'use client';
import Toast from '@/components/toast';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Dialog from '@/components/dialog';
import PendingLabel from '@/components/pending-label';
import type { CustomIcon } from '../custom-icon-schema';

export default function IconDeleteDialog({
  asset,
  affectedCount,
  busy,
  onClose,
  onDelete,
}: {
  asset: CustomIcon;
  affectedCount: number;
  busy: boolean;
  onClose: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const pending = useRef(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const locked = busy || deleting;
  return createPortal(
    <Dialog title="Xóa icon" onClose={onClose} busy={locked}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (busy || pending.current) return;
          pending.current = true;
          setDeleting(true);
          setError('');
          try {
            if (await onDelete()) onClose();
            else setError('Chưa xóa được icon. Hãy kiểm tra thông báo và thử lại.');
          } catch {
            setError('Chưa xóa được icon. Hãy thử lại.');
          } finally {
            pending.current = false;
            setDeleting(false);
          }
        }}
      >
        <p>
          Bạn có muốn xóa icon <strong>{asset.name}</strong> khỏi thư viện?
        </p>
        {affectedCount > 0 && (
          <p>
            Icon này đang được {affectedCount} danh mục sử dụng. Hãy đổi các danh mục sang icon khác
            trong thư viện trước khi xóa.
          </p>
        )}
        {error && (
          <Toast>
            {error}
          </Toast>
        )}
        <div className="custom-icon-delete-actions">
          <button
            type="button"
            className="button monexa-action monexa-cancel"
            disabled={locked}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="button monexa-action monexa-delete"
            disabled={locked || affectedCount > 0}
            aria-busy={locked}
          >
            {locked ? <PendingLabel>Đang xóa</PendingLabel> : 'Xác nhận xóa'}
          </button>
        </div>
      </form>
    </Dialog>,
    document.body,
  );
}
