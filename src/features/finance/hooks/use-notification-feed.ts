'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import {
  notificationPageSchema,
  notificationMutationSchema,
  type InAppNotification,
} from '../notifications/notification-schema';

export function useNotificationFeed(enabled: boolean) {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [asOf, setAsOf] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const working = useRef(false);
  const sequence = useRef(0);
  const load = useCallback(async (cursor?: string) => {
    if (working.current) return;
    const requestId = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        { cache: 'no-store' },
      );
      const raw = await response.json();
      if (!response.ok) throw new Error(raw.error || 'Chưa tải được thông báo.');
      const page = notificationPageSchema.parse(raw);
      if (requestId !== sequence.current) return;
      setItems((previous) =>
        cursor
          ? [
              ...previous,
              ...page.items.filter((item) => !previous.some((old) => old.id === item.id)),
            ]
          : page.items,
      );
      setUnreadCount(page.unreadCount);
      setNextCursor(page.nextCursor);
      if (!cursor) setAsOf(page.asOf);
    } catch (err) {
      if (requestId === sequence.current)
        setError(
          err instanceof z.ZodError
            ? 'Dữ liệu thông báo không hợp lệ.'
            : err instanceof Error
              ? err.message
              : 'Chưa tải được thông báo.',
        );
    } finally {
      if (requestId === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);
  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return;
    const receive = (event: MessageEvent) => {
      if (event.data?.type === 'monexa:notification') void load();
    };
    navigator.serviceWorker.addEventListener('message', receive);
    return () => navigator.serviceWorker.removeEventListener('message', receive);
  }, [enabled, load]);
  async function mutate(input: z.infer<typeof notificationMutationSchema>) {
    if (working.current) return false;
    working.current = true;
    ++sequence.current;
    setBusy(true);
    setLoading(false);
    setError('');
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Chưa cập nhật được thông báo.');
      const unread = z.number().int().nonnegative().parse(result.unreadCount);
      setItems((previous) =>
        input.action === 'delete'
          ? previous.filter((item) => item.id !== input.id)
          : previous.map((item) =>
              (
                input.action === 'read'
                  ? input.ids.includes(item.id)
                  : item.receivedAt <= input.through
              )
                ? { ...item, read: true }
                : item,
            ),
      );
      setUnreadCount(unread);
      return true;
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? 'Dữ liệu thông báo không hợp lệ.'
          : err instanceof Error
            ? err.message
            : 'Chưa cập nhật được thông báo.',
      );
      return false;
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return {
    items,
    unreadCount,
    loading,
    busy,
    error,
    refresh: () => load(),
    loadMore: () => (nextCursor ? load(nextCursor) : Promise.resolve()),
    hasMore: !!nextCursor,
    markRead: (id: string) => mutate({ action: 'read', ids: [id] }),
    markAllRead: () =>
      asOf ? mutate({ action: 'read-all', through: asOf }) : Promise.resolve(false),
    remove: (id: string) => mutate({ action: 'delete', id }),
  };
}
