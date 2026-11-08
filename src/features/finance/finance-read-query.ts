import type { Document } from 'mongodb';

export const financeCollections = {
  categories: 'categories',
  expenses: 'expenses',
  debtSources: 'debt_sources',
  debtTypes: 'debt_types',
  debts: 'debts',
  budgets: 'budgets',
  funds: 'funds',
  incomes: 'incomes',
  fundTransfers: 'fund_transfers',
  familySupports: 'family_supports',
} as const;

/** One database round trip; lookups still read separate collections in one snapshot. */
export function financeReadPipeline(userId: string): Document[] {
  return [
    { $match: { _id: userId, userId } },
    { $project: { _id: 1 } },
    ...Object.entries(financeCollections).map(([as, from]) => ({
      $lookup: {
        from,
        pipeline: [
          { $match: { userId } },
          { $sort: { createdAt: 1, _id: 1 } },
          { $project: { createdAt: 0, updatedAt: 0 } },
        ],
        as,
      },
    })),
  ];
}
