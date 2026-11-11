import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { categoryIcons } from '../icons';
import { DebtSourceIcon } from '../debt-source-icon';
import { expenseCategoryId, type Expense, type FinanceData } from '../model';

export default function ExpenseDetails({ data, expense }: { data: FinanceData; expense: Expense }) {
  const debt = expense.debtId ? data.debts.find((item) => item.id === expense.debtId) : undefined;
  const source = debt && data.debtSources.find((item) => item.id === debt.debtSourceId);
  const categoryId = expenseCategoryId(data, expense);
  const category = data.categories.find((item) => item.id === categoryId);
  const date = new Date(expense.occurredAt);
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const day = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  return (
    <div className="expense-expanded-info" id={`expense-details-${expense.id}`}>
      {category && (
        <div className="expense-detail-item expense-detail-category">
          <small>Danh mục</small>
          <span>
            <Icon icon={categoryIcons[category.icon]} style={{ color: category.color }} />
            {category.name}
          </span>
        </div>
      )}
      {debt && (
        <div className="expense-detail-item expense-detail-source">
          <small>Nguồn công nợ</small>
          <span>
            {source && <DebtSourceIcon icon={source.icon} />}
            {source?.name || 'Nguồn công nợ không còn khả dụng'}
          </span>
        </div>
      )}
      <div className="expense-detail-item expense-detail-time">
        <small>Thời gian</small>
        <time dateTime={expense.occurredAt}>
          <span>{time}</span>
          <span>{day}</span>
        </time>
      </div>
      <div className="expense-detail-item expense-detail-payment">
        <small>Thanh toán</small>
        <span>{expense.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
      </div>
    </div>
  );
}
