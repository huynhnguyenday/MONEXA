'use client';
import { useMemo, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faPen, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import Pagination, { useViewportRows } from '@/components/pagination';
import { createSearchMatcher } from '@/lib/search';
import { type DebtSource, type FinanceData } from '../model';
import ClassificationScreen from './classification-screen';
import { DebtSourceIcon } from '../debt-source-icon';
export default function DebtSourcePanel({
  data,
  ready,
  month,
  onAdd,
  onEdit,
  onDelete,
}: {
  data: FinanceData;
  ready: boolean;
  month: string;
  onAdd: () => void;
  onEdit: (item: DebtSource) => void;
  onDelete: (item: DebtSource) => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const { ref, size } = useViewportRows(168, 0);
  const matchesSearch = createSearchMatcher(search);
  const sources = data.debtSources.filter((item) => matchesSearch(item.name));
  const filteredItems = sources;
  const capacity = size * 2;
  const pages = Math.max(1, Math.ceil(filteredItems.length / capacity));
  const activePage = Math.min(page, pages - 1);
  const visibleItems = filteredItems.slice(activePage * capacity, (activePage + 1) * capacity);
  const listLabel = 'Nguồn công nợ';
  const records = useMemo(
    () =>
      data.debts.map((item) => ({
        groupId: item.debtSourceId,
        amount: item.amount,
        date: item.dueDate ?? '',
      })),
    [data.debts],
  );
  return (
    <ClassificationScreen month={month} groups={data.debtSources} records={records} kind="debt">
      <article className="card category-list-panel debt-source-list-panel">
        <div className="category-toolbar">
          <h2>
            Nguồn công nợ <span>({data.debtSources.length})</span>
          </h2>
          <label className="search-box category-search-box">
            <Icon icon={faMagnifyingGlass} />
            <span className="sr-only">Tìm nguồn công nợ</span>
            <input
              type="search"
              value={search}
              placeholder="Tìm…"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
            />
          </label>
          <button
            className="button primary category-add-button monexa-action monexa-create"
            title="Thêm nguồn"
            aria-label="Thêm nguồn"
            disabled={!ready}
            onClick={onAdd}
          >
            <Icon icon={faPlus} />
          </button>
        </div>
        <div className="category-grid-viewport" ref={ref}>
          {!sources.length ? (
            <div className="compact-empty">
              <p>
                {data.debtSources.length
                  ? 'Không tìm thấy nguồn phù hợp.'
                  : 'Thêm nguồn như MoMo, Shopee, SEasy hoặc TikTok Shop để phân loại công nợ.'}
              </p>
            </div>
          ) : (
            <div className="category-grid">
              {visibleItems.map((source) => {
                const linked = data.debts.some((debt) => debt.debtSourceId === source.id);
                return (
                  <article className="category-tile" key={source.id}>
                    <span
                      className="category-symbol"
                      style={{ color: source.color, background: `${source.color}20` }}
                    >
                      <DebtSourceIcon icon={source.icon} />
                    </span>
                    <div className="category-tile-info">
                      <button
                        className="category-name"
                        title={source.name}
                        disabled={!ready}
                        onClick={() => onEdit(source)}
                      >
                        {source.name}
                      </button>
                      <span className="category-color">
                        <i style={{ background: source.color }} />
                        {source.color.toUpperCase()}
                      </span>
                    </div>
                    <div className="table-actions category-tile-actions">
                      <button
                        aria-label={`Sửa nguồn ${source.name}`}
                        title="Sửa nguồn"
                        disabled={!ready}
                        onClick={() => onEdit(source)}
                      >
                        <Icon icon={faPen} />
                      </button>
                      <button
                        aria-label={`Xóa nguồn ${source.name}`}
                        title={linked ? 'Nguồn đang được công nợ sử dụng' : 'Xóa nguồn'}
                        disabled={!ready || linked}
                        onClick={() => onDelete(source)}
                      >
                        <Icon icon={faTrashCan} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <Pagination
          label={listLabel}
          page={activePage}
          pages={pages}
          total={filteredItems.length}
          onChange={setPage}
        />
      </article>
    </ClassificationScreen>
  );
}
