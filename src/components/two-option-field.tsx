'use client';
import { useId, type ReactNode } from 'react';
import './two-option-field.css';

type Option<T extends string> = { value: T; label: string; description?: ReactNode };
export default function TwoOptionField<T extends string>({
  name,
  legend,
  value,
  onChange,
  options,
  disabled = false,
  className = '',
}: {
  name: string;
  legend: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly [Option<T>, Option<T>];
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <fieldset className={`two-option-field ${className}`} disabled={disabled}>
      <legend>{legend}</legend>
      {options.map((option, index) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            aria-label={option.label}
            aria-describedby={option.description ? `${id}-${index}` : undefined}
          />
          <span>
            {option.label}
            {option.description && <small id={`${id}-${index}`}>{option.description}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
