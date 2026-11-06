'use client';
import type { ReactNode } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

export function FinanceError({
  error,
  busy,
  loading,
  conflict,
  onRetry,
}: {
  error: string;
  busy: boolean;
  loading: boolean;
  conflict: boolean;
  onRetry: () => void;
}) {
  if (!error) return null;
  return (
    <div role="alert" className="alert">
      <div>
        {error}
        <button className="inline-button" disabled={busy || loading} onClick={onRetry}>
          {loading ? 'Đang tải…' : conflict ? 'Tải dữ liệu mới nhất rồi thử lại' : 'Thử tải lại'}
        </button>
      </div>
    </div>
  );
}
export function FinanceFeedback({
  error,
  notice,
  onDismissNotice,
  hasLegacy,
  ready,
  onMigrate,
  onDismissLegacy,
}: {
  error: ReactNode;
  notice: string;
  onDismissNotice: () => void;
  hasLegacy: boolean;
  ready: boolean;
  onMigrate: () => void;
  onDismissLegacy: () => void;
}) {
  return (
    <div className="workspace-messages">
      {error}
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            className="monexa-action monexa-close"
            aria-label="Đóng thông báo"
            onClick={onDismissNotice}
          >
            <Icon icon={faXmark} />
          </button>
        </div>
      )}
      {hasLegacy && (
        <div className="notice">
          <button className="inline-button" disabled={!ready} onClick={onMigrate}>
            Chuyển dữ liệu từ phiên bản cũ
          </button>
          <button
            className="monexa-action monexa-close"
            aria-label="Ẩn gợi ý chuyển dữ liệu"
            onClick={onDismissLegacy}
          >
            <Icon icon={faXmark} />
          </button>
        </div>
      )}
    </div>
  );
}
