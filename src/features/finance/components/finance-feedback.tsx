'use client';
import Toast from '@/components/toast';
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
    <>
      <Toast tone="error">{error}</Toast>
      <button className="inline-button" disabled={busy || loading} onClick={onRetry}>
        {loading ? 'Đang tải…' : conflict ? 'Tải dữ liệu mới nhất rồi thử lại' : 'Thử tải lại'}
      </button>
    </>
  );
}
export function FinanceFeedback({
  error,
  notice,
  hasLegacy,
  ready,
  onMigrate,
  onDismissLegacy,
}: {
  error: ReactNode;
  notice: string;
  hasLegacy: boolean;
  ready: boolean;
  onMigrate: () => void;
  onDismissLegacy: () => void;
}) {
  return (
    <div className="workspace-messages">
      {error}
      {notice && (
        <Toast tone={/^(Không|Chưa|Cần|Tệp|Khoản)/.test(notice) ? 'error' : 'success'}>
          {notice}
        </Toast>
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
