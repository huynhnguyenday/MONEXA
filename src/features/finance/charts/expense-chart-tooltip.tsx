'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { money, type Expense } from '../model';
import './expense-chart-tooltip.css';

export type ExpenseChartSelection = { title: string; items: Expense[]; x: number; y: number; average?: number };
export default function ExpenseChartTooltip({ selection, close }: { selection: ExpenseChartSelection; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      const list = listRef.current;
      if (!list || !ref.current) return;
      const firstRows = Array.from(list.children).slice(0, 2);
      list.style.maxHeight = `${firstRows.reduce((height, row) => height + row.getBoundingClientRect().height, 0)}px`;
      setMeasuredHeight(ref.current.getBoundingClientRect().height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [selection]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener('resize', close);
    };
  }, [close]);
  const width = Math.min(304, window.innerWidth - 24);
  const maxHeight = window.innerHeight - 24;
  return createPortal(
    <div ref={ref} className="expense-chart-tooltip" role="dialog" aria-label="Chi tiết khoản chi trên biểu đồ"
      style={{ width, maxHeight, visibility: measuredHeight ? 'visible' : 'hidden', left: Math.max(12, Math.min(selection.x, window.innerWidth - width - 12)), top: Math.max(12, Math.min(selection.y + 12, window.innerHeight - measuredHeight - 12)) }}>
      <div className="expense-chart-tooltip-heading"><strong>{selection.title}</strong><button type="button" className="monexa-action monexa-close" aria-label="Đóng chi tiết biểu đồ" onClick={close}><span aria-hidden="true">×</span></button></div>
      <div ref={listRef} className="expense-chart-tooltip-list" tabIndex={0}>
        {selection.items.length ? selection.items.map(item => <div className="expense-chart-tooltip-item" key={item.id}><span title={item.title}>{item.title}</span><b>{money(item.amount)}</b></div>) : <p>Không có khoản chi.</p>}
      </div>
      <div className="expense-chart-tooltip-total">Tổng chi <b>{money(selection.items.reduce((sum, item) => sum + item.amount, 0))}</b></div>
      {selection.average !== undefined && <div className="expense-chart-tooltip-total">Trung bình/ngày <b>{money(selection.average)}</b></div>}
    </div>, document.body,
  );
}
