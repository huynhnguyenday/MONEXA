'use client';
import { useMemo, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faPen, faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { createSearchMatcher } from '@/lib/search';
import { type Category, type FinanceData, dateKey, expenseCategoryId } from '../model';
import ClassificationScreen from './classification-screen';
import { categoryIcons } from '../icons';
export default function CategoryPanel({
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
  onEdit: (item: Category) => void;
  onDelete: (item: Category) => void;
}) {
  const [search, setSearch] = useState('');
  const matchesSearch = createSearchMatcher(search);
  const filteredCategories = data.categories.filter((item) => matchesSearch(item.name));
  const records = useMemo(
    () =>
      data.expenses.flatMap((item) => {
        const groupId = expenseCategoryId(data, item);
        return groupId ? [{ groupId, amount: item.amount, date: dateKey(item.occurredAt) }] : [];
      }),
    [data.expenses, data.debts],
  );
  return (
    <ClassificationScreen month={month} groups={data.categories} records={records} kind="expense">
      <article className="card category-list-panel">
        <div className="category-toolbar">
          <h2>
            Danh mục <span>({data.categories.length})</span>
          </h2>
          <label className="search-box category-search-box">
            <Icon icon={faMagnifyingGlass} />
            <span className="sr-only">Tìm danh mục</span>
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
            title="Thêm danh mục"
            aria-label="Thêm danh mục"
            disabled={!ready}
            onClick={onAdd}
          >
            <Icon icon={faPlus} />
          </button>
        </div>
        <div className="category-grid-viewport" role="region" aria-label="Danh mục" tabIndex={0}>
          {!filteredCategories.length ? (
            <div className="compact-empty">
              <p>Không tìm thấy danh mục phù hợp.</p>
            </div>
          ) : (
            <div className="category-grid">
              {filteredCategories.map((category) => {
                const expenses = data.expenses.filter(
                  (expense) => expense.categoryId === category.id,
                );
                const deleteReason =
                  expenses.length || data.debts.some((debt) => debt.categoryId === category.id)
                    ? 'Danh mục đang được sử dụng'
                    : data.categories.length === 1
                      ? 'Cần giữ ít nhất một danh mục'
                      : '';
                return (
                  <article className="category-tile" key={category.id}>
                    <span
                      className="category-symbol"
                      style={{ color: category.color, background: `${category.color}20` }}
                    >
                      <Icon icon={categoryIcons[category.icon]} />
                    </span>
                    <div className="category-tile-info">
                      <button
                        className="category-name"
                        title={category.name}
                        disabled={!ready}
                        onClick={() => onEdit(category)}
                      >
                        {category.name}
                      </button>
                      <span className="category-color">
                        <i style={{ background: category.color }} />
                        {category.color.toUpperCase()}
                      </span>
                    </div>
                    <div className="table-actions category-tile-actions">
                      <button
                        aria-label={`Sửa danh mục ${category.name}`}
                        title="Sửa tên, icon, màu"
                        disabled={!ready}
                        onClick={() => onEdit(category)}
                      >
                        <Icon icon={faPen} />
                      </button>
                      <button
                        aria-label={`Xóa danh mục ${category.name}`}
                        title={deleteReason || 'Xóa danh mục chưa sử dụng'}
                        disabled={!ready || !!deleteReason}
                        onClick={() => onDelete(category)}
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
