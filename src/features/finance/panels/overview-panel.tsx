'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPen,
  faTrashCan,
  faMagnifyingGlass,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import Pagination, { useViewportRows } from '@/components/pagination';
import Charts from '../charts/finance-charts';
import { type Expense, type FinanceData, type getStatistics, displayTime, money } from '../model';
import { categoryIcons } from '../icons';

type Props = {
  data: FinanceData;
  stats: ReturnType<typeof getStatistics>;
  ready: boolean;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onBudget: () => void;
};
export default function OverviewPanel({
  data,
  stats,
  ready,
  onAdd,
  onEdit,
  onDelete,
  onBudget,
}: Props) {
  const [mobileView, setMobileView] = useState<'charts' | 'expenses'>('charts');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const { ref, size } = useViewportRows(66);
  const filtered = stats.expenses.filter((e) =>
    `${e.title} ${e.note} ${data.categories.find((c) => c.id === e.categoryId)?.name}`
      .toLocaleLowerCase('vi')
      .includes(search.toLocaleLowerCase('vi')),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const activePage = Math.min(page, pages - 1);
  return (
    <section
      className={`overview-panel mobile-view-${mobileView}`}
      aria-label="Tổng quan tài chính"
    >
      <div className="mobile-panel-tabs" aria-label="Nội dung tổng quan">
        <button aria-pressed={mobileView === 'charts'} onClick={() => setMobileView('charts')}>
          Chỉ số & biểu đồ
        </button>
        <button aria-pressed={mobileView === 'expenses'} onClick={() => setMobileView('expenses')}>
          Chi tiêu ({stats.expenses.length})
        </button>
      </div>
      <div className="overview-grid">
        <section className="overview-main">
          <div className="compact-stats">
            <article className="stat balance">
              <span className="stat-label">Còn lại</span>
              <strong>{money(data.budget - stats.total)}</strong>
              <small>Ngân sách − chi tiêu tháng</small>
            </article>
            <article className="stat">
              <span className="stat-label">Đã chi tiêu</span>
              <strong>{money(stats.total)}</strong>
              <small>{stats.expenses.length} khoản chi</small>
            </article>
            <article className="stat">
              <span className="stat-label">Trung bình / ngày</span>
              <strong>{money(stats.average)}</strong>
              <small>Tính trên ngày đã qua</small>
            </article>
          </div>
          <Charts data={data} stats={stats} />
        </section>
        <aside className="overview-aside right-column">
          <article className="budget-card">
            <div className="budget-summary">
              <div>
                <h2>Ngân sách tháng</h2>
                <strong>{money(data.budget)}</strong>
              </div>
              <button
                className="icon-button"
                aria-label="Điều chỉnh ngân sách"
                title="Điều chỉnh ngân sách"
                disabled={!ready}
                onClick={onBudget}
              >
                <Icon icon={faPen} />
              </button>
            </div>
            <div className="progress">
              <span
                style={{
                  width: `${data.budget ? Math.min((stats.total / data.budget) * 100, 100) : 0}%`,
                }}
              />
            </div>
            <div className="budget-caption">
              <span>
                {data.budget ? Math.round((stats.total / data.budget) * 100) : 0}% đã dùng
              </span>
              <span className={stats.total > data.budget ? 'overdue-text' : ''}>
                {stats.total > data.budget
                  ? `Vượt ${money(stats.total - data.budget)}`
                  : 'Ngân sách áp dụng mỗi tháng'}
              </span>
            </div>
          </article>
          <article className="card expense-panel">
            <div className="panel-heading">
              <h2>Chi tiêu</h2>
              <button
                className="icon-button"
                aria-label="Thêm chi tiêu"
                title="Thêm chi tiêu"
                disabled={!ready}
                onClick={onAdd}
              >
                <Icon icon={faPlus} />
              </button>
            </div>
            <label className="search-box">
              <Icon icon={faMagnifyingGlass} />
              <span className="sr-only">Tìm chi tiêu</span>
              <input
                type="search"
                value={search}
                placeholder="Tìm khoản chi, danh mục…"
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <div className="expense-table-viewport" ref={ref}>
              {!filtered.length ? (
                <div className="compact-empty">
                  <Icon icon={faWallet} />
                  <p>
                    {stats.expenses.length
                      ? 'Không có kết quả phù hợp.'
                      : 'Chưa có chi tiêu trong tháng.'}
                  </p>
                  <button className="inline-button" disabled={!ready} onClick={onAdd}>
                    + Thêm chi tiêu
                  </button>
                </div>
              ) : (
                <table className="expense-table">
                  <caption className="sr-only">Chi tiêu trong tháng</caption>
                  <colgroup>
                    <col />
                    <col className="amount-column" />
                    <col className="action-column" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Khoản chi</th>
                      <th scope="col">Số tiền</th>
                      <th scope="col">
                        <span className="sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(activePage * size, (activePage + 1) * size).map((expense) => {
                      const category = data.categories.find((c) => c.id === expense.categoryId)!;
                      return (
                        <tr key={expense.id}>
                          <td>
                            <button
                              className="expense-name"
                              title={`${expense.title}${expense.note ? ` · ${expense.note}` : ''}`}
                              onClick={() => onEdit(expense)}
                              disabled={!ready}
                            >
                              {expense.title}
                            </button>
                            <div
                              className="expense-meta"
                              title={`${category.name} · ${displayTime(expense.occurredAt)}`}
                            >
                              <Icon
                                icon={categoryIcons[category.icon]}
                                style={{ color: category.color }}
                              />{' '}
                              {category.name}
                            </div>
                            <time dateTime={expense.occurredAt}>
                              {displayTime(expense.occurredAt)}
                            </time>
                          </td>
                          <td className="amount-cell">{money(expense.amount)}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                aria-label={`Sửa ${expense.title}`}
                                title="Sửa / xem chi tiết"
                                disabled={!ready}
                                onClick={() => onEdit(expense)}
                              >
                                <Icon icon={faPen} />
                              </button>
                              <button
                                aria-label={`Xóa ${expense.title}`}
                                title="Xóa"
                                disabled={!ready}
                                onClick={() => onDelete(expense)}
                              >
                                <Icon icon={faTrashCan} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <Pagination
              label="Chi tiêu"
              page={activePage}
              pages={pages}
              total={filtered.length}
              onChange={setPage}
            />
          </article>
        </aside>
      </div>
    </section>
  );
}
