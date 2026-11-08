import { financeSchema, budgetMonth, type FinanceData } from './model';
import type { IncomeRecord } from './income-model';

/** Keep linked IDs on edit; deleting a transfer removes its funding mirror atomically. */
export function removeIncomeRecord(data: FinanceData, record: IncomeRecord): FinanceData {
  const id = record.entry.id;
  const linked =
    record.kind === 'transfer' ? data.budgets.find((b) => b.transferId === id) : undefined;
  const next = {
    ...data,
    incomes: record.kind === 'income' ? data.incomes.filter((v) => v.id !== id) : data.incomes,
    familySupports:
      record.kind === 'support'
        ? data.familySupports.filter((v) => v.id !== id)
        : data.familySupports,
    fundTransfers:
      record.kind === 'transfer'
        ? data.fundTransfers.filter((v) => v.id !== id)
        : data.fundTransfers,
    budgets:
      record.kind === 'transfer' ? data.budgets.filter((v) => v.transferId !== id) : data.budgets,
  };
  if (linked)
    next.budget = next.budgets
      .filter((b) => budgetMonth(b) === budgetMonth(linked))
      .reduce((sum, b) => sum + b.cash + b.bank, 0);
  return next;
}
export function putIncomeRecord(
  data: FinanceData,
  record: IncomeRecord,
  month: string,
  previous?: IncomeRecord,
): FinanceData {
  const next = previous ? removeIncomeRecord(data, previous) : { ...data };
  if (record.kind === 'income') next.incomes = [...next.incomes, record.entry];
  else if (record.kind === 'support') next.familySupports = [...next.familySupports, record.entry];
  else {
    next.fundTransfers = [...next.fundTransfers, record.entry];
    if (record.entry.toFundId === 'spending') {
      const e = record.entry;
      const oldBudget = data.budgets.find((b) => b.transferId === e.id);
      next.budgets = [
        ...next.budgets,
        {
          id: oldBudget?.id ?? crypto.randomUUID(),
          userId: 'personal',
          transferId: e.id,
          cash: e.paymentMethod === 'cash' ? e.amount : 0,
          bank: e.paymentMethod === 'bank' ? e.amount : 0,
          recordedAt: e.occurredAt,
          month,
        },
      ];
    }
  }
  if (record.kind === 'transfer' && record.entry.toFundId === 'spending') {
    next.budget = next.budgets
      .filter((b) => budgetMonth(b) === month)
      .reduce((s, b) => s + b.cash + b.bank, 0);
  }
  return financeSchema.parse(next);
}
