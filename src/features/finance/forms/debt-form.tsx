'use client';
import { useState } from 'react';
import DateTimeField from '@/components/date-time-field';
import { type Debt, type Person, PERSONAL_USER_ID } from '../model';
import { type FormProps, field } from './types';
export function DebtForm({ data, save, done, busy, debt }: { debt?: Debt } & FormProps) {
  const [date, setDate] = useState<Date | null>(debt ? new Date(debt.occurredAt) : new Date());
  const [due, setDue] = useState<Date | null>(debt?.dueAt ? new Date(debt.dueAt) : null);
  const [personId, setPersonId] = useState(debt?.personId || 'new');
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        const f = new FormData(e.currentTarget);
        if (!date || date.getTime() > Date.now())
          return setError('Thời gian ghi nhận không hợp lệ.');
        if (due && due < date) return setError('Hạn thanh toán phải sau thời gian ghi nhận.');
        if (debt?.settledAt && date > new Date(debt.settledAt))
          return setError('Thời gian ghi nhận phải trước thời gian hoàn tất.');
        const newName = field(f, 'personName');
        const existing = data.people.find(
          (p) => p.name.toLocaleLowerCase('vi') === newName.toLocaleLowerCase('vi'),
        );
        const person: Person | undefined =
          personId === 'new'
            ? existing || { id: crypto.randomUUID(), userId: PERSONAL_USER_ID, name: newName }
            : data.people.find((p) => p.id === personId);
        if (!person?.name) return setError('Vui lòng nhập người liên quan.');
        const next: Debt = {
          userId: PERSONAL_USER_ID,
          id: debt?.id || crypto.randomUUID(),
          title: field(f, 'title'),
          direction: field(f, 'direction') as Debt['direction'],
          amount: Number(f.get('amount')),
          personId: person.id,
          occurredAt: date.toISOString(),
          dueAt: due?.toISOString() || null,
          settledAt: debt?.settledAt || null,
          note: field(f, 'note'),
        };
        if (
          await save({
            ...data,
            people: data.people.some((p) => p.id === person.id)
              ? data.people
              : [...data.people, person],
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
            <select name="direction" defaultValue={debt?.direction || 'receivable'}>
              <option value="receivable">Phải thu · người khác nợ tôi</option>
              <option value="payable">Phải trả · tôi nợ người khác</option>
            </select>
          </label>
          <label>
            Số tiền (VND)
            <input
              name="amount"
              type="number"
              min="1"
              max="1000000000000"
              step="1"
              defaultValue={debt?.amount}
              required
              inputMode="numeric"
            />
          </label>
        </div>
        <label>
          Người liên quan
          <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="new">+ Thêm người liên quan</option>
            {data.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {personId === 'new' && (
          <label>
            Tên người liên quan
            <input name="personName" maxLength={80} placeholder="Tên người / đơn vị" required />
          </label>
        )}
        <DateTimeField
          id="debt-time"
          label="Thời gian ghi nhận"
          value={date}
          onChange={setDate}
          past
        />
        <DateTimeField
          id="debt-due"
          label="Hạn thanh toán (không bắt buộc)"
          value={due}
          onChange={setDue}
          optional
        />
        <label>
          Ghi chú <span className="optional">(không bắt buộc)</span>
          <textarea name="note" defaultValue={debt?.note} maxLength={500} rows={2} />
        </label>
        <p className="dialog-description">
          Công nợ được theo dõi riêng, không tự cộng vào chi tiêu hoặc trừ ngân sách để tránh tính
          trùng.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary full">
          {busy ? 'Đang lưu…' : debt ? 'Lưu thay đổi' : 'Ghi công nợ'}
        </button>
      </fieldset>
    </form>
  );
}
