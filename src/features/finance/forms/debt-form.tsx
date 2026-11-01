'use client';
import { useState } from 'react';
import DateTimeField from '@/components/date-time-field';
import { type Debt, PERSONAL_USER_ID } from '../model';
import { type FormProps, field } from './types';
export function DebtForm({ data, save, done, busy, debt }: { debt?: Debt } & FormProps) {
  const [amount, setAmount] = useState(debt ? new Intl.NumberFormat('vi-VN').format(debt.amount) : '');
  const [due, setDue] = useState<Date | null>(debt?.dueAt ? new Date(debt.dueAt) : null);
  const [personId, setPersonId] = useState(debt?.personId || data.people[0]?.id || '');
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const f = new FormData(e.currentTarget);
        if (!due) return setError('Vui lòng chọn hạn thanh toán.');
        const person = data.people.find((p) => p.id === personId);
        if (!person) return setError('Vui lòng chọn người liên quan đã được tạo.');
        const next: Debt = {
          userId: PERSONAL_USER_ID,
          id: debt?.id || crypto.randomUUID(),
          title: field(f, 'title'),
          direction: field(f, 'direction') as Debt['direction'],
          amount: Number(String(f.get('amount')).replace(/\D/g, '')),
          personId: person.id,
          occurredAt: debt?.occurredAt || new Date().toISOString(),
          dueAt: due.toISOString(),
          settledAt: debt?.settledAt || null,
          note: field(f, 'note'),
        };
        if (
          await save({
            ...data,
            debts: debt
              ? data.debts.map((d) => (d.id === debt.id ? next : d))
              : [next, ...data.debts],
          })
        )
          done();
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
        <div className="form-row">
          <label>
            Loại công nợ
          <select name="direction" defaultValue={debt?.direction || 'payable'}>
              <option value="receivable">Người khác nợ tôi</option>
              <option value="payable">Tôi nợ người khác</option>
            </select>
          </label>
          <label>
            Người liên quan
            <select value={personId} onChange={(e) => setPersonId(e.target.value)} required disabled={!data.people.length}>
              {!data.people.length && <option value="">Chưa có người liên quan</option>}
              {data.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <label>
          Số tiền (VND)
          <input name="amount" type="text" inputMode="numeric" value={amount} onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
            setAmount(digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '');
          }} required aria-label="Số tiền (VND)" />
        </label>
        {!data.people.length && (
          <p role="alert" className="form-error">
            Hãy tạo người liên quan trong navbar trước khi ghi công nợ.
          </p>
        )}
        <DateTimeField
          id="debt-due"
          label="Hạn thanh toán"
          value={due}
          onChange={setDue}
        />
        <label>
          Ghi chú <span className="optional">(không bắt buộc)</span>
          <textarea name="note" defaultValue={debt?.note} maxLength={500} rows={2} />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={!data.people.length || busy}>
          {busy ? 'Đang lưu…' : debt ? 'Lưu thay đổi' : 'Ghi công nợ'}
        </button>
      </fieldset>
    </form>
  );
}
