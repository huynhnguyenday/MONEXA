'use client';
import { Fragment, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPen,
  faTrashCan,
  faMagnifyingGlass,
  faWallet,
  faClockRotateLeft,
  faCirclePlus,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import Charts from '../charts/finance-charts';
import { budgetMonth, dateKey, debtDirection, type Expense, type FinanceData, type getStatistics, displayTime, money } from '../model';
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
  const debtReserve = data.debts
    .filter((debt) => debtDirection(data, debt) === 'payable' && !debt.settledAt && !!debt.dueDate && debt.dueDate.slice(0, 7) === selectedMonth)
    .reduce((sum, debt) => sum + debt.amount, 0);
  const monthBudgets = data.budgets.filter((entry) => budgetMonth(entry) === selectedMonth);
  const cashBudget = monthBudgets.reduce((sum, entry) => sum + entry.cash, 0);
  const bankBudget = monthBudgets.reduce((sum, entry) => sum + entry.bank, 0);
  const monthBudget = cashBudget + bankBudget;
  const cashSpent = stats.expenses.filter((expense) => expense.paymentMethod === 'cash').reduce((sum, expense) => sum + expense.amount, 0);
  const bankSpent = stats.expenses.filter((expense) => expense.paymentMethod === 'bank').reduce((sum, expense) => sum + expense.amount, 0);
  const cashRemaining = Math.max(cashBudget - cashSpent, 0);
  const bankRemaining = Math.max(bankBudget - bankSpent, 0);
  const remaining = cashRemaining + bankRemaining;
  const netBudget = monthBudget - stats.total - debtReserve;
  const remainingPercent = monthBudget ? Math.min((remaining / monthBudget) * 100, 100) : 0;
  const reservePercent = monthBudget ? Math.min((debtReserve / monthBudget) * 100, 100) : debtReserve > 0 ? 100 : 0;
  const cashPercent = cashBudget ? Math.min((cashRemaining / cashBudget) * 100, 100) : 0;
  const bankPercent = bankBudget ? Math.min((bankRemaining / bankBudget) * 100, 100) : 0;
  const availablePercent = Math.max(remainingPercent - reservePercent, 0);
  const cashSegment = remaining ? availablePercent * (cashRemaining / remaining) : 0;
  const bankSegment = Math.max(availablePercent - cashSegment, 0);
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
              <strong>{money(monthBudget - stats.total)}</strong>
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
                <strong className={netBudget < 0 ? 'budget-negative' : ''}>{money(netBudget)}</strong>
              </div>
              <div className="budget-actions">
                <button
                  className="button primary budget-action-button budget-add-button"
                  aria-label="Thêm ngân sách"
                  title="Thêm ngân sách"
                  disabled={!ready}
                  onClick={onBudget}
                >
                  <Icon icon={faCirclePlus} />
                </button>
                <button className="button secondary budget-action-button budget-history-button" aria-label="Lịch sử ngân sách" title="Lịch sử ngân sách" disabled={!ready} onClick={onBudgetHistory}>
                  <Icon icon={faClock} />
                </button>
              </div>
            </div>
            <div className="progress">
              <span className={`budget-debt-progress ${availablePercent === 0 ? 'solo' : ''}`} style={{ width: `${reservePercent}%` }} />
              <span className="budget-cash-progress" style={{ width: `${cashSegment}%` }} />
              <span className="budget-bank-progress" style={{ width: `${bankSegment}%` }} />
            </div>
            <div className="budget-caption">
              <span className="budget-debt-caption">Giữ trả nợ: {money(debtReserve)}</span>
              <span className="budget-source-captions">Tiền mặt {Math.round(cashPercent)}% · Chuyển khoản {Math.round(bankPercent)}%</span>
            </div>
          </article>
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
