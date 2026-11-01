'use client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { FinanceData } from '../model';
import { budgetMonth, dateKey, money } from '../model';

export function BudgetHistory({ data, month }: { data: FinanceData; month: string }) {
  const entries = data.budgets
    .filter((entry) => budgetMonth(entry) === month)
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const grouped = new Map<string, typeof entries>();
  entries.forEach((entry) => {
    const day = dateKey(entry.recordedAt);
    grouped.set(day, [...(grouped.get(day) || []), entry]);
  });
  if (!entries.length) return <p className="dialog-description">Tháng này chưa ghi thêm ngân sách.</p>;
  return <div className="budget-history-list">
    {[...grouped.entries()].map(([day, dayEntries]) => (
      <section className="budget-history-day" key={day}>
        <h3>{format(new Date(`${day}T12:00:00`), 'd MMMM yyyy', { locale: vi })}</h3>
        <ol>
          {dayEntries.map((entry) => (
            <li key={entry.id}>
              <time dateTime={entry.recordedAt}>{format(new Date(entry.recordedAt), 'HH:mm', { locale: vi })}</time>
              {entry.cash > 0 && <strong className="cash-history">Tiền mặt <span>+{money(entry.cash)}</span></strong>}
              {entry.bank > 0 && <strong className="bank-history">Chuyển khoản <span>+{money(entry.bank)}</span></strong>}
            </li>
          ))}
        </ol>
      </section>
    ))}
  </div>;
}
