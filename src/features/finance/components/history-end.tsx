import type { Ref } from 'react';
import './history-end.css';

export default function HistoryEnd({ endRef, hasMore }: { endRef: Ref<HTMLDivElement>; hasMore: boolean }) {
  return hasMore ? <div ref={endRef} className="history-end" aria-hidden="true" /> : null;
}
