import 'server-only';
import { createHash, randomUUID } from 'node:crypto';
import { getDatabase, getMongoClient } from '@/lib/mongodb';
import { PERSONAL_USER_ID } from '../model';
import type { ReminderJob } from './reminder-schedule';
import type { PushDevice } from './push-repository';
import { pushAuthEpoch, pushConfig } from './push-config';
import { expiredPush, sendWebPush } from './push-sender';
import { debtsByDueDate, groupedDebtPushMessage } from './push-message';
import { readDebtSourceName } from './debt-source-name';

type Delivery = {
  _id: string;
  userId: string;
  subscriptionId: string;
  jobId: string;
  sentAt: Date;
  expiresAt: Date;
};
type RunLock = { _id: string; userId: string; token: string; leaseUntil: Date };
type CurrentDebt = {
  _id: string;
  userId: string;
  debtSourceId: string;
  title: string;
  amount: number;
  dueDate: string | null;
  settledAt: string | null;
};

const deliveryId = (job: ReminderJob, device: PushDevice) =>
  createHash('sha256')
    .update(`${job._id}\0${device._id}\0${device.authEpoch}\0${device.publicKey}`)
    .digest('hex');

/** External delivery happens outside transactions; durable receipts make retries idempotent. */
export async function dispatchPushReminders(now = new Date()) {
  const config = pushConfig();
  if (!config) throw new Error('PUSH_NOT_CONFIGURED');
  const db = await getDatabase();
  const client = await getMongoClient();
  const owner = { userId: PERSONAL_USER_ID };
  const locks = db.collection<RunLock>('push_runs');
  const token = randomUUID();
  try {
    const lock = await locks.findOneAndUpdate(
      {
        _id: PERSONAL_USER_ID,
        ...owner,
        $or: [{ leaseUntil: { $lte: now } }, { leaseUntil: { $exists: false } }],
      },
      { $set: { token, leaseUntil: new Date(now.getTime() + 120000) }, $setOnInsert: owner },
      { upsert: true, returnDocument: 'after' },
    );
    if (!lock) return { busy: true, sent: 0, failed: 0 };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000)
      return { busy: true, sent: 0, failed: 0 };
    throw error;
  }
  try {
    const devices = db.collection<PushDevice>('push_subscriptions');
    const jobs = db.collection<ReminderJob>('reminder_jobs');
    const receipts = db.collection<Delivery>('push_deliveries');
    const epoch = pushAuthEpoch();
    const subscriptions = await devices
      .find({
        ...owner,
        authEpoch: epoch,
        publicKey: config.publicKey,
        $or: [{ expirationTime: null }, { expirationTime: { $gt: now.getTime() } }],
      })
      .limit(20)
      .toArray();
    if (!subscriptions.length) return { sent: 0, failed: 0, devices: 0 };
    const pending = await jobs
      .find({ ...owner, status: 'pending', scheduledAt: { $lte: now }, expiresAt: { $gt: now } })
      .toArray();
    let sent = 0,
      failed = 0;
    const gone = new Set<string>();
    const deadline = Date.now() + 45000;
    for (const device of subscriptions) {
      for (const kind of ['morning', 'evening', 'due-evening'] as const) {
        if (gone.has(device._id) || Date.now() >= deadline) continue;
        const candidates = pending.filter((job) => job.kind === kind);
        if (!candidates.length) continue;
        const previous = new Set(
          (
            await receipts
              .find(
                { ...owner, _id: { $in: candidates.map((job) => deliveryId(job, device)) } },
                { projection: { _id: 1 } },
              )
              .toArray()
          ).map((row) => row._id),
        );
        const unsent = candidates.filter((job) => !previous.has(deliveryId(job, device)));
        if (!unsent.length) continue;
        for (const group of debtsByDueDate(unsent)) {
          if (gone.has(device._id) || Date.now() >= deadline) break;
          const current: { job: ReminderJob; debt: CurrentDebt & { dueDate: string } }[] = [];
          for (const job of group) {
            const debt = await db
              .collection<CurrentDebt>('debts')
              .findOne(
                { ...owner, _id: job.debtId, dueDate: job.dueDate, settledAt: null },
                { projection: { title: 1, amount: 1, dueDate: 1, debtSourceId: 1 } },
              );
            if (debt?.dueDate) current.push({ job, debt: { ...debt, dueDate: debt.dueDate } });
          }
          if (!current.length) continue;
          try {
            const details = await Promise.all(
              current.map(async ({ debt }) => ({
                ...debt,
                sourceName: await readDebtSourceName(db, debt.debtSourceId),
              })),
            );
            await sendWebPush(
              device,
              groupedDebtPushMessage(
                details,
                `monexa:due:${group[0].dueDate}:${kind}:${group[0].scheduledAt.toISOString().slice(0, 10)}`,
                false,
                now,
              ),
              Math.max(
                1,
                Math.floor(
                  (Math.min(...current.map(({ job }) => job.expiresAt.getTime())) - now.getTime()) /
                    1000,
                ),
              ),
            );
            // All member receipts commit together, retaining the existing per-debt identities.
            await client.withSession((session) =>
              session.withTransaction(
                async () => {
                  for (const { job } of current)
                    await receipts.updateOne(
                      { _id: deliveryId(job, device), ...owner },
                      {
                        $setOnInsert: {
                          ...owner,
                          subscriptionId: device._id,
                          jobId: job._id,
                          sentAt: now,
                          expiresAt: new Date(job.expiresAt.getTime() + 30 * 86400000),
                        },
                      },
                      { upsert: true, session },
                    );
                },
                { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
              ),
            );
            sent++;
          } catch (error) {
            if (expiredPush(error)) gone.add(device._id);
            else failed++;
          }
        }
      }
    }
    // Bookkeeping is atomic across receipts, schedules and invalid subscriptions.
    await client.withSession((session) =>
      session.withTransaction(
        async () => {
          if (gone.size)
            await devices.deleteMany({ ...owner, _id: { $in: [...gone] } }, { session });
          const active = subscriptions.filter((device) => !gone.has(device._id));
          const delivered = new Set(
            (
              await receipts
                .find(
                  { ...owner, jobId: { $in: pending.map((job) => job._id) } },
                  { session, projection: { _id: 1 } },
                )
                .toArray()
            ).map((row) => row._id),
          );
          const complete = pending.filter(
            (job) =>
              active.length > 0 && active.every((device) => delivered.has(deliveryId(job, device))),
          );
          if (complete.length)
            await jobs.updateMany(
              { ...owner, _id: { $in: complete.map((job) => job._id) }, status: 'pending' },
              { $set: { status: 'sent', sentAt: now } },
              { session },
            );
        },
        { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
      ),
    );
    return { sent, failed, removed: gone.size, devices: subscriptions.length };
  } finally {
    await locks.updateOne(
      { _id: PERSONAL_USER_ID, ...owner, token },
      { $set: { leaseUntil: new Date(0) } },
    );
  }
}
