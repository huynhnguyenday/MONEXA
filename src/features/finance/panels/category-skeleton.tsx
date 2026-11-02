import { ChartSkeleton, LoadingSkeleton as Skeleton, MonthPickerSkeleton } from '../components/loading-skeleton';
import './category-panel.css';

export default function CategorySkeleton({ sources = false }: { sources?: boolean }) {
  const label = sources ? 'nguồn công nợ' : 'danh mục';
  return (
    <section className="category-screen finance-skeleton category-skeleton" aria-label={`Đang tải ${label}`} aria-busy="true">
      <span className="sr-only" role="status">Đang tải dữ liệu {label}…</span>
      <article className="card category-list-panel" aria-hidden="true">
        <div className="category-toolbar">
          <h2 className="skeleton-title-shell"><Skeleton /></h2>
          <div className="search-box category-search-box"><Skeleton /></div>
          <Skeleton className="skeleton-action skeleton-add-action" />
        </div>
        <div className="category-grid-viewport">
          <div className="category-grid">
            {Array.from({ length: 5 }, (_, index) => (
              <article className="category-tile" key={index}>
                <Skeleton className="category-symbol" />
                <div className="category-tile-info"><Skeleton /><Skeleton className="skeleton-detail" /></div>
                <div className="table-actions category-tile-actions"><Skeleton className="skeleton-icon" /><Skeleton className="skeleton-icon" /></div>
              </article>
            ))}
          </div>
        </div>
      </article>
      <article className="card category-chart-panel" aria-hidden="true">
        <div className="category-chart-toolbar">
          <h2 className="skeleton-title-shell"><Skeleton /></h2>
          <MonthPickerSkeleton />
        </div>
        <div className="category-chart"><ChartSkeleton /></div>
      </article>
    </section>
  );
}
