'use client';
import './workspace-gesture-plugin';
import { inspectionEvents } from './chart-inspection';
import { useCallback, useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import MonthPicker from '@/components/month-picker';
import ExpenseChartTooltip, { type ExpenseChartSelection } from './expense-chart-tooltip';
import { dateKey, money, type FinanceData } from '../model';
import { useVietnamToday } from '../hooks/use-vietnam-today';
import { debtSourceHistory } from './debt-source-history';
import './finance-charts.css';
import './debt-daily-chart.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

export default function DebtDailyChart({
  data,
  month,
  direction,
}: {
  data: FinanceData;
  month: string;
  direction: 'receivable' | 'payable';
}) {
  const initial = month || dateKey().slice(0, 7);
  const [dailyMonth, setDailyMonth] = useState(initial);
  const [half, setHalf] = useState(0);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => setHalf(0), [dailyMonth]);
  const [selection, setSelection] = useState<ExpenseChartSelection | null>(null);
  const today = useVietnamToday();
  const close = useCallback(() => setSelection(null), []);
  useEffect(() => {
    const next = month || dateKey().slice(0, 7);
    setDailyMonth(next);
  }, [month]);
  useEffect(close, [data, dailyMonth, direction, today, half, mobile, close]);
  const allDaily = debtSourceHistory(data, dailyMonth, direction, today);
  const daily = mobile
    ? allDaily.slice(half === 0 ? 0 : 15, half === 0 ? 15 : undefined)
    : allDaily;
  const label = direction === 'receivable' ? 'Thu nợ' : 'Trả nợ';
  const color = direction === 'receivable' ? '#1d4ed8' : '#dc2626';
  const options: ChartOptions<'line'> = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
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
          callback: (value) =>
            Number(value) >= 1_000_000
              ? `${Number(value) / 1_000_000}tr`
              : Number(value) >= 1000
                ? `${Number(value) / 1000}k`
                : value,
        },
      },
    },
    ...inspectionEvents((point, chart, hover) => {
      const entry = daily[point.index];
      if (!entry) return;
      const rect = chart.canvas.getBoundingClientRect();
      const next: ExpenseChartSelection = {
        title: `${label} ngày ${entry.date.split('-').reverse().join('/')}`,
        items: entry.items,
        anchor: chart.canvas,
        hover,
        x: rect.left + point.element.x,
        y: rect.top + point.element.y,
        detailLabel: 'Chi tiết thanh toán công nợ trên biểu đồ',
        totalLabel: direction === 'receivable' ? 'Tổng thu hồi' : 'Tổng trả nợ',
        emptyLabel: 'Không có khoản thanh toán.',
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
  };
  return (
    <>
      <article className="card category-chart-panel debt-daily-chart daily-expenses-card">
        <div className="category-chart-toolbar">
          <div className="debt-daily-heading">
            <h2>{label}</h2>
            <button
              type="button"
              className="badge daily-half-toggle"
              aria-label={`${label}: đang xem ${half === 0 ? 'nửa tháng đầu' : 'nửa tháng sau'}. Chuyển sang ${half === 0 ? 'nửa tháng sau' : 'nửa tháng đầu'}`}
              onClick={() => {
                close();
                setHalf((current) => 1 - current);
              }}
            >
              {half === 0 ? 'Nửa tháng đầu' : 'Nửa tháng sau'}
            </button>
          </div>
          <MonthPicker value={dailyMonth} onChange={setDailyMonth} />
        </div>
        <div className="category-chart">
          {daily.length ? (
            <Line
              role="img"
              aria-label={`${label} theo ngày, tháng ${dailyMonth}.${mobile ? ` ${half === 0 ? 'Nửa tháng đầu' : 'Nửa tháng sau'}.` : ''} ${daily.map((entry) => `${entry.date}: ${money(entry.amount)}`).join('; ')}`}
              options={options}
              data={{
                labels: daily.map((entry) => entry.date.slice(8) + '/' + entry.date.slice(5, 7)),
                datasets: [
                  {
                    label,
                    data: daily.map((entry) => entry.amount),
                    borderColor: color,
                    backgroundColor: `${color}14`,
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    pointHitRadius: 12,
                    pointBackgroundColor: color,
                    fill: true,
                    cubicInterpolationMode: 'monotone',
                  },
                ],
              }}
            />
          ) : (
            <div className="compact-empty">
              <p>
                {allDaily.length
                  ? 'Nửa tháng này chưa có dữ liệu thanh toán.'
                  : 'Tháng tương lai chưa có dữ liệu thanh toán.'}
              </p>
            </div>
          )}
        </div>
      </article>
      {selection && <ExpenseChartTooltip selection={selection} close={close} />}
    </>
  );
}
