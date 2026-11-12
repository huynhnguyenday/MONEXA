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
import { money } from '../model';
import { moneyAxisMaximum } from './money-axis';
import { categoryAxisIcons } from './category-axis-icons';
import { groupBreakdown, type BreakdownGroup, type BreakdownRecord } from './group-breakdown';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function wrapName(name: string, capacity: number) {
  const lines: string[] = [];
  for (const word of name.trim().split(/\s+/u)) {
    if (lines.length && lines[lines.length - 1].length + word.length + 1 <= capacity) {
      lines[lines.length - 1] += ' ' + word;
    } else {
      for (let offset = 0; offset < word.length; offset += capacity)
        lines.push(word.slice(offset, offset + capacity));
    }
  }
  return lines.length > 3 ? [...lines.slice(0, 2), lines[2] + '\u2026'] : lines;
}

export default function GroupBreakdownChart({
  groups,
  records,
  period,
  title,
  kind,
  picker,
  titleAction,
}: {
  groups: BreakdownGroup[];
  records: BreakdownRecord[];
  period: string;
  title: string;
  kind: 'expense' | 'debt';
  picker: ReactNode;
  titleAction?: ReactNode;
}) {
  const [width, setWidth] = useState(640);
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
  const totals = useMemo(() => groupBreakdown(groups, records, period), [groups, records, period]);
  const highest = totals.reduce((maximum, group) => Math.max(maximum, group.amount), 0);
  const axisMaximum = moneyAxisMaximum(highest);
  const slotWidth = Math.max(1, (width - 54) / Math.max(1, totals.length));
  const labelSize = slotWidth < 24 ? 8 : slotWidth < 48 ? 9 : 11;
  const labelCapacity = Math.max(1, Math.min(14, Math.floor(slotWidth / (labelSize * 0.65))));
  const compactLabels = kind === 'expense' && width < 480;
  const iconState = useRef({ groups: totals, enabled: compactLabels });
  iconState.current = { groups: totals, enabled: compactLabels };
  const iconPlugin = useMemo(() => categoryAxisIcons(() => iconState.current), []);
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
          title: (items) => totals[items[0]?.dataIndex]?.name ?? '',
          label: (item) => `Tổng ${noun}: ${money(item.parsed.y ?? 0)}`,
          afterLabel: (item) => `${totals[item.dataIndex]?.count ?? 0} khoản ${noun}`,
        },
      },
    },
    scales: {
      x: {
        afterFit: (axis) => {
          if (compactLabels) axis.height = 32;
        },
        grid: { display: false },
        border: { display: false },
        ticks: {
          callback: compactLabels ? () => '' : undefined,
          autoSkip: false,
          maxRotation: 0,
          minRotation: 0,
          color: '#304968',
          font: { size: labelSize, weight: 600, lineHeight: 1.15 },
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
        data-axis-labels={compactLabels ? 'icons' : 'text'}
        ref={ref}
        role="img"
        aria-label={`${title}, ${periodLabel}. Tổng: ${money(totals.reduce((sum, group) => sum + group.amount, 0))}`}
      >
        {totals.length ? (
          <Bar
            plugins={[iconPlugin]}
            options={options}
            data={{
              labels: totals.map((group) => wrapName(group.name, labelCapacity)),
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
                ? 'Thêm danh mục để xem biểu đồ.'
                : 'Thêm nguồn công nợ để xem biểu đồ.'}
            </p>
          </div>
        )}
      </div>
      <span className="sr-only">
        {totals
          .map((group) => `${group.name}: ${money(group.amount)}, ${group.count} khoản ${noun}`)
          .join('; ')}
      </span>
    </article>
  );
}
