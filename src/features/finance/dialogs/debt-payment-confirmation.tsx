'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faCheck, faSpinner, faXmark } from '@fortawesome/free-solid-svg-icons';
import { DebtSourceIcon } from '../debt-source-icon';
import { money } from '../model';
import { debtPaymentGroup, settleDebtPaymentGroup } from '../debt-payments';
import type { FormProps } from '../forms/types';
import './debt-payment-confirmation.css';

export default function DebtPaymentConfirmation({
  data,
  save,
  done,
  busy,
  debtIds,
  reopen = false,
  onCancel,
}: FormProps & { debtIds: string[]; reopen?: boolean; onCancel: () => void }) {
  const [error, setError] = useState('');
  const group = debtPaymentGroup(data, debtIds[0]);
  const ids = new Set(debtIds);
  const unchanged =
    debtIds.length === 1
      ? !!data.debts.find((debt) => debt.id === debtIds[0] && !!debt.settledAt === reopen)
      : debtIds.length >= 2 &&
        ids.size === debtIds.length &&
        group.length === debtIds.length &&
        group.every((debt) => ids.has(debt.id));
  const entries = data.debts.filter((debt) => ids.has(debt.id));
  const source = data.debtSources.find((source) => source.id === entries[0]?.debtSourceId);
  const dueDate = entries[0]?.dueDate;
  const total = entries.reduce((sum, debt) => sum + debt.amount, 0);
  return (
    <form
      className="debt-payment-confirmation"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setError('');
        try {
          const next =
            debtIds.length === 1
              ? {
                  ...data,
                  debts: data.debts.map((debt) =>
                    ids.has(debt.id)
                      ? { ...debt, settledAt: reopen ? null : new Date().toISOString() }
                      : debt,
                  ),
                }
              : settleDebtPaymentGroup(data, debtIds);
          if (!unchanged) throw new Error('Công nợ đã thay đổi. Hãy đóng và mở lại xác nhận.');
          if (await save(next)) done();
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Chưa thể xác nhận thanh toán.');
        }
      }}
    >
      <div className="debt-payment-context">
        <span style={{ color: source?.color }}>
          {source && <DebtSourceIcon icon={source.icon} />}
          <strong>{source?.name || 'Nguồn công nợ'}</strong>
        </span>
        <time dateTime={dueDate || undefined}>
          Đến hạn {dueDate?.split('-').reverse().join('/')}
        </time>
      </div>
      <div
        className="debt-payment-list"
        role="region"
        aria-label="Các khoản nợ cần thanh toán"
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">Các khoản phải trả cùng nguồn và ngày đến hạn</caption>
          <thead>
            <tr>
              <th scope="col">Khoản nợ</th>
              <th scope="col">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((debt) => (
              <tr key={debt.id}>
                <td>{debt.title}</td>
                <td>{money(debt.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="debt-payment-total">
        <strong>Tổng tiền ({entries.length} khoản)</strong>
        <strong>{money(total)}</strong>
      </div>
      {!unchanged && (
        <p className="form-error" role="alert">
          Danh sách công nợ đã thay đổi. Hãy đóng và mở lại xác nhận thanh toán.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="debt-payment-actions">
        <button
          className="button monexa-action monexa-cancel"
          type="button"
          onClick={onCancel}
          disabled={busy}
          aria-label="Hủy"
          title="Hủy"
        >
          <Icon icon={faXmark} />
        </button>
        <button
          className="button primary monexa-action monexa-create"
          type="submit"
          disabled={busy || !unchanged}
          aria-busy={busy}
          aria-label={busy ? 'Đang lưu' : reopen ? 'Xác nhận mở lại' : 'Xác nhận thanh toán'}
          title={reopen ? 'Xác nhận mở lại' : 'Xác nhận thanh toán'}
        >
          <Icon icon={busy ? faSpinner : faCheck} spin={busy} />
          {busy && (
            <span className="sr-only" role="status">
              Đang thanh toán
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
