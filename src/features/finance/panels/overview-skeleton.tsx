'use client';

import { ChartSkeleton, LoadingSkeleton as Skeleton } from '../components/loading-skeleton';
import WorkspaceTabs from '../layout/workspace-tabs';
import { useWorkspaceCarousel } from '../hooks/use-workspace-carousel';
import '../layout/workspace-carousel.css';
import './overview-panel.css';

export default function OverviewSkeleton() {
  const carousel = useWorkspaceCarousel();
  const mobileView = carousel.active === 0 ? 'charts' : 'expenses';
  return (
    <section
      className={`overview-panel workspace-swipe finance-skeleton overview-skeleton mobile-view-${mobileView}`}
      aria-label="Đang tải tổng quan tài chính"
      aria-busy="true"
    >
      <span className="sr-only" role="status">
        Đang tải dữ liệu tổng quan…
      </span>
      <WorkspaceTabs kind="overview" active={carousel.active} onSelect={carousel.select} loading />
      <div
        className="overview-grid workspace-carousel"
        ref={carousel.ref}
        data-active-panel={carousel.active}
        onTouchStart={carousel.onTouchStart}
        onTouchMove={carousel.onTouchMove}
        onTouchEnd={carousel.onTouchEnd}
        onTouchCancel={carousel.onTouchCancel}
        onClickCapture={carousel.onClickCapture}
        onKeyDown={carousel.onKeyDown}
        role="region"
        aria-label="Tổng quan và chi tiêu. Vuốt ngang để chuyển màn hình."
        tabIndex={0}
        aria-hidden="true"
      >
        <section
          className="overview-main workspace-carousel-screen"
          style={carousel.paneStyle(0)}
          inert={carousel.mobile && carousel.active !== 0}
        >
          <div className="compact-stats">
            {Array.from({ length: 6 }, (_, index) => (
              <article className="stat overview-stat overview-stat-remaining" key={index}>
                <Skeleton className="skeleton-label" />
                <Skeleton className="skeleton-value" />
                <Skeleton className="skeleton-detail" />
              </article>
            ))}
          </div>
          {[0, 1].map((chart) => (
            <article className="card chart-card" key={chart}>
              <div className="panel-heading">
                <Skeleton className="skeleton-heading" />
                <Skeleton className="skeleton-icon" />
              </div>
              <ChartSkeleton />
            </article>
          ))}
        </section>
        <aside
          className="overview-aside right-column workspace-carousel-screen"
          style={carousel.paneStyle(1)}
          inert={carousel.mobile && carousel.active !== 1}
        >
          <article className="budget-card">
            <div className="budget-summary">
              <div className="skeleton-budget-value">
                <Skeleton className="skeleton-label" />
                <Skeleton className="skeleton-value" />
              </div>
              <div className="budget-actions">
                <Skeleton className="skeleton-action" />
                <Skeleton className="skeleton-action" />
              </div>
            </div>
            <Skeleton className="skeleton-budget-progress" />
            <Skeleton className="skeleton-caption" />
          </article>
          <article className="card expense-panel">
            <div className="panel-heading">
              <Skeleton className="skeleton-heading" />
              <Skeleton className="skeleton-search" />
              <Skeleton className="skeleton-action" />
            </div>
            <div className="skeleton-expense-list">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="skeleton-expense-row" key={index}>
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </div>
              ))}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
