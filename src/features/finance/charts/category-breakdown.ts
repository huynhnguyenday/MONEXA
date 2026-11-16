import { dateKey, expenseCategoryId, isSpendingExpense, type FinanceData } from '../model';
import type { BreakdownGroup, BreakdownRecord } from './group-breakdown';

// Presentation-only ID: never stored or used as a database relationship.
export const UNCATEGORIZED_DEBT_GROUP = 'chart:uncategorized-debt';

export function categoryBreakdown(data: FinanceData): {
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
} {
  const records = data.expenses.flatMap((expense) => {
    if (!isSpendingExpense(data, expense)) return [];
    const groupId =
      expenseCategoryId(data, expense) || (expense.debtId ? UNCATEGORIZED_DEBT_GROUP : null);
    return groupId ? [{ groupId, amount: expense.amount, date: dateKey(expense.occurredAt) }] : [];
  });
  const used = new Set(records.map((record) => record.groupId));
  const groups: BreakdownGroup[] = data.categories.filter(
    (category) =>
      category.icon !== 'debt' ||
      used.has(category.id) ||
      data.debts.some((debt) => debt.categoryId === category.id),
  );
  if (used.has(UNCATEGORIZED_DEBT_GROUP))
    groups.push({
      id: UNCATEGORIZED_DEBT_GROUP,
      name: 'Công nợ',
      color: '#0d9488',
      icon: 'debt',
    });
  return { groups, records };
}
