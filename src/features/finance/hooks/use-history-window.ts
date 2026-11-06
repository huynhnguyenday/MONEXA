'use client';
import { useEffect, useRef, useState } from 'react';

export const HISTORY_BATCH_SIZE = 15;

/** Reveal complete batches inside the history viewport, without changing the ledger. */
export function useHistoryWindow(total: number, resetKey: string, paused = false) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [batch, setBatch] = useState({ key: resetKey, count: HISTORY_BATCH_SIZE });
  const count = batch.key === resetKey ? batch.count : HISTORY_BATCH_SIZE;
  const visibleCount = Math.min(total, count);
  const hasMore = visibleCount < total;

  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
    setBatch({ key: resetKey, count: HISTORY_BATCH_SIZE });
  }, [resetKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const end = endRef.current;
    if (!viewport || !end || !hasMore || paused) return;
    const reveal = () => {
      if (viewport.clientHeight === 0) return;
      // Scroll and observer events for the same boundary reveal only one batch.
      setBatch(previous => previous.key === resetKey && previous.count > count
        ? previous : { key: resetKey, count: Math.min(total, count + HISTORY_BATCH_SIZE) });
    };
    const onScroll = () => {
      if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 80) reveal();
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) reveal();
    }, { root: viewport, rootMargin: '0px 0px 80px 0px' });
    observer.observe(end);
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      viewport.removeEventListener('scroll', onScroll);
    };
  }, [count, hasMore, paused, resetKey, total]);

  return { viewportRef, endRef, visibleCount, hasMore };
}
