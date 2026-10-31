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
}: {
  id: string;
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  optional?: boolean;
  past?: boolean;
}) {
  return (
    <div className="date-time-field">
      <label htmlFor={id}>{label}</label>
      <DatePicker
        id={id}
        selected={value}
        onChange={onChange}
        locale={vi}
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        dateFormat="dd/MM/yyyy HH:mm"
        timeCaption="Giờ"
        placeholderText="Chọn ngày và giờ"
        required={!optional}
        isClearable={optional}
        maxDate={past ? new Date() : undefined}
        filterTime={past ? (date) => date.getTime() <= Date.now() : undefined}
        autoComplete="off"
        strictParsing
        calendarStartDay={1}
      />
    </div>
  );
}
