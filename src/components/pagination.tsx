'use client';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

export function useViewportRows(rowHeight: number, headerHeight = 30) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(1);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) {
        const styles = getComputedStyle(element);
        const row = parseFloat(styles.getPropertyValue('--row-height')) || rowHeight;
        const header = parseFloat(styles.getPropertyValue('--table-header-height'));
        setSize(
          Math.max(
            1,
            Math.floor(
              (entry.contentRect.height - (Number.isFinite(header) ? header : headerHeight)) / row,
            ),
          ),
        );
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [rowHeight, headerHeight]);
  return { ref, size };
}

export default function Pagination({
  page,
  pages,
  total,
  onChange,
  label,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
  label: string;
}) {
  return (
    <nav className="pagination" aria-label={label}>
      <span>
        <span className="pagination-total">{total} mục · </span>
        {page + 1}/{Math.max(1, pages)}
      </span>
      <div>
        <button
          type="button"
          aria-label={`${label}: trang trước`}
          disabled={page === 0}
          onClick={() => onChange(page - 1)}
        >
          <Icon icon={faChevronLeft} />
        </button>
        <button
          type="button"
          aria-label={`${label}: trang sau`}
          disabled={page + 1 >= pages}
          onClick={() => onChange(page + 1)}
        >
          <Icon icon={faChevronRight} />
        </button>
      </div>
    </nav>
  );
}
