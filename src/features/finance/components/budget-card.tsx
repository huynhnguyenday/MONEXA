'use client';

import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faCirclePlus, faClock } from '@fortawesome/free-solid-svg-icons';
import { calculateAccounts, getCashStatistics, money, type Expense, type FinanceData } from '../model';
import './budget-card.css';

type Props = {
  data: FinanceData;
  expenses: Expense[];
  month: string;
  ready: boolean;
  onAdd: () => void;
  onHistory: () => void;
};

export default function BudgetCard({ data, month, ready, onAdd, onHistory }: Props) {
  const { income, reserve } = getCashStatistics(data, month);
  const accounts = calculateAccounts(data);
  const remaining = accounts.total;
  const percent = (value: number) => income > 0 ? Math.max(0, Math.min(value / income * 100, 100)) : value > 0 ? 100 : 0;
  const remainingOnTop = remaining <= reserve;
  const sourceRemaining = (method: 'cash' | 'bank') => accounts[method];
  const percentageLabel = (value: number) => income > 0
    ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / income * 100)}%`
    : value > 0 ? '—' : '0%';

  return (
    <article className="budget-card" aria-label="Ngân sách tháng">
      <div className="budget-summary">
        <div>
          <h2>Ngân sách tháng</h2>
          <strong title="Tổng tiền đã kiếm được trong tháng">{money(income)}</strong>
        </div>
        <div className="budget-actions">
          <button className="button primary budget-action-button budget-add-button" aria-label="Thêm ngân sách" title="Thêm ngân sách" disabled={!ready} onClick={onAdd}>
            <Icon icon={faCirclePlus} />
          </button>
          <button className="button secondary budget-action-button budget-history-button" aria-label="Lịch sử ngân sách" title="Lịch sử ngân sách" disabled={!ready} onClick={onHistory}>
            <Icon icon={faClock} />
          </button>
        </div>
      </div>
      <div
        className="budget-progress"
        role="img"
        aria-label={`Tổng thu tháng: ${money(income)}. Tiền mặt và chuyển khoản còn lại: ${money(remaining)}. Nợ phải trả chưa thanh toán trong tháng: ${money(reserve)}.`}
        title={income > 0 ? `100% = ${money(income)}` : 'Chưa ghi nhận thu nhập trong tháng'}
      >
        <span className="budget-remaining-progress" style={{ width: `${percent(remaining)}%`, zIndex: remainingOnTop ? 2 : 1 }} />
        <span className="budget-debt-progress" style={{ width: `${percent(reserve)}%`, zIndex: remainingOnTop ? 1 : 2 }} />
      </div>
      <div className="budget-caption">
        <span className="budget-caption-item">
          <button type="button" className="budget-caption-button budget-remaining-caption" aria-describedby="budget-remaining-tooltip">Còn lại {percentageLabel(remaining)}</button>
          <span className="budget-caption-tooltip" id="budget-remaining-tooltip" role="tooltip">
            <span>Tiền mặt: <b>{money(sourceRemaining('cash'))}</b></span>
            <span>Chuyển khoản: <b>{money(sourceRemaining('bank'))}</b></span>
          </span>
        </span>
        <span className="budget-caption-item">
          <button type="button" className="budget-caption-button budget-debt-caption" aria-describedby="budget-debt-tooltip">Nợ {percentageLabel(reserve)}</button>
          <span className="budget-caption-tooltip" id="budget-debt-tooltip" role="tooltip">
            <span>Nợ còn phải trả: <b>{money(reserve)}</b></span>
          </span>
        </span>
      </div>
    </article>
  );
}
