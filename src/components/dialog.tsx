'use client';
import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
export default function Dialog({
  title,
  children,
  onClose,
  busy = false,
  compact = false,
  className,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className={[compact ? 'compact-dialog' : '', className || ''].filter(Boolean).join(' ') || undefined}
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button type="button" aria-label="Đóng" disabled={busy} onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </dialog>
  );
}
