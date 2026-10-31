'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faPen, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import Pagination, { useViewportRows } from '@/components/pagination';
import { type Category, type FinanceData, money } from '../model';
import { categoryIcons } from '../icons';
import './category-panel.css';

export default function CategoryPanel({
  data,
  ready,
  onEdit,
  onDelete,
}: {
  data: FinanceData;
  ready: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  const [search, setSearch] = useState(''),
    [page, setPage] = useState(0);
  const { ref, size } = useViewportRows(72, 32);
  const filtered = data.categories.filter((category) =>
    category.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size)),
    activePage = Math.min(page, pages - 1);
  return (
    <section className="card category-panel" aria-label="Quản lý danh mục">
      <div className="category-toolbar">
        <h2>
          Danh mục <span>({data.categories.length})</span>
        </h2>
        <label className="search-box">
          <Icon icon={faMagnifyingGlass} />
          <span className="sr-only">Tìm danh mục</span>
          <input
            type="search"
            value={search}
            placeholder="Tìm danh mục…"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      <div className="category-table-viewport" ref={ref}>
        {!filtered.length ? (
          <div className="compact-empty">
            <p>Không tìm thấy danh mục phù hợp.</p>
          </div>
        ) : (
          <table className="category-table">
            <caption className="sr-only">Danh mục và chi tiêu liên quan theo ID</caption>
            <colgroup>
              <col />
              <col className="category-usage-column" />
              <col className="category-action-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Tên / icon</th>
                <th scope="col">Chi tiêu · tất cả thời gian</th>
                <th scope="col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(activePage * size, (activePage + 1) * size).map((category) => {
                const expenses = data.expenses.filter(
                  (expense) => expense.categoryId === category.id,
                );
                const deleteReason = expenses.length
                  ? 'Danh mục đang có chi tiêu'
                  : data.categories.length === 1
                    ? 'Cần giữ ít nhất một danh mục'
                    : '';
                return (
                  <tr key={category.id}>
                    <td>
                      <div className="category-identity">
                        <span
                          className="category-symbol"
                          style={{ color: category.color, background: category.color + '18' }}
                        >
                          <Icon icon={categoryIcons[category.icon]} />
                        </span>
                        <div>
                          <button
                            className="expense-name"
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
                      </div>
                    </td>
                    <td>
                      <strong>
                        {money(expenses.reduce((sum, expense) => sum + expense.amount, 0))}
                      </strong>
                      <small>{expenses.length} khoản chi</small>
                    </td>
                    <td>
                      <div className="table-actions">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Pagination
        label="Danh mục"
        page={activePage}
        pages={pages}
        total={filtered.length}
        onChange={setPage}
      />
    </section>
  );
}
