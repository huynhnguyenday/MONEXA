import type { FinanceData } from './model';

const keys = [
  'customIcons',
  'categories',
  'expenses',
  'debtSources',
  'debtTypes',
  'debts',
  'budgets',
  'budgetExchanges',
  'funds',
  'incomes',
  'fundTransfers',
  'familySupports',
] as const;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Apply only this submission's changes to the latest confirmed snapshot. */
export function mergeSave(
  base: FinanceData,
  submitted: FinanceData,
  latest: FinanceData,
): FinanceData {
  const result = { ...latest };
  for (const key of keys) {
    const before = new Map(base[key].map((item) => [item.id, item] as const));
    const after = new Map(submitted[key].map((item) => [item.id, item] as const));
    const current = new Map(latest[key].map((item) => [item.id, item] as const));
    const changed = new Set(
      [...before.keys(), ...after.keys()].filter((id) => !same(before.get(id), after.get(id))),
    );
    for (const id of changed) {
      if (!same(before.get(id), current.get(id)))
        throw new Error(
          'Bản ghi đã thay đổi trong lúc chờ lưu. Giữ nội dung và kiểm tra lại trước khi gửi.',
        );
    }
    // Updates retain their position; new entries follow the form's insertion order.
    const items = latest[key].flatMap((item) =>
      changed.has(item.id) ? (after.has(item.id) ? [after.get(item.id)!] : []) : [item],
    );
    const submittedItems = submitted[key];
    submittedItems.forEach((item, index) => {
      if (before.has(item.id)) return;
      const anchor = submittedItems
        .slice(index + 1)
        .find((next) => items.some((current) => current.id === next.id));
      // A prepend also stays ahead of unrelated entries created by an earlier queued save.
      const position =
        index === 0
          ? 0
          : anchor
            ? items.findIndex((current) => current.id === anchor.id)
            : items.length;
      items.splice(position, 0, item);
    });
    Object.assign(result, { [key]: items });
  }
  if (submitted.budget !== base.budget) {
    if (latest.budget !== base.budget)
      throw new Error('Ngân sách đã thay đổi. Kiểm tra lại trước khi lưu.');
    result.budget = submitted.budget;
  }
  return result;
}
