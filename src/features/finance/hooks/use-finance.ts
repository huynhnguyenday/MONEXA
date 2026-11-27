'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { financeSchema, type FinanceData, type Snapshot } from '../model';
import { mergeSave } from '../save-changes';
export function useFinance() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const current = useRef<Snapshot | null>(null);
  const saving = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const blocked = useRef(false);
  const sequence = useRef(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const refresh = useCallback(async () => {
    if (saving.current) return;
    const requestId = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/finance', {
        cache: 'no-store',
      });
      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const next = { data: financeSchema.parse(result.data), revision: result.revision };
      if (requestId === sequence.current) {
        current.current = next;
        blocked.current = false;
        setSnapshot(next);
        setConflict(false);
      }
    } catch (err) {
      if (requestId === sequence.current)
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu.');
    } finally {
      if (requestId === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  async function save(data: FinanceData, replace = false) {
    if (!current.current || loading || conflict) return false;
    // Confirmation can stay open while another background save completes.
    const base = snapshot ?? current.current;
    const validated = financeSchema.safeParse(data);
    if (!validated.success) {
      setError(validated.error.issues[0].message);
      return false;
    }
    if (new Blob([JSON.stringify(data)]).size > 1_950_000) {
      setError('Dữ liệu vượt giới hạn 2 MB. Hãy xuất bản sao lưu và giảm dữ liệu trước khi lưu.');
      return false;
    }
    ++pending.current;
    saving.current = true;
    setBusy(true);
    setError('');
    ++sequence.current;
    const execute = async () => {
      try {
        if (!current.current) return false;
        if (blocked.current)
          throw new Error(
            'Lần lưu trước chưa được xác nhận. Giữ nội dung và tải lại dữ liệu trước khi gửi tiếp.',
          );
        if (replace && current.current.revision !== base.revision)
          throw new Error(
            'Dữ liệu đã thay đổi trong lúc chờ nhập. Kiểm tra lại trước khi thay thế.',
          );
        const merged = replace
          ? validated.data
          : financeSchema.parse(mergeSave(base.data, validated.data, current.current.data));
        const response = await fetch('/api/finance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: merged, revision: current.current.revision, replace }),
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
        blocked.current = true;
        setError(err instanceof Error ? err.message : 'Chưa lưu được. Hãy thử lại.');
        return false;
      } finally {
        --pending.current;
        saving.current = pending.current > 0;
        setBusy(saving.current);
      }
    };
    // One request at a time; subsequent independent submissions use the returned revision.
    const task = queue.current.then(execute);
    queue.current = task;
    return task;
  }
  return { snapshot, busy, loading, error, conflict, refresh, save };
}
