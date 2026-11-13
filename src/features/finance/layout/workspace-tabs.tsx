'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faReceipt, faWallet } from '@fortawesome/free-solid-svg-icons';

export default function WorkspaceTabs({
  active,
  onSelect,
  kind,
  loading = false,
}: {
  active: number;
  onSelect: (index: number) => void;
  kind: 'overview' | 'income';
  loading?: boolean;
}) {
  const items =
    kind === 'overview'
      ? [
          { label: 'Tổng quan', icon: faChartLine },
          { label: 'Lịch sử chi tiêu', icon: faReceipt },
        ]
      : [
          { label: 'Chỉ số & biểu đồ', icon: faChartLine },
          { label: 'Quản lý tiền', icon: faWallet },
        ];
  return (
    <div
      className={`workspace-icon-tabs${loading ? ' is-loading' : ''}`}
      role="group"
      aria-label={kind === 'overview' ? 'Nội dung tổng quan' : 'Nội dung thu nhập'}
    >
      {items.map((item, index) => (
        <button
          type="button"
          key={item.label}
          title={item.label}
          aria-label={item.label}
          aria-pressed={active === index}
          disabled={loading}
          onClick={() => onSelect(index)}
        >
          <FontAwesomeIcon icon={item.icon} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
