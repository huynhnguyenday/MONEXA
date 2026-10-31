'use client';
import { type FormProps } from './types';
export function BudgetForm({ data, save, done, busy }: FormProps) {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const budget = Number(new FormData(e.currentTarget).get('budget'));
        if (await save({ ...data, budget })) done();
      }}
    >
      <fieldset disabled={busy}>
        <p className="dialog-description">
          Ngân sách này áp dụng chung cho các tháng. Tổng tiền còn lại = ngân sách − chi tiêu của
          tháng đang xem.
        </p>
        <label>
          Ngân sách tháng (VND)
          <input
            autoFocus
            type="number"
            inputMode="numeric"
            name="budget"
            min="0"
            max="1000000000000"
            step="1"
            defaultValue={data.budget}
            required
          />
        </label>
        <button className="button primary full">{busy ? 'Đang lưu…' : 'Lưu ngân sách'}</button>
      </fieldset>
    </form>
  );
}
