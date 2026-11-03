'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { financeSchema, type FinanceData, type Snapshot } from '../model';
export function useFinance(pauseAutoRefresh = false) {
  const paused = useRef(pauseAutoRefresh);
  paused.current = pauseAutoRefresh;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const current = useRef<Snapshot | null>(null);
  const saving = useRef(false);
  const backgroundLoading = useRef(false);
  const lastBackgroundCheck = useRef(0);
  const sequence = useRef(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const refresh = useCallback(async (silent = false) => {
    if (saving.current) return;
    if (silent && (backgroundLoading.current || Date.now() - lastBackgroundCheck.current < 2000)) return;
    if (silent) {
      backgroundLoading.current = true;
      lastBackgroundCheck.current = Date.now();
    }
    const requestId = ++sequence.current;
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const revision = current.current?.revision;
      const response = await fetch('/api/finance', {
        cache: 'no-store',
        headers: silent && revision !== undefined ? { 'If-None-Match': `"finance-${revision}"` } : {},
      });
      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (response.status === 304) return;
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const next = { data: financeSchema.parse(result.data), revision: result.revision };
      if (requestId === sequence.current && !(silent && paused.current)) {
        const changed = current.current?.revision !== next.revision;
        current.current = next;
        if (!silent || changed) setSnapshot(next);
        setConflict(false);
      }
    } catch (err) {
      if (requestId === sequence.current)
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.');
    } finally {
      if (silent) backgroundLoading.current = false;
      if (!silent && requestId === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (pauseAutoRefresh || busy || loading || error) return;
    const update = () => {
      if (document.visibilityState === 'visible' && !saving.current && !paused.current)
        void refresh(true);
    };
    const timer = setInterval(update, 20000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [pauseAutoRefresh, busy, loading, error, refresh]);
  async function save(data: FinanceData) {
    if (saving.current || !current.current || loading) return false;
    const validated = financeSchema.safeParse(data);
    if (!validated.success) {
      setError(validated.error.issues[0].message);
      return false;
    }
    if (new Blob([JSON.stringify(data)]).size > 1_950_000) {
      setError('Dữ liệu vượt giới hạn 2 MB. Hãy xuất bản sao lưu và giảm dữ liệu trước khi lưu.');
      return false;
    }
    saving.current = true;
    setBusy(true);
    setError('');
    ++sequence.current;
    try {
      const response = await fetch('/api/finance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: validated.data, revision: current.current.revision }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.assign('/login');
        return false;
      }
      if (response.status === 409) setConflict(true);
      if (!response.ok) throw new Error(result.error);
      const next = { data: financeSchema.parse(result.data), revision: result.revision };
      current.current = next;
      setSnapshot(next);
      setConflict(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa lưu được. Hãy thử lại.');
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return { snapshot, busy, loading, error, conflict, refresh, save };
}
