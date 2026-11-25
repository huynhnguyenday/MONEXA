'use client';
import { useEffect, useRef, useId } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
export default function Dialog({
  title,
  children,
  onClose,
  busy = false,
  backgroundSaving = busy,
  compact = false,
  className,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  backgroundSaving?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  useEffect(() => {
    const dialog = ref.current;
    if (!busy) {
      // Keep the form mounted while saving so a failed request restores its draft.
      if (dialog?.isConnected && !dialog.open) dialog.showModal();
      return;
    }
    if (!backgroundSaving) return;
    const openDialogs = document.querySelectorAll('dialog[open]');
    // A nested icon dialog owns its save; keep its parent form and draft in place.
    if (dialog !== openDialogs.item(openDialogs.length - 1)) return;
    // Closing the native dialog releases the viewport without cancelling the request.
    const timer = setTimeout(() => dialog?.close(), 1500);
    return () => clearTimeout(timer);
  }, [busy, backgroundSaving]);
  return (
    <dialog
      className={
        [compact ? 'compact-dialog' : '', className || ''].filter(Boolean).join(' ') || undefined
      }
      ref={ref}
      aria-labelledby={titleId}
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
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="monexa-action monexa-close"
            aria-label="Đóng"
            disabled={busy}
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </dialog>
  );
}
