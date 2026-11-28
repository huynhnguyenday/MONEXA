import { debtDirection, type FinanceData } from '../model';
import { groupBreakdown, type BreakdownGroup, type BreakdownRecord } from './group-breakdown';

export function categoryInsights(
  groups: BreakdownGroup[],
  records: BreakdownRecord[],
  month: string,
) {
  const [year, number] = month.split('-').map(Number);
  const previousMonth = new Date(Date.UTC(year, number - 2, 1)).toISOString().slice(0, 7);
  const previous = new Map(
    groupBreakdown(groups, records, previousMonth).map((g) => [g.id, g.amount]),
  );
  const rows = groupBreakdown(groups, records, month).map((g) => ({
    ...g,
    previous: previous.get(g.id) || 0,
  }));
  return {
    previousMonth,
    rows: rows
      .filter((g) => g.count || g.previous)
      .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id)),
  };
}

export function debtInsights(
  data: FinanceData,
  direction: 'payable' | 'receivable',
  today: string,
) {
  const open = data.debts.filter((d) => !d.settledAt && debtDirection(data, d) === direction);
  // Missing source on lending is a display group only, never a persisted relationship.
  const groups = [...data.debtSources, { id: '', name: 'Từ ngân sách', color: '#64748b' }];
  const rows = groups
    .map((g) => {
      const debts = open.filter((d) => d.debtSourceId === g.id);
      const amounts = [0, 0, 0, 0]; // Future, today, overdue, no due date.
      for (const d of debts)
        amounts[!d.dueDate ? 3 : d.dueDate < today ? 2 : d.dueDate === today ? 1 : 0] += d.amount;
      return { ...g, amounts, amount: amounts.reduce((a, b) => a + b, 0), count: debts.length };
    })
    .filter((g) => g.count)
    .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
  const start = new Date(today + 'T00:00:00Z').getTime();
  const weeks = Array.from({ length: 4 }, (_, i) => {
    const from = new Date(start + i * 7 * 86400000).toISOString().slice(0, 10);
    const to = new Date(start + (i * 7 + 6) * 86400000).toISOString().slice(0, 10);
    return {
      from,
      to,
      amounts: rows.map((g) =>
        open
          .filter(
            (d) => d.debtSourceId === g.id && d.dueDate && d.dueDate >= from && d.dueDate <= to,
          )
          .reduce((s, d) => s + d.amount, 0),
      ),
    };
  });
  return { rows, weeks };
}

export function weeklyCategoryInsights(
  groups: BreakdownGroup[],
  records: BreakdownRecord[],
  month: string,
) {
  const [year, number] = month.split('-').map(Number),
    days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: Math.ceil(days / 7) }, (_, i) => {
    const from = i * 7 + 1,
      to = Math.min(days, from + 6),
      details = groupBreakdown(
        groups,
        records.filter((r) => Number(r.date.slice(8)) >= from && Number(r.date.slice(8)) <= to),
        month,
      ).filter((g) => g.amount > 0);
    return { label: `${from}–${to}`, amount: details.reduce((s, d) => s + d.amount, 0), details };
  });
}
