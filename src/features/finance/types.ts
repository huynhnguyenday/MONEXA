import type { Category, Debt, Expense } from './model';

export type FinanceView = 'overview' | 'debts' | 'categories';
export const viewLabels: Record<FinanceView, string> = {
  overview: 'Tổng quan',
  debts: 'Công nợ',
  categories: 'Danh mục',
};
export type FinanceModal =
  | { type: 'expense'; expense?: Expense }
  | { type: 'debt'; debt?: Debt }
  | { type: 'category'; category?: Category }
  | { type: 'budget' | 'people' }
  | { type: 'budget-history' }
  | null;
