'use client';
import { useEffect, useState, type ReactNode } from 'react';
import MonthPicker from '@/components/month-picker';

import GroupBreakdownChart from '../charts/group-breakdown-chart';
import ClassificationInsights from '../charts/classification-insights-chart';
import type { BreakdownGroup, BreakdownRecord } from '../charts/group-breakdown';
import { dateKey, type FinanceData } from '../model';
import WorkspaceTabs from '../layout/workspace-tabs';
import { useWorkspaceCarousel, WorkspaceEntryContext } from '../hooks/use-workspace-carousel';
import '../layout/workspace-carousel.css';
import './category-panel.css';
import type { CustomIcon } from '../custom-icon-schema';

export default function ClassificationScreen({
  month,
  groups,
  records,
  kind,
  children,
  customIcons = [],
  data,
}: {
  month: string;
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
  kind: 'expense' | 'debt';
  children: ReactNode;
  customIcons?: CustomIcon[];
  data: FinanceData;
}) {
  const initialMonth = month || dateKey().slice(0, 7);
  const [chartMonth, setChartMonth] = useState(initialMonth);

  const [chartPage, setChartPage] = useState(0);
  const carousel = useWorkspaceCarousel({
    onActiveChange: (index, direction) => {
      if (index === 0) setChartPage(direction < 0 ? 1 : 0);
    },
  });
  useEffect(() => {
    const next = month || dateKey().slice(0, 7);
    setChartMonth(next);
  }, [month]);
  const label = kind === 'expense' ? 'Danh mục' : 'Nguồn công nợ';
  const chartLabel = kind === 'expense' ? 'Chi tiêu theo danh mục' : 'Công nợ theo nguồn';
  return (
    <section
      className={`category-workspace workspace-swipe${kind === 'expense' ? ' expense-category-workspace' : ''}`}
      aria-label={`Quản lý ${label.toLocaleLowerCase('vi')}`}
    >
      <WorkspaceTabs
        kind={kind === 'expense' ? 'categories' : 'debt-sources'}
        active={carousel.active === 1 ? 2 : chartPage}
        onSelect={(index) => {
          carousel.select(index === 2 ? 1 : 0);
          if (index < 2) setChartPage(index);
        }}
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
          <WorkspaceEntryContext.Provider value={{ index: chartPage, onChange: setChartPage }}>
            <ClassificationInsights
              lead={
                <GroupBreakdownChart
                  groups={groups}
                  records={records}
                  period={chartMonth}
                  kind={kind}
                  customIcons={customIcons}
                  title={`${chartLabel} theo tháng`}
                  picker={<MonthPicker value={chartMonth} onChange={setChartMonth} />}
                />
              }
              groups={groups}
              records={records}
              month={chartMonth}
              kind={kind}
              data={data}
              customIcons={customIcons}
            />
          </WorkspaceEntryContext.Provider>
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
