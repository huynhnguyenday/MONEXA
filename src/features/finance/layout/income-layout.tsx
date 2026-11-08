import type { ReactNode } from 'react';
import './income-layout.css';

export type IncomeWorkspaceView = 'analytics' | 'management';
export default function IncomeLayout({
  view,
  onViewChange,
  analytics,
  management,
  children,
  loading = false,
}: {
  view: IncomeWorkspaceView;
  onViewChange?: (view: IncomeWorkspaceView) => void;
  analytics: ReactNode;
  management: ReactNode;
  children?: ReactNode;
  loading?: boolean;
}) {
  return (
    <section
      className={`income-panel income-view-${view}`}
      role={loading ? 'status' : undefined}
      aria-label={loading ? 'Đang tải thu nhập và phân bổ' : 'Thu nhập và phân bổ'}
    >
      <div className="income-mobile-tabs" role="group" aria-label="Nội dung thu nhập">
        <button
          disabled={loading}
          aria-pressed={view === 'analytics'}
          onClick={() => onViewChange?.('analytics')}
        >
          Chỉ số & biểu đồ
        </button>
        <button
          disabled={loading}
          aria-pressed={view === 'management'}
          onClick={() => onViewChange?.('management')}
        >
          Quản lý tiền
        </button>
      </div>
      <div className="income-grid">
        {analytics}
        {management}
      </div>
      {children}
    </section>
  );
}
