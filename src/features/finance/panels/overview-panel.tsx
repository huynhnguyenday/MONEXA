'use client';
import { Fragment, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPen,
  faTrashCan,
  faMagnifyingGlass,
  faWallet,
  faArrowUp,
  faArrowDown,
  faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import Charts from '../charts/finance-charts';
import BudgetCard from '../components/budget-card';
import { getCashStatistics, dateKey, type Expense, type FinanceData, type getStatistics, displayTime, money } from '../model';
import { categoryIcons } from '../icons';

type Props = {
  data: FinanceData;
  stats: ReturnType<typeof getStatistics>;
  ready: boolean;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onBudget: () => void;
  onBudgetHistory: () => void;
  month: string;
};
export default function OverviewPanel({
  data,
  stats,
  ready,
  onAdd,
  onEdit,
  onDelete,
  onBudget,
  onBudgetHistory,
  month,
}: Props) {
  const [mobileView, setMobileView] = useState<'charts' | 'expenses'>('charts');
  const [search, setSearch] = useState('');
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = stats.expenses.filter((e) =>
    `${e.title} ${e.note} ${data.categories.find((c) => c.id === e.categoryId)?.name}`
      .toLocaleLowerCase('vi')
      .includes(search.toLocaleLowerCase('vi')),
  );
  const selectedMonth = month || dateKey().slice(0, 7);
  const cashStats = getCashStatistics(data, selectedMonth);
  const monthBudget = cashStats.income;
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
            <article className="stat overview-stat overview-stat-remaining">
              <span className="stat-label"><Icon icon={faArrowUp} aria-hidden="true" />Còn lại</span>
              <strong>{money(monthBudget - stats.total)}</strong>
              <small>Ngân sách − chi tiêu tháng</small>
            </article>
            <article className="stat overview-stat overview-stat-remaining" title={`Tổng tiền hiện có: ${money(data.balance)}. Nợ phải trả tháng đang xem: ${money(cashStats.reserve)}.`}>
              <span className="stat-label"><Icon icon={faWallet} aria-hidden="true" />Thực tế</span>
              <strong>{money(cashStats.actual)}</strong>
              <small>Tổng tiền − nợ tháng đang xem</small>
            </article>
            <article className="stat overview-stat overview-stat-spent">
              <span className="stat-label"><Icon icon={faArrowDown} aria-hidden="true" />Chi tiêu</span>
              <strong>{money(stats.total)}</strong>
              <small>{stats.expenses.length} khoản chi</small>
            </article>
            <article className="stat overview-stat overview-stat-average">
              <span className="stat-label"><Icon icon={faChartLine} aria-hidden="true" />Trung bình / ngày</span>
              <strong>{money(stats.average)}</strong>
              <small>Tính trên ngày đã qua</small>
            </article>
            <article className="stat overview-stat overview-stat-average">
              <span className="stat-label"><Icon icon={faChartLine} aria-hidden="true" />Trung bình kiếm</span>
              <strong>{money(cashStats.averageIncome)}</strong>
              <small>Tổng thu tháng / số ngày trong tháng</small>
            </article>
          </div>
          <Charts data={data} stats={stats} />
        </section>
        <aside className="overview-aside right-column">
          <BudgetCard data={data} expenses={stats.expenses} month={selectedMonth} ready={ready} onAdd={onBudget} onHistory={onBudgetHistory} />
          <article className="card expense-panel">
            <div className="panel-heading">
              <h2>Chi tiêu</h2>
              <label className="search-box expense-search-box">
                <Icon icon={faMagnifyingGlass} />
                <span className="sr-only">Tìm chi tiêu</span>
                <input
                  type="search"
                  value={search}
                  placeholder="Tìm khoản chi…"
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                />
              </label>
              <button
                className="button primary expense-add-button"
                aria-label="Thêm chi tiêu"
                title="Thêm chi tiêu"
                disabled={!ready}
                onClick={onAdd}
              >
                <Icon icon={faPlus} />
              </button>
            </div>
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
                    <col className="title-column" />
                    <col className="amount-column" />
                    <col className="action-column" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="expense-title-heading" scope="col">Khoản chi</th>
                      <th scope="col">Số tiền</th>
                      <th scope="col">
                        <span className="sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
              {filtered.map((expense) => {
                      const category = data.categories.find((c) => c.id === expense.categoryId)!;
                      const compactTitle = expense.title.trim().split(/\s+/).length > 40
                        ? `${expense.title.trim().split(/\s+/).slice(0, 40).join(' ')}…`
                        : expense.title;
                      const expanded = expandedExpense === expense.id;
                      return (
                        <Fragment key={expense.id}>
                          <tr
                            className={expanded ? 'expense-summary-row expanded' : 'expense-summary-row'}
                            tabIndex={0}
                            aria-label={`${expanded ? 'Thu gọn' : 'Xem chi tiết'} khoản chi ${expense.title}`}
                            aria-expanded={expanded}
                            aria-controls={`expense-details-${expense.id}`}
                            onClick={() => setExpandedExpense(expanded ? null : expense.id)}
                            onKeyDown={(event) => {
                              if (event.target !== event.currentTarget) return;
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setExpandedExpense(expanded ? null : expense.id);
                              }
                            }}
                          >
                            <td className="expense-title-cell">
                              <span className="expense-name" title={expense.title}>{compactTitle}</span>
                            </td>
                            <td className="expense-amount-td"><strong className="expense-amount-cell">{money(expense.amount)}</strong></td>
                            <td className="expense-actions-td"><div className="table-actions">
                              <button aria-label={`Sửa ${expense.title}`} title="Sửa / xem chi tiết" disabled={!ready} onClick={(event) => { event.stopPropagation(); onEdit(expense); }}><Icon icon={faPen} /></button>
                              <button aria-label={`Xóa ${expense.title}`} title="Xóa" disabled={!ready} onClick={(event) => { event.stopPropagation(); onDelete(expense); }}><Icon icon={faTrashCan} /></button>
                            </div></td>
                          </tr>
                          {expanded && <tr className="expense-details-row">
                            <td colSpan={3}>
                              <div className="expense-expanded-info" id={`expense-details-${expense.id}`}>
                                <div className="expense-detail-item">
                                  <small>Danh mục</small>
                                  <span><Icon icon={categoryIcons[category.icon]} style={{ color: category.color }} /> {category.name}</span>
                                </div>
                                <div className="expense-detail-item">
                                  <small>Thời gian</small>
                                  <time dateTime={expense.occurredAt}>{displayTime(expense.occurredAt)}</time>
                                </div>
                                <div className="expense-detail-item">
                                  <small>Thanh toán</small>
                                  <span>{expense.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
                                </div>
                              </div>
                            </td>
                          </tr>}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
