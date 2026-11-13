'use client';
import { useDebtCarousel } from '../hooks/use-debt-carousel';
import { format } from 'date-fns';
import type { FinanceData } from '../model';
import DebtCalendar from './debt-calendar';
import DebtDailyChart from '../charts/debt-daily-chart';
import './category-panel.css';
import './debt-calendar-layout.css';

export default function DebtCalendarLayout({
  data,
  month,
  setMonth,
}: {
  data: FinanceData;
  month: Date | null;
  setMonth: (month: Date) => void;
}) {
  const carousel = useDebtCarousel();
  return (
    <div className="debt-calendar-layout">
      <div
        ref={carousel.ref}
        className="debt-calendar-slides"
        data-active-panel={carousel.active}
        onTouchStart={carousel.onTouchStart}
        onTouchMove={carousel.onTouchMove}
        onClickCapture={carousel.onClickCapture}
        onKeyDown={carousel.onKeyDown}
        onTouchEnd={carousel.onTouchEnd}
        onTouchCancel={carousel.onTouchCancel}
        role="region"
        aria-label="Lịch và biểu đồ công nợ. Vuốt ngang để chuyển nội dung."
        tabIndex={0}
      >
        <div className="debt-calendar-pane" style={carousel.paneStyle(0)}>
          <DebtCalendar data={data} month={month} setMonth={setMonth} />
        </div>
        <div className="debt-daily-pane debt-receivable-pane" style={carousel.paneStyle(1)}>
          <DebtDailyChart
            data={data}
            month={month ? format(month, 'yyyy-MM') : ''}
            direction="receivable"
          />
        </div>
        <div className="debt-daily-pane debt-payable-pane" style={carousel.paneStyle(2)}>
          <DebtDailyChart
            data={data}
            month={month ? format(month, 'yyyy-MM') : ''}
            direction="payable"
          />
        </div>
      </div>
    </div>
  );
}
