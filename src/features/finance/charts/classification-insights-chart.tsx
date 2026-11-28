'use client';
import './workspace-gesture-plugin';
import { useCallback, useEffect, useState } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarController,
  DoughnutController,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { money, type FinanceData } from '../model';
import { useVietnamToday } from '../hooks/use-vietnam-today';
import type { BreakdownGroup, BreakdownRecord } from './group-breakdown';
import { categoryInsights, debtInsights, weeklyCategoryInsights } from './classification-insights';
import { inspectionEvents } from './chart-inspection';
import ExpenseChartTooltip, { type ExpenseChartSelection } from './expense-chart-tooltip';
import './classification-insights.css';
ChartJS.register(
  BarController,
  DoughnutController,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
);
type Kind = 'bar' | 'doughnut';
type Row = {
  id: string;
  name: string;
  amount: number;
  details: { label: string; amount: number; color: string }[];
  metric?: { label: string; value: string };
};
type Panel = {
  title: string;
  period: string;
  type: Kind;
  data: ChartData<Kind>;
  rows: Row[];
  stacked?: boolean;
  totalLabel?: string;
};
const compact = (v: string | number) =>
  Number(v) >= 1000000
    ? `${Number(v) / 1000000}tr`
    : Number(v) >= 1000
      ? `${Number(v) / 1000}k`
      : v;
