'use client';
import { useState, type ReactNode } from 'react';
import { dateKey } from '../model';
import { useIncomeSummary } from '../hooks/use-income-summary';
import IncomeLayout from '../layout/income-layout';
import IncomeAnalytics from './income-analytics';
import IncomeManagement from './income-management';
import IncomeDialogs, { type IncomeModal } from '../dialogs/income-dialogs';
import type { FormProps } from '../forms/types';

export default function IncomePanel({
  data,
  save,
  busy,
  month,
  ready,
  error,
}: FormProps & { month: string; ready: boolean; error: ReactNode }) {
  const [modal, setModal] = useState<IncomeModal>(null);
  const period = month || dateKey().slice(0, 7);
  const summary = useIncomeSummary(data, period);
  const forms = { data, save, busy, done: () => setModal(null) };
  return (
    <IncomeLayout
      analytics={<IncomeAnalytics data={data} statistics={summary.statistics} />}
      management={
        <IncomeManagement
          data={data}
          save={save}
          busy={busy}
          balances={summary.balances}
          ready={ready}
          onCreate={setModal}
          onEdit={setModal}
        />
      }
    >
      <IncomeDialogs {...forms} modal={modal} month={period} error={error} />
    </IncomeLayout>
  );
}
