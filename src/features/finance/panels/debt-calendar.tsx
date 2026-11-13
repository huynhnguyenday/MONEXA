'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faChevronLeft,
  faChevronRight,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import DatePicker from 'react-datepicker';
import { format, startOfMonth, getDaysInMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { type Debt, type FinanceData, dateKey, debtDirection, money } from '../model';
import DebtCalendarAmount from './debt-calendar-amount';
import { LoadingSkeleton } from '../components/loading-skeleton';
export default function DebtCalendar({
  data,
  month,
  setMonth,
  loading = false,
}: {
  data: FinanceData;
  month: Date | null;
  setMonth: (month: Date) => void;
  loading?: boolean;
}) {
  const weeks = month
    ? Math.ceil((((startOfMonth(month).getDay() + 6) % 7) + getDaysInMonth(month)) / 7)
    : 6;
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
  const [tooltipDate, setTooltipDate] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
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
  const direction = (debt: Debt) => debtDirection(data, debt);
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
    <article
      className="debt-calendar-shell"
      aria-busy={loading}
      style={{ '--debt-calendar-weeks': weeks } as CSSProperties}
    >
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
              if (!date || loading) return;
              setSelectedCalendarDay(date);
              setTooltipDate(dateKey(date));
            }}
            openToDate={month}
            calendarClassName="debt-calendar"
            dayClassName={(date: Date) => dayClassName(date)}
            renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
              <div className="debt-calendar-header">
                <button
                  type="button"
                  disabled={loading}
                  aria-label="Tháng trước"
                  onClick={decreaseMonth}
                >
                  <Icon icon={faChevronLeft} />
                </button>
                <strong>
                  {loading ? (
                    <LoadingSkeleton className="skeleton-heading" />
                  ) : (
                    format(date, 'MMMM yyyy', { locale: vi })
                  )}
                </strong>
                <button
                  type="button"
                  disabled={loading}
                  aria-label="Tháng sau"
                  onClick={increaseMonth}
                >
                  <Icon icon={faChevronRight} />
                </button>
              </div>
            )}
            renderDayContents={(day: number, date: Date | null) => {
              if (loading) return <LoadingSkeleton className="debt-calendar-loading-day" />;
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
                      {totals.receivable > 0 && <Icon className="receivable" icon={faArrowUp} />}
                      {totals.payable > 0 && <Icon className="payable" icon={faArrowDown} />}
                    </span>
                  </span>
                  <span className="debt-calendar-payments">
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
                  const source = data.debtSources.find((item) => item.id === debt.debtSourceId);
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
                <p className="debt-day-tooltip-empty">Không có công nợ đến hạn trong ngày này.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
