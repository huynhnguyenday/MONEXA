'use client';
import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartLine,
  faReceipt,
  faWallet,
  faTags,
  faAddressBook,
  faChartColumn,
} from '@fortawesome/free-solid-svg-icons';

export default function WorkspaceTabs({
  active,
  onSelect,
  kind,
  loading = false,
}: {
  active: number;
  onSelect: (index: number) => void;
  kind: 'overview' | 'income' | 'categories' | 'debt-sources';
  loading?: boolean;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setTarget(document.getElementById('header-workspace-tabs'));
  }, []);
  const items =
    kind === 'overview'
      ? [
          { label: 'Tổng quan', icon: faChartLine },
          { label: 'Lịch sử chi tiêu', icon: faReceipt },
        ]
      : kind === 'categories' || kind === 'debt-sources'
        ? [
            { label: 'Biểu đồ tổng hợp', icon: faChartLine },
            { label: 'Biểu đồ chi tiết', icon: faChartColumn },
            {
              label: kind === 'categories' ? 'Danh mục' : 'Nguồn công nợ',
              icon: kind === 'categories' ? faTags : faAddressBook,
            },
          ]
        : [
            { label: 'Chỉ số & biểu đồ', icon: faChartLine },
            { label: 'Quản lý tiền', icon: faWallet },
          ];
  return target
    ? createPortal(
        <div
          className={`workspace-icon-tabs${loading ? ' is-loading' : ''}`}
          data-active-index={active}
          data-tab-count={items.length}
          style={
            {
              '--tab-count': items.length,
              '--tab-active-position': `${active * 100}%`,
            } as CSSProperties
          }
          role="group"
          aria-label={`Chuyển nội dung ${kind === 'overview' ? 'tổng quan' : kind === 'income' ? 'thu nhập' : kind === 'categories' ? 'danh mục' : 'nguồn công nợ'}`}
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
        </div>,
        target,
      )
    : null;
}
