'use client';

import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faClock, faRightLeft } from '@fortawesome/free-solid-svg-icons';
import { getMonthlyBudget, getCashStatistics, money, type FinanceData } from '../model';
import FinanceTooltip from './finance-tooltip';
import './budget-card.css';

type Props = {
  data: FinanceData;
  month: string;
  ready: boolean;
  onHistory: () => void;
  onExchange: () => void;
};

export default function BudgetCard({ data, month, ready, onHistory, onExchange }: Props) {
  const { reserve } = getCashStatistics(data, month);
  const {
    opening,
    closing: accounts,
    allocated,
    available: monthlySources,
  } = getMonthlyBudget(data, month);
  const income = monthlySources.total;
  const remaining = accounts.total;
  const percent = (value: number) =>
    income > 0 ? Math.max(0, Math.min((value / income) * 100, 100)) : value > 0 ? 100 : 0;
  const remainingOnTop = remaining <= reserve;
  const sourceRemaining = (method: 'cash' | 'bank') => accounts[method];
  const percentageLabel = (value: number) =>
    income > 0
      ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format((value / income) * 100)}%`
      : value > 0
        ? '—'
        : '0%';

  return (
    <article className="budget-card" aria-label="Ngân sách tháng">
      <div className="budget-summary">
        <div>
          <h2>Ngân sách tháng</h2>
          <strong title="Dư đầu kỳ cộng tiền được phân bổ thêm trong tháng">{money(income)}</strong>
        </div>
        <div className="budget-actions">
          <button
            type="button"
            className="monexa-action monexa-create"
            aria-label="Trao đổi tiền ngân sách"
            title="Trao đổi tiền ngân sách"
            disabled={!ready}
            onClick={onExchange}
          >
            <Icon icon={faRightLeft} />
          </button>
          <button
            className="button secondary budget-action-button budget-history-button"
            aria-label="Lịch sử ngân sách"
            title="Lịch sử ngân sách"
            disabled={!ready}
            onClick={onHistory}
          >
            <Icon icon={faClock} />
          </button>
        </div>
      </div>
      <div
        className="budget-progress"
        role="img"
        aria-label={`Ngân sách tháng: ${money(income)}. Dư chuyển kỳ: ${money(opening.total)}. Phân bổ thêm: ${money(allocated.cash + allocated.bank)}. Còn lại trong kỳ: ${money(remaining)}. Nợ phải trả chưa thanh toán trong tháng: ${money(reserve)}.`}
        title={
          income > 0
            ? `100% = dư đầu kỳ + phân bổ thêm: ${money(income)}`
            : 'Chưa có ngân sách trong tháng'
        }
      >
        <span
          className="budget-remaining-progress"
          style={{ width: `${percent(remaining)}%`, zIndex: remainingOnTop ? 2 : 1 }}
        />
        <span
          className="budget-debt-progress"
          style={{ width: `${percent(reserve)}%`, zIndex: remainingOnTop ? 1 : 2 }}
        />
      </div>
      <div className="budget-caption">
        <FinanceTooltip
          className="budget-caption-button budget-debt-caption"
          label={'N\u1ee3'}
          content={
            <div className="finance-tooltip-stats">
              <div className="finance-tooltip-stat">
                <span>Nợ còn phải trả</span>
                <b>{money(reserve)}</b>
              </div>{' '}
            </div>
          }
        >
          {' '}
          Nợ {percentageLabel(reserve)}{' '}
        </FinanceTooltip>
        <FinanceTooltip
          className="budget-caption-button budget-remaining-caption"
          label={'C\u00f2n l\u1ea1i'}
          content={
            <div className="finance-tooltip-stats">
              <div className="finance-tooltip-stat">
                <span>Tiền mặt</span>
                <b>{money(sourceRemaining('cash'))}</b>
              </div>
              <div className="finance-tooltip-stat">
                <span>Chuyển khoản</span>
                <b>{money(sourceRemaining('bank'))}</b>
              </div>{' '}
            </div>
          }
        >
          {' '}
          Còn lại {percentageLabel(remaining)}{' '}
        </FinanceTooltip>
        <FinanceTooltip
          className="budget-caption-button budget-total-caption"
          label={'T\u1ed5ng ng\u00e2n s\u00e1ch'}
          content={
            <div className="finance-tooltip-stats">
              <div className="finance-tooltip-stat">
                <span>Dư chuyển kỳ</span>
                <b>{money(opening.total)}</b>
              </div>
              <div className="finance-tooltip-stat">
                <span>Phân bổ thêm</span>
                <b>{money(allocated.cash + allocated.bank)}</b>
              </div>
              <div className="finance-tooltip-stat">
                <span>Tiền mặt</span>
                <b>{money(monthlySources.cash)}</b>
              </div>
              <div className="finance-tooltip-stat">
                <span>Chuyển khoản</span>
                <b>{money(monthlySources.bank)}</b>
              </div>{' '}
            </div>
          }
        >
          {' '}
          Tổng 100%{' '}
        </FinanceTooltip>
      </div>
    </article>
  );
}
