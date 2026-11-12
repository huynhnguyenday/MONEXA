'use client';
import { useEffect, useId, useState, type ReactNode } from 'react';
import MonthPicker from '@/components/month-picker';
import YearPicker from '../components/year-picker';
import GroupBreakdownChart from '../charts/group-breakdown-chart';
import type { BreakdownGroup, BreakdownRecord } from '../charts/group-breakdown';
import { dateKey } from '../model';
import './category-panel.css';

export default function ClassificationScreen({
  month,
  groups,
  records,
  kind,
  children,
  charts,
}: {
  month: string;
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
  kind: 'expense' | 'debt';
  children: ReactNode;
  charts?: ReactNode;
}) {
  const initialMonth = month || dateKey().slice(0, 7);
  const [chartMonth, setChartMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialMonth.slice(0, 4));
  const [tab, setTab] = useState<'charts' | 'list'>('charts');
  const id = useId();
  useEffect(() => {
    const next = month || dateKey().slice(0, 7);
    setChartMonth(next);
    setYear(next.slice(0, 4));
  }, [month]);
  const label = kind === 'expense' ? 'Danh mục' : 'Nguồn công nợ';
  const chartLabel = kind === 'expense' ? 'Chi tiêu theo danh mục' : 'Công nợ theo nguồn';
  return (
    <section
      className={`category-screen category-view-${tab}`}
      aria-label={`Quản lý ${label.toLocaleLowerCase('vi')}`}
    >
      <div
        className="category-mobile-tabs"
        role="group"
        aria-label={`Nội dung ${label.toLocaleLowerCase('vi')}`}
      >
        <button
          type="button"
          className={tab === 'charts' ? 'active' : ''}
          aria-pressed={tab === 'charts'}
          aria-controls={`${id}-charts`}
          onClick={() => setTab('charts')}
        >
          Biểu đồ
        </button>
        <button
          type="button"
          className={tab === 'list' ? 'active' : ''}
          aria-pressed={tab === 'list'}
          aria-controls={`${id}-list`}
          onClick={() => setTab('list')}
        >
          {label}
        </button>
      </div>
      <div className="category-charts" id={`${id}-charts`}>
        {charts || (
          <>
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
          </>
        )}
      </div>
      <div className="category-management" id={`${id}-list`}>
        {children}
      </div>
    </section>
  );
}
