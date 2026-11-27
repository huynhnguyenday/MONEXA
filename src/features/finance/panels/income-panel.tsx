'use client';
import { dateKey } from '../model';
import { useIncomeSummary } from '../hooks/use-income-summary';
import IncomeLayout from '../layout/income-layout';
import IncomeAnalytics from './income-analytics';
import IncomeManagement from './income-management';
import type { IncomeRecord } from '../income-model';
import type { FormProps } from '../forms/types';

export default function IncomePanel({
  data,
  save,
  month,
  ready,
  onOpen,
}: Pick<FormProps, 'data' | 'save'> & {
  month: string;
  ready: boolean;
  onOpen: (kind: 'income' | 'allocation', record?: IncomeRecord) => void;
}) {
  const period = month || dateKey().slice(0, 7);
  const summary = useIncomeSummary(data, period);
  return (
    <IncomeLayout
      analytics={<IncomeAnalytics data={data} statistics={summary.statistics} />}
      management={
        <IncomeManagement
          data={data}
          save={save}
          busy={false}
          balances={summary.balances}
          ready={ready}
          onCreate={onOpen}
          onEdit={(record) => onOpen(record.kind === 'income' ? 'income' : 'allocation', record)}
        />
      }
    ></IncomeLayout>
  );
}
