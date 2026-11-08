'use client';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import DebtHistory from './debt-history';
import DatePicker from 'react-datepicker';
import {
  faPlus,
  faArrowDown,
  faArrowUp,
  faTriangleExclamation,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { type Debt, type FinanceData, dateKey, debtDirection, money } from '../model';
import { format, startOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import './debt-panel.css';
import DebtCalendarAmount from './debt-calendar-amount';
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
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
  const [tooltipDate, setTooltipDate] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMonth(startOfMonth(new Date())), []);
  useEffect(() => {
    if (!tooltipDate) return;
    const closeOutside = (event: PointerEvent) => {
      if (!tooltipRef.current?.contains(event.target as Node)) setTooltipDate(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTooltipDate(null);
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [tooltipDate]);
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
  const dateLabel = (value: string) => {
    const [year, monthValue, day] = value.split('-');
    return `${day}/${monthValue}/${year}`;
  };
  const byDueDate = new Map<string, Debt[]>();
  for (const debt of data.debts) {
    if (!debt.dueDate || debt.settledAt) continue;
    const key = debt.dueDate;
    byDueDate.set(key, [...(byDueDate.get(key) || []), debt]);
  }
  const dayClassName = (date: Date) =>
    [
      selectedCalendarDay && dateKey(date) === dateKey(selectedCalendarDay)
        ? 'debt-calendar-selected'
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  return (
    <section className="compact-debts" aria-label="Quản lý công nợ">
      <div className="compact-stats debt-overview-stats">
        <article className="stat debt-stat debt-stat-receivable debt-stat-month">
          <span className="stat-label">
            <Icon icon={faArrowUp} aria-hidden="true" />
            Phải thu
          </span>
          <strong>{money(monthReceivable)}</strong>
          <small>Tháng {format(month ?? new Date(), 'MM/yyyy')}</small>
        </article>
        <article className="stat debt-stat debt-stat-receivable debt-stat-total">
          <span className="stat-label">
            <Icon icon={faArrowUp} aria-hidden="true" />
            Phải thu
          </span>
          <strong>{money(totalReceivable)}</strong>
          <small>Tất cả thời gian</small>
        </article>
        <article className="stat debt-stat debt-stat-payable debt-stat-month">
          <span className="stat-label">
            <Icon icon={faArrowDown} aria-hidden="true" />
            Phải trả
          </span>
          <strong>{money(monthPayable)}</strong>
          <small>Tháng {format(month ?? new Date(), 'MM/yyyy')}</small>
        </article>
        <article className="stat debt-stat debt-stat-payable debt-stat-total">
          <span className="stat-label">
            <Icon icon={faArrowDown} aria-hidden="true" />
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
      <article className="card compact-debt-card">
        {view === 'calendar' ? (
          <>
            <div className="debt-table-viewport debt-calendar-viewport">
              {month && (
                <DatePicker
                  inline
                  locale={vi}
                  selected={selectedCalendarDay}
                  onChange={(date: Date | null) => date && setMonth(startOfMonth(date))}
                  onMonthChange={(date: Date) => {
                    setMonth(startOfMonth(date));
                    setSelectedCalendarDay(null);
                    setTooltipDate(null);
                  }}
                  onSelect={(date: Date | null) => {
                    if (!date) return;
                    setSelectedCalendarDay(date);
                    setTooltipDate(dateKey(date));
                  }}
                  openToDate={month}
                  calendarClassName="debt-calendar"
                  dayClassName={(date: Date) => dayClassName(date)}
                  renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                    <div className="debt-calendar-header">
                      <button type="button" aria-label="Tháng trước" onClick={decreaseMonth}>
                        <Icon icon={faChevronLeft} />
                      </button>
                      <strong>{format(date, 'MMMM yyyy', { locale: vi })}</strong>
                      <button type="button" aria-label="Tháng sau" onClick={increaseMonth}>
                        <Icon icon={faChevronRight} />
                      </button>
                    </div>
                  )}
                  renderDayContents={(day: number, date: Date | null) => {
                    if (!date) return day;
                    const items = byDueDate.get(dateKey(date)) || [];
                    const totals = items.reduce(
                      (sum, debt) => {
                        sum[direction(debt)] += debt.amount;
                        return sum;
                      },
                      { payable: 0, receivable: 0 },
                    );
                    return (
                      <span className="debt-calendar-day">
                        <span className="debt-calendar-day-header">
                          <span>{day}</span>
                          <span className="debt-calendar-directions">
                            {totals.receivable > 0 && (
                              <Icon className="receivable" icon={faArrowUp} />
                            )}
                            {totals.payable > 0 && <Icon className="payable" icon={faArrowDown} />}
                          </span>
                        </span>
                        {totals.receivable > 0 && (
                          <small className="receivable">
                            <Icon icon={faArrowUp} />
                            <DebtCalendarAmount amount={totals.receivable} />
                          </small>
                        )}
                        {totals.payable > 0 && (
                          <small className="payable">
                            <Icon icon={faArrowDown} />
                            <DebtCalendarAmount amount={totals.payable} />
                          </small>
                        )}
                      </span>
                    );
                  }}
                />
              )}
              {tooltipDate && (
                <div
                  className="debt-day-tooltip"
                  ref={tooltipRef}
                  role="dialog"
                  aria-label={`Công nợ đến hạn ngày ${dateLabel(tooltipDate)}`}
                >
                  <div className="debt-day-tooltip-header">
                    <strong>{dateLabel(tooltipDate)}</strong>
                    <button
                      type="button"
                      aria-label="Đóng thông tin ngày"
                      className="monexa-action monexa-close"
                      onClick={() => setTooltipDate(null)}
                    >
                      <Icon icon={faXmark} />
                    </button>
                  </div>
                  <div className="debt-day-tooltip-list">
                    {(byDueDate.get(tooltipDate) || []).length ? (
                      (byDueDate.get(tooltipDate) || []).map((debt) => {
                        const source = data.debtSources.find(
                          (item) => item.id === debt.debtSourceId,
                        );
                        return (
                          <article className="debt-day-tooltip-entry" key={debt.id}>
                            <div className="debt-day-tooltip-row">
                              <strong title={debt.title}>{debt.title}</strong>
                              <b>{money(debt.amount)}</b>
                            </div>
                            <div className="debt-day-tooltip-row">
                              <span>
                                {data.debtTypes.find((type) => type.id === debt.debtTypeId)?.name ||
                                  'Loại công nợ'}
                              </span>
                              <span>{source?.name || 'Không rõ nguồn công nợ'}</span>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p className="debt-day-tooltip-empty">
                        Không có công nợ đến hạn trong ngày này.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <DebtHistory
            data={data}
            ready={ready}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            onSettle={onSettle}
          />
        )}
      </article>
    </section>
  );
}
