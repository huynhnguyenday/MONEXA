'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import Dialog from '@/components/dialog';
import type { FinanceData } from '../model';

export type DebtHistorySort = 'default' | 'amountAsc' | 'amountDesc' | 'dueDesc';
export default function DebtHistoryFilters({
  sources,
  source,
  status,
  sort,
  onSource,
  onStatus,
  onSort,
}: {
  sources: FinanceData['debtSources'];
  source: string;
  status: string;
  sort: DebtHistorySort;
  onSource: (value: string) => void;
  onStatus: (value: string) => void;
  onSort: (value: DebtHistorySort) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = Number(!!source) + Number(!!status) + Number(sort !== 'default');
  return (
    <div className="debt-mobile-filters">
      <button
        type="button"
        className="button secondary debt-filter-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count ? `Tùy chọn bộ lọc, ${count} đang áp dụng` : 'Tùy chọn bộ lọc'}
        title="Tùy chọn bộ lọc"
        onClick={() => setOpen(true)}
      >
        <Icon icon={faSliders} />
        {count > 0 && <span aria-hidden="true">{count}</span>}
      </button>
      {open && (
        <Dialog
          title="Tùy chọn công nợ"
          compact
          className="compact-dialog debt-filter-dialog"
          onClose={() => setOpen(false)}
        >
          <div className="debt-filter-fields">
            <label>
              Nguồn công nợ
              <select
                aria-label="Nguồn công nợ"
                value={source}
                onChange={(event) => onSource(event.target.value)}
              >
                <option value="">Tất cả nguồn</option>
                {sources.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Trạng thái
              <select
                aria-label="Trạng thái"
                value={status}
                onChange={(event) => onStatus(event.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="outstanding">Đang nợ</option>
                <option value="overdue">Quá hạn</option>
                <option value="settled">Đã thanh toán</option>
              </select>
            </label>
            <label>
              Sắp xếp
              <select
                aria-label="Sắp xếp"
                value={sort}
                onChange={(event) => onSort(event.target.value as DebtHistorySort)}
              >
                <option value="default">Mặc định</option>
                <option value="amountAsc">Số tiền tăng dần</option>
                <option value="amountDesc">Số tiền giảm dần</option>
                <option value="dueDesc">Hạn xa nhất trước</option>
              </select>
            </label>
            <div className="debt-filter-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  onSource('');
                  onStatus('');
                  onSort('default');
                }}
              >
                Đặt lại
              </button>
              <button type="button" className="button primary" onClick={() => setOpen(false)}>
                Xong
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
