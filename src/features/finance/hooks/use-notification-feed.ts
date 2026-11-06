'use client';
import { useCallback, useEffect, useState } from 'react';

export type InAppNotification = {
  tag: string;
  title: string;
  body: string;
  receivedAt: string;
  read: boolean;
};

export function useNotificationFeed() {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const receive = useCallback((message: Pick<InAppNotification, 'tag' | 'title' | 'body'>) => {
    setItems((previous) => [
      { ...message, receivedAt: new Date().toISOString(), read: false },
      ...previous.filter((item) => item.tag !== message.tag),
    ]);
  }, []);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const listener = (event: MessageEvent) => {
      const message = event.data;
      if (
        message?.type !== 'monexa:notification' ||
        typeof message.title !== 'string' ||
        typeof message.body !== 'string' ||
        typeof message.tag !== 'string'
      )
        return;
      receive({
        title: message.title.slice(0, 120),
        body: message.body.slice(0, 400),
        tag: message.tag.slice(0, 180),
      });
    };
    navigator.serviceWorker.addEventListener('message', listener);
    return () => navigator.serviceWorker.removeEventListener('message', listener);
  }, [receive]);
  const markRead = () => setItems((previous) => previous.map((item) => ({ ...item, read: true })));
  const remove = (tag: string) =>
    setItems((previous) => previous.filter((item) => item.tag !== tag));
  return { items, receive, markRead, remove };
}
