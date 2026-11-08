import { useMemo } from 'react';
import { budgetMonth, dateKey, type FinanceData } from '../model';
import { calculateFunds } from '../income-model';

export function useIncomeSummary(data: FinanceData, month: string) {
  return useMemo(() => {
    const year = month.slice(0, 4);
    const received = data.incomes.filter((entry) => entry.type !== 'opening');
    const sum = (items: { amount: number }[]) =>
      items.reduce((total, entry) => total + entry.amount, 0);
    const inMonth = (entry: { occurredAt: string }) => dateKey(entry.occurredAt).startsWith(month);
    return {
      balances: calculateFunds(data),
      statistics: {
        year,
        annualIncome: sum(received.filter((entry) => dateKey(entry.occurredAt).startsWith(year))),
        monthlyIncome: sum(received.filter(inMonth)),
        totalMother: sum(data.familySupports),
        mother: sum(data.familySupports.filter(inMonth)),
        totalSavings: sum(data.fundTransfers.filter((entry) => entry.toFundId === 'savings')),
        savingsIn: sum(
          data.fundTransfers.filter((entry) => entry.toFundId === 'savings' && inMonth(entry)),
        ),
        annualBudget: data.budgets
          .filter((entry) => entry.transferId && budgetMonth(entry).startsWith(year))
          .reduce((total, entry) => total + entry.cash + entry.bank, 0),
        budget: data.budgets
          .filter((entry) => entry.transferId && budgetMonth(entry) === month)
          .reduce((total, entry) => total + entry.cash + entry.bank, 0),
      },
    };
  }, [data, month]);
}
export type IncomeSummary = ReturnType<typeof useIncomeSummary>;
