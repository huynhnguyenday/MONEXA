import { money } from '../model';
import type { PushMessage } from './push-sender';

type DebtDetails = { title: string; amount: number; dueDate: string };
export function debtPushMessage(debt: DebtDetails, tag: string, test = false): PushMessage {
  const date = debt.dueDate.split('-').reverse().join('/');
  return {
    title: test ? 'MONEXA · Thông báo thử' : 'MONEXA · Nhắc hạn công nợ',
    body: `${debt.title} · ${money(debt.amount)} · Hạn thanh toán ${date}.`,
    tag,
  };
}
