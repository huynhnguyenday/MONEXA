import {
  ChartSkeleton,
  LoadingSkeleton as Skeleton,
  MonthPickerSkeleton,
} from '../components/loading-skeleton';
import './category-panel.css';

export default function CategorySkeleton({ sources = false }: { sources?: boolean }) {
  const label = sources ? 'nguồn công nợ' : 'danh mục';
  return (
    <section
      className="category-screen category-view-charts finance-skeleton category-skeleton"
      aria-label={`Đang tải ${label}`}
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Đang tải dữ liệu {label}…
      </span>
      <div className="category-mobile-tabs" aria-hidden="true">
        <Skeleton />
        <Skeleton />
      </div>
      <div className="category-charts" aria-hidden="true">
        {['month', 'year'].map((period) => (
          <article className="card category-chart-panel" key={period}>
            <div className="category-chart-toolbar">
              <h2 className="skeleton-title-shell">
                <Skeleton />
              </h2>
              <MonthPickerSkeleton />
            </div>
            <div className="category-chart">
              <ChartSkeleton />
            </div>
          </article>
        ))}
      </div>
      <div className="category-management">
        <article
          className={`card category-list-panel${sources ? ' debt-source-list-panel' : ''}`}
          aria-hidden="true"
        >
          <div className="category-toolbar">
            <h2 className="skeleton-title-shell">
              <Skeleton />
            </h2>
            <div className="search-box category-search-box">
              <Skeleton />
            </div>
            <Skeleton className="skeleton-action skeleton-add-action" />
          </div>
          <div className="category-grid-viewport">
            <div className="category-grid">
              {Array.from({ length: 2 }, (_, index) => (
                <article className="category-tile" key={index}>
                  <Skeleton className="category-symbol" />
                  <div className="category-tile-info">
                    <Skeleton />
                    <Skeleton className="skeleton-detail" />
                  </div>
                  <div className="table-actions category-tile-actions">
                    <Skeleton className="skeleton-icon" />
                    <Skeleton className="skeleton-icon" />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
