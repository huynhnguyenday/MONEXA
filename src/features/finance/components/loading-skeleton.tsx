import type { CSSProperties } from 'react';
import './loading-skeleton.css';

export function LoadingSkeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span className={`loading-skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function MonthPickerSkeleton() {
  return (
    <div className="header-month-picker" role="status" aria-label="Đang tải bộ chọn tháng thống kê">
      <div className="month-picker-button month-picker-skeleton">
        <LoadingSkeleton className="skeleton-icon" />
        <LoadingSkeleton className="skeleton-month-label" />
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="skeleton-chart" aria-hidden="true">
      {[40, 65, 48, 82, 58].map((height, index) => <LoadingSkeleton key={index} style={{ height: `${height}%` }} />)}
    </div>
  );
}
