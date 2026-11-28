'use client';
import './workspace-gesture-plugin';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
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
import type { Category, DebtSource } from '../model';
import CategoryIcon from '../components/category-icon';
import { DebtSourceIcon } from '../debt-source-icon';
import type { CustomIcon } from '../custom-icon-schema';
import { useVietnamToday } from '../hooks/use-vietnam-today';
import { useWorkspaceCarousel } from '../hooks/use-workspace-carousel';
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
  color?: string;
  icon?: string;
  customIconId?: string | null;
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
  indexAxis?: 'x' | 'y';
  showLegend?: boolean;
  showDetails?: boolean;
  totalLabel?: string;
  mobilePage?: 0 | 1;
  desktopOrder?: number;
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
function InsightCard({
  panel,
  control,
  kind,
  customIcons,
}: {
  panel: Panel;
  control?: React.ReactNode;
  kind: 'expense' | 'debt';
  customIcons: CustomIcon[];
}) {
  const [selection, setSelection] = useState<ExpenseChartSelection | null>(null);
  const close = useCallback(() => setSelection(null), []);
  useEffect(close, [panel, close]);
  const show = (index: number, x: number, y: number, anchor?: HTMLCanvasElement, hover = false) => {
    const row = panel.rows[index];
    if (!row) return;
    const next: ExpenseChartSelection = {
      title: `${row.name} · ${panel.period}`,
      titleColor: row.color,
      titleIcon: row.icon ? (
        kind === 'expense' ? (
          <CategoryIcon
            category={{
              icon: row.icon as Category['icon'],
              customIconId: row.customIconId,
            }}
            assets={customIcons}
            style={{ color: row.color }}
          />
        ) : (
          <DebtSourceIcon icon={row.icon as DebtSource['icon']} />
        )
      ) : undefined,
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
      hideDetails: panel.showDetails === false,
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
    plugins: {
      legend: {
        display: panel.showLegend ?? false,
        position: 'top',
        labels: { boxWidth: 10, boxHeight: 10, font: { size: 10 }, padding: 8 },
      },
      tooltip: { enabled: false },
    },
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
          indexAxis: panel.indexAxis ?? 'x',
          interaction: {
            mode: 'index' as const,
            intersect: false,
            axis: panel.indexAxis === 'y' ? ('y' as const) : ('x' as const),
          },
          scales: {
            x: {
              stacked: panel.stacked,
              beginAtZero: panel.indexAxis === 'y',
              grid: { display: panel.indexAxis !== 'y', color: '#edf2f8' },
              ticks: {
                font: { size: panel.indexAxis === 'y' ? 9 : 11 },
                maxRotation: 0,
                autoSkip: panel.indexAxis !== 'y',
                maxTicksLimit: 4,
                ...(panel.indexAxis === 'y' ? { callback: compact } : {}),
              },
            },
            y: {
              stacked: panel.stacked,
              beginAtZero: true,
              grid: { display: panel.indexAxis !== 'y', color: '#edf2f8' },
              ticks:
                panel.indexAxis === 'y'
                  ? { font: { size: 9 }, autoSkip: false }
                  : { font: { size: 10 }, maxTicksLimit: 4, callback: compact },
            },
          },
        }),
  };
  return (
    <article
      className="card category-chart-panel insight-card"
      aria-label={panel.title}
      style={panel.desktopOrder !== undefined ? { order: panel.desktopOrder } : undefined}
    >
      <div className="insight-heading">
        <h2>{panel.title}</h2>
        {control}
      </div>
      {panel.rows.some((r) => r.amount > 0 || r.details.some((detail) => detail.amount > 0)) ? (
        <div className="category-chart insight-canvas">
          <Chart
            type={panel.type}
            data={panel.data}
            options={options}
            role="img"
            tabIndex={0}
            aria-label={`${panel.title}. ${panel.period}. ${panel.rows.map((r) => (panel.indexAxis === 'y' ? `${r.name}: tháng trước ${money(r.details[0]?.amount || 0)}, tháng này ${money(r.amount)}` : `${r.name}: ${money(r.amount)}`)).join('; ')}. Dùng phím mũi tên để xem chi tiết.`}
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
  lead,
  groups,
  records,
  month,
  kind,
  data,
  customIcons = [],
}: {
  lead: ReactNode;
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
  month: string;
  kind: 'expense' | 'debt';
  data: FinanceData;
  customIcons?: CustomIcon[];
}) {
  const today = useVietnamToday();
  const [direction, setDirection] = useState<'payable' | 'receivable'>('payable');
  const carousel = useWorkspaceCarousel({ handoffForwardSwipeAtEnd: true });
  const renderChartPages = (panels: Panel[], control?: ReactNode) => {
    const pages = panels.reduce<[Panel[], Panel[]]>(
      (result, panel, index) => {
        result[panel.mobilePage ?? (index === 0 ? 0 : 1)].push(panel);
        return result;
      },
      [[], []],
    );
    return (
      <div
        ref={carousel.ref}
        className="category-chart-carousel workspace-carousel"
        data-active-panel={carousel.active}
        onTouchStart={carousel.onTouchStart}
        onTouchMove={carousel.onTouchMove}
        onTouchEnd={carousel.onTouchEnd}
        onTouchCancel={carousel.onTouchCancel}
        onClickCapture={carousel.onClickCapture}
        onKeyDown={carousel.onKeyDown}
        role="region"
        aria-label="Biểu đồ phân loại. Vuốt ngang để xem nhóm biểu đồ tiếp theo."
        tabIndex={0}
      >
        {pages.map((pagePanels, index) => (
          <div
            className="category-chart-page workspace-carousel-screen"
            key={index}
            style={carousel.paneStyle(index)}
            inert={carousel.mobile && carousel.active !== index}
          >
            {index === 0 && lead}
            {pagePanels.map((panel) => (
              <InsightCard
                key={panel.title}
                panel={panel}
                control={control}
                kind={kind}
                customIcons={customIcons}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };
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
        showDetails: false,
        mobilePage: 1,
        desktopOrder: 1,
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
          color: r.color,
          icon: r.icon,
          customIconId: r.customIconId,
          metric: { label: 'Tỷ trọng', value: pct(r.amount, total) },
          details: current.map((g) => ({ label: g.name, amount: g.amount, color: g.color })),
        })),
      },
      {
        title: 'So với tháng trước',
        period: `${period(previousMonth)} → ${period(month)}`,
        type: 'bar',
        indexAxis: 'y',
        showLegend: true,
        showDetails: false,
        mobilePage: 0,
        desktopOrder: 2,
        totalLabel: `Tháng ${period(month)}`,
        data: {
          labels: rows.map((r) => r.name),
          datasets: [
            {
              label: `Tháng ${period(previousMonth)}`,
              data: rows.map((r) => r.previous),
              backgroundColor: '#94a3b8',
              maxBarThickness: 14,
            },
            {
              label: `Tháng ${period(month)}`,
              data: rows.map((r) => r.amount),
              backgroundColor: '#1d4ed8',
              maxBarThickness: 14,
            },
          ],
        },
        rows: rows.map((r) => ({
          id: r.id,
          name: r.name,
          amount: r.amount,
          color: r.color,
          icon: r.icon,
          customIconId: r.customIconId,
          metric: {
            label: `Tháng ${period(previousMonth)}`,
            value: money(r.previous),
          },
          details: [],
        })),
      },
      {
        title: 'Chi tiêu theo tuần',
        period: period(month),
        type: 'bar',
        stacked: true,
        mobilePage: 1,
        desktopOrder: 3,
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
    return renderChartPages(panels);
  }
  const { rows, weeks, settledAmount } = debtInsights(data, direction, today),
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
        metric: { label: 'Đã thanh toán', value: money(settledAmount) },
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
      showDetails: false,
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
        color: r.color,
        icon: 'icon' in r ? r.icon : undefined,
        metric: { label: 'Tỷ trọng', value: pct(r.amount, total) },
        details: rows.map((g) => ({ label: g.name, amount: g.amount, color: g.color })),
      })),
    },
  ];
  return renderChartPages(panels, control);
}
