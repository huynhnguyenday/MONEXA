'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type { ReactNode } from 'react';
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
  hideDetails?: boolean;
  titleColor?: string;
  titleIcon?: ReactNode;

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
  const [scrollbar, setScrollbar] = useState({ visible: false, height: 0, top: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      if (!ref.current) return;
      setMeasuredHeight(ref.current.getBoundingClientRect().height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [selection]);
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const updateScrollbar = () => {
      const trackHeight = Math.max(list.clientHeight - 8, 0);
      const maxScroll = list.scrollHeight - list.clientHeight;
      if (maxScroll <= 0 || trackHeight <= 0) {
        setScrollbar({ visible: false, height: 0, top: 0 });
        return;
      }
      const height = Math.min(
        trackHeight,
        Math.max(18, (trackHeight * list.clientHeight) / list.scrollHeight),
      );
      const progress = Math.max(0, Math.min(1, list.scrollTop / maxScroll));
      const top = 4 + progress * (trackHeight - height);
      setScrollbar({ visible: true, height, top });
    };
    updateScrollbar();
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(list);
    list.addEventListener('scroll', updateScrollbar, { passive: true });
    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', updateScrollbar);
    };
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
  const anchorRect = selection.anchor?.getBoundingClientRect();
  const belowHeight = anchorRect ? window.innerHeight - anchorRect.bottom - 24 : 0;
  const aboveHeight = anchorRect ? anchorRect.top - 24 : 0;
  const preferBelow = anchorRect
    ? anchorRect.top + anchorRect.height / 2 < window.innerHeight / 2
    : selection.y < window.innerHeight / 2;
  const placeBelow = preferBelow
    ? belowHeight >= 120 || belowHeight >= aboveHeight
    : aboveHeight < 120 && belowHeight > aboveHeight;
  const availableHeight = anchorRect
    ? placeBelow
      ? belowHeight
      : aboveHeight
    : window.innerHeight - 24;
  const maxHeight = Math.max(120, availableHeight);
  const preferredTop = anchorRect
    ? placeBelow
      ? anchorRect.bottom + 12
      : anchorRect.top - measuredHeight - 12
    : selection.y + 12;
  const top = Math.max(12, Math.min(preferredTop, window.innerHeight - measuredHeight - 12));
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
        top,
      }}
    >
      <div className="expense-chart-tooltip-heading">
        <div className="expense-chart-tooltip-title" style={{ color: selection.titleColor }}>
          {selection.titleIcon && (
            <span className="expense-chart-tooltip-title-icon" aria-hidden="true">
              {selection.titleIcon}
            </span>
          )}
          <strong>{selection.title}</strong>
        </div>
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
      {!selection.hideDetails && (
        <>
          <div className="expense-chart-tooltip-list-heading">
            <strong>Chi tiết</strong>
            <span>
              {selection.items.length} {selection.itemUnit || 'khoản'}
            </span>
          </div>
          <div className="expense-chart-tooltip-list-container">
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
            {scrollbar.visible && (
              <div className="expense-chart-tooltip-scrollbar" aria-hidden="true">
                <span
                  className="expense-chart-tooltip-scrollbar-thumb"
                  style={{ height: scrollbar.height, top: scrollbar.top }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
