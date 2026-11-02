import type { FinanceView } from '../types';
import CategorySkeleton from './category-skeleton';
import DebtSkeleton from './debt-skeleton';
import OverviewSkeleton from './overview-skeleton';

export default function FinanceSkeleton({ view, debtView }: { view: FinanceView; debtView: 'calendar' | 'history' }) {
  if (view === 'overview') return <OverviewSkeleton />;
  if (view === 'debts') return <DebtSkeleton view={debtView} />;
  return <CategorySkeleton sources={view === 'debt-sources'} />;
}
