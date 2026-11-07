'use client';

import { Bar, Line } from 'react-chartjs-2';
import { useCallback, useEffect, useRef, useState } from 'react';
import ExpenseChartTooltip, { type ExpenseChartSelection } from './expense-chart-tooltip';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import { dateKey, money, type getStatistics } from '../model';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, BarElement, Filler, Tooltip);

const axisMoney = (value: string | number) => Number(value) >= 1_000_000
  ? `${Number(value) / 1_000_000}tr`
  : Number(value) >= 1_000 ? `${Number(value) / 1_000}k` : value;

const options: ChartOptions<'line'> = {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        autoSkip: true,
        maxTicksLimit: 8,
        maxRotation: 0,
        minRotation: 0,
        color: '#526581',
        font: { size: 11 },
      },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: '#edf2f8' },
      ticks: {
        maxTicksLimit: 5,
        color: '#64748b',
        font: { size: 11 },
        callback: axisMoney,
      },
    },
  },
};

const weekdayOptions: ChartOptions<'bar'> = {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { autoSkip: false, maxRotation: 0, minRotation: 0, color: '#526581', font: { size: 10 } },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: '#edf2f8' },
      ticks: {
        maxTicksLimit: 4,
        color: '#64748b',
        font: { size: 10 },
        callback: axisMoney,
      },
    },
  },
};

export default function Charts({ stats }: { stats: ReturnType<typeof getStatistics> }) {
  const [selection, setSelection] = useState<ExpenseChartSelection | null>(null);
  const activeTitle = useRef<string | null>(null);
  const dismissedTitle = useRef<string | null>(null);
  const close = useCallback(() => {
    dismissedTitle.current = activeTitle.current;
    setSelection(null);
  }, []);
  useEffect(() => setSelection(null), [stats]);
  useEffect(() => {
    const resetDismissal = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.chart canvas, .expense-chart-tooltip')) dismissedTitle.current = null;
    };
    document.addEventListener('pointermove', resetDismissal);
    return () => document.removeEventListener('pointermove', resetDismissal);
  }, []);
  const [year, month] = stats.month.split('-');
  const labels = stats.daily.map((_, index) => `${String(index + 1).padStart(2, '0')}/${month}`);
  const description = `Chi tiêu từng ngày tháng ${Number(month)}/${year}. Tổng ${money(stats.total)}. ${stats.daily.map((amount, index) => `${labels[index]}: ${money(amount)}`).join('; ')}.`;
  const show = (kind: 'daily' | 'weekday', index: number, x: number, y: number, clicked = false) => {
    const title = kind === 'daily' ? `Khoản chi ngày ${labels[index]}/${year}` : `${index === 6 ? 'Chủ nhật' : `Thứ ${index + 2}`} · ${month}/${year}`;
    if (!clicked && dismissedTitle.current === title) return;
    dismissedTitle.current = null;
    activeTitle.current = title;
    const items = stats.expenses.filter(expense => kind === 'daily'
      ? dateKey(expense.occurredAt) === `${stats.month}-${String(index + 1).padStart(2, '0')}`
      : (new Date(`${dateKey(expense.occurredAt)}T12:00:00Z`).getUTCDay() + 6) % 7 === index);
    setSelection(previous => previous?.title === title && previous.x === x && previous.y === y
      ? previous : { title, items, x, y, average: kind === 'weekday' ? stats.weekday[index] : undefined });
  };
  const handlers = (kind: 'daily' | 'weekday') => {
    const hover: NonNullable<ChartOptions<'line'>['onHover']> = (event, elements, chart) => {
      if (event.type !== 'mousemove' || !window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches) return;
      const point = elements[0];
      if (!point) return;
      const rect = chart.canvas.getBoundingClientRect();
      show(kind, point.index, rect.left + point.element.x, rect.top + point.element.y);
    };
    const click: NonNullable<ChartOptions<'line'>['onClick']> = (event, _elements, chart) => {
      if (event.type !== 'click' || !event.native) return;
      const point = chart.getElementsAtEventForMode(event.native, 'nearest', { intersect: true }, false)[0];
      if (!point) { close(); return; }
      const rect = chart.canvas.getBoundingClientRect();
      show(kind, point.index, rect.left + point.element.x, rect.top + point.element.y, true);
    };
    return { onHover: hover, onClick: click };
  };
  const dailyOptions: ChartOptions<'line'> = { ...options, ...handlers('daily'), plugins: { ...options.plugins, tooltip: { enabled: false } } };
  const detailedWeekdayOptions: ChartOptions<'bar'> = { ...weekdayOptions, ...handlers('weekday'), plugins: { ...weekdayOptions.plugins, tooltip: { enabled: false } } };

  return (
    <>
    {selection && <ExpenseChartTooltip selection={selection} close={close} />}
    <article className="card chart-card daily-expenses-card">
      <div className="panel-heading">
        <h2>Chi tiêu từng ngày</h2>
        <span className="badge">VND · {month}/{year}</span>
      </div>
      <div className="chart">
        <Line
          onMouseLeave={() => { dismissedTitle.current = null; }}
          role="img"
          aria-label={description}
          options={dailyOptions}
          data={{
            labels,
            datasets: [{
              label: 'Chi tiêu',
              data: stats.daily,
              borderColor: '#1d4ed8',
              backgroundColor: '#1d4ed814',
              borderWidth: 2,
              pointRadius: 2,
              pointHoverRadius: 5,
              pointHitRadius: 12,
              pointBackgroundColor: '#1d4ed8',
              fill: true,
              cubicInterpolationMode: 'monotone',
            }],
          }}
        />
      </div>
    </article>
    <article className="card chart-card weekday-expenses-card">
      <div className="panel-heading">
        <h2>Trung bình theo thứ</h2>
        <span className="badge" title="Tổng chi theo thứ chia số ngày cùng thứ đã qua trong tháng. Múi giờ Việt Nam.">VND / NGÀY</span>
      </div>
      <div className="chart">
        <Bar
          onMouseLeave={() => { dismissedTitle.current = null; }}
          role="img"
          aria-label={`Chi tiêu trung bình theo thứ tháng ${Number(month)}/${year}. ${stats.weekday.map((amount, index) => `${index === 6 ? 'Chủ nhật' : `Thứ ${index + 2}`}: ${money(amount)}`).join('; ')}.`}
          options={detailedWeekdayOptions}
          data={{
            labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'],
            datasets: [{ label: 'Trung bình theo thứ', data: stats.weekday, backgroundColor: '#3b82f6', borderRadius: 5, maxBarThickness: 34 }],
          }}
        />
      </div>
    </article>
    </>
  );
}
