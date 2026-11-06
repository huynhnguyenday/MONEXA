'use client';

import { useState } from 'react';
import { ChartSkeleton, LoadingSkeleton as Skeleton } from '../components/loading-skeleton';
import './overview-panel.css';

export default function OverviewSkeleton() {
  const [mobileView, setMobileView] = useState<'charts' | 'expenses'>('charts');
  return (
    <section className={`overview-panel finance-skeleton overview-skeleton mobile-view-${mobileView}`} aria-label="Đang tải tổng quan tài chính" aria-busy="true">
      <span className="sr-only" role="status">Đang tải dữ liệu tổng quan…</span>
      <div className="mobile-panel-tabs" aria-label="Nội dung tổng quan">
        <button aria-pressed={mobileView === 'charts'} onClick={() => setMobileView('charts')}>Chỉ số & biểu đồ</button>
        <button aria-pressed={mobileView === 'expenses'} onClick={() => setMobileView('expenses')}>Chi tiêu</button>
      </div>
      <div className="overview-grid" aria-hidden="true">
        <section className="overview-main">
          <div className="compact-stats">
            {Array.from({ length: 5 }, (_, index) => (
              <article className="stat overview-stat overview-stat-remaining" key={index}>
                <Skeleton className="skeleton-label" />
                <Skeleton className="skeleton-value" />
                <Skeleton className="skeleton-detail" />
              </article>
            ))}
          </div>
          {[0, 1].map((chart) => <article className="card chart-card" key={chart}>
            <div className="panel-heading"><Skeleton className="skeleton-heading" /><Skeleton className="skeleton-icon" /></div>
            <ChartSkeleton />
          </article>)}
        </section>
        <aside className="overview-aside right-column">
          <article className="budget-card">
            <div className="budget-summary">
              <div className="skeleton-budget-value"><Skeleton className="skeleton-label" /><Skeleton className="skeleton-value" /></div>
              <div className="budget-actions"><Skeleton className="skeleton-action" /><Skeleton className="skeleton-action" /></div>
            </div>
            <Skeleton className="skeleton-budget-progress" />
            <Skeleton className="skeleton-caption" />
          </article>
          <article className="card expense-panel">
            <div className="panel-heading"><Skeleton className="skeleton-heading" /><Skeleton className="skeleton-search" /><Skeleton className="skeleton-action" /></div>
            <div className="skeleton-expense-list">
              {Array.from({ length: 4 }, (_, index) => <div className="skeleton-expense-row" key={index}><Skeleton /><Skeleton /><Skeleton /></div>)}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
