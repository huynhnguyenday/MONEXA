import 'server-only';
import { createHash } from 'node:crypto';
import type { Db } from 'mongodb';
import type { z } from 'zod';
import { PERSONAL_USER_ID } from '../model';
import type { PushMessage } from './push-sender';
import type { ReminderJob } from './reminder-schedule';
import { groupedDebtPushMessage } from './push-message';
import { notificationMutationSchema, type InAppNotification } from './notification-schema';

type NotificationDocument = {
  _id: string;
  userId: string;
  tag: string;
  title: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  deletedAt: Date | null;
};
const owner = { userId: PERSONAL_USER_ID };
const visible = { ...owner, deletedAt: null };
export async function createNotificationIndexes(db: Db) {
  await db
    .collection('notifications')
    .createIndex({ userId: 1, deletedAt: 1, createdAt: -1, _id: -1 });
  await db.collection('notifications').createIndex({ userId: 1, deletedAt: 1, readAt: 1 });
}
function present(row: NotificationDocument): InAppNotification {
  return {
    id: row._id,
    tag: row.tag,
    title: row.title,
    body: row.body,
    receivedAt: row.createdAt.toISOString(),
    read: row.readAt !== null,
  };
}
/** One immutable record per scheduled notification, shared by all devices/retries. */
export async function archiveNotification(db: Db, message: PushMessage, receivedAt = new Date()) {
  const _id = createHash('sha256').update(message.tag).digest('hex');
  const document: NotificationDocument = {
    _id,
    ...owner,
    tag: message.tag.slice(0, 180),
    title: message.title.slice(0, 120),
    body: message.body.slice(0, 16000),
    createdAt: receivedAt,
    readAt: null,
    deletedAt: null,
  };
  const result = await db
    .collection<NotificationDocument>('notifications')
    .updateOne({ _id, ...owner }, { $setOnInsert: document }, { upsert: true });
  return { notification: present(document), inserted: result.upsertedCount === 1 };
}
export const reminderNotificationTag = (job: ReminderJob) =>
  `monexa:due:${job.dueDate}:${job.kind}:${job.scheduledAt.toISOString().slice(0, 10)}`;

/** Build history before delivery, including when no device is subscribed. */
export async function archiveDueNotifications(db: Db, jobs: ReminderJob[], now: Date) {
  const groups = new Map<string, ReminderJob[]>();
  for (const job of jobs) {
    const tag = reminderNotificationTag(job);
    groups.set(tag, [...(groups.get(tag) ?? []), job]);
  }
  let archived = 0;
  for (const [tag, members] of groups) {
    const debts = await db
      .collection<{
        _id: string;
        userId: string;
        title: string;
        amount: number;
        debtSourceId: string;
        dueDate: string;
        settledAt: string | null;
      }>('debts')
      .find({
        ...owner,
        _id: { $in: members.map((job) => job.debtId) },
        dueDate: members[0].dueDate,
        settledAt: null,
      })
      .sort({ _id: 1 })
      .toArray();
    if (!debts.length) continue;
    const sources = await db
      .collection<{ _id: string; userId: string; name: string }>('debt_sources')
      .find({ ...owner, _id: { $in: debts.map((debt) => debt.debtSourceId) } })
      .toArray();
    const names = new Map(sources.map((source) => [source._id, source.name]));
    const message = groupedDebtPushMessage(
      debts.map((debt) => ({ ...debt, sourceName: names.get(debt.debtSourceId) })),
      tag,
      false,
      now,
    );
    if ((await archiveNotification(db, message, now)).inserted) archived++;
  }
  return archived;
}

export async function readNotifications(db: Db, cursor?: string) {
  const asOf = new Date();
  const [date, id] = cursor?.split('|') ?? [];
  const query = cursor
    ? {
        ...visible,
        $or: [
          { createdAt: { $lt: new Date(date) } },
          { createdAt: new Date(date), _id: { $lt: id } },
        ],
      }
    : visible;
  const rows = await db
    .collection<NotificationDocument>('notifications')
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(51)
    .toArray();
  const items = rows.slice(0, 50);
  const last = items.at(-1);
  const unreadCount = await db
    .collection<NotificationDocument>('notifications')
    .countDocuments({ ...visible, readAt: null });
  return {
    items: items.map(present),
    nextCursor: rows.length > 50 && last ? `${last.createdAt.toISOString()}|${last._id}` : null,
    unreadCount,
    asOf: asOf.toISOString(),
  };
}

export async function mutateNotifications(
  db: Db,
  input: z.infer<typeof notificationMutationSchema>,
) {
  const collection = db.collection<NotificationDocument>('notifications');
  const now = new Date();
  if (input.action === 'delete')
    await collection.updateOne({ ...visible, _id: input.id }, { $set: { deletedAt: now } });
  else if (input.action === 'read')
    await collection.updateMany(
      { ...visible, _id: { $in: input.ids }, readAt: null },
      { $set: { readAt: now } },
    );
  else
    await collection.updateMany(
      { ...visible, readAt: null, createdAt: { $lte: new Date(input.through) } },
      { $set: { readAt: now } },
    );
  return { ...input, unreadCount: await collection.countDocuments({ ...visible, readAt: null }) };
}
