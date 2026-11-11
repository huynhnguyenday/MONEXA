'use client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faCheck, faTrashCan, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { FormProps } from './types';
import { budgetMonth, dateKey, money } from '../model';
import './budget-history.css';
import { useHistoryWindow } from '../hooks/use-history-window';
import HistoryEnd from '../components/history-end';

export function BudgetHistory({
  data,
  save,
  busy,
  month,
}: Omit<FormProps, 'done'> & { month: string }) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const entries = useMemo(
    () =>
      data.budgets
        .filter((entry) => budgetMonth(entry) === month)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)),
    [data.budgets, month],
  );
  const { viewportRef, endRef, visibleCount, hasMore } = useHistoryWindow(
    entries.length,
    month,
    busy,
  );
  const grouped = new Map<string, typeof entries>();
  entries.slice(0, visibleCount).forEach((entry) => {
    const day = dateKey(entry.recordedAt);
    grouped.set(day, [...(grouped.get(day) || []), entry]);
  });
  if (!entries.length)
    return <p className="empty-state">Tháng này chưa ghi thêm ngân sách.</p>;
  return (
    <div className="budget-history-manager">
      <div
        className="budget-history-list"
        ref={viewportRef}
        role="region"
        aria-label="Lịch sử ngân sách"
        tabIndex={0}
      >
        {[...grouped.entries()].map(([day, dayEntries]) => (
          <section className="budget-history-day" key={day}>
            <h3>{format(new Date(`${day}T12:00:00`), 'd MMMM yyyy', { locale: vi })}</h3>
            <ol>
              {dayEntries.map((entry) => (
                <li key={entry.id} className="budget-history-entry">
                  <time dateTime={entry.recordedAt}>
                    {format(new Date(entry.recordedAt), 'HH:mm', { locale: vi })}
                  </time>
                  <div className="budget-history-amounts">
                    {entry.cash > 0 && (
                      <strong className="cash-history">
                        Tiền mặt <span>+{money(entry.cash)}</span>
                      </strong>
                    )}
                    {entry.bank > 0 && (
                      <strong className="bank-history">
                        Chuyển khoản <span>+{money(entry.bank)}</span>
                      </strong>
                    )}
                  </div>
                  <div className="budget-history-actions">
                    {pendingDelete === entry.id ? (
                      <>
                        <button
                          type="button"
                          className="button secondary budget-confirm-delete"
                          disabled={busy}
                          aria-label={`Có, xóa khoản thu ${money(entry.cash + entry.bank)}`}
                          title="Có, xóa khoản thu"
                          onClick={async () => {
                            if (busy) return;
                            const budgets = data.budgets.filter((item) => item.id !== entry.id);
                            const budget = budgets
                              .filter((item) => budgetMonth(item) === month)
                              .reduce((sum, item) => sum + item.cash + item.bank, 0);
                            if (await save({ ...data, budget, budgets })) setPendingDelete(null);
                          }}
                        >
                          <Icon icon={faCheck} />
                        </button>
                        <button
                          type="button"
                          className="button secondary budget-cancel-delete monexa-action monexa-close"
                          disabled={busy}
                          autoFocus
                          aria-label="Không, giữ khoản thu"
                          title="Không, giữ khoản thu"
                          onClick={() => setPendingDelete(null)}
                        >
                          <Icon icon={faXmark} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="button secondary budget-delete"
                        disabled={busy || !!entry.transferId}
                        aria-label={`Xóa khoản thu ${money(entry.cash + entry.bank)}`}
                        title={
                          entry.transferId
                            ? 'Chỉnh tại Thu nhập & phân bổ'
                            : 'Xóa khoản ngân sách cũ'
                        }
                        onClick={() => setPendingDelete(entry.id)}
                      >
                        <Icon icon={faTrashCan} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <HistoryEnd endRef={endRef} hasMore={hasMore} />
      </div>
    </div>
  );
}
