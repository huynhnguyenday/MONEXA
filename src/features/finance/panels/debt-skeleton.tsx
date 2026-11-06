import { LoadingSkeleton as Skeleton } from '../components/loading-skeleton';
import { dateKey } from '../model';

export default function DebtSkeleton({ view }: { view: 'calendar' | 'history' }) {
  const [year, month] = dateKey().split('-').map(Number);
  const weekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Math.ceil((weekday + days) / 7) * 7;
  return (
    <section
      className="compact-debts finance-skeleton debt-skeleton"
      aria-label="Đang tải công nợ"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Đang tải dữ liệu công nợ…
      </span>
      <div className="compact-stats debt-overview-stats" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <article
            className={`stat debt-stat ${index % 2 ? 'debt-stat-total' : 'debt-stat-month'}`}
            key={index}
          >
            <Skeleton className="skeleton-label" />
            <Skeleton className="skeleton-value" />
            <Skeleton className="skeleton-detail" />
          </article>
        ))}
      </div>
      <article className="card compact-debt-card" aria-hidden="true">
        {view === 'calendar' ? (
          <div className="debt-table-viewport debt-calendar-viewport">
            <div className="skeleton-debt-calendar">
              <div className="skeleton-calendar-heading">
                <Skeleton className="skeleton-action" />
                <Skeleton className="skeleton-heading" />
                <Skeleton className="skeleton-action" />
              </div>
              <div className="skeleton-calendar-weekdays">
                {Array.from({ length: 7 }, (_, index) => (
                  <Skeleton className="skeleton-label" key={index} />
                ))}
              </div>
              <div
                className="skeleton-calendar-days"
                style={{ gridTemplateRows: `repeat(${cells / 7}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: cells }, (_, index) => (
                  <Skeleton className="skeleton-calendar-cell" key={index} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </article>
    </section>
  );
}
