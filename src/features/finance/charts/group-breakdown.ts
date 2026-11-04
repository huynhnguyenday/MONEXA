export type BreakdownGroup = { id: string; name: string; color: string };
export type BreakdownRecord = { groupId: string; amount: number; date: string };

// Dates arrive as Vietnam calendar keys: YYYY-MM-DD, never device-local timestamps.
export function groupBreakdown(
  groups: BreakdownGroup[],
  records: BreakdownRecord[],
  period: string,
) {
  const totals = new Map<string, { amount: number; count: number }>();
  for (const record of records) {
    if (!record.date.startsWith(`${period}-`)) continue;
    const total = totals.get(record.groupId) ?? { amount: 0, count: 0 };
    total.amount += record.amount;
    total.count += 1;
    totals.set(record.groupId, total);
  }
  return groups.map((group) => ({
    ...group,
    amount: totals.get(group.id)?.amount ?? 0,
    count: totals.get(group.id)?.count ?? 0,
  }));
}
