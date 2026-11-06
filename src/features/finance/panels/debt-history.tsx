'use client';
import { useMemo, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faPen,
  faRotateLeft,
  faTrashCan,
  faFilter,
  faSort,
  faSortUp,
  faSortDown,
} from '@fortawesome/free-solid-svg-icons';
import { useHistoryWindow } from '../hooks/use-history-window';
import HistoryEnd from '../components/history-end';
import DebtHistoryFilters, { type DebtHistorySort } from './debt-history-filters';
import { type Debt, type FinanceData, dateKey, debtDirection, money } from '../model';
import './debt-history.css';
type Props = {
  data: FinanceData;
  ready: boolean;
  onAdd: () => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onSettle: (debt: Debt) => void;
};
export default function DebtHistory({ data, ready, onAdd, onEdit, onDelete, onSettle }: Props) {
  const [source, setSource] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState<DebtHistorySort>('default');
  const direction = (debt: Debt) => debtDirection(data, debt);
  const today = dateKey();
  const overdue = (debt: Debt) => !debt.settledAt && !!debt.dueDate && debt.dueDate < today;
  const history = useMemo(
    () =>
      data.debts
        .filter(
          (debt) =>
            (!source || debt.debtSourceId === source) &&
            (!statusFilter ||
              (statusFilter === 'settled'
                ? !!debt.settledAt
                : statusFilter === 'overdue'
                  ? overdue(debt)
                  : !debt.settledAt)),
        )
        .sort((a, b) => {
          const group = Number(!!a.settledAt) - Number(!!b.settledAt);
          if (group) return group;
          if (sort === 'amountAsc' || sort === 'amountDesc') {
            const amount = (a.amount - b.amount) * (sort === 'amountAsc' ? 1 : -1);
            if (amount) return amount;
          }
          if (sort === 'dueDesc') {
            const due = (b.dueDate ?? '').localeCompare(a.dueDate ?? '');
            if (due) return due;
          }
          return (
            (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') ||
            b.occurredAt.localeCompare(a.occurredAt) ||
            a.id.localeCompare(b.id)
          );
        }),
    [data.debts, source, statusFilter, sort, today],
  );
  const { viewportRef, endRef, visibleCount, hasMore } = useHistoryWindow(
    history.length,
    JSON.stringify([source, statusFilter, sort]),
    !ready,
  );
  const visibleItems = history.slice(0, visibleCount);
  const sourceControl = (
    <label className="debt-filter-select">
      <Icon icon={faFilter} />
      <select
        aria-label="Lọc nguồn công nợ"
        value={source}
        onChange={(event) => {
          setSource(event.target.value);
        }}
      >
        <option value="">Nguồn công nợ</option>
        {data.debtSources.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
  const statusControl = (
    <label className="debt-filter-select">
      <Icon icon={faFilter} />
      <select
        aria-label="Lọc trạng thái"
        value={statusFilter}
        onChange={(event) => {
          setStatusFilter(event.target.value);
        }}
      >
        <option value="">Trạng thái</option>
        <option value="outstanding">Đang nợ</option>
        <option value="overdue">Quá hạn</option>
        <option value="settled">Đã thanh toán</option>
      </select>
    </label>
  );
  const amountControl = (
    <button
      type="button"
      className="debt-sort"
      title="Thấp lên cao → cao xuống thấp → mặc định"
      onClick={() => {
        setSort(
          sort === 'amountAsc' ? 'amountDesc' : sort === 'amountDesc' ? 'default' : 'amountAsc',
        );
      }}
    >
      Số tiền{' '}
      <Icon icon={sort === 'amountAsc' ? faSortUp : sort === 'amountDesc' ? faSortDown : faSort} />
    </button>
  );
  const dueControl = (
    <button
      type="button"
      className="debt-sort"
      title="Hạn xa nhất trước → mặc định"
      onClick={() => {
        setSort(sort === 'dueDesc' ? 'default' : 'dueDesc');
      }}
    >
      Hạn thanh toán <Icon icon={sort === 'dueDesc' ? faSortDown : faSort} />
    </button>
  );
  const dateLabel = (value: string) => {
    const [year, monthValue, day] = value.split('-');
    return `${day}/${monthValue}/${year}`;
  };
  const dueLabel = (debt: Debt) => {
    if (!debt.dueDate) return 'Chưa có hạn thanh toán';
    const date = dateLabel(debt.dueDate);
    if (debt.settledAt) return `Hạn ${date}`;
    // Compare calendar dates in Vietnam, independently of the device timezone.
    const days = Math.round(
      (Date.parse(`${debt.dueDate}T00:00:00Z`) - Date.parse(`${dateKey()}T00:00:00Z`)) / 86_400_000,
    );
    const urgency = days <= 10 ? 'urgent' : days <= 30 ? 'soon' : 'safe';
    return (
      <>
        {days > 0 ? (
          <>
            Còn <strong className={`debt-days-${urgency}`}>{days}</strong> ngày là tới hạn
          </>
        ) : days === 0 ? (
          <strong className="debt-days-urgent">Đến hạn hôm nay</strong>
        ) : (
          <>
            Quá hạn <strong className="debt-days-urgent">{-days}</strong> ngày
          </>
        )}
        {` - ${date}`}
      </>
    );
  };
  return (
    <>
      <div className="debt-history-toolbar">
        <div className="debt-history-heading">
          Tất cả công nợ <span>{history.length}</span>
        </div>
        <DebtHistoryFilters
          sources={data.debtSources}
          source={source}
          status={statusFilter}
          sort={sort}
          onSource={setSource}
          onStatus={setStatusFilter}
          onSort={setSort}
        />
      </div>
      <div
        className="debt-table-viewport debt-history-viewport"
        ref={viewportRef}
        role="region"
        aria-label="Lịch sử công nợ"
        tabIndex={0}
      >
        {!data.debts.length ? (
          <div className="compact-empty">
            <p>Chưa có lịch sử công nợ.</p>
            <button className="button primary monexa-action monexa-create" disabled={!ready} onClick={onAdd}>
              + Ghi công nợ
            </button>
          </div>
        ) : (
          <table className="compact-debt-table">
            <caption className="sr-only">Lịch sử công nợ</caption>
            <colgroup>
              <col />
              <col className="debt-source-column" />
              <col className="debt-money-column" />
              <col className="debt-date-column" />
              <col className="debt-status-column" />
              <col className="debt-actions-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Khoản nợ</th>
                <th scope="col">{sourceControl}</th>
                <th
                  scope="col"
                  aria-sort={
                    sort === 'amountAsc'
                      ? 'ascending'
                      : sort === 'amountDesc'
                        ? 'descending'
                        : 'none'
                  }
                >
                  {amountControl}
                </th>
                <th scope="col" aria-sort={sort === 'dueDesc' ? 'descending' : 'none'}>
                  {dueControl}
                </th>
                <th scope="col">{statusControl}</th>
                <th scope="col">
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((debt) => {
                const source = data.debtSources.find((item) => item.id === debt.debtSourceId);
                const status = debt.settledAt
                  ? 'Đã thanh toán'
                  : overdue(debt)
                    ? 'Quá hạn'
                    : 'Đang nợ';
                const titleChars = Array.from(debt.title);
                const title =
                  titleChars.length > 40 ? `${titleChars.slice(0, 40).join('')}...` : debt.title;
                return (
                  <tr key={debt.id}>
                    <td>
                      <h3 title={debt.title}>{title}</h3>
                      <span className="mobile-debt-status">
                        {data.debtTypes.find((type) => type.id === debt.debtTypeId)?.name ||
                          'Loại công nợ'}{' '}
                        · {status}
                      </span>
                    </td>
                    <td>
                      <span className="debt-source" title={source?.name}>
                        {source?.name || 'Không rõ nguồn công nợ'}
                      </span>
                    </td>
                    <td>
                      <strong className={direction(debt)}>{money(debt.amount)}</strong>
                      <small>{direction(debt) === 'receivable' ? 'Phải thu' : 'Phải trả'}</small>
                    </td>
                    <td>
                      <time
                        dateTime={debt.dueDate ?? undefined}
                        className={overdue(debt) ? 'overdue-text' : 'debt-due'}
                      >
                        {dueLabel(debt)}
                      </time>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${overdue(debt) ? 'overdue' : debt.settledAt ? 'settled' : ''}`}
                      >
                        {status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          aria-label={`Sửa ${debt.title}`}
                          title="Sửa công nợ"
                          disabled={!ready}
                          onClick={() => onEdit(debt)}
                        >
                          <Icon icon={faPen} />
                        </button>
                        <button
                          className="settle-action"
                          aria-label={
                            debt.settledAt
                              ? `Mở lại ${debt.title}`
                              : `Đánh dấu đã thanh toán ${debt.title}`
                          }
                          title={debt.settledAt ? 'Mở lại' : 'Đánh dấu đã thanh toán'}
                          disabled={!ready}
                          onClick={() => onSettle(debt)}
                        >
                          <Icon icon={debt.settledAt ? faRotateLeft : faCheck} />
                        </button>
                        <button
                          aria-label={`Xóa ${debt.title}`}
                          title="Xóa công nợ"
                          disabled={!ready}
                          onClick={() => onDelete(debt)}
                        >
                          <Icon icon={faTrashCan} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <HistoryEnd endRef={endRef} hasMore={hasMore} />
      </div>
    </>
  );
}
