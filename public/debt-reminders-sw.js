self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let message = {};
  try {
    const parsed = event.data ? event.data.json() : {};
    if (parsed && typeof parsed === 'object') message = parsed;
  } catch { /* Always show a visible notification. */ }
  event.waitUntil(Promise.all([self.registration.showNotification(
    typeof message.title === 'string' ? message.title.slice(0, 120) : 'MONEXA · Nhắc hạn công nợ', {
      body: typeof message.body === 'string' ? message.body.slice(0, 400) : 'Mở MONEXA để xem công nợ đến hạn.',
      icon: '/pwa-192.png', badge: '/favicon.png',
      tag: typeof message.tag === 'string' ? message.tag.slice(0, 180) : 'monexa:reminder',
      data: { url: '/debts' },
    },
  ), self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    for (const client of clients) {
      if (new URL(client.url).origin === self.location.origin) client.postMessage({
        type: 'monexa:notification',
        title: typeof message.title === 'string' ? message.title.slice(0, 120) : 'MONEXA',
        body: typeof message.body === 'string' ? message.body.slice(0, 400) : 'Mở MONEXA để xem công nợ đến hạn.',
        tag: typeof message.tag === 'string' ? message.tag.slice(0, 180) : 'monexa:reminder',
      });
    }
  })]));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then(async (clients) => {
    const client = clients.find((item) => new URL(item.url).origin === self.location.origin);
    if (client) { await client.navigate('/debts'); return client.focus(); }
    return self.clients.openWindow('/debts');
  }));
});
