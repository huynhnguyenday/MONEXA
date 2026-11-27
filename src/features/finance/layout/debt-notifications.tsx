'use client';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faBell, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import PushNotificationSettings from '../components/push-notification-settings';
import NotificationBody from '../components/notification-body';
import { useNotificationFeed } from '../hooks/use-notification-feed';
import { useConfirmation } from '../hooks/use-confirmation';
import Toast from '@/components/toast';
import './debt-notifications.css';

export default function DebtNotifications({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const { confirm, confirmation } = useConfirmation();
  const feed = useNotificationFeed(ready);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (
        !(event.target as Element).closest?.('.confirmation-dialog') &&
        !root.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 1500);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <div className="debt-notifications" ref={root}>
      <button
        type="button"
        ref={button}
        className="button notification-icon-button notification-bell monexa-action monexa-bell"
        disabled={!ready}
        aria-label={`Thông báo công nợ${feed.unreadCount ? `, ${feed.unreadCount} chưa đọc` : ''}`}
        aria-expanded={open}
        aria-controls="debt-notifications-panel"
        onClick={() => {
          if (!open) void feed.refresh();
          setOpen(!open);
        }}
      >
        <Icon icon={faBell} />
        {feed.unreadCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {feed.unreadCount > 99 ? '99+' : feed.unreadCount}
          </span>
        )}
      </button>
      <section
        hidden={!open}
        id="debt-notifications-panel"
        className="notification-panel"
        aria-label="Thông báo công nợ"
      >
        <PushNotificationSettings onNotice={setNotice} onTest={feed.refresh} />
        {feed.error && (
          <div className="notification-error" role="alert">
            {feed.error}
            <button
              type="button"
              className="inline-button"
              disabled={feed.busy || feed.loading}
              onClick={() => void feed.refresh()}
            >
              Thử tải lại
            </button>
          </div>
        )}
        <div
          className={`notification-content${!feed.items.length ? ' notification-content-empty' : ''}`}
          aria-busy={feed.loading || feed.busy}
        >
          {!feed.items.length ? (
            <p>{feed.loading ? 'Đang tải lịch sử thông báo…' : 'Chưa có thông báo.'}</p>
          ) : (
            <>
              {feed.unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-mark-read"
                  disabled={feed.busy || feed.loading}
                  onClick={async () => {
                    if (await confirm('Đánh dấu tất cả thông báo là đã đọc?'))
                      await feed.markAllRead();
                  }}
                >
                  Đánh dấu đã đọc
                </button>
              )}
              <ul>
                {feed.items.map((item) => (
                  <li key={item.id} className="notification-feed-item" data-read={item.read}>
                    <button
                      type="button"
                      className="notification-read-button"
                      aria-label={`${item.read ? 'Đã đọc' : 'Đọc thông báo'}: ${item.title}`}
                      disabled={feed.busy}
                      onClick={() => {
                        if (!item.read) void feed.markRead(item.id);
                      }}
                    >
                      <strong>{item.title}</strong>
                      <span>
                        <NotificationBody body={item.body} />
                      </span>
                      <small>
                        <time dateTime={item.receivedAt}>
                          {new Date(item.receivedAt).toLocaleString('vi-VN', {
                            timeZone: 'Asia/Ho_Chi_Minh',
                          })}
                        </time>{' '}
                        · {item.read ? 'Đã đọc' : 'Chưa đọc'}
                      </small>
                    </button>
                    <div className="notification-item-actions">
                      <button
                        type="button"
                        className="notification-compact-button notification-delete-button"
                        aria-label={`Xóa thông báo ${item.title}`}
                        title="Xóa thông báo"
                        disabled={feed.busy}
                        onClick={async () => {
                          if (await confirm(`Xóa thông báo “${item.title}”?`))
                            await feed.remove(item.id);
                        }}
                      >
                        <span className="notification-button-face">
                          <Icon icon={faTrashCan} />
                        </span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {feed.hasMore && (
                <button
                  type="button"
                  className="notification-mark-read"
                  disabled={feed.loading || feed.busy}
                  onClick={() => void feed.loadMore()}
                >
                  Xem thông báo cũ hơn
                </button>
              )}
            </>
          )}
        </div>
      </section>
      {notice && <Toast tone="success">{notice}</Toast>}
      {confirmation}
    </div>
  );
}
