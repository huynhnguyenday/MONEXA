'use client';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import DatePicker from 'react-datepicker';
import {
  faArrowDown,
  faArrowUp,
} from '@fortawesome/free-solid-svg-icons';
import { type Debt, type FinanceData, dateKey, money } from '../model';
import { format, startOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
export default function DebtPanel({
  data,
  ready,
  onAdd,
}: {
  data: FinanceData;
  ready: boolean;
  onAdd: () => void;
}) {
  const [month, setMonth] = useState<Date | null>(null);
  useEffect(() => setMonth(startOfMonth(new Date())), []);
  const outstanding = data.debts.filter((d) => !d.settledAt);
  const overdue = (d: Debt) => !d.settledAt && !!d.dueAt && Date.parse(d.dueAt) < Date.now();
  const byDueDate = new Map<string, Debt[]>();
  for (const debt of data.debts) {
    if (!debt.dueAt || debt.settledAt) continue;
    const key = dateKey(debt.dueAt);
    byDueDate.set(key, [...(byDueDate.get(key) || []), debt]);
  }
  const today = month ? dateKey(new Date()) : '';
  const dayClassName = (date: Date) => dateKey(date) === today ? 'debt-calendar-today' : '';
  return (
    <section className="compact-debts" aria-label="Quản lý công nợ">
      <div className="compact-stats">
        <article className="stat balance">
          <span className="stat-label">Phải thu</span>
          <strong>
            {money(
              outstanding
                .filter((d) => d.direction === 'receivable')
                .reduce((s, d) => s + d.amount, 0),
            )}
          </strong>
          <small>Chưa hoàn tất · tất cả thời gian</small>
        </article>
        <article className="stat">
          <span className="stat-label">Phải trả</span>
          <strong>
            {money(
              outstanding
                .filter((d) => d.direction === 'payable')
                .reduce((s, d) => s + d.amount, 0),
            )}
          </strong>
          <small>Chưa hoàn tất · tất cả thời gian</small>
        </article>
        <article className="stat">
          <span className="stat-label">Quá hạn</span>
          <strong>{outstanding.filter(overdue).length}</strong>
          <small>Khoản cần kiểm tra</small>
        </article>
      </div>
      <article className="card compact-debt-card">
        <div className="debt-table-viewport debt-calendar-viewport">
          {month && <DatePicker inline locale={vi} selected={month} onChange={(date: Date | null) => date && setMonth(startOfMonth(date))}
            openToDate={month} calendarClassName="debt-calendar" dayClassName={(date: Date) => dayClassName(date)}
            renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
              <div className="debt-calendar-header"><button type="button" aria-label="Tháng trước" onClick={decreaseMonth}>‹</button><strong>{format(date, 'MMMM yyyy', { locale: vi })}</strong><button type="button" aria-label="Tháng sau" onClick={increaseMonth}>›</button></div>
            )}
            renderDayContents={(day: number, date: Date | null) => {
              if (!date) return day;
              const items = byDueDate.get(dateKey(date)) || [];
              return <span className="debt-calendar-day"><span>{day}</span>{items.slice(0, 2).map((d) => <small key={d.id} className={d.direction}><Icon icon={d.direction === 'payable' ? faArrowDown : faArrowUp} />{money(d.amount)}</small>)}{items.length > 2 && <small>+{items.length - 2} khoản</small>}</span>;
            }} />}
          <div className="debt-calendar-legend"><span><Icon icon={faArrowUp} /> Người khác nợ tôi</span><span><Icon icon={faArrowDown} /> Tôi nợ người khác</span></div>
        </div>
      </article>
    </section>
  );
}
