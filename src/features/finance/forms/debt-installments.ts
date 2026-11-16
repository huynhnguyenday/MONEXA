import type { Debt } from '../model';

/** Split integer VND exactly; anchor each date to the original day (including month ends). */
export function splitDebtInstallments(debt: Debt, months: 1 | 3 | 6): Debt[] {
  if (months === 1) return [debt];
  if (!debt.dueDate || !Number.isSafeInteger(debt.amount) || debt.amount < months)
    throw new Error('INVALID_INSTALLMENTS');
  const [year, month, day] = debt.dueDate.split('-').map(Number);
  const base = Math.floor(debt.amount / months);
  const remainder = debt.amount % months;
  return Array.from({ length: months }, (_, index) => {
    const target = new Date(Date.UTC(year, month - 1 + index, 1));
    const last = new Date(
      Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
    ).getUTCDate();
    target.setUTCDate(Math.min(day, last));
    return {
      ...debt,
      id: index === 0 ? debt.id : crypto.randomUUID(),
      title: `${debt.title.slice(0, 90)} (${index + 1}/${months})`,
      amount: base + (index < remainder ? 1 : 0),
      dueDate: target.toISOString().slice(0, 10),
    };
  });
}
