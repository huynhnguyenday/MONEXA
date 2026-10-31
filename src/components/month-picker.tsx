'use client';
import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { vi } from 'date-fns/locale';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';

const MonthButton = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void }>(
  function MonthButton({ value, onClick }, ref) {
    return (
      <button
        type="button"
        ref={ref}
        className="month-picker-button"
        onClick={onClick}
        aria-label="Chọn tháng thống kê"
      >
        <FontAwesomeIcon icon={faCalendarDays} />
        <span>{value || 'Chọn tháng'}</span>
      </button>
    );
  },
);
export default function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (month: string) => void;
}) {
  const [year, month] = value.split('-').map(Number);
  return (
    <div className="header-month-picker">
      <DatePicker
        selected={value ? new Date(year, month - 1, 1) : null}
        onChange={(date: Date | null) => {
          if (date)
            onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        }}
        locale={vi}
        showMonthYearPicker
        showFullMonthYearPicker
        dateFormat="'Tháng' MM/yyyy"
        customInput={<MonthButton />}
        popperPlacement="bottom"
        previousYearAriaLabel="Năm trước"
        nextYearAriaLabel="Năm sau"
        previousYearButtonLabel="Năm trước"
        nextYearButtonLabel="Năm sau"
        renderCustomHeader={({ date, decreaseYear, increaseYear }) => (
          <div className="month-picker-year">
            <button type="button" aria-label="Năm trước" onClick={decreaseYear}>
              ‹
            </button>
            <strong>Năm {date.getFullYear()}</strong>
            <button type="button" aria-label="Năm sau" onClick={increaseYear}>
              ›
            </button>
          </div>
        )}
      />
    </div>
  );
}
