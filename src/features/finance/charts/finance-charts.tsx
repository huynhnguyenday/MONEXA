'use client';

import { Bar, Line } from 'react-chartjs-2';
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
import { money, type getStatistics } from '../model';

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
    tooltip: { callbacks: { label: (ctx) => `Chi tiêu: ${money(ctx.parsed.y ?? 0)}` } },
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
    tooltip: { callbacks: { label: (ctx) => money(ctx.parsed.y ?? 0) } },
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
  const [year, month] = stats.month.split('-');
  const labels = stats.daily.map((_, index) => `${String(index + 1).padStart(2, '0')}/${month}`);
  const description = `Chi tiêu từng ngày tháng ${Number(month)}/${year}. Tổng ${money(stats.total)}. ${stats.daily.map((amount, index) => `${labels[index]}: ${money(amount)}`).join('; ')}.`;

  return (
    <>
    <article className="card chart-card daily-expenses-card">
      <div className="panel-heading">
        <h2>Chi tiêu từng ngày</h2>
        <span className="badge">VND · {month}/{year}</span>
      </div>
      <div className="chart">
        <Line
          role="img"
          aria-label={description}
          options={options}
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
          role="img"
          aria-label={`Chi tiêu trung bình theo thứ tháng ${Number(month)}/${year}. ${stats.weekday.map((amount, index) => `${index === 6 ? 'Chủ nhật' : `Thứ ${index + 2}`}: ${money(amount)}`).join('; ')}.`}
          options={weekdayOptions}
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
