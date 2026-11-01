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
}: {
  id: string;
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  optional?: boolean;
  past?: boolean;
  withTime?: boolean;
}) {
  return (
    <div className="date-time-field">
      <label htmlFor={id}>{label}</label>
      <DatePicker
        id={id}
        selected={value}
        onChange={onChange}
        locale={vi}
        showTimeSelect={withTime}
        timeFormat="HH:mm"
        timeIntervals={15}
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
      />
    </div>
  );
}
