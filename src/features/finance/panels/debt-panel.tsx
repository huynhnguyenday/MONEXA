'use client';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import DatePicker from 'react-datepicker';
import {
  faArrowDown,
  faArrowUp,
  faCheck,
  faPen,
  faRotateLeft,
  faTriangleExclamation,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import { type Debt, type FinanceData, dateKey, debtDirection, money } from '../model';
import { format, startOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
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
  const [visibleCount, setVisibleCount] = useState(20);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  useEffect(() => setMonth(startOfMonth(new Date())), []);
  useEffect(() => {
    setVisibleCount(20);
    historyRef.current?.scrollTo({ top: 0 });
  }, [view]);
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
  const monthOutstanding = outstanding.filter((debt) => debt.dueDate && debt.dueDate.slice(0, 7) === viewedMonthKey);
  const monthReceivable = monthOutstanding.filter((debt) => direction(debt) === 'receivable').reduce((sum, debt) => sum + debt.amount, 0);
  const monthPayable = monthOutstanding.filter((debt) => direction(debt) === 'payable').reduce((sum, debt) => sum + debt.amount, 0);
  const totalReceivable = outstanding.filter((debt) => direction(debt) === 'receivable').reduce((sum, debt) => sum + debt.amount, 0);
  const totalPayable = outstanding.filter((debt) => direction(debt) === 'payable').reduce((sum, debt) => sum + debt.amount, 0);
  const monthOverdueCount = monthOutstanding.filter(overdue).length;
  const totalOverdueCount = outstanding.filter(overdue).length;
  const history = [...data.debts].sort((a, b) => {
    const dueOrder = (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
    return dueOrder || b.occurredAt.localeCompare(a.occurredAt);
  });
  const visibleItems = history.slice(0, visibleCount);
  const dateLabel = (value: string) => {
    const [year, monthValue, day] = value.split('-');
    return `${day}/${monthValue}/${year}`;
  };
  const dueLabel = (debt: Debt) => {
    if (!debt.dueDate) return 'Chưa có hạn thanh toán';
    const date = dateLabel(debt.dueDate);
    if (debt.settledAt) return `Hạn ${date}`;
    // Compare calendar dates in Vietnam, independently of the device timezone.
    const days = Math.round((Date.parse(`${debt.dueDate}T00:00:00Z`) - Date.parse(`${dateKey()}T00:00:00Z`)) / 86_400_000);
    const urgency = days <= 10 ? 'urgent' : days <= 30 ? 'soon' : 'safe';
    return <>
      {days > 0 ? <>Còn <strong className={`debt-days-${urgency}`}>{days}</strong> ngày là tới hạn</>
        : days === 0 ? <strong className="debt-days-urgent">Đến hạn hôm nay</strong>
          : <>Quá hạn <strong className="debt-days-urgent">{-days}</strong> ngày</>}
      {` - ${date}`}
    </>;
  };
  const byDueDate = new Map<string, Debt[]>();
  for (const debt of data.debts) {
    if (!debt.dueDate || debt.settledAt) continue;
    const key = debt.dueDate;
    byDueDate.set(key, [...(byDueDate.get(key) || []), debt]);
  }
  const dayClassName = (date: Date) => [
    selectedCalendarDay && dateKey(date) === dateKey(selectedCalendarDay) ? 'debt-calendar-selected' : '',
  ].filter(Boolean).join(' ');
  return (
    <section className="compact-debts" aria-label="Quản lý công nợ">
      <div className="compact-stats debt-overview-stats">
        <article className="stat debt-stat debt-stat-receivable debt-stat-month"><span className="stat-label"><Icon icon={faArrowUp} aria-hidden="true" />Phải thu</span><strong>{money(monthReceivable)}</strong><small>Tháng {format(month ?? new Date(), 'MM/yyyy')}</small></article>
        <article className="stat debt-stat debt-stat-receivable debt-stat-total"><span className="stat-label"><Icon icon={faArrowUp} aria-hidden="true" />Phải thu</span><strong>{money(totalReceivable)}</strong><small>Tất cả thời gian</small></article>
        <article className="stat debt-stat debt-stat-payable debt-stat-month"><span className="stat-label"><Icon icon={faArrowDown} aria-hidden="true" />Phải trả</span><strong>{money(monthPayable)}</strong><small>Tháng {format(month ?? new Date(), 'MM/yyyy')}</small></article>
        <article className="stat debt-stat debt-stat-payable debt-stat-total"><span className="stat-label"><Icon icon={faArrowDown} aria-hidden="true" />Phải trả</span><strong>{money(totalPayable)}</strong><small>Tất cả thời gian</small></article>
        <article className="stat debt-stat debt-stat-overdue debt-stat-month"><span className="stat-label"><Icon icon={faTriangleExclamation} aria-hidden="true" />Quá hạn</span><strong>{monthOverdueCount}</strong><small>Tháng đang xem</small></article>
        <article className="stat debt-stat debt-stat-overdue debt-stat-total"><span className="stat-label"><Icon icon={faTriangleExclamation} aria-hidden="true" />Quá hạn</span><strong>{totalOverdueCount}</strong><small>Tất cả thời gian</small></article>
      </div>
      <article className="card compact-debt-card">
        {view === 'calendar' ? (
          <>
            <div className="debt-table-viewport debt-calendar-viewport">
              {month && <DatePicker inline locale={vi} selected={selectedCalendarDay} onChange={(date: Date | null) => date && setMonth(startOfMonth(date))}
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
                openToDate={month} calendarClassName="debt-calendar" dayClassName={(date: Date) => dayClassName(date)}
                renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                  <div className="debt-calendar-header"><button type="button" aria-label="Tháng trước" onClick={decreaseMonth}>‹</button><strong>{format(date, 'MMMM yyyy', { locale: vi })}</strong><button type="button" aria-label="Tháng sau" onClick={increaseMonth}>›</button></div>
                )}
                renderDayContents={(day: number, date: Date | null) => {
                  if (!date) return day;
                  const items = byDueDate.get(dateKey(date)) || [];
                  const totals = items.reduce((sum, debt) => {
                    sum[direction(debt)] += debt.amount;
                    return sum;
                  }, { payable: 0, receivable: 0 });
                  return <span className="debt-calendar-day"><span>{day}</span>
                    {totals.receivable > 0 && <small className="receivable"><Icon icon={faArrowUp} />{money(totals.receivable)}</small>}
                    {totals.payable > 0 && <small className="payable"><Icon icon={faArrowDown} />{money(totals.payable)}</small>}
                  </span>;
                }} />}
              {tooltipDate && <div className="debt-day-tooltip" ref={tooltipRef} role="dialog" aria-label={`Công nợ đến hạn ngày ${dateLabel(tooltipDate)}`}>
                <div className="debt-day-tooltip-header">
                  <strong>{dateLabel(tooltipDate)}</strong>
                  <button type="button" aria-label="Đóng thông tin ngày" onClick={() => setTooltipDate(null)}>×</button>
                </div>
                <div className="debt-day-tooltip-list">
                  {(byDueDate.get(tooltipDate) || []).length ? (byDueDate.get(tooltipDate) || []).map((debt) => {
                    const source = data.debtSources.find((item) => item.id === debt.debtSourceId);
                    return <article className="debt-day-tooltip-entry" key={debt.id}>
                      <div className="debt-day-tooltip-row"><strong title={debt.title}>{debt.title}</strong><b>{money(debt.amount)}</b></div>
                      <div className="debt-day-tooltip-row"><span>{data.debtTypes.find((type) => type.id === debt.debtTypeId)?.name || 'Loại công nợ'}</span><span>{source?.name || 'Không rõ nguồn công nợ'}</span></div>
                    </article>;
                  }) : <p className="debt-day-tooltip-empty">Không có công nợ đến hạn trong ngày này.</p>}
                </div>
              </div>}
            </div>
          </>
        ) : (
          <>
            <div className="debt-history-heading">Tất cả công nợ <span>{history.length}</span></div>
            <div className="debt-table-viewport debt-history-viewport" ref={historyRef}
              role="region" aria-label="Lịch sử công nợ" tabIndex={0}
              onScroll={(event) => {
                const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
                if (scrollHeight - scrollTop - clientHeight < 160 && visibleCount < history.length) {
                  setVisibleCount((count) => Math.min(count + 20, history.length));
                }
              }}>
              {!history.length ? (
                <div className="compact-empty"><p>Chưa có lịch sử công nợ.</p><button className="inline-button" disabled={!ready} onClick={onAdd}>+ Ghi công nợ</button></div>
              ) : (
                <table className="compact-debt-table">
                  <caption className="sr-only">Lịch sử công nợ</caption>
                  <colgroup><col /><col className="debt-source-column" /><col className="debt-money-column" /><col className="debt-date-column" /><col className="debt-status-column" /><col className="debt-actions-column" /></colgroup>
                  <thead><tr><th scope="col">Khoản nợ</th><th scope="col">Nguồn công nợ</th><th scope="col">Số tiền</th><th scope="col">Hạn thanh toán</th><th scope="col">Trạng thái</th><th scope="col"><span className="sr-only">Thao tác</span></th></tr></thead>
                  <tbody>
                    {visibleItems.map((debt) => {
                      const source = data.debtSources.find((item) => item.id === debt.debtSourceId);
                      const status = debt.settledAt ? 'Đã thanh toán' : overdue(debt) ? 'Quá hạn' : 'Đang nợ';
                      const titleChars = Array.from(debt.title);
                      const title = titleChars.length > 40 ? `${titleChars.slice(0, 40).join('')}...` : debt.title;
                      return (
                        <tr key={debt.id}>
                          <td><h3 title={debt.title}>{title}</h3>
                            <span className="mobile-debt-status">{data.debtTypes.find((type) => type.id === debt.debtTypeId)?.name || 'Loại công nợ'} · {status}</span>
                          </td>
                          <td><span className="debt-source" title={source?.name}>{source?.name || 'Không rõ nguồn công nợ'}</span></td>
                          <td><strong className={direction(debt)}>{money(debt.amount)}</strong><small>{direction(debt) === 'receivable' ? 'Phải thu' : 'Phải trả'}</small></td>
                          <td><time dateTime={debt.dueDate ?? undefined} className={overdue(debt) ? 'overdue-text' : 'debt-due'}>{dueLabel(debt)}</time></td>
                          <td><span className={`status-badge ${overdue(debt) ? 'overdue' : debt.settledAt ? 'settled' : ''}`}>{status}</span></td>
                          <td><div className="table-actions">
                            <button aria-label={`Sửa ${debt.title}`} title="Sửa công nợ" disabled={!ready} onClick={() => onEdit(debt)}><Icon icon={faPen} /></button>
                            <button className="settle-action" aria-label={debt.settledAt ? `Mở lại ${debt.title}` : `Đánh dấu đã thanh toán ${debt.title}`} title={debt.settledAt ? 'Mở lại' : 'Đánh dấu đã thanh toán'} disabled={!ready} onClick={() => onSettle(debt)}><Icon icon={debt.settledAt ? faRotateLeft : faCheck} /></button>
                            <button aria-label={`Xóa ${debt.title}`} title="Xóa công nợ" disabled={!ready} onClick={() => onDelete(debt)}><Icon icon={faTrashCan} /></button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </article>
    </section>
  );
}
