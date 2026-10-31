'use client';
import { useEffect, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import Pagination from '@/components/pagination';
import { money, type FinanceData, type getStatistics } from '../model';
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
const options: ChartOptions<'bar'> = {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (ctx) => money(ctx.parsed.y || 0) } },
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
      border: { display: false },
      grid: { color: '#edf2f8' },
      ticks: {
        maxTicksLimit: 4,
        color: '#64748b',
        font: { size: 10 },
        callback: (v) =>
          Number(v) >= 1000000
            ? `${Number(v) / 1000000}tr`
            : Number(v) >= 1000
              ? `${Number(v) / 1000}k`
              : v,
      },
    },
  },
};
function wrapLabel(label: string) {
  const words = label.match(/.{1,14}(?:\s|$)|.{1,14}/g);
  return words?.map((word) => word.trim()) || [label];
}
export default function Charts({
  data,
  stats,
}: {
  data: FinanceData;
  stats: ReturnType<typeof getStatistics>;
}) {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState(6),
    [page, setPage] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0)
        setSize(Math.max(2, Math.min(10, Math.floor(entry.contentRect.width / 90))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const pages = Math.max(1, Math.ceil(data.categories.length / size)),
    activePage = Math.min(page, pages - 1),
    start = activePage * size;
  const categories = data.categories.slice(start, start + size);
  return (
    <>
      <article className="card chart-card" ref={ref}>
        <div className="panel-heading">
          <h2>Chi tiêu theo danh mục</h2>
          {pages > 1 ? (
            <Pagination
              label="Danh mục biểu đồ"
              page={activePage}
              pages={pages}
              total={data.categories.length}
              onChange={setPage}
            />
          ) : (
            <span className="badge">VND</span>
          )}
        </div>
        <div
          className="chart"
          role="img"
          aria-label={`Chi tiêu theo danh mục. Tổng ${money(stats.total)}`}
        >
          <Bar
            options={options}
            data={{
              labels: categories.map((c) => wrapLabel(c.name)),
              datasets: [
                {
                  data: stats.categories.slice(start, start + size),
                  backgroundColor: categories.map((c) => c.color),
                  borderRadius: 5,
                  maxBarThickness: 44,
                },
              ],
            }}
          />
        </div>
      </article>
      <article className="card chart-card">
        <div className="panel-heading">
          <h2>Trung bình theo thứ</h2>
          <span
            className="badge"
            title="Tổng chi theo thứ chia số ngày cùng thứ đã qua trong tháng. Múi giờ Việt Nam."
          >
            VND / NGÀY
          </span>
        </div>
        <div
          className="chart"
          role="img"
          aria-label="Biểu đồ chi tiêu trung bình từ thứ hai đến chủ nhật"
        >
          <Bar
            options={options}
            data={{
              labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'],
              datasets: [
                {
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
