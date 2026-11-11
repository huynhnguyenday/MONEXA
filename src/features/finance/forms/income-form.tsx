'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faSackDollar } from '@fortawesome/free-solid-svg-icons';
import DateTimeField from '@/components/date-time-field';
import PendingLabel from '@/components/pending-label';
import { ZodError } from 'zod';
import { incomeTypes, type IncomeRecord } from '../income-model';
import { putIncomeRecord } from '../income-operations';
import type { FormProps } from './types';

export const formatVndInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
};
export function IncomeForm({
  data,
  save,
  done,
  busy,
  record,
}: FormProps & { record?: Extract<IncomeRecord, { kind: 'income' }> }) {
  const entry = record?.entry;
  const [title, setTitle] = useState(entry?.title ?? '');
  const [type, setType] = useState<keyof typeof incomeTypes>(entry?.type ?? 'salary');
  const [method, setMethod] = useState<'cash' | 'bank'>(entry?.paymentMethod ?? 'bank');
  const [amount, setAmount] = useState(entry ? formatVndInput(String(entry.amount)) : '');
  const [date, setDate] = useState<Date | null>(entry ? new Date(entry.occurredAt) : new Date());
  const [note, setNote] = useState(entry?.note ?? '');
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setError('');
        try {
          const value = Number(amount.replace(/\D/g, ''));
          if (!title.trim()) throw new Error('Nhập nội dung nhận tiền.');
          if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000_000)
            throw new Error('Nhập số tiền từ 1 đến 1.000.000.000.000 ₫.');
          if (!date || !Number.isFinite(date.getTime()))
            throw new Error('Chọn ngày nhận tiền hợp lệ.');
          const next = putIncomeRecord(
            data,
            {
              kind: 'income',
              entry: {
                id: entry?.id ?? crypto.randomUUID(),
                userId: 'personal',
                fundId: 'unallocated',
                title: title.trim(),
                type,
                paymentMethod: method,
                amount: value,
                occurredAt: date.toISOString(),
                note,
              },
            },
            '',
            record,
          );
          if (await save(next)) done();
        } catch (e) {
          setError(
            e instanceof ZodError
              ? e.issues[0]?.message
              : e instanceof Error
                ? e.message
                : 'Kiểm tra thông tin nhận tiền.',
          );
        }
      }}
    >
      <fieldset disabled={busy}>
        <label>
          Nội dung nhận tiền
          <input
            autoFocus
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Lương tháng 11"
          />
        </label>
        <label>
          Loại thu nhập
          <select
            aria-label="Loại thu nhập"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            {Object.entries(incomeTypes).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nhận vào
          <select
            aria-label="Nhận vào"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'cash' | 'bank')}
          >
            <option value="cash">Tiền mặt</option>
            <option value="bank">Chuyển khoản</option>
          </select>
        </label>
        <label>
          Số tiền nhận (VND)
          <input
            required
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatVndInput(e.target.value))}
          />
        </label>
        <DateTimeField
          id="income-date"
          label="Ngày giờ nhận tiền"
          value={date}
          onChange={setDate}
          past
        />
        <label>
          Ghi chú
          <textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary full monexa-action monexa-create" aria-busy={busy}>
          {busy ? (
            <PendingLabel>Đang lưu</PendingLabel>
          ) : (
            <>
              <Icon icon={faSackDollar} /> {record ? 'Lưu thu nhập' : 'Ghi nhận thu nhập'}
            </>
          )}
        </button>
      </fieldset>
    </form>
  );
}
