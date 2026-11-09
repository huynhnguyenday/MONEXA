import type { ClientSession, Db } from 'mongodb';
import { PERSONAL_USER_ID, type Debt } from '../model';

export type ReminderJob = {
  _id: string;
  userId: string;
  debtId: string;
  dueDate: string;
  kind: 'morning' | 'evening' | 'due-evening';
  scheduledAt: Date;
  expiresAt: Date;
  status: 'pending' | 'sent';
  createdAt: Date;
  sentAt?: Date;
};

export function debtReminderJobs(debts: Debt[], now = new Date()): ReminderJob[] {
  return debts.flatMap((debt) => {
    if (debt.settledAt || !debt.dueDate) return [];
    const dueDate = debt.dueDate;
    const slots = Array.from({ length: 11 }, (_, index) => 10 - index).flatMap((daysBefore) =>
      daysBefore <= 3
        ? [
            { daysBefore, morning: true },
            { daysBefore, morning: false },
          ]
        : [{ daysBefore, morning: false }],
    );
    return slots.map(({ daysBefore, morning }) => {
      const day = new Date(`${dueDate}T00:00:00Z`);
      day.setUTCDate(day.getUTCDate() - daysBefore);
      const date = day.toISOString().slice(0, 10);
      const kind = morning ? 'morning' : daysBefore === 0 ? 'due-evening' : 'evening';
      return {
        // Preserve the existing due-evening identity and its delivery receipts.
        _id: `${PERSONAL_USER_ID}:${debt.id}:${dueDate}:${kind}${kind === 'due-evening' ? '' : `:${date}`}`,
        userId: PERSONAL_USER_ID,
        debtId: debt.id,
        dueDate,
        kind,
        scheduledAt: new Date(`${date}T${morning ? '06:30' : '19:30'}:00+07:00`),
        expiresAt: new Date(`${date}T${morning ? '19:30:00' : '23:59:59.999'}+07:00`),
        status: 'pending' as const,
        createdAt: now,
      };
    });
  });
}

/** Must commit with debt documents, balance and finance revision. */
export async function syncDebtReminders(
  db: Db,
  debts: Debt[],
  session: ClientSession,
  previous?: Debt[],
) {
  const jobs = debtReminderJobs(debts);
  const previousIds = previous && new Set(debtReminderJobs(previous).map((job) => job._id));
  const currentIds = new Set(jobs.map((job) => job._id));
  const added = jobs.filter((job) => !previousIds?.has(job._id));
  const removed = previousIds && [...previousIds].filter((id) => !currentIds.has(id));
  const collection = db.collection<ReminderJob>('reminder_jobs');
  if (added.length)
    await collection.bulkWrite(
      added.map(({ scheduledAt, expiresAt, ...job }) => ({
        updateOne: {
          filter: { _id: job._id, userId: PERSONAL_USER_ID },
          update: { $set: { scheduledAt, expiresAt }, $setOnInsert: job },
          upsert: true,
        },
      })),
      { session, ordered: true },
    );
  if (removed?.length)
    await collection.deleteMany({ userId: PERSONAL_USER_ID, _id: { $in: removed } }, { session });
  if (!previousIds)
    await collection.deleteMany(
      { userId: PERSONAL_USER_ID, _id: { $nin: [...currentIds] } },
      { session },
    );
}
