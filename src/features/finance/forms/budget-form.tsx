'use client';
import PendingLabel from '@/components/pending-label';
import { useState } from 'react';
import DateTimeField from '@/components/date-time-field';
import { budgetMonth, dateFromKey, dateKey, dateKeyFromLocal } from '../model';
import { type FormProps } from './types';
export function BudgetForm({ data, save, done, busy, month }: FormProps & { month: string }) {
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date | null>(() => dateFromKey(
    month === dateKey().slice(0, 7) ? dateKey() : `${month}-01`,
  ));
  const [error, setError] = useState('');
  const selectedMonth = date ? dateKeyFromLocal(date).slice(0, 7) : month;
  const monthBudgets = data.budgets.filter((entry) => budgetMonth(entry) === selectedMonth);
  const cashTotal = monthBudgets.reduce((sum, entry) => sum + entry.cash, 0);
  const bankTotal = monthBudgets.reduce((sum, entry) => sum + entry.bank, 0);
  const format = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 13);
    return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
  };
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const value = Number(amount.replace(/\D/g, ''));
        if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000_000)
          return setError('Nhập số tiền từ 1 đến 1.000.000.000.000 ₫.');
        if (!date || !Number.isFinite(date.getTime()) || dateKeyFromLocal(date) > dateKey())
          return setError('Chọn ngày ghi nhận hợp lệ, không ở tương lai.');
        const cashAmount = method === 'cash' ? value : 0;
        const bankAmount = method === 'bank' ? value : 0;
        const budget = cashTotal + bankTotal + value;
        const entry = {
          id: crypto.randomUUID(),
          userId: 'personal' as const,
          cash: cashAmount,
          bank: bankAmount,
          month: selectedMonth,
          recordedAt: new Date(`${dateKeyFromLocal(date)}T00:00:00+07:00`).toISOString(),
        };
        if (await save({ ...data, budget, budgets: [...data.budgets, entry] })) done();
      }}
    >
      <fieldset disabled={busy}>
        <div className="budget-anchor-summary" aria-label={`Ngân sách tháng ${selectedMonth}`}>
          <strong>Đã ghi nhận cho {selectedMonth}</strong>
          <span className="cash-history">Tiền mặt <b>{new Intl.NumberFormat('vi-VN').format(cashTotal)} ₫</b></span>
          <span className="bank-history">Chuyển khoản <b>{new Intl.NumberFormat('vi-VN').format(bankTotal)} ₫</b></span>
        </div>
        <DateTimeField id="budget-date" label="Ngày ghi nhận ngân sách" value={date} onChange={setDate} withTime={false} past />
        <label>
          Hình thức
          <select value={method} onChange={(event) => setMethod(event.target.value as 'cash' | 'bank')}>
            <option value="cash">Tiền mặt</option>
            <option value="bank">Chuyển khoản</option>
          </select>
        </label>
        <label>
          Số tiền thêm vào ngân sách (VND)
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(format(event.target.value))}
            required
          />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button aria-busy={busy} className="button primary full monexa-action monexa-create">{busy ? <PendingLabel>Đang lưu</PendingLabel> : 'Thêm ngân sách'}</button>
      </fieldset>
    </form>
  );
}
