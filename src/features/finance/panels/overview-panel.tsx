'use client';
import { useMemo, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faFilter,
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
  debtSourceIdForDisplay,
  money,
} from '../model';
import ExpenseDetails from '../components/expense-details';
import ExpenseFilters, { emptyExpenseFilter } from '../components/expense-filters';
import { createNameAmountSearchMatcher } from '@/lib/search';
import { useHistoryWindow } from '../hooks/use-history-window';
import HistoryEnd from '../components/history-end';
import ExpenseTitle from '../components/expense-title';
import WorkspaceTabs from '../layout/workspace-tabs';
import { useWorkspaceCarousel } from '../hooks/use-workspace-carousel';
import '../layout/workspace-carousel.css';
import './overview-panel.css';

type Props = {
  data: FinanceData;
  stats: ReturnType<typeof getStatistics>;
  ready: boolean;
  onAdd: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onBudgetHistory: () => void;
  onBudgetExchange: () => void;
  month: string;
};

function TooltipStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`finance-tooltip-stat${highlight ? ' finance-tooltip-stat-highlight' : ''}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

export default function OverviewPanel({
  data,
  stats,
  ready,
  onAdd,
  onEdit,
  onDelete,
  onBudgetHistory,
  onBudgetExchange,
  month,
}: Props) {
  const carousel = useWorkspaceCarousel();
  const mobileView = carousel.active === 0 ? 'charts' : 'expenses';
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyExpenseFilter);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterCount = Object.values(filters).filter(Boolean).length;
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const matchesSearch = createNameAmountSearchMatcher(search);
    const sourceDebts = new Set(
      data.debts
        .filter((debt) => debtSourceIdForDisplay(data, debt) === filters.sourceId)
        .map((debt) => debt.id),
    );
    return stats.expenses.filter(
      (expense) =>
        matchesSearch(expense) &&
        (!filters.day || dateKey(expense.occurredAt) === filters.day) &&
        (!filters.categoryId || expense.categoryId === filters.categoryId) &&
        (!filters.sourceId || (!!expense.debtId && sourceDebts.has(expense.debtId))),
    );
  }, [stats.expenses, search, filters, data.debts, data.debtTypes]);
  const { viewportRef, endRef, visibleCount, hasMore } = useHistoryWindow(
    filtered.length,
    JSON.stringify([month, search, filters]),
    !ready,
  );
  const dayGroups = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const expense of filtered.slice(0, visibleCount)) {
      const day = dateKey(expense.occurredAt);
      const group = groups.get(day);
      if (group) group.push(expense);
      else groups.set(day, [expense]);
    }
    return [...groups].map(([day, expenses]) => ({ day, expenses }));
  }, [filtered, visibleCount]);
  const selectedMonth = month || dateKey().slice(0, 7);
  const cashStats = getCashStatistics(data, selectedMonth, stats.today);
  const monthBudget = cashStats.income;
  const periodBalances = getBudgetPeriod(data, selectedMonth);
  return (
    <section
      className={`overview-panel workspace-swipe mobile-view-${mobileView}`}
      aria-label="Tổng quan tài chính"
    >
      <WorkspaceTabs kind="overview" active={carousel.active} onSelect={carousel.select} />
      <div
        className="overview-grid workspace-carousel"
        ref={carousel.ref}
        data-active-panel={carousel.active}
        onTouchStart={carousel.onTouchStart}
        onTouchMove={carousel.onTouchMove}
        onTouchEnd={carousel.onTouchEnd}
        onTouchCancel={carousel.onTouchCancel}
        onClickCapture={carousel.onClickCapture}
        onKeyDown={carousel.onKeyDown}
        role="region"
        aria-label="Tổng quan và chi tiêu. Vuốt ngang để chuyển màn hình."
        tabIndex={0}
      >
        <section
          className="overview-main workspace-carousel-screen"
          style={carousel.paneStyle(0)}
          inert={carousel.mobile && carousel.active !== 0}
        >
          <div className="compact-stats">
            <FinanceTooltip
              as="article"
              className="stat overview-stat overview-stat-remaining"
              label="Còn lại trong tháng"
              placement="bottom"
              interaction="click"
              content={
                <>
                  <div className="finance-tooltip-stats">
                    <TooltipStat label="Dư đầu kỳ" value={money(periodBalances.opening.total)} />
                    <TooltipStat label="Tiền cấp tháng" value={money(monthBudget)} />
                    <TooltipStat label="Đã chi tiêu" value={money(stats.total)} />
                    <TooltipStat
                      label="Còn lại cuối kỳ"
                      value={money(periodBalances.closing.total)}
                      highlight
                    />
                  </div>
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
              interaction="click"
              content={
                <div className="finance-tooltip-stats">
                  <TooltipStat label="Tổng tiền hiện có" value={money(data.balance)} />
                  <TooltipStat
                    label="Nợ chưa thanh toán trong tháng"
                    value={money(cashStats.reserve)}
                  />
                  <TooltipStat
                    label="Thực tế sau khi trừ nợ"
                    value={money(cashStats.actual)}
                    highlight
                  />
                </div>
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
              interaction="click"
              content={
                <div className="finance-tooltip-stats">
                  <TooltipStat label="Nợ đến hạn trong tháng" value={money(cashStats.reserve)} />
                  <TooltipStat label="Số ngày thống kê" value={`${stats.elapsedDays} ngày`} />
                  <TooltipStat
                    label="Nợ trung bình mỗi ngày"
                    value={money(cashStats.averageDebt)}
                    highlight
                  />
                </div>
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
        <aside
          className="overview-aside right-column workspace-carousel-screen"
          style={carousel.paneStyle(1)}
          inert={carousel.mobile && carousel.active !== 1}
        >
          <BudgetCard
            data={data}
            month={selectedMonth}
            ready={ready}
            onHistory={onBudgetHistory}
            onExchange={onBudgetExchange}
          />
          <article className="card expense-panel">
            <div className="panel-heading">
              <h2 className="sr-only">Lịch sử chi tiêu</h2>
              <button
                type="button"
                className="expense-filter-button"
                aria-label="Lọc chi tiêu"
                title="Lọc chi tiêu"
                aria-haspopup="dialog"
                aria-expanded={filterOpen}
                data-active={filterCount > 0}
                onClick={() => setFilterOpen(true)}
              >
                <Icon icon={faFilter} />
                {filterCount > 0 && <span>{filterCount}</span>}
              </button>
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
                <div className="expense-day-list">
                  {dayGroups.map(({ day, expenses }) => (
                    <section
                      className="expense-day-group"
                      key={day}
                      aria-label={`Chi ti?u ng?y ${day}`}
                    >
                      <h3 className="expense-day-heading">
                        <time dateTime={day}>
                          {new Intl.DateTimeFormat('vi-VN', {
                            timeZone: 'Asia/Ho_Chi_Minh',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            weekday: 'long',
                          }).format(new Date(`${day}T00:00:00+07:00`))}
                        </time>
                      </h3>
                      <div className="expense-day-card">
                        <table className="expense-table">
                          <caption className="sr-only">Chi tiêu trong tháng</caption>
                          <colgroup>
                            <col className="title-column" />
                            <col className="amount-column" />
                            <col className="action-column" />
                          </colgroup>
                          <thead className="sr-only">
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
                          {expenses.map((expense) => {
                            const expanded = expandedExpense === expense.id;
                            return (
                              <tbody key={expense.id}>
                                <tr
                                  className={
                                    expanded
                                      ? 'expense-summary-row expanded'
                                      : 'expense-summary-row'
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
                                      <ExpenseDetails data={data} expense={expense} />
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            );
                          })}
                        </table>
                      </div>
                    </section>
                  ))}
                </div>
              )}
              <HistoryEnd endRef={endRef} hasMore={hasMore} />
            </div>
          </article>
        </aside>
      </div>
      {filterOpen && (
        <ExpenseFilters
          data={data}
          value={filters}
          apply={setFilters}
          close={() => setFilterOpen(false)}
        />
      )}
    </section>
  );
}
