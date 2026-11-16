'use client';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import LoadingSpinner from '@/components/loading-spinner';
import { DebtSourceIcon } from '../debt-source-icon';
import { money, type Debt } from '../model';
import type { FormProps } from '../forms/types';
import './debt-payment-confirmation.css';

export default function DebtDeleteConfirmation({
  data,
  save,
  done,
  busy,
  debt,
  onCancel,
}: FormProps & { debt: Debt; onCancel: () => void }) {
  const current = data.debts.find((item) => item.id === debt.id);
  const unchanged = !!current && JSON.stringify(current) === JSON.stringify(debt);
  const source = data.debtSources.find((item) => item.id === debt.debtSourceId);
  return (
    <form
      className="debt-payment-confirmation"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !unchanged) return;
        if (
          await save({
            ...data,
            debts: data.debts.filter((item) => item.id !== debt.id),
            expenses: data.expenses.filter((expense) => expense.debtId !== debt.id),
          })
        )
          done();
      }}
    >
      <div className="debt-payment-context">
        <span style={{ color: source?.color }}>
          {source && <DebtSourceIcon icon={source.icon} />}
          <strong>{source?.name || (!debt.debtSourceId ? 'Ngân sách' : 'Nguồn công nợ')}</strong>
        </span>
        {debt.dueDate && (
          <time dateTime={debt.dueDate}>{debt.dueDate.split('-').reverse().join('/')}</time>
        )}
      </div>
      <div
        className="debt-payment-list"
        role="region"
        aria-label="Khoản công nợ sẽ xóa"
        tabIndex={0}
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Khoản nợ</th>
              <th scope="col">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{debt.title}</td>
              <td>{money(debt.amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="debt-delete-description">
        Xóa khoản công nợ này và chi tiêu tự động liên kết (nếu có). Số dư sẽ được tính lại theo các
        giao dịch còn lại.
      </p>
      {!unchanged && (
        <p className="form-error" role="alert">
          Công nợ đã thay đổi. Hãy đóng và mở lại xác nhận xóa.
        </p>
      )}
      <div className="debt-payment-actions">
        <button
          type="button"
          className="button monexa-action monexa-cancel"
          onClick={onCancel}
          disabled={busy}
          aria-label="Hủy"
          title="Hủy"
        >
          <Icon icon={faXmark} />
        </button>
        <button
          type="submit"
          className="button monexa-action monexa-delete"
          disabled={busy || !unchanged}
          aria-busy={busy}
          aria-label="Xác nhận xóa công nợ"
          title="Xác nhận xóa công nợ"
        >
          {busy ? <LoadingSpinner /> : <Icon icon={faTrashCan} />}
          {busy && (
            <span className="sr-only" role="status">
              Đang xóa công nợ
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
