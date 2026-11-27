'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Dialog from '@/components/dialog';
import { createPortal } from 'react-dom';
import './use-confirmation.css';

export function useConfirmation() {
  const [message, setMessage] = useState('');
  const resolve = useRef<((answer: boolean) => void) | null>(null);
  const finish = useCallback((answer: boolean) => {
    resolve.current?.(answer);
    resolve.current = null;
    setMessage('');
  }, []);
  useEffect(
    () => () => {
      resolve.current?.(false);
    },
    [],
  );
  const confirm = useCallback((text: string) => {
    if (resolve.current) return Promise.resolve(false);
    setMessage(text);
    return new Promise<boolean>((answer) => {
      resolve.current = answer;
    });
  }, []);
  const confirmation = message
    ? createPortal(
        <Dialog
          title="Xác nhận thao tác"
          onClose={() => finish(false)}
          className="confirmation-dialog"
        >
          <p>{message}</p>
          <div className="confirmation-actions">
            <button
              type="button"
              className="button secondary"
              autoFocus
              onClick={() => finish(false)}
            >
              Hủy
            </button>
            <button type="button" className="button primary" onClick={() => finish(true)}>
              Xác nhận
            </button>
          </div>
        </Dialog>,
        document.body,
      )
    : null;
  return { confirm, confirmation };
}
