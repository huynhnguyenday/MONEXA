import { dateKey } from '../model';
import type { PushMessage } from './push-sender';

type DebtDetails = { title: string; sourceName?: string; amount: number; dueDate: string };

/** Group by immutable source ID, never by its editable display name. */
export function groupedDebtPushMessage(
  debts: readonly (DebtDetails & { debtSourceId?: string })[],
  tag: string,
  test = false,
  now = new Date(),
): PushMessage {
  const sources = new Map<string, DebtDetails>();
  for (const debt of debts) {
    const key = JSON.stringify([debt.dueDate, debt.debtSourceId ?? null]);
    const previous = sources.get(key);
    if (previous) previous.amount += debt.amount;
    else sources.set(key, { ...debt });
  }
  return {
    title: test ? 'MONEXA · Thông báo thử' : 'MONEXA · Nhắc hạn công nợ',
    body: [...sources.values()]
      .map((debt) => debtPushMessage(debt, tag, test, now).body)
      .join('\n'),
    tag,
  };
}

export function debtsByDueDate<T extends { dueDate: string | null }>(debts: readonly T[]): T[][] {
  const dates = new Map<string, T[]>();
  for (const debt of debts) {
    if (!debt.dueDate) continue;
    const group = dates.get(debt.dueDate) ?? [];
    group.push(debt);
    dates.set(debt.dueDate, group);
  }
  return [...dates.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group]) => group);
}
export function debtPushMessage(
  debt: DebtDetails,
  tag: string,
  test = false,
  now = new Date(),
): PushMessage {
  const days = Math.round((Date.parse(debt.dueDate) - Date.parse(dateKey(now))) / 86400000);
  const deadline =
    days === 0
      ? 'đến hạn trong hôm nay'
      : days > 0
        ? `đến hạn trong ${days} ngày nữa`
        : `đã quá hạn ${-days} ngày`;
  return {
    title: test ? 'MONEXA · Thông báo thử' : 'MONEXA · Nhắc hạn công nợ',
    body: `Thanh toán cho ${debt.sourceName?.trim() || debt.title} ${deadline}. Số tiền ${new Intl.NumberFormat('vi-VN').format(debt.amount)} đồng.`,
    tag,
  };
}
