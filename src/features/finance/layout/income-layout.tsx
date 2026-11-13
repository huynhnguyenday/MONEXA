'use client';
import type { ReactNode } from 'react';
import { useWorkspaceCarousel } from '../hooks/use-workspace-carousel';
import './income-layout.css';
import './workspace-carousel.css';

export default function IncomeLayout({
  analytics,
  management,
  children,
  loading = false,
}: {
  analytics: ReactNode;
  management: ReactNode;
  children?: ReactNode;
  loading?: boolean;
}) {
  const carousel = useWorkspaceCarousel();
  const view = carousel.active === 0 ? 'analytics' : 'management';
  return (
    <section
      className={`income-panel workspace-swipe income-view-${view}`}
      role={loading ? 'status' : undefined}
      aria-label={loading ? 'Đang tải thu nhập và phân bổ' : 'Thu nhập và phân bổ'}
    >
      <div
        className="income-grid workspace-carousel"
        ref={carousel.ref}
        data-active-panel={carousel.active}
        onTouchStart={carousel.onTouchStart}
        onTouchMove={carousel.onTouchMove}
        onTouchEnd={carousel.onTouchEnd}
        onTouchCancel={carousel.onTouchCancel}
        onClickCapture={carousel.onClickCapture}
        onKeyDown={carousel.onKeyDown}
        role="region"
        aria-label="Biểu đồ và quản lý tiền. Vuốt ngang để chuyển màn hình."
        tabIndex={0}
      >
        <div
          className="workspace-carousel-screen"
          style={carousel.paneStyle(0)}
          inert={carousel.mobile && carousel.active !== 0}
        >
          {analytics}
        </div>
        <div
          className="workspace-carousel-screen"
          style={carousel.paneStyle(1)}
          inert={carousel.mobile && carousel.active !== 1}
        >
          {management}
        </div>
      </div>
      {children}
    </section>
  );
}
