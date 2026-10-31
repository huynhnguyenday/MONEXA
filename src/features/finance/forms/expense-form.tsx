'use client';
import { useState } from 'react';
import DateTimeField from '@/components/date-time-field';
import { type Expense, money, PERSONAL_USER_ID } from '../model';
import { iconLabels } from '../icons';
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
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
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
          amount: Number(amount),
          categoryId: field(f, 'categoryId'),
          occurredAt: date.toISOString(),
          note: field(f, 'note'),
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
          <input
            name="title"
            defaultValue={expense?.title}
            maxLength={100}
            placeholder="Ví dụ: Ăn trưa, mua sách…"
            autoFocus
            required
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
            type="number"
            inputMode="numeric"
            min="1"
            max="1000000000000"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="Ví dụ: 50000"
          />
        </label>
        {Number(amount) > 0 && <div className="amount-preview">{money(Number(amount))}</div>}
        <label htmlFor="expense-category">Danh mục</label>
        <select
          id="expense-category"
          name="categoryId"
          defaultValue={expense?.categoryId || data.categories[0].id}
        >
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {iconLabels[c.icon]} · {c.name}
            </option>
          ))}
        </select>
        <button type="button" className="inline-button" onClick={onCategory}>
          + Quản lý / thêm danh mục
        </button>
        <label>
          Ghi chú <span className="optional">(không bắt buộc)</span>
          <textarea
            name="note"
            defaultValue={expense?.note}
            maxLength={500}
            rows={3}
            placeholder="Thêm một chút thông tin…"
          />
        </label>
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
