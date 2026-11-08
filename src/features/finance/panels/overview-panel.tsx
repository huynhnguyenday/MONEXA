'use client';
import { Fragment, useMemo, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faPen,
  faTrashCan,
  faMagnifyingGlass,
  faWallet,
  faCoins,
  faReceipt,
  faChartLine,
  faFileInvoiceDollar,
} from '@fortawesome/free-solid-svg-icons';
import Charts from '../charts/finance-charts';
import BudgetCard from '../components/budget-card';
import FinanceTooltip from '../components/finance-tooltip';
import {
  getCashStatistics,
  getBudgetPeriod,
  dateKey,
  type Expense,
  type FinanceData,
  type getStatistics,
  displayTime,
  money,
} from '../model';
import { categoryIcons } from '../icons';
import { createNameAmountSearchMatcher } from '@/lib/search';
import { useHistoryWindow } from '../hooks/use-history-window';
import HistoryEnd from '../components/history-end';
import ExpenseTitle from '../components/expense-title';
import './overview-panel.css';

type Props = {
  data: FinanceData;
  stats: ReturnType<typeof getStatistics>;
  ready: boolean;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
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
  onBudgetHistory,
  month,
}: Props) {
  const [mobileView, setMobileView] = useState<'charts' | 'expenses'>('charts');
  const [search, setSearch] = useState('');
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const filtered = useMemo(
    () => stats.expenses.filter(createNameAmountSearchMatcher(search)),
    [stats.expenses, search],
  );
  const { viewportRef, endRef, visibleCount, hasMore } = useHistoryWindow(
    filtered.length,
    JSON.stringify([month, search]),
    !ready,
  );
  const selectedMonth = month || dateKey().slice(0, 7);
  const cashStats = getCashStatistics(data, selectedMonth, stats.today);
  const monthBudget = cashStats.income;
  const periodBalances = getBudgetPeriod(data, selectedMonth);
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
            <FinanceTooltip
              as="article"
              className="stat overview-stat overview-stat-remaining"
              label="Còn lại trong tháng"
              placement="bottom"
              content={
                <>
                  <span>
                    Dư đầu kỳ: <b>{money(periodBalances.opening.total)}</b>
                  </span>
                  <span>
                    Tiền cấp tháng: <b>{money(monthBudget)}</b>
                  </span>
                  <span>
                    Đã chi tiêu: <b>{money(stats.total)}</b>
                  </span>
                  <span>
                    Dư ngân sách cuối kỳ: <b>{money(periodBalances.closing.total)}</b>
                  </span>
                  <span>
                    Bao gồm biến động thu/trả công nợ; không gồm tiết kiệm hoặc thu nhập chưa phân
                    bổ.
                  </span>
                </>
              }
            >
              <span className="stat-label">
                <Icon icon={faCoins} aria-hidden="true" />
                Còn lại
              </span>
              <strong>{money(periodBalances.closing.total)}</strong>
              <small title="Dư đầu kỳ cộng các dòng tiền vào, trừ các dòng tiền ra của ngân sách">
                Có dư chuyển kỳ
              </small>
            </FinanceTooltip>
            <FinanceTooltip
              as="article"
              className="stat overview-stat overview-stat-remaining"
              label="Thực tế"
              placement="bottom"
              content={
                <>
                  <span>
                    Tổng tiền hiện có: <b>{money(data.balance)}</b>
                  </span>
                  <span>
                    Nợ phải trả trong tháng: <b>{money(cashStats.reserve)}</b>
                  </span>
                  <span>
                    Thực tế: <b>{money(cashStats.actual)}</b>
                  </span>
                </>
              }
            >
              <span className="stat-label">
                <Icon icon={faWallet} aria-hidden="true" />
                Thực tế
              </span>
              <strong>{money(cashStats.actual)}</strong>
              <small title="Tổng tiền hiện có trừ nợ phải trả trong tháng">Trừ nợ tháng</small>
            </FinanceTooltip>
            <article className="stat overview-stat overview-stat-spent">
              <span className="stat-label">
                <Icon icon={faReceipt} aria-hidden="true" />
                Chi tiêu
              </span>
              <strong>{money(stats.total)}</strong>
              <small>{stats.expenses.length} khoản chi</small>
            </article>
            <FinanceTooltip
              as="article"
              className="stat overview-stat overview-stat-debt"
              label="Nợ/ngày"
              placement="bottom"
              content={
                <>
                  <span>
                    Nợ phải trả trong tháng: <b>{money(cashStats.reserve)}</b>
                  </span>
                  <span>
                    Số ngày thống kê: <b>{stats.elapsedDays} ngày</b>
                  </span>
                  <span>
                    Nợ trung bình/ngày: <b>{money(cashStats.averageDebt)}</b>
                  </span>
                  <span>Chỉ gồm nợ phải trả chưa hoàn tất, đến hạn trong tháng đang xem.</span>
                  <span>
                    Tháng hiện tại tính đến hôm nay; tháng đã qua tính đủ ngày; tháng tương lai bằng
                    0.
                  </span>
                </>
              }
            >
              <span className="stat-label">
                <Icon icon={faFileInvoiceDollar} aria-hidden="true" />
                Nợ/ngày
              </span>
              <strong>{money(cashStats.averageDebt)}</strong>
              <small title="Tổng nợ phải trả chưa hoàn tất đến hạn trong tháng chia cho số ngày thống kê">
                Nợ / {stats.elapsedDays} ngày
              </small>
            </FinanceTooltip>
            <article className="stat overview-stat overview-stat-average">
              <span className="stat-label">
                <Icon icon={faChartLine} aria-hidden="true" />
                Chi/ngày
              </span>
              <strong>{money(stats.average)}</strong>
              <small title="Tổng chi tháng chia cho số ngày thống kê">
                Chi / {stats.elapsedDays} ngày
              </small>
            </article>
            <article className="stat overview-stat overview-stat-average">
              <span className="stat-label">
                <Icon icon={faChartLine} aria-hidden="true" />
                Cấp/ngày
              </span>
              <strong>{money(cashStats.averageIncome)}</strong>
              <small title="Tổng tiền cấp ngân sách tháng chia cho số ngày thống kê">
                Cấp / {stats.elapsedDays} ngày
              </small>
            </article>
          </div>
          <Charts stats={stats} />
        </section>
        <aside className="overview-aside right-column">
          <BudgetCard
            data={data}
            expenses={stats.expenses}
            month={selectedMonth}
            ready={ready}
            onHistory={onBudgetHistory}
          />
          <article className="card expense-panel">
            <div className="panel-heading">
              <h2>Chi tiêu</h2>
              <label className="search-box expense-search-box">
                <Icon icon={faMagnifyingGlass} />
                <span className="sr-only">Tìm chi tiêu</span>
                <input
                  type="search"
                  value={search}
                  placeholder="Tìm tên hoặc số tiền…"
                  title="Tìm tên khoản chi hoặc số tiền ±20.000đ trong tháng đang chọn"
                  onChange={(e) => {
                    setSearch(e.target.value);
                  }}
                />
              </label>
              <button
                className="button primary expense-add-button monexa-action monexa-create"
                aria-label="Thêm chi tiêu"
                title="Thêm chi tiêu"
                disabled={!ready}
                onClick={onAdd}
              >
                <Icon icon={faPlus} />
              </button>
            </div>
            <div
              className="expense-table-viewport"
              ref={viewportRef}
              role="region"
              aria-label="Lịch sử chi tiêu"
              tabIndex={0}
            >
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
                      <th className="expense-title-heading" scope="col">
                        Khoản chi
                      </th>
                      <th scope="col">Số tiền</th>
                      <th scope="col">
                        <span className="sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, visibleCount).map((expense) => {
                      const category = data.categories.find((c) => c.id === expense.categoryId)!;
                      const expanded = expandedExpense === expense.id;
                      return (
                        <Fragment key={expense.id}>
                          <tr
                            className={
                              expanded ? 'expense-summary-row expanded' : 'expense-summary-row'
                            }
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
                              <ExpenseTitle title={expense.title} />
                            </td>
                            <td className="expense-amount-td">
                              <strong className="expense-amount-cell">
                                {money(expense.amount)}
                              </strong>
                            </td>
                            <td className="expense-actions-td">
                              <div className="table-actions">
                                <button
                                  className="table-edit-action"
                                  aria-label={`Sửa ${expense.title}`}
                                  title="Sửa / xem chi tiết"
                                  disabled={!ready}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onEdit(expense);
                                  }}
                                >
                                  <Icon icon={faPen} />
                                </button>
                                <button
                                  aria-label={`Xóa ${expense.title}`}
                                  title="Xóa"
                                  disabled={!ready}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onDelete(expense);
                                  }}
                                >
                                  <Icon icon={faTrashCan} />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="expense-details-row">
                              <td colSpan={3}>
                                <div
                                  className="expense-expanded-info"
                                  id={`expense-details-${expense.id}`}
                                >
                                  <div className="expense-detail-item expense-detail-category">
                                    <small>Danh mục</small>
                                    <span>
                                      <Icon
                                        icon={categoryIcons[category.icon]}
                                        style={{ color: category.color }}
                                      />{' '}
                                      {category.name}
                                    </span>
                                  </div>
                                  <div className="expense-detail-item expense-detail-time">
                                    <small>Thời gian</small>
                                    <time dateTime={expense.occurredAt}>
                                      {displayTime(expense.occurredAt)}
                                    </time>
                                  </div>
                                  <div className="expense-detail-item expense-detail-payment">
                                    <small>Thanh toán</small>
                                    <span>
                                      {expense.paymentMethod === 'cash'
                                        ? 'Tiền mặt'
                                        : 'Chuyển khoản'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <HistoryEnd endRef={endRef} hasMore={hasMore} />
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
