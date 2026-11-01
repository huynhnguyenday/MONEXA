'use client';
import { useState } from 'react';
import { budgetMonth } from '../model';
import { type FormProps } from './types';
export function BudgetForm({ data, save, done, busy, month }: FormProps & { month: string }) {
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [amount, setAmount] = useState('');
  const monthBudgets = data.budgets.filter((entry) => budgetMonth(entry) === month);
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
        const value = Number(amount.replace(/\D/g, ''));
        if (!value) return;
        const cashAmount = method === 'cash' ? value : 0;
        const bankAmount = method === 'bank' ? value : 0;
        const budget = cashTotal + bankTotal + value;
        const entry = {
          id: crypto.randomUUID(),
          userId: 'personal' as const,
          cash: cashAmount,
          bank: bankAmount,
          month,
          recordedAt: new Date().toISOString(),
        };
        if (await save({ ...data, budget, budgets: [...data.budgets, entry] })) done();
      }}
    >
      <fieldset disabled={busy}>
        <div className="budget-anchor-summary" aria-label={`Ngân sách tháng ${month}`}>
          <strong>Đã ghi nhận cho {month}</strong>
          <span className="cash-history">Tiền mặt <b>{new Intl.NumberFormat('vi-VN').format(cashTotal)} ₫</b></span>
          <span className="bank-history">Chuyển khoản <b>{new Intl.NumberFormat('vi-VN').format(bankTotal)} ₫</b></span>
        </div>
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
        <button className="button primary full">{busy ? 'Đang lưu…' : 'Thêm ngân sách'}</button>
      </fieldset>
    </form>
  );
}
