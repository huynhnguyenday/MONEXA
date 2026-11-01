'use client';
import type { ReactNode } from 'react';
import Dialog from '@/components/dialog';
import type { FinanceModal } from '../types';
import type { FormProps } from '../forms/types';
import { ExpenseForm } from '../forms/expense-form';
import { DebtForm } from '../forms/debt-form';
import { CategoryForm } from '../forms/category-form';
import { CategoryManager } from '../forms/category-manager';
import { BudgetForm } from '../forms/budget-form';
import { PeopleForm } from '../forms/people-form';
import { BudgetHistory } from '../forms/budget-history';

type Props = {
  modal: FinanceModal;
  categoryOverlay: boolean;
  onCategoryOverlay: (value: boolean) => void;
  onClose: () => void;
  formProps: FormProps;
  error: ReactNode;
  month: string;
};
export default function FinanceDialogs({
  modal,
  categoryOverlay,
  onCategoryOverlay,
  onClose,
  formProps,
  error,
  month,
}: Props) {
  if (!modal) return null;
  const title = categoryOverlay
    ? 'Danh mục chi tiêu'
    : modal.type === 'expense'
      ? modal.expense
        ? 'Sửa khoản chi'
        : 'Ghi một khoản chi'
      : modal.type === 'debt'
        ? modal.debt
          ? 'Sửa công nợ'
          : 'Ghi công nợ'
        : modal.type === 'category'
          ? modal.category
            ? 'Sửa danh mục'
            : 'Thêm danh mục'
            : modal.type === 'budget-history'
              ? 'Lịch sử ngân sách'
              : modal.type === 'people'
            ? 'Người liên quan'
            : 'Ngân sách của bạn';
  return (
    <Dialog title={title} onClose={onClose} busy={formProps.busy} compact={modal.type === 'debt'} className={modal.type === 'budget-history' ? 'budget-history-dialog' : undefined}>
      {error}
      {modal.type === 'expense' && (
        <>
          <div hidden={categoryOverlay}>
            <ExpenseForm
              {...formProps}
              expense={modal.expense}
              onCategory={() => onCategoryOverlay(true)}
            />
          </div>
          {categoryOverlay && (
            <CategoryManager {...formProps} done={() => onCategoryOverlay(false)} />
          )}
        </>
      )}
      {modal.type === 'category' && <CategoryForm {...formProps} category={modal.category} />}
      {modal.type === 'debt' && <DebtForm {...formProps} debt={modal.debt} />}
      {modal.type === 'budget' && <BudgetForm {...formProps} />}
      {modal.type === 'budget-history' && <BudgetHistory data={formProps.data} month={month} />}
      {modal.type === 'people' && <PeopleForm {...formProps} />}
    </Dialog>
  );
}
