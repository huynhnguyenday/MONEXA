'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faPen, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
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
import MonthPicker from '@/components/month-picker';
import { type Category, type FinanceData, dateKey, money } from '../model';
import { categoryIcons } from '../icons';
import './category-panel.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function getChartOptions(chartCounts: number[], chartCategories: Category[], start: number): ChartOptions<'bar'> {
  return {
  animation: false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#142d4e',
      bodyColor: '#405a7c',
      borderColor: '#cbd8ea',
      borderWidth: 1,
      cornerRadius: 10,
      displayColors: true,
      boxPadding: 4,
      padding: 11,
      titleFont: { family: "'Be Vietnam Pro', sans-serif", size: 12, weight: 'bold' },
      bodyFont: { family: "'Be Vietnam Pro', sans-serif", size: 11, weight: 'normal' },
      callbacks: {
        title: (items) => chartCategories[items[0]?.dataIndex]?.name || '',
        label: (context) => `Tổng chi: ${money(context.parsed.y || 0)}`,
        afterLabel: (context) => `${chartCounts[start + context.dataIndex] ?? 0} khoản chi tiêu`,
      },
    },
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
        maxTicksLimit: 5,
        color: '#64748b',
        font: { size: 10 },
        callback: (value) => {
          const amount = Number(value);
          return amount >= 1_000_000 ? `${amount / 1_000_000}tr` : amount >= 1_000 ? `${amount / 1_000}k` : value;
        },
      },
    },
  },
  };
}

function wrapCategoryName(name: string) {
  const lines: string[] = [];
  let line = '';
  for (const word of name.split(/\s+/)) {
    if (line && `${line} ${word}`.length > 12) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export default function CategoryPanel({
  data,
  ready,
  month,
  onAdd,
  onEdit,
  onDelete,
}: {
  data: FinanceData;
  ready: boolean;
  month: string;
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  const [search, setSearch] = useState('');
  const [chartMonth, setChartMonth] = useState(month || dateKey().slice(0, 7));
  const [chartCapacity, setChartCapacity] = useState(6);
  const [chartPage, setChartPage] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => setChartMonth(month || dateKey().slice(0, 7)), [month]);
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) {
        setChartCapacity(Math.max(2, Math.min(12, Math.floor(entry.contentRect.width / 86))));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const filteredCategories = data.categories.filter((category) =>
    category.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
  );
  const monthExpenses = useMemo(
    () => data.expenses.filter((expense) => dateKey(expense.occurredAt).slice(0, 7) === chartMonth),
    [data.expenses, chartMonth],
  );
  const chartValues = data.categories.map((category) =>
    monthExpenses
      .filter((expense) => expense.categoryId === category.id)
      .reduce((sum, expense) => sum + expense.amount, 0),
  );
  const chartCounts = data.categories.map((category) =>
    monthExpenses.filter((expense) => expense.categoryId === category.id).length,
  );
  const pages = Math.max(1, Math.ceil(data.categories.length / chartCapacity));
  const activePage = Math.min(chartPage, pages - 1);
  const start = activePage * chartCapacity;
  const chartCategories = data.categories.slice(start, start + chartCapacity);
  const options = useMemo(
    () => getChartOptions(chartCounts, chartCategories, start),
    [chartCounts, chartCategories, start],
  );

  return (
    <section className="category-screen" aria-label="Quản lý danh mục">
      <article className="card category-list-panel">
        <div className="category-toolbar">
          <h2>Danh mục <span>({data.categories.length})</span></h2>
          <label className="search-box category-search-box">
            <Icon icon={faMagnifyingGlass} />
            <span className="sr-only">Tìm danh mục</span>
            <input
              type="search"
              value={search}
              placeholder="Tìm danh mục…"
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <button className="button primary category-add-button" disabled={!ready} onClick={onAdd}>
            <Icon icon={faPlus} />
            <span>Thêm danh mục</span>
          </button>
        </div>
        <div className="category-grid-viewport">
          {!filteredCategories.length ? (
            <div className="compact-empty"><p>Không tìm thấy danh mục phù hợp.</p></div>
          ) : (
            <div className="category-grid">
              {filteredCategories.map((category) => {
                const expenses = data.expenses.filter((expense) => expense.categoryId === category.id);
                const deleteReason = expenses.length
                  ? 'Danh mục đang có chi tiêu'
                  : data.categories.length === 1
                    ? 'Cần giữ ít nhất một danh mục'
                    : '';
                return (
                  <article className="category-tile" key={category.id}>
                    <span className="category-symbol" style={{ color: category.color, background: `${category.color}20` }}>
                      <Icon icon={categoryIcons[category.icon]} />
                    </span>
                    <div className="category-tile-info">
                      <button className="category-name" title={category.name} disabled={!ready} onClick={() => onEdit(category)}>
                        {category.name}
                      </button>
                      <span className="category-color"><i style={{ background: category.color }} />{category.color.toUpperCase()}</span>
                    </div>
                    <div className="table-actions category-tile-actions">
                      <button aria-label={`Sửa danh mục ${category.name}`} title="Sửa tên, icon, màu" disabled={!ready} onClick={() => onEdit(category)}>
                        <Icon icon={faPen} />
                      </button>
                      <button aria-label={`Xóa danh mục ${category.name}`} title={deleteReason || 'Xóa danh mục chưa sử dụng'} disabled={!ready || !!deleteReason} onClick={() => onDelete(category)}>
                        <Icon icon={faTrashCan} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </article>

      <article className="card category-chart-panel">
        <div className="category-chart-toolbar">
          <h2>Chi tiêu theo danh mục</h2>
          <MonthPicker value={chartMonth} onChange={(value) => { setChartMonth(value); setChartPage(0); }} />
          {pages > 1 && (
            <Pagination label="Danh mục biểu đồ" page={activePage} pages={pages} total={data.categories.length} onChange={setChartPage} />
          )}
        </div>
        <div className="category-chart" ref={chartRef} role="img" aria-label={`Tổng chi tiêu theo danh mục trong tháng ${chartMonth}`}>
          {chartCategories.length > 0 && <Bar
            options={options}
            data={{
              labels: chartCategories.map((category) => wrapCategoryName(category.name)),
              datasets: [{
                label: 'Chi tiêu',
                data: chartValues.slice(start, start + chartCapacity),
                backgroundColor: chartCategories.map((category) => category.color),
                borderRadius: 5,
                maxBarThickness: 48,
              }],
            }}
          />}
        </div>
      </article>
    </section>
  );
}
