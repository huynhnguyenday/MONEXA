'use client';
import { LoadingSkeleton as Skeleton } from '../components/loading-skeleton';
import { dateKey, initialData } from '../model';
import DebtCalendarLayout from './debt-calendar-layout';
import './debt-calendar-layout.css';

export default function DebtSkeleton({ view }: { view: 'calendar' | 'history' }) {
  const [year, month] = dateKey().split('-').map(Number);
  const overview = (
    <div className="compact-stats debt-overview-stats" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <article
          className={`stat ${index === 6 ? 'debt-stat debt-create-stat debt-create-skeleton' : 'debt-stat'} ${index % 2 ? 'debt-stat-total' : 'debt-stat-month'}`}
          key={index}
        >
          {index === 6 ? (
            <>
              <Skeleton className="skeleton-icon" />
              <Skeleton className="skeleton-label" />
            </>
          ) : (
            <>
              <span className="stat-label">
                <span className="debt-skeleton-stat-icon" />
                <Skeleton className="skeleton-label" />
              </span>
              <strong className="debt-skeleton-stat-line">
                <span className="debt-skeleton-stat-text">0 đ</span>
                <Skeleton className="skeleton-value" />
              </strong>
              <small className="debt-skeleton-stat-line">
                <span className="debt-skeleton-stat-text">Tháng 11/2026</span>
                <Skeleton className="skeleton-detail" />
              </small>
            </>
          )}
        </article>
      ))}
    </div>
  );
  if (view === 'calendar')
    return (
      <section
        className="debt-workspace finance-skeleton debt-skeleton"
        aria-label="Đang tải công nợ"
        aria-busy="true"
      >
        <DebtCalendarLayout
          data={initialData}
          month={new Date(year, month - 1, 1)}
          setMonth={() => {}}
          overview={overview}
          loading
        />
      </section>
    );
  return (
    <section
      className="compact-debts finance-skeleton debt-skeleton"
      aria-label="Đang tải lịch sử công nợ"
      aria-busy="true"
    >
      {overview}
      <article className="card compact-debt-card" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <div className="skeleton-debt-history">
          {Array.from({ length: 4 }, (_, row) => (
            <div className="skeleton-history-row" key={row}>
              {Array.from({ length: 6 }, (_, column) => (
                <Skeleton key={column} />
              ))}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
