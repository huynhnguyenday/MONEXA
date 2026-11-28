'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { money, type Expense } from '../model';
import './expense-chart-tooltip.css';

export type ExpenseChartSelection = {
  title: string;
  items: (Pick<Expense, 'id' | 'title' | 'amount'> & { color?: string })[];
  x: number;
  y: number;
  average?: number;
  detailLabel?: string;
  totalLabel?: string;
  totalAmount?: number;
  emptyLabel?: string;

  metrics?: { label: string; value: string }[];
  itemUnit?: string;
  anchor?: HTMLCanvasElement;
  hover?: boolean;
};
export default function ExpenseChartTooltip({
  selection,
  close,
}: {
  selection: ExpenseChartSelection;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const list = listRef.current;
      if (!list || !ref.current) return;
      setMeasuredHeight(ref.current.getBoundingClientRect().height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [selection]);
  useEffect(() => {
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;
    const move = (event: PointerEvent) => {
      if (!selection.hover) return;
      clearTimeout(leaveTimer);
      if (
        ref.current?.contains(event.target as Node) ||
        selection.anchor?.contains(event.target as Node)
      )
        return;
      leaveTimer = setTimeout(close, 150);
    };
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('pointermove', move);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('pointermove', move);
      clearTimeout(leaveTimer);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', close);
    };
  }, [close, selection.hover, selection.anchor]);
  const width = Math.min(304, window.innerWidth - 24);
  const maxHeight = window.innerHeight - 24;
  return createPortal(
    <div
      ref={ref}
      className="expense-chart-tooltip"
      role="dialog"
      aria-label={selection.detailLabel || 'Chi tiết khoản chi trên biểu đồ'}
      style={{
        width,
        maxHeight,
        visibility: measuredHeight ? 'visible' : 'hidden',
        left: Math.max(12, Math.min(selection.x, window.innerWidth - width - 12)),
        top: Math.max(12, Math.min(selection.y + 12, window.innerHeight - measuredHeight - 12)),
      }}
    >
      <div className="expense-chart-tooltip-heading">
        <strong>{selection.title}</strong>
        <button
          type="button"
          className="monexa-action monexa-close"
          aria-label="Đóng chi tiết biểu đồ"
          onClick={close}
        >
          <span aria-hidden="true">
            <Icon icon={faXmark} />
          </span>
        </button>
      </div>
      <div
        className={`expense-chart-tooltip-summary${selection.average !== undefined || selection.metrics?.length ? ' has-average' : ''}`}
      >
        <div className="expense-chart-tooltip-stat">
          <span>{selection.totalLabel || 'Tổng chi'}</span>
          <b>
            {money(
              selection.totalAmount ?? selection.items.reduce((sum, item) => sum + item.amount, 0),
            )}
          </b>
        </div>
        {selection.average !== undefined && (
          <div className="expense-chart-tooltip-stat">
            <span>Trung bình/ngày</span>
            <b>{money(selection.average)}</b>
          </div>
        )}
        {selection.metrics?.map((metric) => (
          <div className="expense-chart-tooltip-stat" key={metric.label}>
            <span>{metric.label}</span>
            <b>{metric.value}</b>
          </div>
        ))}
      </div>
      <div className="expense-chart-tooltip-list-heading">
        <strong>Chi tiết</strong>
        <span>
          {selection.items.length} {selection.itemUnit || 'khoản'}
        </span>
      </div>
      <div
        ref={listRef}
        className="expense-chart-tooltip-list"
        tabIndex={0}
        role="region"
        aria-label="Danh sách khoản trên biểu đồ"
      >
        {selection.items.length ? (
          selection.items.map((item) => (
            <div className="expense-chart-tooltip-item" key={item.id}>
              <span title={item.title}>
                {item.color && (
                  <i
                    className="expense-chart-tooltip-color"
                    style={{ background: item.color }}
                    aria-hidden="true"
                  />
                )}
                {item.title}
              </span>
              <b>{money(item.amount)}</b>
            </div>
          ))
        ) : (
          <p>{selection.emptyLabel || 'Không có khoản chi.'}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}
