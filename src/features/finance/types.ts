import type { Category, Debt, DebtSource, Expense } from './model';
import type { IncomeRecord } from './income-model';

export type FinanceView = 'income' | 'overview' | 'debts' | 'categories' | 'debt-sources';
export const viewLabels: Record<FinanceView, string> = {
  income: 'Thu nhập & phân bổ',
  overview: 'Tổng quan',
  debts: 'Công nợ',
  categories: 'Danh mục',
  'debt-sources': 'Nguồn công nợ',
};
export type FinanceModal =
  | { type: 'income-entry'; record?: IncomeRecord; kind: 'income' | 'allocation' }
  | { type: 'expense'; expense?: Expense }
  | { type: 'debt'; debt?: Debt }
  | { type: 'debt-payment'; debtIds: string[]; reopen?: boolean }
  | { type: 'debt-delete'; debt: Debt }
  | { type: 'category'; category?: Category }
  | { type: 'debtSource'; debtSource?: DebtSource }
  | { type: 'budget' }
  | { type: 'budget-history' }
  | { type: 'budget-exchange' }
  | null;
