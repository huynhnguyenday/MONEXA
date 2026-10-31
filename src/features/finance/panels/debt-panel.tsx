'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faTrashCan,
  faCheck,
  faRotate,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import Pagination, { useViewportRows } from '@/components/pagination';
import { type Debt, type FinanceData, displayTime, money } from '../model';
export default function DebtPanel({
  data,
  ready,
  onAdd,
  onEdit,
  onDelete,
  onSettle,
}: {
  data: FinanceData;
  ready: boolean;
  onAdd: () => void;
  onEdit: (debt: Debt) => void;
  onDelete: (debt: Debt) => void;
  onSettle: (debt: Debt) => void;
}) {
  const [filter, setFilter] = useState('open'),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(0);
  const { ref, size } = useViewportRows(82, 32);
  const outstanding = data.debts.filter((d) => !d.settledAt);
  const overdue = (d: Debt) => !d.settledAt && !!d.dueAt && Date.parse(d.dueAt) < Date.now();
  const filtered = [...data.debts]
    .filter(
      (d) =>
        !(
          (filter === 'open' && d.settledAt) ||
          (filter === 'settled' && !d.settledAt) ||
          (filter === 'overdue' && !overdue(d))
        ) &&
        `${d.title} ${d.note} ${data.people.find((p) => p.id === d.personId)?.name}`
          .toLocaleLowerCase('vi')
          .includes(search.toLocaleLowerCase('vi')),
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const pages = Math.max(1, Math.ceil(filtered.length / size)),
    activePage = Math.min(page, pages - 1);
  return (
    <section className="compact-debts" aria-label="Quản lý công nợ">
      <div className="compact-stats">
        <article className="stat balance">
          <span className="stat-label">Phải thu</span>
          <strong>
            {money(
              outstanding
                .filter((d) => d.direction === 'receivable')
                .reduce((s, d) => s + d.amount, 0),
            )}
          </strong>
          <small>Chưa hoàn tất · tất cả thời gian</small>
        </article>
        <article className="stat">
          <span className="stat-label">Phải trả</span>
          <strong>
            {money(
              outstanding
                .filter((d) => d.direction === 'payable')
                .reduce((s, d) => s + d.amount, 0),
            )}
          </strong>
          <small>Chưa hoàn tất · tất cả thời gian</small>
        </article>
        <article className="stat">
          <span className="stat-label">Quá hạn</span>
          <strong>{outstanding.filter(overdue).length}</strong>
          <small>Khoản cần kiểm tra</small>
        </article>
      </div>
      <article className="card compact-debt-card">
        <div className="compact-debt-toolbar">
          <div className="filter-tabs" aria-label="Lọc công nợ">
            {[
              ['open', 'Chưa hoàn tất'],
              ['overdue', 'Quá hạn'],
              ['settled', 'Đã hoàn tất'],
              ['all', 'Tất cả'],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                className={filter === value ? 'selected' : ''}
                onClick={() => {
                  setFilter(value);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search-box">
            <Icon icon={faMagnifyingGlass} />
            <span className="sr-only">Tìm công nợ</span>
            <input
              type="search"
              placeholder="Tìm khoản nợ, người liên quan…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        <div className="debt-table-viewport" ref={ref}>
          {!filtered.length ? (
            <div className="compact-empty">
              <p>Không có công nợ phù hợp.</p>
              <button className="inline-button" disabled={!ready} onClick={onAdd}>
                + Ghi công nợ
              </button>
            </div>
          ) : (
            <table className="compact-debt-table">
              <caption className="sr-only">Danh sách công nợ</caption>
              <colgroup>
                <col />
                <col className="debt-money-column" />
                <col className="debt-date-column" />
                <col className="debt-status-column" />
                <col className="debt-actions-column" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">Khoản nợ / Người</th>
                  <th scope="col">Số tiền</th>
                  <th scope="col">Thời gian</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(activePage * size, (activePage + 1) * size).map((debt) => (
                  <tr key={debt.id}>
                    <td>
                      <h3>
                        <button
                          className="expense-name"
                          disabled={!ready}
                          title={`${debt.title}${debt.note ? ` · ${debt.note}` : ''}`}
                          onClick={() => onEdit(debt)}
                        >
                          {debt.title}
                        </button>
                      </h3>
                      <span
                        className="debt-person"
                        title={data.people.find((p) => p.id === debt.personId)!.name}
                      >
                        {data.people.find((p) => p.id === debt.personId)!.name}
                      </span>
                      <span className="mobile-debt-status">
                        {debt.direction === 'receivable' ? 'Phải thu' : 'Phải trả'} ·{' '}
                        {debt.settledAt ? 'Hoàn tất' : overdue(debt) ? 'Quá hạn' : 'Chưa hoàn tất'}
                      </span>
                    </td>
                    <td className="amount-cell">{money(debt.amount)}</td>
                    <td>
                      <time dateTime={debt.occurredAt}>{displayTime(debt.occurredAt)}</time>
                      <span className={overdue(debt) ? 'overdue-text' : 'debt-due'}>
                        {debt.settledAt
                          ? `Xong: ${displayTime(debt.settledAt)}`
                          : debt.dueAt
                            ? `Hạn: ${displayTime(debt.dueAt)}`
                            : 'Chưa đặt hạn'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${debt.settledAt ? 'settled' : overdue(debt) ? 'overdue' : ''}`}
                      >
                        {debt.settledAt ? 'Đã hoàn tất' : overdue(debt) ? 'Quá hạn' : 'Đang mở'}
                      </span>
                      <small>{debt.direction === 'receivable' ? 'Phải thu' : 'Phải trả'}</small>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          aria-label={`Sửa ${debt.title}`}
                          disabled={!ready}
                          onClick={() => onEdit(debt)}
                        >
                          <Icon icon={faPen} />
                        </button>
                        <button
                          aria-label={`Xóa ${debt.title}`}
                          disabled={!ready}
                          onClick={() => onDelete(debt)}
                        >
                          <Icon icon={faTrashCan} />
                        </button>
                        <button
                          className="settle-action"
                          title={debt.settledAt ? 'Mở lại' : 'Đã thanh toán'}
                          aria-label={debt.settledAt ? 'Mở lại' : 'Đã thanh toán'}
                          disabled={!ready}
                          onClick={() => onSettle(debt)}
                        >
                          <Icon icon={debt.settledAt ? faRotate : faCheck} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          label="Công nợ"
          page={activePage}
          pages={pages}
          total={filtered.length}
          onChange={setPage}
        />
      </article>
    </section>
  );
}
