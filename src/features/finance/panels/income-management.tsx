import IncomeBalances from '../components/income-balances';
import IncomeActionCard from '../components/income-action-card';
import type { IncomeSummary } from '../hooks/use-income-summary';
import type { IncomeRecord } from '../income-model';
import type { FormProps } from '../forms/types';

export default function IncomeManagement({
  balances,
  ready,
  onCreate,
  onEdit,
  ...forms
}: Omit<FormProps, 'done'> & {
  balances: IncomeSummary['balances'];
  ready: boolean;
  onCreate: (kind: 'income' | 'allocation') => void;
  onEdit: (record: IncomeRecord) => void;
}) {
  return (
    <section className="income-management" aria-label="Quản lý thu nhập và phân bổ">
      <IncomeBalances balances={balances} />
      <div className="income-action-cards">
        <IncomeActionCard
          scope="income"
          {...forms}
          ready={ready}
          onCreate={() => onCreate('income')}
          onEdit={onEdit}
        />
        <IncomeActionCard
          scope="allocation"
          {...forms}
          ready={ready}
          onCreate={() => onCreate('allocation')}
          onEdit={onEdit}
        />
      </div>
    </section>
  );
}
