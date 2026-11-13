import type { CSSProperties } from 'react';
import { money } from '../model';

export default function DebtCalendarAmount({ amount }: { amount: number }) {
  const digits = String(amount);
  const millions = amount >= 1_000_000;
  const upper = millions ? digits.slice(0, -3) : digits;
  const grouped = upper.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const scale = Math.min(1, 7 / Math.max(grouped.length, millions ? 4 : 1));
  return (
    <span className="debt-calendar-amount" style={{ '--debt-money-scale': scale } as CSSProperties}>
      <span className="debt-calendar-money-full">{money(amount)}</span>
      <span className="debt-calendar-money-mobile" aria-label={money(amount)} title={money(amount)}>
        <span>{grouped}</span>
        <span>{millions ? `.${digits.slice(-3)} đ` : 'đ'}</span>
      </span>
    </span>
  );
}
