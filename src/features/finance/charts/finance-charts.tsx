'use client';
import './workspace-gesture-plugin';

import { Bar, Line } from 'react-chartjs-2';
import { useCallback, useEffect, useState } from 'react';
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
import './finance-charts.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  BarElement,
  Filler,
  Tooltip,
);

const axisMoney = (value: string | number) =>
  Number(value) >= 1_000_000
    ? `${Number(value) / 1_000_000}tr`
    : Number(value) >= 1_000
      ? `${Number(value) / 1_000}k`
      : value;

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
      ticks: {
        autoSkip: false,
        maxRotation: 0,
        minRotation: 0,
        color: '#526581',
        font: { size: 10 },
      },
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
  const [mobile, setMobile] = useState(false);
  const [half, setHalf] = useState(0);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => setHalf(0), [stats.month]);
  const [selection, setSelection] = useState<ExpenseChartSelection | null>(null);
  const close = useCallback(() => {
    setSelection(null);
  }, []);
  useEffect(() => setSelection(null), [stats]);
  const [year, month] = stats.month.split('-');
  const labels = stats.daily.map((_, index) => `${String(index + 1).padStart(2, '0')}/${month}`);
  const offset = mobile && half === 1 ? 15 : 0;
  const daily = mobile ? stats.daily.slice(offset, half === 0 ? 15 : undefined) : stats.daily;
  const visibleLabels = labels.slice(offset, offset + daily.length);
  const description = `Chi tiêu từng ngày tháng ${Number(month)}/${year}. Tổng tháng ${money(stats.total)}. ${mobile ? (half === 0 ? 'Nửa tháng đầu. ' : 'Nửa tháng sau. ') : ''}${daily.map((amount, index) => `${visibleLabels[index]}: ${money(amount)}`).join('; ')}.`;
  const show = (kind: 'daily' | 'weekday', index: number, x: number, y: number) => {
    const title =
      kind === 'daily'
        ? `Khoản chi ngày ${labels[index]}/${year}`
        : `${index === 6 ? 'Chủ nhật' : `Thứ ${index + 2}`} · ${month}/${year}`;
    const items = stats.expenses.filter((expense) =>
      kind === 'daily'
        ? dateKey(expense.occurredAt) === `${stats.month}-${String(index + 1).padStart(2, '0')}`
        : (new Date(`${dateKey(expense.occurredAt)}T12:00:00Z`).getUTCDay() + 6) % 7 === index,
    );
    setSelection((previous) =>
      previous?.title === title && previous.x === x && previous.y === y
        ? previous
        : { title, items, x, y, average: kind === 'weekday' ? stats.weekday[index] : undefined },
    );
  };
  const handlers = (kind: 'daily' | 'weekday') => {
    const click: NonNullable<ChartOptions<'line'>['onClick']> = (event, _elements, chart) => {
      if (event.type !== 'click' || !event.native) return;
      const point = chart.getElementsAtEventForMode(
        event.native,
        'nearest',
        { intersect: true },
        false,
      )[0];
      if (!point) {
        close();
        return;
      }
      const rect = chart.canvas.getBoundingClientRect();
      show(
        kind,
        point.index + (kind === 'daily' ? offset : 0),
        rect.left + point.element.x,
        rect.top + point.element.y,
      );
    };
    return { onClick: click };
  };
  const dailyOptions: ChartOptions<'line'> = {
    ...options,
    ...handlers('daily'),
    plugins: { ...options.plugins, tooltip: { enabled: false } },
  };
  const detailedWeekdayOptions: ChartOptions<'bar'> = {
    ...weekdayOptions,
    ...handlers('weekday'),
    plugins: { ...weekdayOptions.plugins, tooltip: { enabled: false } },
  };

  return (
    <>
      {selection && <ExpenseChartTooltip selection={selection} close={close} />}
      <article className="card chart-card daily-expenses-card">
        <div className="panel-heading">
          <h2>Chi tiêu từng ngày</h2>
          <span className="badge daily-month-badge">
            VND · {month}/{year}
          </span>
          <button
            type="button"
            className="badge daily-half-toggle"
            aria-label={`Đang xem ${half === 0 ? 'nửa tháng đầu' : 'nửa tháng sau'}. Chuyển sang ${half === 0 ? 'nửa tháng sau' : 'nửa tháng đầu'}`}
            onClick={() => {
              close();
              setHalf((current) => 1 - current);
            }}
          >
            {half === 0 ? 'Nửa tháng đầu' : 'Nửa tháng sau'}
          </button>
        </div>
        <div className="chart">
          <Line
            role="img"
            aria-label={description}
            options={dailyOptions}
            data={{
              labels: visibleLabels,
              datasets: [
                {
                  label: 'Chi tiêu',
                  data: daily,
                  borderColor: '#1d4ed8',
                  backgroundColor: '#1d4ed814',
                  borderWidth: 2,
                  pointRadius: 2,
                  pointHoverRadius: 5,
                  pointHitRadius: 12,
                  pointBackgroundColor: '#1d4ed8',
                  fill: true,
                  cubicInterpolationMode: 'monotone',
                },
              ],
            }}
          />
        </div>
      </article>
      <article className="card chart-card weekday-expenses-card">
        <div className="panel-heading">
          <h2>Trung bình theo thứ</h2>
          <span
            className="badge"
            title="Tổng chi theo thứ chia số ngày cùng thứ đã qua trong tháng. Múi giờ Việt Nam."
          >
            VND / NGÀY
          </span>
        </div>
        <div className="chart">
          <Bar
            role="img"
            aria-label={`Chi tiêu trung bình theo thứ tháng ${Number(month)}/${year}. ${stats.weekday.map((amount, index) => `${index === 6 ? 'Chủ nhật' : `Thứ ${index + 2}`}: ${money(amount)}`).join('; ')}.`}
            options={detailedWeekdayOptions}
            data={{
              labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'],
              datasets: [
                {
                  label: 'Trung bình theo thứ',
                  data: stats.weekday,
                  backgroundColor: '#3b82f6',
                  borderRadius: 5,
                  maxBarThickness: 34,
                },
              ],
            }}
          />
        </div>
      </article>
    </>
  );
}
