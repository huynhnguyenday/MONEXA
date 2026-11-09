import { dateKey, money } from '../model';
import type { PushMessage } from './push-sender';

type DebtDetails = { title: string; amount: number; dueDate: string };
export function debtPushMessage(
  debt: DebtDetails,
  tag: string,
  test = false,
  now = new Date(),
): PushMessage {
  const date = debt.dueDate.split('-').reverse().join('/');
  const days = Math.round((Date.parse(debt.dueDate) - Date.parse(dateKey(now))) / 86400000);
  const deadline =
    days === 0
      ? 'đến hạn trong hôm nay'
      : days > 0
        ? `đến hạn trong ${days} ngày nữa`
        : `đã quá hạn ${-days} ngày`;
  return {
    title: test ? 'MONEXA · Thông báo thử' : 'MONEXA · Nhắc hạn công nợ',
    body: `Thanh toán ${debt.title} ${deadline} · Số tiền ${money(debt.amount)} · Ngày tới hạn ${date}`,
    tag,
  };
}
