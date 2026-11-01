'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import DateTimeField from '@/components/date-time-field';
import { type Expense, PERSONAL_USER_ID } from '../model';
import { categoryIcons } from '../icons';
import { type FormProps, field } from './types';
export function ExpenseForm({
  data,
  save,
  done,
  busy,
  expense,
  onCategory,
}: { expense?: Expense; onCategory: () => void } & FormProps) {
  const [date, setDate] = useState<Date | null>(
    expense ? new Date(expense.occurredAt) : new Date(),
  );
  const [amount, setAmount] = useState(expense ? new Intl.NumberFormat('vi-VN').format(expense.amount) : '');
  const [categoryId, setCategoryId] = useState(expense?.categoryId || data.categories[0]?.id || '');
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const f = new FormData(e.currentTarget);
        if (!date || date.getTime() > Date.now())
          return setError('Chọn thời gian chi tiêu hợp lệ, không ở tương lai.');
        const next: Expense = {
          id: expense?.id || crypto.randomUUID(),
          userId: PERSONAL_USER_ID,
          title: field(f, 'title'),
          amount: Number(amount.replace(/\D/g, '')),
          paymentMethod: field(f, 'paymentMethod') as Expense['paymentMethod'],
          categoryId: field(f, 'categoryId'),
          occurredAt: date.toISOString(),
          note: '',
        };
        if (
          await save({
            ...data,
            expenses: expense
              ? data.expenses.map((item) => (item.id === expense.id ? next : item))
              : [next, ...data.expenses],
          })
        )
          done();
      }}
    >
      <fieldset disabled={busy}>
        <label>
          Tên chi tiêu
          <textarea
            name="title"
            defaultValue={expense?.title}
            maxLength={100}
            placeholder="Ví dụ: Ăn trưa, mua sách…"
            autoFocus
            required
            rows={2}
          />
        </label>
        <DateTimeField
          id="expense-time"
          label="Thời gian chi tiêu"
          value={date}
          onChange={setDate}
          past
        />
        <label>
          Số tiền (VND)
          <input
            name="amount"
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
              setAmount(digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '');
            }}
            required
            placeholder="Ví dụ: 50000"
          />
        </label>
        <label>Danh mục</label>
        <input type="hidden" name="categoryId" value={categoryId} />
        <div className="expense-category-picker" role="group" aria-label="Chọn danh mục chi tiêu">
          {data.categories.map((c) => (
            <button type="button" key={c.id} className={categoryId === c.id ? 'selected' : ''} aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
              <Icon icon={categoryIcons[c.icon]} style={{ color: c.color }} /> <span>{c.name}</span>
            </button>
          ))}
        </div>
        <label>
          Hình thức thanh toán
          <select name="paymentMethod" defaultValue={expense?.paymentMethod || 'cash'}>
            <option value="cash">Tiền mặt</option>
            <option value="bank">Chuyển khoản</option>
          </select>
        </label>
        <button type="button" className="inline-button" onClick={onCategory}>
          + Quản lý / thêm danh mục
        </button>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? 'Đang lưu…' : expense ? 'Lưu thay đổi' : 'Lưu chi tiêu'}
        </button>
      </fieldset>
    </form>
  );
}
