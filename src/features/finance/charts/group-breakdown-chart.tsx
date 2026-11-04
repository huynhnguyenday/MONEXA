'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  Tooltip,
  type ChartOptions,
} from 'chart.js';
import Pagination from '@/components/pagination';
import { money } from '../model';
import { groupBreakdown, type BreakdownGroup, type BreakdownRecord } from './group-breakdown';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function wrapName(name: string) {
  const words = name.match(/.{1,12}(?:\s|$)|\S{1,12}/g) ?? [name];
  return words.length > 2
    ? [words[0].trim(), `${words[1].trim()}…`]
    : words.map((word) => word.trim());
}

export default function GroupBreakdownChart({
  groups,
  records,
  period,
  title,
  kind,
  picker,
}: {
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
  period: string;
  title: string;
  kind: 'expense' | 'debt';
  picker: ReactNode;
}) {
  const [capacity, setCapacity] = useState(6);
  const [page, setPage] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0)
        setCapacity(Math.max(2, Math.min(12, Math.floor(entry.contentRect.width / 86))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setPage(0), [period]);
  const totals = useMemo(() => groupBreakdown(groups, records, period), [groups, records, period]);
  const pages = Math.max(1, Math.ceil(totals.length / capacity));
  const activePage = Math.min(page, pages - 1);
  const visible = totals.slice(activePage * capacity, (activePage + 1) * capacity);
  const noun = kind === 'expense' ? 'chi tiêu' : 'công nợ';
  const periodLabel =
    period.length === 4 ? `năm ${period}` : `tháng ${period.slice(5)}/${period.slice(0, 4)}`;
  const options: ChartOptions<'bar'> = {
    animation: false,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#142d4e',
        bodyColor: '#304968',
        borderColor: '#cbd8ea',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
        titleFont: { family: "'Be Vietnam Pro', sans-serif", size: 12, weight: 'bold' },
        bodyFont: { family: "'Be Vietnam Pro', sans-serif", size: 11, weight: 600 },
        callbacks: {
          title: (items) => visible[items[0]?.dataIndex]?.name ?? '',
          label: (item) => `Tổng ${noun}: ${money(item.parsed.y ?? 0)}`,
          afterLabel: (item) => `${visible[item.dataIndex]?.count ?? 0} khoản ${noun}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          color: '#304968',
          font: { size: 11, weight: 600 },
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#edf2f8' },
        ticks: {
          maxTicksLimit: 4,
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
        <h2>{title}</h2>
        {picker}
      </div>
      <div
        className="category-chart"
        ref={ref}
        role="img"
        aria-label={`${title}, ${periodLabel}. Tổng: ${money(totals.reduce((sum, group) => sum + group.amount, 0))}`}
      >
        {visible.length ? (
          <Bar
            options={options}
            data={{
              labels: visible.map((group) => wrapName(group.name)),
              datasets: [
                {
                  label: `Tổng ${noun}`,
                  data: visible.map((group) => group.amount),
                  backgroundColor: visible.map((group) => group.color),
                  borderRadius: 5,
                  maxBarThickness: 48,
                },
              ],
            }}
          />
        ) : (
          <div className="compact-empty">
            <p>
              {kind === 'expense'
                ? 'Thêm danh mục để xem biểu đồ.'
                : 'Thêm nguồn công nợ để xem biểu đồ.'}
            </p>
          </div>
        )}
      </div>
      <span className="sr-only">
        {visible
          .map((group) => `${group.name}: ${money(group.amount)}, ${group.count} khoản ${noun}`)
          .join('; ')}
      </span>
      {pages > 1 && (
        <Pagination
          label={`${title}, ${periodLabel}`}
          page={activePage}
          pages={pages}
          total={groups.length}
          onChange={setPage}
        />
      )}
    </article>
  );
}
