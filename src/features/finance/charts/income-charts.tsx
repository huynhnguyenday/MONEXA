'use client';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { budgetMonth, dateKey, money, type FinanceData } from '../model';
import './income-charts.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip, Legend);
export const allocationChartLabels = ['Tiết kiệm', 'Ngân sách'] as const;
const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${money(Number(c.raw))}` } },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12, font: { size: 11 } },
    },
    y: {
      beginAtZero: true,
      border: { display: false },
      grid: { color: '#edf2f8' },
      ticks: {
        maxTicksLimit: 3,
        callback: (v) =>
          Math.abs(Number(v)) >= 1e6
            ? `${Number(v) / 1e6}tr`
            : Math.abs(Number(v)) >= 1e3
              ? `${Number(v) / 1e3}k`
              : v,
      },
    },
  },
};
export default function IncomeChart({
  data,
  year,
  kind,
}: {
  data: FinanceData;
  year: string;
  kind: number;
}) {
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const source = (method: 'cash' | 'bank') =>
    months.map((month) =>
      data.fundTransfers
        .filter(
          (e) =>
            e.toFundId === 'savings' &&
            e.paymentMethod === method &&
            dateKey(e.occurredAt).startsWith(month),
        )
        .reduce((s, e) => s + e.amount, 0),
    );
  const datasets =
    kind === 1
      ? (['unallocated', 'savings'] as const).map((from, i) => ({
          label: from === 'savings' ? 'Từ tiết kiệm' : 'Từ thu nhập',
          backgroundColor: i ? '#d97706' : '#1d4ed8',
          borderRadius: 4,
          data: months.map((month) =>
            data.budgets
              .filter(
                (b) =>
                  b.transferId &&
                  budgetMonth(b) === month &&
                  data.fundTransfers.some((t) => t.id === b.transferId && t.fromFundId === from),
              )
              .reduce((s, b) => s + b.cash + b.bank, 0),
          ),
        }))
      : [
          { label: 'Tiền mặt', data: source('cash'), backgroundColor: '#059669', borderRadius: 4 },
          {
            label: 'Chuyển khoản',
            data: source('bank'),
            backgroundColor: '#1d4ed8',
            borderRadius: 4,
          },
        ];
  if (kind === 0)
    datasets.push({
      label: 'Rút sang ngân sách',
      data: months.map((month) =>
        data.fundTransfers
          .filter((e) => e.fromFundId === 'savings' && dateKey(e.occurredAt).startsWith(month))
          .reduce((s, e) => s + e.amount, 0),
      ),
      backgroundColor: '#d97706',
      borderRadius: 4,
    });
  return (
    <article className="card income-chart" aria-label={`Biểu đồ ${allocationChartLabels[kind]}`}>
      <div className="income-chart-heading">
        <h2>{allocationChartLabels[kind]}</h2>
      </div>
      <div className="income-chart-canvas">
        <Line
          options={options}
          data={{
            labels: months.map((m) => `T${Number(m.slice(5))}`),
            datasets: datasets.map((series) => ({
              ...series,
              borderColor: series.backgroundColor,
              backgroundColor: `${series.backgroundColor}18`,
              borderWidth: 2.5,
              pointRadius: 2,
              pointHoverRadius: 5,
              pointHitRadius: 12,
              tension: 0.3,
              fill: false,
            })),
          }}
          role="img"
          aria-label={`Biểu đồ đường ${allocationChartLabels[kind]} từng tháng năm ${year}, đơn vị VND`}
        />
      </div>
    </article>
  );
}
