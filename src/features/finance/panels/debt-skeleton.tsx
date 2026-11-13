'use client';
import { LoadingSkeleton as Skeleton } from '../components/loading-skeleton';
import { dateKey, initialData } from '../model';
import DebtCalendar from './debt-calendar';
import './debt-calendar-layout.css';

export default function DebtSkeleton({ view }: { view: 'calendar' | 'history' }) {
  const [year, month] = dateKey().split('-').map(Number);
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
      <div className="debt-calendar-layout" aria-hidden="true">
        <div
          className={view === 'calendar' ? 'debt-calendar-slides' : undefined}
          style={view === 'history' ? { display: 'flex', flex: 1, minHeight: 0 } : undefined}
        >
          {view === 'calendar' &&
            [0, 1].map((index) => (
              <div
                key={index}
                className={`debt-daily-pane ${index ? 'debt-payable-pane' : 'debt-receivable-pane'}`}
              >
                <article
                  className="card"
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    padding: 12,
                  }}
                >
                  <Skeleton className="skeleton-heading" />
                  <Skeleton style={{ flex: 1 }} />
                </article>
              </div>
            ))}
          <div
            className={view === 'calendar' ? 'debt-calendar-pane' : undefined}
            style={view === 'history' ? { display: 'flex', flex: 1, minHeight: 0 } : undefined}
          >
            {view === 'calendar' ? (
              <DebtCalendar
                data={initialData}
                month={new Date(year, month - 1, 1)}
                setMonth={() => {}}
                loading
              />
            ) : (
              <article className="card compact-debt-card">
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
              </article>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
