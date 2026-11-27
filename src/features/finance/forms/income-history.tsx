'use client';
import Toast from '@/components/toast';
import { Fragment, useMemo, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faPen, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { financeSchema, dateKey, money } from '../model';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useConfirmation } from '../hooks/use-confirmation';
import { incomeRecords, incomeTypes, fundLabels, type IncomeRecord } from '../income-model';
import { removeIncomeRecord } from '../income-operations';
import { useHistoryWindow } from '../hooks/use-history-window';
import HistoryEnd from '../components/history-end';
import LoadingSpinner from '@/components/loading-spinner';
import type { FormProps } from './types';
import './income-history.css';

export type IncomeHistoryScope = 'income' | 'allocation';
export function incomeRecordTitle(record: IncomeRecord) {
  return record.kind === 'income'
    ? record.entry.title
    : record.kind === 'support'
      ? `${fundLabels[record.entry.sourceFundId]} → Gửi mẹ`
      : `${fundLabels[record.entry.fromFundId]} → ${fundLabels[record.entry.toFundId]}`;
}
export default function IncomeHistory({
  data,
  save,
  busy,
  onEdit,
  scope,
  id,
}: Omit<FormProps, 'done'> & {
  onEdit: (record: IncomeRecord) => void;
  scope: IncomeHistoryScope;
  id: string;
}) {
  const [error, setError] = useState('');
  const { confirm, confirmation } = useConfirmation();
  const [deleting, setDeleting] = useState<string | null>(null);
  const records = useMemo(
    () =>
      incomeRecords(data)
        .filter((r) => (scope === 'income' ? r.kind === 'income' : r.kind !== 'income'))
        .sort((a, b) => b.entry.occurredAt.localeCompare(a.entry.occurredAt)),
    [data, scope],
  );
  const { viewportRef, endRef, visibleCount, hasMore } = useHistoryWindow(
    records.length,
    scope,
    busy,
  );
  return (
    <div className="income-history">
      <div
        className="income-history-rows"
        id={id}
        ref={viewportRef}
        role="region"
        tabIndex={0}
        aria-label={scope === 'income' ? 'Lịch sử thu nhập' : 'Lịch sử phân bổ'}
      >
        {error && <Toast>{error}</Toast>}
        {!records.length && (
          <p className="income-history-empty">
            {scope === 'income' ? 'Chưa ghi nhận thu nhập.' : 'Chưa có phân bổ tiền.'}
          </p>
        )}
        {records.slice(0, visibleCount).map((r, index) => (
          <Fragment key={`${r.kind}-${r.entry.id}`}>
            {(index === 0 ||
              dateKey(records[index - 1].entry.occurredAt) !== dateKey(r.entry.occurredAt)) && (
              <h3 className="income-history-day">
                <time dateTime={dateKey(r.entry.occurredAt)}>
                  {format(new Date(`${dateKey(r.entry.occurredAt)}T12:00:00`), 'd MMMM yyyy', {
                    locale: vi,
                  })}
                </time>
              </h3>
            )}
            <article className="income-history-row">
              <div className="income-history-summary">
                <span className="income-history-title">
                  <strong title={incomeRecordTitle(r)}>{incomeRecordTitle(r)}</strong>
                </span>
                <b>{money(r.entry.amount)}</b>
                <small>
                  {r.entry.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}
                  {r.kind === 'income' ? ` · ${incomeTypes[r.entry.type]}` : ''}
                </small>
                {r.entry.note && <small title={r.entry.note}>{r.entry.note}</small>}
              </div>
              <div className="income-history-actions">
                <button
                  type="button"
                  className="monexa-action monexa-edit"
                  disabled={busy}
                  aria-label={`Sửa ${incomeRecordTitle(r)}`}
                  title="Sửa giao dịch"
                  onClick={() => onEdit(r)}
                >
                  <Icon icon={faPen} />
                </button>
                <button
                  type="button"
                  className="monexa-action monexa-delete income-history-delete"
                  disabled={busy || deleting === r.entry.id}
                  aria-busy={deleting === r.entry.id}
                  aria-label={`Xóa ${incomeRecordTitle(r)}`}
                  title="Xóa giao dịch"
                  onClick={async () => {
                    if (busy || deleting) return;
                    if (
                      !(await confirm(
                        `Xóa “${incomeRecordTitle(r)}”? Giao dịch liên kết sẽ được hoàn tác; chỉ lưu khi các sổ vẫn đủ tiền.`,
                      ))
                    )
                      return;
                    setError('');
                    const result = financeSchema.safeParse(removeIncomeRecord(data, r));
                    if (!result.success)
                      return setError(
                        'Không thể xóa vì tiền đã được phân bổ hoặc các giao dịch sau sẽ thiếu nguồn.',
                      );
                    setDeleting(r.entry.id);
                    try {
                      await save(result.data);
                    } finally {
                      setDeleting(null);
                    }
                  }}
                >
                  {deleting === r.entry.id ? <LoadingSpinner /> : <Icon icon={faTrashCan} />}
                </button>
              </div>
            </article>
          </Fragment>
        ))}
        <HistoryEnd endRef={endRef} hasMore={hasMore} />
      </div>
      {confirmation}
    </div>
  );
}
