import { debtDirection, type Debt, type FinanceData } from './model';

export function debtPaymentGroup(data: FinanceData, id: string): Debt[] {
  const selected = data.debts.find((debt) => debt.id === id);
  if (
    !selected ||
    selected.settledAt ||
    !selected.dueDate ||
    debtDirection(data, selected) !== 'payable'
  )
    return [];
  return data.debts
    .filter(
      (debt) =>
        debt.userId === selected.userId &&
        !debt.settledAt &&
        debt.debtSourceId === selected.debtSourceId &&
        debt.dueDate === selected.dueDate &&
        debtDirection(data, debt) === 'payable',
    )
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id));
}

/** Build one mutation; repository reconciles every linked expense in one transaction/revision. */
export function settleDebtPaymentGroup(
  data: FinanceData,
  ids: string[],
  at = new Date().toISOString(),
): FinanceData {
  const selected = new Set(ids);
  const group = debtPaymentGroup(data, ids[0]);
  if (
    ids.length < 2 ||
    selected.size !== ids.length ||
    group.length !== ids.length ||
    group.some((debt) => !selected.has(debt.id))
  )
    throw new Error('Danh sách công nợ đã thay đổi. Hãy đóng và mở lại xác nhận thanh toán.');
  return {
    ...data,
    debts: data.debts.map((debt) => (selected.has(debt.id) ? { ...debt, settledAt: at } : debt)),
  };
}
