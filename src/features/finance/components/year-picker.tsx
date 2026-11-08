'use client';
import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { vi } from 'date-fns/locale';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faCalendarDays, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const YearButton = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void }>(
  function YearButton({ value, onClick }, ref) {
    return (
      <button
        type="button"
        ref={ref}
        className="month-picker-button"
        onClick={onClick}
        aria-label="Chọn năm thống kê"
      >
        <Icon icon={faCalendarDays} />
        <span>{value || 'Chọn năm'}</span>
      </button>
    );
  },
);

export default function YearPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (year: string) => void;
}) {
  return (
    <div className="header-month-picker">
      <DatePicker
        selected={new Date(Number(value), 0, 1)}
        onChange={(date: Date | null) => {
          if (date) onChange(String(date.getFullYear()));
        }}
        locale={vi}
        showYearPicker
        calendarClassName="finance-year-picker"
        dateFormat="'Năm' yyyy"
        customInput={<YearButton />}
        popperPlacement="bottom"
        previousYearAriaLabel="Các năm trước"
        nextYearAriaLabel="Các năm sau"
        renderCustomHeader={({
          visibleYearsRange,
          date,
          decreaseYear,
          increaseYear,
          prevYearButtonDisabled,
          nextYearButtonDisabled,
        }) => (
          <div className="month-picker-year">
            <button
              type="button"
              aria-label="Các năm trước"
              disabled={prevYearButtonDisabled}
              onClick={decreaseYear}
            >
              <Icon icon={faChevronLeft} />
            </button>
            <strong>
              {visibleYearsRange
                ? `${visibleYearsRange.startYear} – ${visibleYearsRange.endYear}`
                : date.getFullYear()}
            </strong>
            <button
              type="button"
              aria-label="Các năm sau"
              disabled={nextYearButtonDisabled}
              onClick={increaseYear}
            >
              <Icon icon={faChevronRight} />
            </button>
          </div>
        )}
      />
    </div>
  );
}
