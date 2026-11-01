import type { Category, Debt, DebtSource, Expense } from './model';

export type FinanceView = 'overview' | 'debts' | 'categories' | 'debt-sources';
export const viewLabels: Record<FinanceView, string> = {
  overview: 'Tổng quan',
  debts: 'Công nợ',
  categories: 'Danh mục',
  'debt-sources': 'Nguồn công nợ',
};
export type FinanceModal =
  | { type: 'expense'; expense?: Expense }
  | { type: 'debt'; debt?: Debt }
  | { type: 'category'; category?: Category }
  | { type: 'debtSource'; debtSource?: DebtSource }
  | { type: 'budget' }
  | { type: 'budget-history' }
  | null;
