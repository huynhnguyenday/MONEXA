'use client';
import { useMemo, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faPen, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
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
  const matchesSearch = createSearchMatcher(search);
  const sources = data.debtSources.filter((item) => matchesSearch(item.name));
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
        <div
          className="category-grid-viewport"
          role="region"
          aria-label="Nguồn công nợ"
          tabIndex={0}
        >
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
              {sources.map((source) => {
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
      </article>
    </ClassificationScreen>
  );
}
