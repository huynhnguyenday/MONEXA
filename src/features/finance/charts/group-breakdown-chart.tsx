'use client';
import './workspace-gesture-plugin';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { money, type DebtSource } from '../model';
import { DebtSourceIcon } from '../debt-source-icon';
import { debtSourceAxisIcons } from './debt-source-axis-icons';
import CategoryIcon from '../components/category-icon';
import type { CustomIcon } from '../custom-icon-schema';
import { type Category } from '../model';
import { moneyAxisMaximum } from './money-axis';
import { groupBreakdown, type BreakdownGroup, type BreakdownRecord } from './group-breakdown';
import ExpenseChartTooltip, { type ExpenseChartSelection } from './expense-chart-tooltip';
import { inspectionEvents } from './chart-inspection';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function GroupBreakdownChart({
  groups,
  records,
  period,
  title,
  kind,
  picker,
  titleAction,
  customIcons = [],
}: {
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
  period: string;
  title: string;
  kind: 'expense' | 'debt';
  picker: ReactNode;
  titleAction?: ReactNode;
  customIcons?: CustomIcon[];
}) {
  const [width, setWidth] = useState(640);
  const [selection, setSelection] = useState<ExpenseChartSelection | null>(null);
  const close = useCallback(() => setSelection(null), []);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const allTotals = useMemo(
    () => groupBreakdown(groups, records, period).filter((group) => group.count > 0),
    [groups, records, period],
  );
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [period]);
  const pageSize = Math.max(1, Math.floor((width - 54) / 42));
  const pageCount = Math.max(1, Math.ceil(allTotals.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const totals = allTotals.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const highest = allTotals.reduce((maximum, group) => Math.max(maximum, group.amount), 0);
  const axisMaximum = moneyAxisMaximum(highest);
  const sourceIcons = useRef<HTMLDivElement>(null);
  const sourceIconPlugin = useMemo(() => debtSourceAxisIcons(() => sourceIcons.current), []);
  useEffect(() => {
    close();
  }, [period, currentPage, close]);
  const noun = kind === 'expense' ? 'chi tiêu' : 'công nợ';
  const periodLabel =
    period.length === 4 ? `năm ${period}` : `tháng ${period.slice(5)}/${period.slice(0, 4)}`;
  const options: ChartOptions<'bar'> = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    ...inspectionEvents((point, chart, hover) => {
      const group = totals[point.index];
      if (!group) return;
      const rect = chart.canvas.getBoundingClientRect();
      const next: ExpenseChartSelection = {
        title: `${group.name} · ${periodLabel}`,
        items: allTotals.map((g) => ({
          id: g.id,
          title: g.name,
          amount: g.amount,
          color: g.color,
        })),
        x: rect.left + point.element.x,
        y: rect.top + point.element.y,
        anchor: chart.canvas,
        hover,
        totalLabel: `Tổng ${noun}`,
        totalAmount: group.amount,
        itemUnit: 'mục',
        metrics: [{ label: 'Số khoản', value: String(group.count) }],
      };
      setSelection((previous) =>
        previous?.title === next.title &&
        previous.x === next.x &&
        previous.y === next.y &&
        previous.hover === next.hover
          ? previous
          : next,
      );
    }),
    scales: {
      x: {
        afterFit: (axis) => {
          axis.height = 36;
        },
        grid: { display: false },
        border: { display: false },
        ticks: {
          callback: () => '',
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          color: '#304968',
          padding: 4,
        },
      },
      y: {
        beginAtZero: true,
        max: axisMaximum,
        border: { display: false },
        grid: { color: '#edf2f8' },
        ticks: {
          stepSize: axisMaximum / 2,
          maxTicksLimit: 3,
          autoSkip: false,
          color: '#405a7c',
          font: { size: 11, weight: 600 },
          callback: (value) =>
            Number(value) >= 1_000_000
              ? `${Number(value) / 1_000_000}tr`
              : Number(value) >= 1_000
                ? `${Number(value) / 1_000}k`
                : value,
        },
      },
    },
  };
  return (
    <article className="card category-chart-panel">
      <div className="category-chart-toolbar">
        <h2>
          {title}
          {titleAction}
        </h2>
        {picker}
      </div>
      <div
        className="category-chart"
        data-axis-labels={kind === 'debt' ? 'source-logos' : 'icons'}
        ref={ref}
        role="img"
        aria-label={`${title}, ${periodLabel}. Tổng: ${money(allTotals.reduce((sum, group) => sum + group.amount, 0))}`}
      >
        {totals.length ? (
          <Bar
            plugins={[sourceIconPlugin]}
            options={options}
            data={{
              labels: totals.map((group) => group.name),
              datasets: [
                {
                  label: `Tổng ${noun}`,
                  data: totals.map((group) => group.amount),
                  backgroundColor: totals.map((group) => group.color),
                  borderRadius: 5,
                  maxBarThickness: 24,
                  barPercentage: 0.65,
                  categoryPercentage: 0.85,
                },
              ],
            }}
          />
        ) : (
          <div className="compact-empty">
            <p>
              {kind === 'expense'
                ? 'Chưa có chi tiêu trong kỳ này.'
                : 'Chưa có công nợ trong kỳ này.'}
            </p>
          </div>
        )}
        {totals.length > 0 && (
          <div className="debt-source-axis-icons" ref={sourceIcons} aria-hidden="true">
            {totals.map((group) => (
              <span
                key={group.id}
                data-source-axis-icon
                title={group.name}
                style={{ color: group.color }}
              >
                {kind === 'debt' ? (
                  <DebtSourceIcon icon={(group.icon as DebtSource['icon']) || 'person'} />
                ) : (
                  <CategoryIcon
                    category={{
                      icon: (group.icon as Category['icon']) || 'receipt',
                      customIconId: group.customIconId,
                    }}
                    assets={customIcons}
                  />
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      {pageCount > 1 && (
        <div className="pagination chart-icon-pages" aria-label="Phân trang biểu đồ">
          <button
            type="button"
            aria-label="Trang danh mục trước"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            ‹
          </button>
          <span>
            {currentPage + 1}/{pageCount}
          </span>
          <button
            type="button"
            aria-label="Trang danh mục sau"
            disabled={currentPage + 1 === pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            ›
          </button>
        </div>
      )}
      <span className="sr-only">
        {allTotals
          .map((group) => `${group.name}: ${money(group.amount)}, ${group.count} khoản ${noun}`)
          .join('; ')}
      </span>
      {selection && <ExpenseChartTooltip selection={selection} close={close} />}
    </article>
  );
}
