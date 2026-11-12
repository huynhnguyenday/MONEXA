import { dateKey, debtDirection, type FinanceData } from '../model';

export function debtSourceHistory(
  data: FinanceData,
  month: string,
  direction: 'receivable' | 'payable',
  today: string,
) {
  const [year, number] = month.split('-').map(Number);
  const days =
    month > today.slice(0, 7)
      ? 0
      : month === today.slice(0, 7)
        ? Number(today.slice(8))
        : new Date(Date.UTC(year, number, 0)).getUTCDate();
  const entries = data.debts.filter(
    (debt) =>
      debt.settledAt &&
      debtDirection(data, debt) === direction &&
      dateKey(debt.settledAt).startsWith(month),
  );
  const daily = Array.from({ length: days }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, '0')}`;
    const items = entries
      .filter((debt) => dateKey(debt.settledAt!) === date)
      .map((debt) => ({
        id: debt.id,
        title: `${data.debtSources.find((source) => source.id === debt.debtSourceId)?.name || 'Nguồn công nợ'} · ${debt.title}`,
        amount: debt.amount,
      }));
    return { date, items, amount: items.reduce((sum, item) => sum + item.amount, 0) };
  });
  return daily;
}
