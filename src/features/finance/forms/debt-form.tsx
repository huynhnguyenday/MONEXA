'use client';
import Toast from '@/components/toast';
import PendingLabel from '@/components/pending-label';
import { useId, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons';
import CategoryIcon from '../components/category-icon';
import './debt-form.css';
import DateTimeField from '@/components/date-time-field';
import PaymentMethodField from '@/components/payment-method-field';
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
import { splitDebtInstallments } from './debt-installments';
export function DebtForm({ data, save, done, busy, debt }: { debt?: Debt } & FormProps) {
  const categoryLabelId = useId();
  const [installments, setInstallments] = useState<1 | 3 | 6>(1);
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
  const [method, setMethod] = useState<'cash' | 'bank'>(debt?.paymentMethod || 'cash');
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
        if (busy) return;
        setError('');
        const f = new FormData(e.currentTarget);
        if (!due) return setError('Vui lòng chọn hạn thanh toán.');
        const source = data.debtSources.find((item) => item.id === debtSourceId);
        if (!lending && !source) return setError('Vui lòng chọn nguồn công nợ đã được tạo.');
        const debtType = data.debtTypes.find((type) => type.id === debtTypeId);
        if (!debtType) return setError('Vui lòng chọn loại công nợ.');
        if (categoryId && !data.categories.some((category) => category.id === categoryId))
          return setError('Danh mục không hợp lệ.');
        const next: Debt = {
          userId: PERSONAL_USER_ID,
          id: debt?.id || crypto.randomUUID(),
          title: field(f, 'title'),
          amount: Number(String(f.get('amount')).replace(/\D/g, '')),
          debtTypeId: debtType.id,
          debtSourceId: lending ? '' : source!.id,
          categoryId: categoryId || null,
          paymentMethod: method,
          occurredAt: debt?.occurredAt || new Date().toISOString(),
          dueDate: dateKeyFromLocal(due),
          reminderReadFor: debt?.reminderReadFor,
          settledAt: debt?.settledAt || null,
          note: debt?.note || '',
        };
        try {
          const entries = splitDebtInstallments(next, debt ? 1 : installments);
          const proposed = {
            ...data,
            debts: debt
              ? data.debts.map((d) => (d.id === debt.id ? next : d))
              : [...entries, ...data.debts],
          };
          assertLendingFunds(data, reconcileDebtExpenses(data, proposed));
          if (await save(proposed)) done();
        } catch {
          setError(
            'Không đủ số dư nguồn tiền đã chọn hoặc số tiền không hợp lệ cho số kỳ trả góp.',
          );
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
            {lending ? 'Nguồn tiền' : 'Nguồn công nợ'}
            {lending ? (
              <input value="Ngân sách" readOnly />
            ) : (
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
            )}
          </label>
        </div>
        {!debt && (
          <div className="debt-installment-options" role="group" aria-label="Chia kỳ trả góp">
            {([3, 6] as const).map((months) => (
              <label key={months}>
                <input
                  type="checkbox"
                  checked={installments === months}
                  aria-label={`Trả góp ${months} tháng`}
                  onChange={() => setInstallments(installments === months ? 1 : months)}
                />
                {months} tháng
              </label>
            ))}
          </div>
        )}
        <div className="form-row debt-amount-due-row">
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
          <DateTimeField
            id="debt-due"
            label="Hạn thanh toán"
            value={due}
            onChange={setDue}
            withTime={false}
          />
        </div>
        <PaymentMethodField
          value={method}
          onChange={setMethod}
          legend="Hình thức chi tiền"
          cashDescription={lending ? `Hiện có ${money(accounts.cash)}` : undefined}
          bankDescription={lending ? `Hiện có ${money(accounts.bank)}` : undefined}
        />
        {!lending && !data.debtSources.length && (
          <Toast>Hãy tạo nguồn công nợ trong navbar trước khi ghi công nợ.</Toast>
        )}
        {!data.debtTypes.length && <Toast>Chưa có loại công nợ để chọn.</Toast>}
        <>
          <div className="debt-category-heading">
            <label id={categoryLabelId}>
              Danh mục <span>(tùy chọn)</span>
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
          <div className="expense-category-picker" role="group" aria-labelledby={categoryLabelId}>
            {data.categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={categoryId === category.id ? 'selected' : ''}
                aria-pressed={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              >
                <CategoryIcon
                  category={category}
                  assets={data.customIcons}
                  style={{ color: category.color }}
                />
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </>
        {error && <Toast>{error}</Toast>}
        <button
          aria-busy={busy}
          className="button primary full monexa-action monexa-create"
          disabled={(!lending && !data.debtSources.length) || !data.debtTypes.length || busy}
        >
          {busy ? <PendingLabel>Đang lưu</PendingLabel> : debt ? 'Lưu thay đổi' : 'Ghi công nợ'}
        </button>
      </fieldset>
    </form>
  );
}
