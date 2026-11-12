'use client';
import PendingLabel from '@/components/pending-label';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { categoryIcons } from '../icons';
import './debt-form.css';
import DateTimeField from '@/components/date-time-field';
import {
  assertLendingFunds,
  reconcileDebtExpenses,
  calculateAccounts,
  money,
  dateFromKey,
  dateKeyFromLocal,
  type Debt,
  PERSONAL_USER_ID,
} from '../model';
import { type FormProps, field } from './types';
export function DebtForm({ data, save, done, busy, debt }: { debt?: Debt } & FormProps) {
  const [amount, setAmount] = useState(
    debt ? new Intl.NumberFormat('vi-VN').format(debt.amount) : '',
  );
  const [due, setDue] = useState<Date | null>(debt?.dueDate ? dateFromKey(debt.dueDate) : null);
  const [debtSourceId, setDebtSourceId] = useState(
    debt?.debtSourceId || data.debtSources[0]?.id || '',
  );
  const [debtTypeId, setDebtTypeId] = useState(debt?.debtTypeId || data.debtTypes[0]?.id || '');
  const lending = data.debtTypes.find((type) => type.id === debtTypeId)?.direction === 'receivable';
  const accounts = calculateAccounts(data);
  const [error, setError] = useState('');
  const [categoryId, setCategoryId] = useState(
    debt?.categoryId === undefined
      ? (debt && data.expenses.find((expense) => expense.debtId === debt.id)?.categoryId) || ''
      : debt.categoryId || '',
  );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const f = new FormData(e.currentTarget);
        if (!due) return setError('Vui lòng chọn hạn thanh toán.');
        const source = data.debtSources.find((item) => item.id === debtSourceId);
        if (!source) return setError('Vui lòng chọn nguồn công nợ đã được tạo.');
        const debtType = data.debtTypes.find((type) => type.id === debtTypeId);
        if (!debtType) return setError('Vui lòng chọn loại công nợ.');
        const next: Debt = {
          userId: PERSONAL_USER_ID,
          id: debt?.id || crypto.randomUUID(),
          title: field(f, 'title'),
          amount: Number(String(f.get('amount')).replace(/\D/g, '')),
          debtTypeId: debtType.id,
          debtSourceId: source.id,
          categoryId: lending ? null : categoryId || null,
          paymentMethod: field(f, 'paymentMethod') as Debt['paymentMethod'],
          occurredAt: debt?.occurredAt || new Date().toISOString(),
          dueDate: dateKeyFromLocal(due),
          reminderReadFor: debt?.reminderReadFor,
          settledAt: debt?.settledAt || null,
          note: debt?.note || '',
        };
        const proposed = {
          ...data,
          debts: debt
            ? data.debts.map((d) => (d.id === debt.id ? next : d))
            : [next, ...data.debts],
        };
        try {
          assertLendingFunds(data, reconcileDebtExpenses(data, proposed));
          if (await save(proposed)) done();
        } catch {
          setError('Không đủ số dư nguồn tiền đã chọn để cho mượn hoặc dữ liệu không hợp lệ.');
        }
      }}
    >
      <fieldset disabled={busy}>
        <label>
          Tên khoản công nợ
          <input
            autoFocus
            name="title"
            defaultValue={debt?.title}
            maxLength={100}
            placeholder="Ví dụ: Cho mượn tiền, mượn mua máy…"
            required
          />
        </label>
        <div className="form-row debt-type-source-row">
          <label>
            Loại công nợ
            <select
              name="debtTypeId"
              value={debtTypeId}
              onChange={(event) => setDebtTypeId(event.target.value)}
              required
              disabled={!data.debtTypes.length}
            >
              {data.debtTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nguồn công nợ
            <select
              name="debtSourceId"
              value={debtSourceId}
              onChange={(e) => setDebtSourceId(e.target.value)}
              required
              disabled={!data.debtSources.length}
            >
              {!data.debtSources.length && <option value="">Chưa có nguồn công nợ</option>}
              {data.debtSources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
        </div>
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
            aria-label="Số tiền (VND)"
          />
        </label>
        <div className="form-row debt-payment-due-row">
          <label>
            Hình thức chi tiền
            <select name="paymentMethod" defaultValue={debt?.paymentMethod || 'cash'}>
              <option value="cash">
                Tiền mặt{lending ? ` — hiện có ${money(accounts.cash)}` : ''}
              </option>
              <option value="bank">
                Chuyển khoản{lending ? ` — hiện có ${money(accounts.bank)}` : ''}
              </option>
            </select>
          </label>
          <DateTimeField
            id="debt-due"
            label="Hạn thanh toán"
            value={due}
            onChange={setDue}
            withTime={false}
          />
        </div>
        {!data.debtSources.length && (
          <p role="alert" className="form-error">
            Hãy tạo nguồn công nợ trong navbar trước khi ghi công nợ.
          </p>
        )}
        {!data.debtTypes.length && (
          <p role="alert" className="form-error">
            Chưa có loại công nợ để chọn.
          </p>
        )}
        {!lending && (
          <>
            <div className="debt-category-heading">
              <label id="debt-category-label">
                Danh mục <span className="optional">(không bắt buộc)</span>
              </label>
              <button
                type="button"
                className="monexa-action monexa-reset"
                aria-label="Xóa chọn danh mục"
                title="Xóa chọn danh mục"
                disabled={!categoryId || busy}
                onClick={() => setCategoryId('')}
              >
                <Icon icon={faArrowRotateLeft} fixedWidth />
              </button>
            </div>
            <div
              className="expense-category-picker"
              role="group"
              aria-labelledby="debt-category-label"
            >
              {data.categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className={categoryId === category.id ? 'selected' : ''}
                  aria-pressed={categoryId === category.id}
                  onClick={() => setCategoryId(category.id)}
                >
                  <Icon icon={categoryIcons[category.icon]} style={{ color: category.color }} />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button
          aria-busy={busy}
          className="button primary full monexa-action monexa-create"
          disabled={!data.debtSources.length || !data.debtTypes.length || busy}
        >
          {busy ? <PendingLabel>Đang lưu</PendingLabel> : debt ? 'Lưu thay đổi' : 'Ghi công nợ'}
        </button>
      </fieldset>
    </form>
  );
}
