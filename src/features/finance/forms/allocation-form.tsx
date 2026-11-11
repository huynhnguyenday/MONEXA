'use client';
import { useState } from 'react';
import { ZodError } from 'zod';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faMoneyBillTransfer } from '@fortawesome/free-solid-svg-icons';
import DateTimeField from '@/components/date-time-field';
import PendingLabel from '@/components/pending-label';
import { budgetMonth, calculateAccounts, dateKey, money } from '../model';
import { calculateFunds, type IncomeRecord } from '../income-model';
import { putIncomeRecord } from '../income-operations';
import { formatVndInput } from './income-form';
import type { FormProps } from './types';
import './allocation-form.css';

export function AllocationForm({
  data,
  save,
  done,
  busy,
  record,
  budgetOnly = false,
}: FormProps & {
  month: string;
  record?: Exclude<IncomeRecord, { kind: 'income' }>;
  budgetOnly?: boolean;
}) {
  const entry = record?.entry;
  const [target, setTarget] = useState<'mother' | 'savings' | 'spending'>(
    record?.kind === 'support'
      ? 'mother'
      : (record?.entry.toFundId ?? (budgetOnly ? 'spending' : 'mother')),
  );
  const [source, setSource] = useState<'unallocated' | 'savings' | 'spending'>(
    record?.kind === 'transfer'
      ? record.entry.fromFundId
      : record?.kind === 'support'
        ? record.entry.sourceFundId
        : 'unallocated',
  );
  const [method, setMethod] = useState<'cash' | 'bank'>(entry?.paymentMethod ?? 'bank');
  const [amount, setAmount] = useState(entry ? formatVndInput(String(entry.amount)) : '');
  const [date, setDate] = useState<Date | null>(entry ? new Date(entry.occurredAt) : new Date());
  const budgetPeriod =
    data.budgets.find((b) => b.transferId === entry?.id)?.month ?? dateKey().slice(0, 7);
  const [error, setError] = useState('');
  const accounts = calculateAccounts(data);
  let available = source === 'spending' ? accounts[method] : calculateFunds(data)[source][method];
  if (record && record.entry.paymentMethod === method) {
    const oldSource =
      record.kind === 'support' ? record.entry.sourceFundId : record.entry.fromFundId;
    if (oldSource === source) available += record.entry.amount;
    if (record.kind === 'transfer' && record.entry.toFundId === 'savings' && source === 'savings')
      available -= record.entry.amount;
    if (record.kind === 'transfer' && record.entry.toFundId === 'spending' && source === 'spending')
      available -= record.entry.amount;
  }
  const value = Number(amount.replace(/\D/g, ''));
  const monthly = data.budgets
    .filter((b) => budgetMonth(b) === budgetPeriod)
    .reduce((s, b) => ({ cash: s.cash + b.cash, bank: s.bank + b.bank }), { cash: 0, bank: 0 });
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setError('');
        try {
          if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000_000)
            throw new Error('Nhập số tiền từ 1 đến 1.000.000.000.000 ₫.');
          if (!date || !Number.isFinite(date.getTime()))
            throw new Error('Chọn ngày chuyển tiền hợp lệ.');
          if (value > available)
            throw new Error('Số dư nguồn không đủ. Kiểm tra tiền mặt/chuyển khoản.');
          const common = {
            id: entry?.id ?? crypto.randomUUID(),
            userId: 'personal' as const,
            paymentMethod: method,
            amount: value,
            occurredAt: date.toISOString(),
            note: entry?.note ?? '',
          };
          const nextRecord: IncomeRecord =
            target === 'mother'
              ? {
                  kind: 'support',
                  entry: {
                    ...common,
                    sourceFundId: source === 'spending' ? 'spending' : 'unallocated',
                  },
                }
              : { kind: 'transfer', entry: { ...common, fromFundId: source, toFundId: target } };
          if (
            await save(
              putIncomeRecord(
                data,
                nextRecord,
                record ? budgetPeriod : dateKey().slice(0, 7),
                record,
              ),
            )
          )
            done();
        } catch (e) {
          setError(
            e instanceof ZodError
              ? e.issues[0]?.message
              : e instanceof Error
                ? e.message
                : 'Kiểm tra thông tin phân bổ.',
          );
        }
      }}
    >
      <fieldset disabled={busy}>
        <div className="allocation-route-fields">
          <label>
            Lấy từ sổ
            <select
              aria-label="Lấy từ sổ"
              value={source}
              onChange={(e) => {
                const value = e.target.value as typeof source;
                setSource(value);
                if (value === 'savings') setTarget('spending');
                if (value === 'spending' && target === 'spending') setTarget('savings');
              }}
            >
              <option value="unallocated">Chưa phân bổ</option>
              <option value="savings">Tiết kiệm</option>
              {!budgetOnly && <option value="spending">Ngân sách chi tiêu</option>}
            </select>
          </label>
          <label>
            Chuyển đến
            <select
              aria-label="Chuyển đến"
              value={target}
              onChange={(e) => {
                const v = e.target.value as typeof target;
                setTarget(v);
              }}
            >
              {source !== 'savings' && !budgetOnly && <option value="mother">Gửi mẹ</option>}
              {source !== 'savings' && !budgetOnly && <option value="savings">Tiết kiệm</option>}
              {source !== 'spending' && <option value="spending">Ngân sách chi tiêu</option>}
            </select>
          </label>
        </div>
        <label>
          Nguồn tiền
          <select
            aria-label="Nguồn tiền"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'cash' | 'bank')}
          >
            <option value="cash">Tiền mặt</option>
            <option value="bank">Chuyển khoản</option>
          </select>
        </label>
        <div className="allocation-summary" aria-live="polite">
          <span>
            Nguồn trước chuyển <b>{money(available)}</b>
          </span>
          <span>
            Nguồn sau chuyển <b>{money(available - value)}</b>
          </span>
        </div>
        <label>
          Số tiền chuyển (VND)
          <input
            autoFocus
            required
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatVndInput(e.target.value))}
          />
        </label>
        <DateTimeField
          id="allocation-date"
          label="Ngày giờ chuyển tiền"
          value={date}
          onChange={setDate}
          past
        />
        {target === 'spending' && (
          <>
            <div className="allocation-summary">
              <strong>Đã cấp tháng {budgetPeriod}</strong>
              <span>
                Tiền mặt <b>{money(monthly.cash)}</b>
              </span>
              <span>
                Chuyển khoản <b>{money(monthly.bank)}</b>
              </span>
              <strong>Ngân sách đang có · tất cả thời gian</strong>
              <span>
                Tiền mặt <b>{money(accounts.cash)}</b>
              </span>
              <span>
                Chuyển khoản <b>{money(accounts.bank)}</b>
              </span>
            </div>
          </>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full monexa-action monexa-create" aria-busy={busy}>
          {busy ? (
            <PendingLabel>Đang lưu</PendingLabel>
          ) : (
            <>
              <Icon icon={faMoneyBillTransfer} /> {record ? 'Lưu phân bổ' : 'Xác nhận chuyển tiền'}
            </>
          )}
        </button>
      </fieldset>
    </form>
  );
}
