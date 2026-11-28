'use client';
import DatePicker from 'react-datepicker';
import { vi } from 'date-fns/locale';
import { forwardRef, useId, type ComponentPropsWithoutRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarDays } from '@fortawesome/free-solid-svg-icons';

const CalendarButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<'button'> & { label: string }
>(function CalendarButton(
  { value, label, onClick, onKeyDown, onFocus, onBlur, tabIndex, id, disabled },
  ref,
) {
  return (
    <button
      type="button"
      ref={ref}
      id={id}
      className="calendar-day-button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      tabIndex={tabIndex}
      disabled={disabled}
      aria-label={label}
      aria-haspopup="dialog"
    >
      <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
      <span>{value || 'Chọn ngày'}</span>
    </button>
  );
});
export default function DateTimeField({
  id,
  label,
  value,
  onChange,
  optional = false,
  past = false,
  withTime = true,
  wholeHours = false,
  calendarOnly = true,
}: {
  id: string;
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  optional?: boolean;
  past?: boolean;
  withTime?: boolean;
  wholeHours?: boolean;
  calendarOnly?: boolean;
}) {
  const instanceId = useId();
  const inputId = `${id}-${instanceId}`;
  return (
    <div className="date-time-field">
      <label htmlFor={inputId}>{label}</label>
      <DatePicker
        id={inputId}
        customInput={calendarOnly ? <CalendarButton label={label} /> : undefined}
        preventOpenOnFocus={calendarOnly}
        selected={value}
        onChange={(next: Date | null) => {
          if (next && wholeHours) {
            next = new Date(next);
            next.setMinutes(0, 0, 0);
          }
          onChange(next);
        }}
        locale={vi}
        showTimeSelect={withTime}
        timeFormat="HH:mm"
        timeIntervals={wholeHours ? 60 : 15}
        dateFormat={withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'}
        timeCaption="Giờ"
        placeholderText={withTime ? 'Chọn ngày và giờ' : 'Chọn ngày'}
        required={!optional}
        isClearable={optional}
        maxDate={past ? new Date() : undefined}
        filterTime={past ? (date) => date.getTime() <= Date.now() : undefined}
        autoComplete="off"
        strictParsing
        calendarStartDay={1}
        popperClassName={withTime ? 'transaction-date-popper' : undefined}
        popperProps={{ strategy: 'fixed' }}
        popperModifiers={[
          {
            name: 'viewportBounds',
            fn: ({ x, y, rects }) => ({
              x: Math.max(12, Math.min(x, window.innerWidth - rects.floating.width - 12)),
              y: Math.max(12, Math.min(y, window.innerHeight - rects.floating.height - 12)),
            }),
          },
        ]}
      />
    </div>
  );
}
