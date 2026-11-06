import { money } from '../model';

export default function DebtCalendarAmount({ amount }: { amount: number }) {
  const digits = String(amount);
  const millions = amount >= 1_000_000;
  const upper = millions ? digits.slice(0, -3) : digits;
  const grouped = upper.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (
    <span className="debt-calendar-amount">
      <span className="debt-calendar-money-full">{money(amount)}</span>
      <span className="debt-calendar-money-mobile">
        <span>{grouped}</span>
        <span>{millions ? digits.slice(-3) : ''}đ</span>
      </span>
    </span>
  );
}
