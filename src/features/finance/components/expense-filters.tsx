'use client';
import { useId, useState } from 'react';
import Dialog from '@/components/dialog';
import DateTimeField from '@/components/date-time-field';
import { dateFromKey, dateKeyFromLocal, type FinanceData } from '../model';
export const emptyExpenseFilter = { day: '', categoryId: '', sourceId: '' };
export default function ExpenseFilters({
  data,
  value,
  apply,
  close,
}: {
  data: FinanceData;
  value: typeof emptyExpenseFilter;
  apply: (next: typeof emptyExpenseFilter) => void;
  close: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const categoryId = useId();
  const sourceId = useId();
  return (
    <Dialog title="Lọc chi tiêu" onClose={close} className="expense-filter-dialog">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply(draft);
          close();
        }}
      >
        <DateTimeField
          id="expense-filter-day"
          label="Ngày chi tiêu"
          value={draft.day ? dateFromKey(draft.day) : null}
          onChange={(day) => setDraft({ ...draft, day: day ? dateKeyFromLocal(day) : '' })}
          optional
          withTime={false}
          calendarOnly
        />
        <div>
          <label htmlFor={categoryId}>Danh mục</label>
          <select
            id={categoryId}
            value={draft.categoryId}
            onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
          >
            <option value="">Tất cả danh mục</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={sourceId}>Nguồn công nợ</label>
          <select
            id={sourceId}
            value={draft.sourceId}
            onChange={(event) => setDraft({ ...draft, sourceId: event.target.value })}
          >
            <option value="">Tất cả nguồn</option>
            {data.debtSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>
        <div className="confirmation-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => setDraft(emptyExpenseFilter)}
          >
            Bỏ bộ lọc
          </button>
          <button className="button primary">Áp dụng</button>
        </div>
      </form>
    </Dialog>
  );
}
