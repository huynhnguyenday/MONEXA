import type { ReactNode } from 'react';
import Dialog from '@/components/dialog';
import { IncomeForm } from '../forms/income-form';
import { AllocationForm } from '../forms/allocation-form';
import type { FormProps } from '../forms/types';
import type { IncomeRecord } from '../income-model';
import './income-dialogs.css';

export type IncomeModal = 'income' | 'allocation' | IncomeRecord | null;
export default function IncomeDialogs({
  modal,
  month,
  error,
  ...forms
}: FormProps & { modal: IncomeModal; month: string; error: ReactNode }) {
  if (!modal) return null;
  const editing = typeof modal === 'object' ? modal : undefined;
  const income = modal === 'income' || editing?.kind === 'income';
  return (
    <Dialog
      key={typeof modal === 'string' ? modal : `${modal.kind}-${modal.entry.id}`}
      title={
        income
          ? editing
            ? 'Sửa thu nhập'
            : 'Nhận thu nhập'
          : editing
            ? 'Sửa phân bổ'
            : 'Phân bổ tiền'
      }
      onClose={forms.done}
      busy={forms.busy}
      className={`income-entry-dialog${income ? '' : ' allocation-entry-dialog'}`}
    >
      {error}
      {income ? (
        <IncomeForm {...forms} record={editing?.kind === 'income' ? editing : undefined} />
      ) : (
        <AllocationForm {...forms} month={month} record={editing} />
      )}
    </Dialog>
  );
}
