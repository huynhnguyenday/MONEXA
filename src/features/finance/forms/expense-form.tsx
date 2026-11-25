'use client';
import Toast from '@/components/toast';
import PendingLabel from '@/components/pending-label';
import { useState } from 'react';
import DateTimeField from '@/components/date-time-field';
import PaymentMethodField from '@/components/payment-method-field';
import { type Expense, PERSONAL_USER_ID } from '../model';
import CategoryIcon from '../components/category-icon';
import { type FormProps, field } from './types';
export function ExpenseForm({
  data,
  save,
  done,
  busy,
  expense,
}: { expense?: Expense } & FormProps) {
  const [date, setDate] = useState<Date | null>(() => {
    if (expense) return new Date(expense.occurredAt);
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now;
  });
  const [amount, setAmount] = useState(
    expense ? new Intl.NumberFormat('vi-VN').format(expense.amount) : '',
  );
  const [categoryId, setCategoryId] = useState(expense?.categoryId || data.categories[0]?.id || '');
  const [method, setMethod] = useState<Expense['paymentMethod']>(expense?.paymentMethod || 'cash');
  const [error, setError] = useState('');
  const categories = expense?.categoryId
    ? [...data.categories].sort(
        (a, b) => Number(b.id === expense.categoryId) - Number(a.id === expense.categoryId),
      )
    : data.categories;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setError('');
        const f = new FormData(e.currentTarget);
        if (!date || date.getTime() > Date.now())
          return setError('Chọn thời gian chi tiêu hợp lệ, không ở tương lai.');
        const next: Expense = {
          id: expense?.id || crypto.randomUUID(),
          userId: PERSONAL_USER_ID,
          title: field(f, 'title'),
          amount: Number(amount.replace(/\D/g, '')),
          paymentMethod: method,
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
        <div className="expense-amount-time-row">
          <DateTimeField
            id="expense-time"
            label="Thời gian chi tiêu"
            value={date}
            onChange={setDate}
            past
            wholeHours
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
        </div>
        <label>Danh mục</label>
        <input type="hidden" name="categoryId" value={categoryId} />
        <div className="expense-category-picker" role="group" aria-label="Chọn danh mục chi tiêu">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              className={categoryId === c.id ? 'selected' : ''}
              aria-pressed={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
            >
              <CategoryIcon category={c} assets={data.customIcons} style={{ color: c.color }} />{' '}
              <span>{c.name}</span>
            </button>
          ))}
        </div>
        <PaymentMethodField
          value={method}
          onChange={setMethod}
          className="expense-payment-method"
        />
        {error && <Toast>{error}</Toast>}
        <button
          aria-busy={busy}
          className="button primary full monexa-action monexa-create"
          disabled={busy}
        >
          {busy ? <PendingLabel>Đang lưu</PendingLabel> : expense ? 'Lưu thay đổi' : 'Lưu chi tiêu'}
        </button>
      </fieldset>
    </form>
  );
}
