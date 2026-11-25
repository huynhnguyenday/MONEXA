'use client';
import DatePicker from 'react-datepicker';
import { vi } from 'date-fns/locale';
export default function DateTimeField({
  id,
  label,
  value,
  onChange,
  optional = false,
  past = false,
  withTime = true,
  wholeHours = false,
}: {
  id: string;
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  optional?: boolean;
  past?: boolean;
  withTime?: boolean;
  wholeHours?: boolean;
}) {
  return (
    <div className="date-time-field">
      <label htmlFor={id}>{label}</label>
      <DatePicker
        id={id}
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
