'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faPen, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip, type ChartOptions } from 'chart.js';
import MonthPicker from '@/components/month-picker';
import Pagination from '@/components/pagination';
import { type DebtSource, type FinanceData, dateKey, money } from '../model';
import { DebtSourceIcon } from '../debt-source-icon';
import './category-panel.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function wrapSourceName(name: string) {
  const lines: string[] = [];
  let line = '';
  for (const word of name.split(/\s+/)) {
    if (line && `${line} ${word}`.length > 12) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export default function DebtSourcePanel({ data, ready, month, onAdd, onEdit, onDelete }: {
  data: FinanceData; ready: boolean; month: string; onAdd: () => void;
  onEdit: (source: DebtSource) => void; onDelete: (source: DebtSource) => void;
}) {
  const [search, setSearch] = useState('');
  const [chartMonth, setChartMonth] = useState(month);
  const [chartCapacity, setChartCapacity] = useState(6);
  const [chartPage, setChartPage] = useState(0);
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => setChartMonth(month), [month]);
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setChartCapacity(Math.max(2, Math.min(12, Math.floor(entry.contentRect.width / 86))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const sources = data.debtSources.filter((source) => source.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')));
  const debts = useMemo(() => data.debts.filter((debt) => dateKey(debt.occurredAt).slice(0, 7) === chartMonth), [data.debts, chartMonth]);
  const values = data.debtSources.map((source) => debts.filter((debt) => debt.debtSourceId === source.id).reduce((sum, debt) => sum + debt.amount, 0));
  const counts = data.debtSources.map((source) => debts.filter((debt) => debt.debtSourceId === source.id).length);
  const pages = Math.max(1, Math.ceil(data.debtSources.length / chartCapacity));
  const activePage = Math.min(chartPage, pages - 1);
  const start = activePage * chartCapacity;
  const chartSources = data.debtSources.slice(start, start + chartCapacity);
  const options: ChartOptions<'bar'> = {
    animation: false, responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: '#fff', titleColor: '#142d4e', bodyColor: '#405a7c', borderColor: '#cbd8ea', borderWidth: 1, cornerRadius: 10, padding: 11,
      titleFont: { family: "'Be Vietnam Pro', sans-serif", size: 12, weight: 'bold' }, bodyFont: { family: "'Be Vietnam Pro', sans-serif", size: 11 },
      callbacks: { title: (items) => chartSources[items[0]?.dataIndex]?.name || '', label: (item) => `Tổng công nợ: ${money(item.parsed.y || 0)}`, afterLabel: (item) => `${counts[start + item.dataIndex] || 0} khoản công nợ` },
    } },
    scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#526581', font: { size: 10 } } }, y: { beginAtZero: true, border: { display: false }, grid: { color: '#edf2f8' }, ticks: { maxTicksLimit: 5, color: '#64748b', callback: (value) => Number(value) >= 1_000_000 ? `${Number(value) / 1_000_000}tr` : Number(value) >= 1_000 ? `${Number(value) / 1_000}k` : value } } },
  };
  return <section className="category-screen" aria-label="Quản lý nguồn công nợ">
    <article className="card category-list-panel">
      <div className="category-toolbar">
        <h2>Nguồn công nợ <span>({data.debtSources.length})</span></h2>
        <label className="search-box category-search-box"><Icon icon={faMagnifyingGlass} /><span className="sr-only">Tìm nguồn công nợ</span><input type="search" value={search} placeholder="Tìm nguồn…" onChange={(event) => setSearch(event.target.value)} /></label>
        <button className="button primary category-add-button" disabled={!ready} onClick={onAdd}><Icon icon={faPlus} /><span>Thêm nguồn</span></button>
      </div>
      <div className="category-grid-viewport">
        {!sources.length ? <div className="compact-empty"><p>{data.debtSources.length ? 'Không tìm thấy nguồn phù hợp.' : 'Thêm nguồn như MoMo, Shopee, SEasy hoặc TikTok Shop để phân loại công nợ.'}</p></div> : <div className="category-grid">
          {sources.map((source) => {
            const linked = data.debts.some((debt) => debt.debtSourceId === source.id);
            return <article className="category-tile" key={source.id}>
              <span className="category-symbol" style={{ color: source.color, background: `${source.color}20` }}><DebtSourceIcon icon={source.icon} /></span>
              <div className="category-tile-info"><button className="category-name" title={source.name} disabled={!ready} onClick={() => onEdit(source)}>{source.name}</button><span className="category-color"><i style={{ background: source.color }} />{source.color.toUpperCase()}</span></div>
              <div className="table-actions category-tile-actions"><button aria-label={`Sửa nguồn ${source.name}`} title="Sửa nguồn" disabled={!ready} onClick={() => onEdit(source)}><Icon icon={faPen} /></button><button aria-label={`Xóa nguồn ${source.name}`} title={linked ? 'Nguồn đang được công nợ sử dụng' : 'Xóa nguồn'} disabled={!ready || linked} onClick={() => onDelete(source)}><Icon icon={faTrashCan} /></button></div>
            </article>;
          })}
        </div>}
      </div>
    </article>
    <article className="card category-chart-panel">
      <div className="category-chart-toolbar"><h2>Công nợ theo nguồn</h2><MonthPicker value={chartMonth} onChange={(value) => { setChartMonth(value); setChartPage(0); }} />{pages > 1 && <Pagination label="Nguồn công nợ biểu đồ" page={activePage} pages={pages} total={data.debtSources.length} onChange={setChartPage} />}</div>
      <div className="category-chart" ref={chartRef} role="img" aria-label={`Tổng công nợ theo nguồn trong tháng ${chartMonth}`}>
        {chartSources.length > 0 && <Bar options={options} data={{ labels: chartSources.map((source) => wrapSourceName(source.name)), datasets: [{ label: 'Công nợ', data: values.slice(start, start + chartCapacity), backgroundColor: chartSources.map((source) => source.color), borderRadius: 5, maxBarThickness: 48 }] }} />}
      </div>
    </article>
  </section>;
}
