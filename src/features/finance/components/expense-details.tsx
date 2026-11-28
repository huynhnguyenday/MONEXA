import CategoryIcon from './category-icon';
import { DebtSourceIcon } from '../debt-source-icon';
import { expenseCategoryId, type Expense, type FinanceData } from '../model';

export default function ExpenseDetails({ data, expense }: { data: FinanceData; expense: Expense }) {
  const debt = expense.debtId ? data.debts.find((item) => item.id === expense.debtId) : undefined;
  const source = debt && data.debtSources.find((item) => item.id === debt.debtSourceId);
  const categoryId = expenseCategoryId(data, expense);
  const category = data.categories.find((item) => item.id === categoryId);
  const sourceColor = source?.color || '#1d4ed8';
  const date = new Date(expense.occurredAt);
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return (
    <div
      className="expense-expanded-info"
      id={`expense-details-${expense.id}`}
      style={{ borderLeftColor: category?.color }}
    >
      {category && (
        <div className="expense-detail-item expense-detail-category">
          <small>Danh mục</small>
          <span style={{ color: category.color }}>
            <CategoryIcon
              category={category}
              assets={data.customIcons}
              style={{ color: category.color }}
            />
            {category.name}
          </span>
        </div>
      )}
      {debt && (
        <div className="expense-detail-item expense-detail-source">
          <small>Nguồn công nợ</small>
          <span style={{ color: sourceColor }}>
            {source && <DebtSourceIcon icon={source.icon} />}
            {source?.name ||
              (!debt.debtSourceId ? 'Ngân sách' : 'Nguồn công nợ không còn khả dụng')}
          </span>
        </div>
      )}
      <div className="expense-detail-item expense-detail-time">
        <small>Thời gian</small>
        <time dateTime={expense.occurredAt}>
          <span>{time}</span>
        </time>
      </div>
      <div className="expense-detail-item expense-detail-payment">
        <small>Thanh toán</small>
        <span>{expense.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
      </div>
    </div>
  );
}
