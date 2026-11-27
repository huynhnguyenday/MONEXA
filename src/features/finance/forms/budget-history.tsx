'use client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useMemo } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import type { FormProps } from './types';
import { budgetMonth, dateKey, money } from '../model';
import './budget-history.css';
import { useHistoryWindow } from '../hooks/use-history-window';
import HistoryEnd from '../components/history-end';
import LoadingSpinner from '@/components/loading-spinner';
import { useConfirmation } from '../hooks/use-confirmation';

export function BudgetHistory({ data, save, busy, done, month }: FormProps & { month: string }) {
  const { confirm, confirmation } = useConfirmation();
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
  if (!entries.length) return <p className="empty-state">Tháng này chưa ghi thêm ngân sách.</p>;
  return (
    <div className="budget-history-manager">
      {confirmation}
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
                    <button
                      type="button"
                      className="button secondary budget-delete"
                      disabled={busy || !!entry.transferId}
                      aria-label={`Xóa khoản thu ${money(entry.cash + entry.bank)}`}
                      title={
                        entry.transferId ? 'Chỉnh tại Thu nhập & phân bổ' : 'Xóa khoản ngân sách cũ'
                      }
                      onClick={async () => {
                        if (
                          busy ||
                          !(await confirm(`Xóa khoản ngân sách ${money(entry.cash + entry.bank)}?`))
                        )
                          return;
                        const budgets = data.budgets.filter((item) => item.id !== entry.id);
                        const budget = budgets
                          .filter((item) => budgetMonth(item) === month)
                          .reduce((sum, item) => sum + item.cash + item.bank, 0);
                        if (await save({ ...data, budget, budgets })) done();
                      }}
                    >
                      {busy ? <LoadingSpinner /> : <Icon icon={faTrashCan} />}
                    </button>
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
