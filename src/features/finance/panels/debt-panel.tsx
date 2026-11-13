'use client';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import DebtHistory from './debt-history';
import {
  faPlus,
  faArrowTrendUp,
  faArrowTrendDown,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { type Debt, type FinanceData, dateKey, debtDirection, money } from '../model';
import { format, startOfMonth } from 'date-fns';
import './debt-panel.css';
import DebtCalendarLayout from './debt-calendar-layout';
export default function DebtPanel({
  data,
  ready,
  onAdd,
  view,
  onEdit,
  onDelete,
  onSettle,
}: {
  data: FinanceData;
  ready: boolean;
  onAdd: () => void;
  view: 'calendar' | 'history';
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onSettle: (debt: Debt) => void;
}) {
  const [month, setMonth] = useState<Date | null>(null);
  useEffect(() => setMonth(startOfMonth(new Date())), []);
  const outstanding = data.debts.filter((d) => !d.settledAt);
  const direction = (debt: Debt) => debtDirection(data, debt);
  const overdue = (d: Debt) => !d.settledAt && !!d.dueDate && d.dueDate < dateKey();
  const viewedMonthKey = format(month ?? new Date(), 'yyyy-MM');
  const monthOutstanding = outstanding.filter(
    (debt) => debt.dueDate && debt.dueDate.slice(0, 7) === viewedMonthKey,
  );
  const monthReceivable = monthOutstanding
    .filter((debt) => direction(debt) === 'receivable')
    .reduce((sum, debt) => sum + debt.amount, 0);
  const monthPayable = monthOutstanding
    .filter((debt) => direction(debt) === 'payable')
    .reduce((sum, debt) => sum + debt.amount, 0);
  const totalReceivable = outstanding
    .filter((debt) => direction(debt) === 'receivable')
    .reduce((sum, debt) => sum + debt.amount, 0);
  const totalPayable = outstanding
    .filter((debt) => direction(debt) === 'payable')
    .reduce((sum, debt) => sum + debt.amount, 0);
  const monthOverdueCount = monthOutstanding.filter(overdue).length;
  const totalOverdueCount = outstanding.filter(overdue).length;
  return (
    <section className="compact-debts" aria-label="Quản lý công nợ">
      <div className="compact-stats debt-overview-stats">
        <article className="stat debt-stat debt-stat-receivable debt-stat-month">
          <span className="stat-label">
            <Icon icon={faArrowTrendUp} fixedWidth aria-hidden="true" />
            Phải thu
          </span>
          <strong>{money(monthReceivable)}</strong>
          <small>Tháng {format(month ?? new Date(), 'MM/yyyy')}</small>
        </article>
        <article className="stat debt-stat debt-stat-receivable debt-stat-total">
          <span className="stat-label">
            <Icon icon={faArrowTrendUp} fixedWidth aria-hidden="true" />
            Phải thu
          </span>
          <strong>{money(totalReceivable)}</strong>
          <small>Tất cả thời gian</small>
        </article>
        <article className="stat debt-stat debt-stat-payable debt-stat-month">
          <span className="stat-label">
            <Icon icon={faArrowTrendDown} fixedWidth aria-hidden="true" />
            Phải trả
          </span>
          <strong>{money(monthPayable)}</strong>
          <small>Tháng {format(month ?? new Date(), 'MM/yyyy')}</small>
        </article>
        <article className="stat debt-stat debt-stat-payable debt-stat-total">
          <span className="stat-label">
            <Icon icon={faArrowTrendDown} fixedWidth aria-hidden="true" />
            Phải trả
          </span>
          <strong>{money(totalPayable)}</strong>
          <small>Tất cả thời gian</small>
        </article>
        <article className="stat debt-stat debt-stat-overdue debt-stat-month">
          <span className="stat-label">
            <Icon icon={faTriangleExclamation} aria-hidden="true" />
            Quá hạn
          </span>
          <strong>{monthOverdueCount}</strong>
          <small>Tháng đang xem</small>
        </article>
        <article className="stat debt-stat debt-stat-overdue debt-stat-total">
          <span className="stat-label">
            <Icon icon={faTriangleExclamation} aria-hidden="true" />
            Quá hạn
          </span>
          <strong>{totalOverdueCount}</strong>
          <small>Tất cả thời gian</small>
        </article>
        <button
          type="button"
          className="stat debt-create-stat button primary monexa-action monexa-create"
          disabled={!ready}
          onClick={onAdd}
        >
          <Icon icon={faPlus} />
          <span>Ghi công nợ</span>
        </button>
      </div>
      {view === 'calendar' ? (
        <DebtCalendarLayout data={data} month={month} setMonth={setMonth} />
      ) : (
        <article className="card compact-debt-card">
          <DebtHistory
            data={data}
            ready={ready}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            onSettle={onSettle}
          />
        </article>
      )}
    </section>
  );
}
