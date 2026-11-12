'use client';
import type { ReactNode } from 'react';
import Dialog from '@/components/dialog';
import type { FinanceModal } from '../types';
import type { FormProps } from '../forms/types';
import { ExpenseForm } from '../forms/expense-form';
import { DebtForm } from '../forms/debt-form';
import { CategoryForm } from '../forms/category-form';
import { BudgetForm } from '../forms/budget-form';
import { DebtSourceForm } from '../forms/debt-source-form';
import { BudgetExchange } from '../forms/budget-exchange';
import { BudgetHistory } from '../forms/budget-history';
import DebtPaymentConfirmation from './debt-payment-confirmation';

type Props = {
  modal: FinanceModal;
  onClose: () => void;
  formProps: FormProps;
  error: ReactNode;
  month: string;
};
export default function FinanceDialogs({ modal, onClose, formProps, error, month }: Props) {
  if (!modal) return null;
  const title =
    modal.type === 'debt-payment'
      ? modal.reopen
        ? 'Xác nhận mở lại công nợ'
        : 'Xác nhận thanh toán'
      : modal.type === 'budget-exchange'
        ? 'Trao đổi tiền ngân sách'
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
              : modal.type === 'debtSource'
                ? modal.debtSource
                  ? 'Sửa nguồn công nợ'
                  : 'Thêm nguồn công nợ'
                : modal.type === 'budget-history'
                  ? 'Lịch sử ngân sách'
                  : 'Ngân sách của bạn';
  return (
    <Dialog
      title={title}
      onClose={onClose}
      busy={formProps.busy}
      compact={modal.type === 'debt'}
      className={
        modal.type === 'debt-payment'
          ? 'debt-payment-dialog'
          : modal.type === 'budget-exchange'
            ? 'budget-exchange-dialog'
            : modal.type === 'debt'
              ? 'debt-entry-dialog'
              : modal.type === 'budget-history'
                ? 'budget-history-dialog'
                : undefined
      }
    >
      {error}
      {modal.type === 'debt-payment' && (
        <DebtPaymentConfirmation
          {...formProps}
          debtIds={modal.debtIds}
          reopen={modal.reopen}
          onCancel={onClose}
        />
      )}
      {modal.type === 'budget-exchange' && <BudgetExchange {...formProps} />}
      {modal.type === 'expense' && <ExpenseForm {...formProps} expense={modal.expense} />}
      {modal.type === 'category' && <CategoryForm {...formProps} category={modal.category} />}
      {modal.type === 'debtSource' && (
        <DebtSourceForm {...formProps} debtSource={modal.debtSource} />
      )}
      {modal.type === 'debt' && <DebtForm {...formProps} debt={modal.debt} />}
      {modal.type === 'budget' && <BudgetForm {...formProps} month={month} />}
      {modal.type === 'budget-history' && <BudgetHistory {...formProps} month={month} />}
    </Dialog>
  );
}
