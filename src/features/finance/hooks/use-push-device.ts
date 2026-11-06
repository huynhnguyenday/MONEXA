'use client';
import { useEffect, useRef, useState } from 'react';

const workerPath = '/debt-reminders-sw.js';
async function activeRegistration() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Chưa khởi động được thông báo. Hãy tải lại trang và thử lại.')), 15000); }),
    ]);
  } finally { clearTimeout(timeout); }
}
function keyBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), char => char.charCodeAt(0));
}
async function request(path: string, method: string, body?: unknown) {
  const response = await fetch(path, { method, cache: 'no-store', signal: AbortSignal.timeout(15000),
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Không thể cập nhật thông báo.');
  return result;
}
export function usePushDevice() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const current = useRef<PushSubscription | null>(null);
  const publicKey = useRef('');
  const working = useRef(false);

  useEffect(() => {
    const available = window.isSecureContext && 'serviceWorker' in navigator
      && 'PushManager' in window && 'Notification' in window;
    setSupported(available);
    if (!available) { setBusy(false); return; }
    let cancelled = false;
    const updatePermission = () => setPermission(Notification.permission);
    updatePermission();
    window.addEventListener('focus', updatePermission);
    void (async () => {
      try {
        const config = await request('/api/push/subscription', 'GET');
        if (cancelled) return;
        setConfigured(config.enabled);
        if (!config.enabled) return;
        publicKey.current = config.publicKey;
        await navigator.serviceWorker.register(workerPath, { scope: '/', updateViaCache: 'none' });
        const ready = await activeRegistration();
        if (cancelled) return;
        registration.current = ready;
        let existing = await ready.pushManager.getSubscription();
        if (existing) {
          const key = existing.options.applicationServerKey;
          const expected = keyBytes(config.publicKey);
          if (!key || new Uint8Array(key).some((value, index) => value !== expected[index]) || key.byteLength !== expected.length) {
            // A VAPID rotation requires a new subscription; never silently request permission.
            await existing.unsubscribe();
            existing = null;
          }
        }
        if (existing && Notification.permission === 'granted') {
          await request('/api/push/subscription', 'POST', existing.toJSON());
          current.current = existing;
          if (!cancelled) setSubscribed(true);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Chưa kiểm tra được đăng ký thông báo.');
      } finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; window.removeEventListener('focus', updatePermission); };
  }, []);

  async function enable() {
    if (working.current || !supported || !configured) return;
    working.current = true; setBusy(true); setError(''); setNotice('');
    try {
      // Request directly from the click gesture, including on iOS Home Screen apps.
      const allowed = await Notification.requestPermission();
      setPermission(allowed);
      if (allowed !== 'granted') return;
      const ready = registration.current || await activeRegistration();
      const subscription = await ready.pushManager.getSubscription()
        || await ready.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey.current).buffer });
      await request('/api/push/subscription', 'POST', subscription.toJSON());
      current.current = subscription; setSubscribed(true);
      setNotice('Đã bật thông báo trên thiết bị này. Bạn có thể đóng MONEXA.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa bật được thông báo.'); }
    finally { working.current = false; setBusy(false); }
  }
  async function disable() {
    if (working.current || !current.current) return;
    working.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const subscription = current.current;
      await subscription.unsubscribe();
      current.current = null; setSubscribed(false);
      await request('/api/push/subscription', 'DELETE', { endpoint: subscription.endpoint });
      setNotice('Đã tắt thông báo trên thiết bị này.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa tắt được thông báo.'); }
    finally { working.current = false; setBusy(false); }
  }
  async function test() {
    if (working.current || !current.current) return;
    working.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await request('/api/push/test', 'POST', { endpoint: current.current.endpoint });
      setNotice('Đã gửi thông báo thử. Kiểm tra thanh thông báo của điện thoại.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Chưa gửi được thông báo thử.'); }
    finally { working.current = false; setBusy(false); }
  }
  return { supported, permission, subscribed, configured, busy, error, notice, enable, disable, test };
}
