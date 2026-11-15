'use client';
import { useEffect, useState, type ReactNode } from 'react';
import MonthPicker from '@/components/month-picker';
import YearPicker from '../components/year-picker';
import GroupBreakdownChart from '../charts/group-breakdown-chart';
import type { BreakdownGroup, BreakdownRecord } from '../charts/group-breakdown';
import { dateKey } from '../model';
import WorkspaceTabs from '../layout/workspace-tabs';
import { useWorkspaceCarousel } from '../hooks/use-workspace-carousel';
import '../layout/workspace-carousel.css';
import './category-panel.css';

export default function ClassificationScreen({
  month,
  groups,
  records,
  kind,
  children,
}: {
  month: string;
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
  kind: 'expense' | 'debt';
  children: ReactNode;
}) {
  const initialMonth = month || dateKey().slice(0, 7);
  const [chartMonth, setChartMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialMonth.slice(0, 4));
  const carousel = useWorkspaceCarousel();
  useEffect(() => {
    const next = month || dateKey().slice(0, 7);
    setChartMonth(next);
    setYear(next.slice(0, 4));
  }, [month]);
  const label = kind === 'expense' ? 'Danh mục' : 'Nguồn công nợ';
  const chartLabel = kind === 'expense' ? 'Chi tiêu theo danh mục' : 'Công nợ theo nguồn';
  return (
    <section
      className="category-workspace workspace-swipe"
      aria-label={`Quản lý ${label.toLocaleLowerCase('vi')}`}
    >
      <WorkspaceTabs
        kind={kind === 'expense' ? 'categories' : 'debt-sources'}
        active={carousel.active}
        onSelect={carousel.select}
      />
      <div
        className="category-screen workspace-carousel"
        ref={carousel.ref}
        data-active-panel={carousel.active}
        onTouchStart={carousel.onTouchStart}
        onTouchMove={carousel.onTouchMove}
        onTouchEnd={carousel.onTouchEnd}
        onTouchCancel={carousel.onTouchCancel}
        onClickCapture={carousel.onClickCapture}
        onKeyDown={carousel.onKeyDown}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        <div
          className="category-charts workspace-carousel-screen"
          style={carousel.paneStyle(0)}
          inert={carousel.mobile && carousel.active !== 0}
        >
          <GroupBreakdownChart
            groups={groups}
            records={records}
            period={chartMonth}
            kind={kind}
            title={`${chartLabel} theo tháng`}
            picker={<MonthPicker value={chartMonth} onChange={setChartMonth} />}
          />
          <GroupBreakdownChart
            groups={groups}
            records={records}
            period={year}
            kind={kind}
            title={`Tổng ${chartLabel.toLocaleLowerCase('vi')} theo năm`}
            picker={<YearPicker value={year} onChange={setYear} />}
          />
        </div>
        <div
          className="category-management workspace-carousel-screen"
          style={carousel.paneStyle(1)}
          inert={carousel.mobile && carousel.active !== 1}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
