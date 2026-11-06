import type { ClientSession, Db } from 'mongodb';
import { PERSONAL_USER_ID, type Debt } from '../model';

export type ReminderJob = {
  _id: string;
  userId: string;
  debtId: string;
  dueDate: string;
  kind: 'before' | 'due' | 'due-evening';
  scheduledAt: Date;
  expiresAt: Date;
  status: 'pending' | 'sent';
  createdAt: Date;
  sentAt?: Date;
};

export function debtReminderJobs(debts: Debt[], now = new Date()): ReminderJob[] {
  return debts.flatMap(debt => {
    if (debt.settledAt || !debt.dueDate) return [];
    const dueDate = debt.dueDate;
    return (['before', 'due', 'due-evening'] as const).map(kind => {
      const day = new Date(`${dueDate}T00:00:00Z`);
      if (kind === 'before') day.setUTCDate(day.getUTCDate() - 1);
      const date = day.toISOString().slice(0, 10);
      return {
        _id: `${PERSONAL_USER_ID}:${debt.id}:${dueDate}:${kind}`,
        userId: PERSONAL_USER_ID, debtId: debt.id, dueDate, kind,
        scheduledAt: new Date(`${date}T${kind === 'due-evening' ? '21' : '09'}:00:00+07:00`),
        expiresAt: new Date(`${date}T${kind === 'due-evening' ? '23:59:59.999' : '21:00:00'}+07:00`),
        status: 'pending' as const, createdAt: now,
      };
    });
  });
}

/** Must commit with debt documents, balance and finance revision. */
export async function syncDebtReminders(db: Db, debts: Debt[], session: ClientSession, previous?: Debt[]) {
  const jobs = debtReminderJobs(debts);
  const previousIds = previous && new Set(debtReminderJobs(previous).map(job => job._id));
  const currentIds = new Set(jobs.map(job => job._id));
  const added = jobs.filter(job => !previousIds?.has(job._id));
  const removed = previousIds && [...previousIds].filter(id => !currentIds.has(id));
  const collection = db.collection<ReminderJob>('reminder_jobs');
  if (added.length) await collection.bulkWrite(added.map(job => ({
    updateOne: { filter: { _id: job._id, userId: PERSONAL_USER_ID }, update: { $setOnInsert: job }, upsert: true },
  })), { session, ordered: true });
  if (removed?.length) await collection.deleteMany({ userId: PERSONAL_USER_ID, _id: { $in: removed } }, { session });
  if (!previousIds) await collection.deleteMany({ userId: PERSONAL_USER_ID, _id: { $nin: [...currentIds] } }, { session });
}
