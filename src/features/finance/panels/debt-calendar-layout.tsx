'use client';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { useWorkspaceCarousel } from '../hooks/use-workspace-carousel';
import type { FinanceData } from '../model';
import { ChartSkeleton, LoadingSkeleton } from '../components/loading-skeleton';
import DebtCalendar from './debt-calendar';
import DebtDailyChart from '../charts/debt-daily-chart';
import './category-panel.css';
import './debt-calendar-layout.css';

export default function DebtCalendarLayout({
  data,
  month,
  setMonth,
  overview,
  loading = false,
}: {
  data: FinanceData;
  month: Date | null;
  setMonth: (month: Date) => void;
  overview: ReactNode;
  loading?: boolean;
}) {
  const carousel = useWorkspaceCarousel();
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
        aria-label="Công nợ và biểu đồ. Vuốt ngang để chuyển màn hình."
        tabIndex={0}
      >
        <div
          className="compact-debts debt-overview-screen"
          style={carousel.paneStyle(0)}
          inert={carousel.active !== 0 && carousel.mobile}
        >
          {overview}
          <div className="debt-calendar-pane">
            <DebtCalendar data={data} month={month} setMonth={setMonth} loading={loading} />
          </div>
        </div>
        <div
          className="debt-charts-screen"
          style={carousel.paneStyle(1)}
          inert={carousel.active !== 1 && carousel.mobile}
        >
          {(['receivable', 'payable'] as const).map((direction) => (
            <div className={`debt-daily-pane debt-${direction}-pane`} key={direction}>
              {loading ? (
                <article className="card category-chart-panel">
                  <LoadingSkeleton className="skeleton-heading" />
                  <ChartSkeleton />
                </article>
              ) : (
                <DebtDailyChart
                  data={data}
                  month={month ? format(month, 'yyyy-MM') : ''}
                  direction={direction}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