const period = (month: string) => month.split('-').reverse().join('/');
const pct = (v: number, total: number) =>
  `${(total ? (v / total) * 100 : 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
function InsightCard({ panel, control }: { panel: Panel; control?: React.ReactNode }) {
  const [selection, setSelection] = useState<ExpenseChartSelection | null>(null);
  const close = useCallback(() => setSelection(null), []);
  useEffect(close, [panel, close]);
  const show = (index: number, x: number, y: number, anchor?: HTMLCanvasElement, hover = false) => {
    const row = panel.rows[index];
    if (!row) return;
    const next: ExpenseChartSelection = {
      title: `${row.name} · ${panel.period}`,
      items: row.details.map((d, i) => ({
        id: row.id + ':' + i,
        title: d.label,
        amount: d.amount,
        color: d.color,
      })),
      x,
      y,
      anchor,
      hover,
      totalLabel: panel.totalLabel || 'Tổng',
      totalAmount: row.amount,
      detailLabel: panel.title,
      metrics: row.metric ? [row.metric] : undefined,
      itemUnit: 'mục',
      emptyLabel: 'Không phát sinh.',
    };
    setSelection((previous) =>
      previous?.title === next.title &&
      previous.x === next.x &&
      previous.y === next.y &&
      previous.hover === next.hover
        ? previous
        : next,
    );
  };
  const options: ChartOptions<Kind> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    ...inspectionEvents((point, chart, hover) => {
      const rect = chart.canvas.getBoundingClientRect();
      show(
        point.index,
        rect.left + point.element.x,
        rect.top + point.element.y,
        chart.canvas,
        hover,
      );
    }),
    ...(panel.type === 'doughnut'
      ? { cutout: '62%' }
      : {
          interaction: { mode: 'index' as const, intersect: false },
          scales: {
            x: {
              stacked: panel.stacked,
              grid: { display: false },
              ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: false },
            },
            y: {
              stacked: panel.stacked,
              beginAtZero: true,
              grid: { color: '#edf2f8' },
              ticks: { font: { size: 10 }, maxTicksLimit: 4, callback: compact },
            },
          },
        }),
  };
  return (
    <article className="card category-chart-panel insight-card" aria-label={panel.title}>
      <div className="insight-heading">
        <h2>{panel.title}</h2>
        {control}
      </div>
      {panel.rows.some((r) => r.amount > 0) ? (
        <div className="category-chart insight-canvas">
          <Chart
            type={panel.type}
            data={panel.data}
            options={options}
            role="img"
            tabIndex={0}
            aria-label={`${panel.title}. ${panel.period}. ${panel.rows.map((r) => `${r.name}: ${money(r.amount)}`).join('; ')}. Dùng phím mũi tên để xem chi tiết.`}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Enter') return;
              e.preventDefault();
              e.stopPropagation();
              const current = panel.rows.findIndex(
                  (r) => selection?.title === `${r.name} · ${panel.period}`,
                ),
                step = e.key === 'ArrowLeft' ? -1 : 1,
                index = (current + step + panel.rows.length) % panel.rows.length,
                rect = e.currentTarget.getBoundingClientRect();
              show(index, rect.left + rect.width / 2, rect.top + rect.height / 2);
            }}
          />
        </div>
      ) : (
        <div className="compact-empty">
          <p>Chưa có dữ liệu phù hợp.</p>
        </div>
      )}
      {selection && <ExpenseChartTooltip selection={selection} close={close} />}
    </article>
  );
}
export default function ClassificationInsights({
  groups,
  records,
  month,
  kind,
  data,
}: {
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
  month: string;
  kind: 'expense' | 'debt';
  data: FinanceData;
}) {
  const today = useVietnamToday();
  const [direction, setDirection] = useState<'payable' | 'receivable'>('payable');
  if (kind === 'expense') {
    const { rows, previousMonth } = categoryInsights(groups, records, month),
      current = rows.filter((r) => r.amount > 0),
      total = current.reduce((s, r) => s + r.amount, 0);
    const weeks = weeklyCategoryInsights(groups, records, month);
    const panels: Panel[] = [
      {
        title: 'Tỷ trọng chi tiêu',
        period: period(month),
        type: 'doughnut',
        totalLabel: 'Chi danh mục',
        data: {
          labels: current.map((r) => r.name),
          datasets: [
            {
              data: current.map((r) => r.amount),
              backgroundColor: current.map((r) => r.color),
              borderWidth: 2,
              borderColor: '#fff',
            },
          ],
        },
        rows: current.map((r) => ({
          id: r.id,
          name: r.name,
          amount: r.amount,
          metric: { label: 'Tỷ trọng', value: pct(r.amount, total) },
          details: current.map((g) => ({ label: g.name, amount: g.amount, color: g.color })),
        })),
      },
      {
        title: 'So với tháng trước',
        period: `${period(previousMonth)} → ${period(month)}`,
        type: 'bar',
        stacked: true,
        totalLabel: 'Chi trong tháng',
        data: {
          labels: [period(previousMonth), period(month)],
          datasets: rows.map((r) => ({
            label: r.name,
            data: [r.previous, r.amount],
            backgroundColor: r.color,
            maxBarThickness: 64,
          })),
        },
        rows: [previousMonth, month].map((m, i) => {
          const sum = rows.reduce((s, r) => s + (i ? r.amount : r.previous), 0),
            before = rows.reduce((s, r) => s + r.previous, 0);
          return {
            id: m,
            name: period(m),
            amount: sum,
            metric: i
              ? {
                  label: 'So với tháng trước',
                  value: before
                    ? `${sum - before >= 0 ? '+' : ''}${pct(sum - before, before)}`
                    : 'Mới phát sinh',
                }
              : undefined,
            details: rows
              .map((r) => ({ label: r.name, amount: i ? r.amount : r.previous, color: r.color }))
              .filter((r) => r.amount > 0),
          };
        }),
      },
      {
        title: 'Chi tiêu theo tuần',
        period: period(month),
        type: 'bar',
        stacked: true,
        totalLabel: 'Chi trong tuần',
        data: {
          labels: weeks.map((w) => w.label),
          datasets: current.map((r) => ({
            label: r.name,
            data: weeks.map((w) => w.details.find((d) => d.id === r.id)?.amount || 0),
            backgroundColor: r.color,
            maxBarThickness: 48,
          })),
        },
        rows: weeks.map((w) => ({
          id: w.label,
          name: `Ngày ${w.label}`,
          amount: w.amount,
          metric: { label: 'Tỷ trọng tháng', value: pct(w.amount, total) },
          details: w.details.map((d) => ({ label: d.name, amount: d.amount, color: d.color })),
        })),
      },
    ];
    return (
      <>
        {panels.map((panel) => (
          <InsightCard key={panel.title} panel={panel} />
        ))}
      </>
    );
  }
  const { rows, weeks } = debtInsights(data, direction, today),
    total = rows.reduce((s, r) => s + r.amount, 0),
    noun = direction === 'payable' ? 'Phải trả' : 'Phải thu';
  const control = (
    <label className="insight-direction">
      <span className="sr-only">Loại công nợ cho ba biểu đồ</span>
      <select value={direction} onChange={(e) => setDirection(e.target.value as typeof direction)}>
        <option value="payable">Phải trả</option>
        <option value="receivable">Phải thu</option>
      </select>
    </label>
  );
  const statuses = ['Chưa đến hạn', 'Hôm nay', 'Quá hạn', 'Chưa có hạn'];
  const panels: Panel[] = [
    {
      title: 'Trạng thái công nợ',
      period: `${noun} · ${period(today)}`,
      type: 'bar',
      stacked: true,
      totalLabel: 'Nợ chưa thanh toán',
      data: {
        labels: statuses,
        datasets: rows.map((r) => ({
          label: r.name,
          data: r.amounts,
          backgroundColor: r.color,
          maxBarThickness: 48,
        })),
      },
      rows: statuses.map((label, i) => ({
        id: label,
        name: label,
        amount: rows.reduce((s, r) => s + r.amounts[i], 0),
        details: rows
          .map((r) => ({ label: r.name, amount: r.amounts[i], color: r.color }))
          .filter((r) => r.amount > 0),
      })),
    },
    {
      title: 'Đến hạn trong 4 tuần tới',
      period: noun,
      type: 'bar',
      stacked: true,
      totalLabel: 'Đến hạn trong tuần',
      data: {
        labels: weeks.map(
          (w) => `${w.from.slice(8)}/${w.from.slice(5, 7)}–${w.to.slice(8)}/${w.to.slice(5, 7)}`,
        ),
        datasets: rows.map((r, i) => ({
          label: r.name,
          data: weeks.map((w) => w.amounts[i]),
          backgroundColor: r.color,
          maxBarThickness: 48,
        })),
      },
      rows: weeks.map((w) => ({
        id: w.from,
        name: `${period(w.from)}–${period(w.to)}`,
        amount: w.amounts.reduce((s, a) => s + a, 0),
        details: rows
          .map((r, i) => ({ label: r.name, amount: w.amounts[i], color: r.color }))
          .filter((r) => r.amount > 0),
      })),
    },
    {
      title: 'Tỷ trọng nợ còn lại',
      period: noun,
      type: 'doughnut',
      totalLabel: 'Nợ chưa thanh toán',
      data: {
        labels: rows.map((r) => r.name),
        datasets: [
          {
            data: rows.map((r) => r.amount),
            backgroundColor: rows.map((r) => r.color),
            borderWidth: 2,
            borderColor: '#fff',
          },
        ],
      },
      rows: rows.map((r) => ({
        id: r.id,
        name: r.name,
        amount: r.amount,
        metric: { label: 'Tỷ trọng', value: pct(r.amount, total) },
        details: rows.map((g) => ({ label: g.name, amount: g.amount, color: g.color })),
      })),
    },
  ];
  return (
    <>
      {panels.map((panel) => (
        <InsightCard key={panel.title} panel={panel} control={control} />
      ))}
    </>
  );
}
