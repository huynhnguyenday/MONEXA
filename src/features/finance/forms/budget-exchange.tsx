'use client';
import { useState } from 'react';
import PendingLabel from '@/components/pending-label';
import { calculateAccounts, displayTime, money, PERSONAL_USER_ID } from '../model';
import type { FormProps } from './types';
import './budget-exchange.css';
const labels = { cash: 'Tiền mặt', bank: 'Chuyển khoản' };
export function BudgetExchange({ data, save, busy }: FormProps) {
  const [tab, setTab] = useState<'convert' | 'history'>('convert');
  const [from, setFrom] = useState<'cash' | 'bank'>('cash');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const accounts = calculateAccounts(data);
  const to = from === 'cash' ? 'bank' : 'cash';
  const entries = [...data.budgetExchanges].sort(
    (a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id.localeCompare(a.id),
  );
  return (
    <div className="budget-exchange">
      <div className="mobile-panel-tabs" role="tablist" aria-label="Trao đổi ngân sách">
        <button
          type="button"
          role="tab"
          id="exchange-convert-tab"
          aria-controls="exchange-convert"
          aria-selected={tab === 'convert'}
          className={tab === 'convert' ? 'active' : ''}
          onClick={() => setTab('convert')}
        >
          Chuyển đổi
        </button>
        <button
          type="button"
          role="tab"
          id="exchange-history-tab"
          aria-controls="exchange-history"
          aria-selected={tab === 'history'}
          className={tab === 'history' ? 'active' : ''}
          onClick={() => setTab('history')}
        >
          Lịch sử
        </button>
      </div>
      {tab === 'convert' ? (
        <form
          id="exchange-convert"
          role="tabpanel"
          aria-labelledby="exchange-convert-tab"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            setSuccess('');
            const value = Number(amount.replace(/\D/g, ''));
            if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000_000)
              return setError('Nhập số tiền nguyên từ 1 đến 1.000.000.000.000 VND.');
            if (value > accounts[from]) return setError('Số dư nguồn không đủ để chuyển đổi.');
            if (
              await save({
                ...data,
                budgetExchanges: [
                  ...data.budgetExchanges,
                  {
                    id: crypto.randomUUID(),
                    userId: PERSONAL_USER_ID,
                    from,
                    to,
                    amount: value,
                    occurredAt: new Date().toISOString(),
                  },
                ],
              })
            ) {
              setAmount('');
              setSuccess('Đã chuyển đổi thành công.');
            }
          }}
        >
          <fieldset disabled={busy}>
            <div className="exchange-sources">
              <label>
                Chuyển từ
                <select
                  aria-label="Chuyển từ"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value as 'cash' | 'bank');
                    setError('');
                    setSuccess('');
                  }}
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="bank">Chuyển khoản</option>
                </select>
              </label>
              <label>
                Chuyển đến
                <input value={labels[to]} readOnly />
              </label>
            </div>
            <p className="exchange-balance">
              Số dư {labels[from].toLocaleLowerCase('vi')}: <strong>{money(accounts[from])}</strong>
            </p>
            <label>
              Số tiền (VND)
              <input
                aria-label="Số tiền (VND)"
                type="text"
                inputMode="numeric"
                required
                value={amount}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 13);
                  setAmount(digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '');
                  setSuccess('');
                }}
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            {success && <p role="status">{success}</p>}
            <button
              className="button primary monexa-action monexa-create exchange-submit"
              type="submit"
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? <PendingLabel>Đang chuyển đổi</PendingLabel> : 'Chuyển đổi'}
            </button>
          </fieldset>
        </form>
      ) : (
        <div
          id="exchange-history"
          role="tabpanel"
          aria-labelledby="exchange-history-tab"
          className="exchange-history"
        >
          <div
            className="exchange-history-rows"
            role="region"
            aria-label="Danh sách chuyển đổi"
            tabIndex={0}
          >
            {!entries.length && <p>Chưa có lịch sử chuyển đổi.</p>}
            <ol>
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <strong>
                      {labels[entry.from]} → {labels[entry.to]}
                    </strong>
                    <time dateTime={entry.occurredAt}>{displayTime(entry.occurredAt)}</time>
                  </div>
                  <b>{money(entry.amount)}</b>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
