'use client';
import { useId } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faPlus, faMoneyBillTransfer } from '@fortawesome/free-solid-svg-icons';
import IncomeHistory, { type IncomeHistoryScope } from '../forms/income-history';
import type { IncomeRecord } from '../income-model';
import type { FormProps } from '../forms/types';
import './income-action-card.css';

export default function IncomeActionCard({
  scope,
  data,
  save,
  busy,
  ready,
  onCreate,
  onEdit,
}: Omit<FormProps, 'done'> & {
  scope: IncomeHistoryScope;
  ready: boolean;
  onCreate: () => void;
  onEdit: (record: IncomeRecord) => void;
}) {
  const historyId = useId();
  const income = scope === 'income';
  const title = income ? 'Nhận thu nhập' : 'Phân bổ tiền';
  return (
    <article className={`card income-actions income-actions-${scope}`} aria-label={title}>
      <div className="income-action-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="button primary monexa-action monexa-create income-create-button"
          aria-label={title}
          title={title}
          disabled={!ready}
          onClick={onCreate}
        >
          <Icon icon={income ? faPlus : faMoneyBillTransfer} />
        </button>
      </div>
      <IncomeHistory
        data={data}
        save={save}
        busy={busy}
        onEdit={onEdit}
        scope={scope}
        id={historyId}
      />
    </article>
  );
}
