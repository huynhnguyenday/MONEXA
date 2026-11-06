'use client';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faBell, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { dateKey, debtDirection, money, upcomingDebtReminders, type FinanceData } from '../model';
import PushNotificationSettings from '../components/push-notification-settings';
import NotificationBody from '../components/notification-body';
import { useNotificationFeed } from '../hooks/use-notification-feed';
import { debtPushMessage } from '../notifications/push-message';
import './debt-notifications.css';

export default function DebtNotifications({
  data,
  ready,
  onRead,
}: {
  data: FinanceData;
  ready: boolean;
  onRead: (ids: string[]) => Promise<boolean>;
}) {
  const [today, setToday] = useState('');
  const [open, setOpen] = useState(false);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);
  const feed = useNotificationFeed();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setToday(dateKey());
    update();
    const timer = setInterval(update, 20000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
  const reminders = today
    ? upcomingDebtReminders(data.debts, today).filter(
        (debt) => !dismissedReminders.includes(`${debt.id}:${debt.dueDate}`),
      )
    : [];
  const unread = reminders.filter((debt) => debt.reminderReadFor !== debt.dueDate);
  const unreadCount = unread.length + feed.items.filter((item) => !item.read).length;
  const hasContent = reminders.length > 0 || feed.items.length > 0;
  const testNotification = () => {
    const debt = data.debts
      .filter((item) => !item.settledAt && item.dueDate)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!) || a.id.localeCompare(b.id))[0];
    feed.receive(
      debt?.dueDate
        ? debtPushMessage({ ...debt, dueDate: debt.dueDate }, 'monexa:test', true)
        : {
            tag: 'monexa:test',
            title: 'MONEXA · Thông báo thử',
            body: 'Thông báo trong ứng dụng hoạt động. Hiện không có công nợ chưa thanh toán có hạn.',
          },
    );
  };
  return (
    <div className="debt-notifications" ref={root}>
      <button
        type="button"
        ref={button}
        className="button notification-icon-button notification-bell monexa-action monexa-bell"
        disabled={!ready}
        aria-label={`Thông báo công nợ${unreadCount ? `, ${unreadCount} chưa đọc` : ''}`}
        aria-expanded={open}
        aria-controls="debt-notifications-panel"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <Icon icon={faBell} />
        {unreadCount > 0 && (
          <span className="notification-count" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <section
        hidden={!open}
        id="debt-notifications-panel"
        className="notification-panel"
        aria-label="Thông báo công nợ"
      >
        <PushNotificationSettings
          onTest={testNotification}
          onNotice={(body) =>
            feed.receive({
              tag: `monexa:device:${crypto.randomUUID()}`,
              title: 'Cài đặt thông báo',
              body,
            })
          }
        />
        <div className={`notification-content${!hasContent ? ' notification-content-empty' : ''}`}>
          {!hasContent ? (
            <p>Không có công nợ đến hạn vào ngày mai.</p>
          ) : (
            <>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notification-mark-read"
                  disabled={!ready}
                  onClick={() => {
                    feed.markRead();
                    if (unread.length) void onRead(unread.map((debt) => debt.id));
                  }}
                >
                  Đánh dấu đã đọc
                </button>
              )}
              <ul>
                {feed.items.map((item) => (
                  <li key={item.tag} className="notification-feed-item">
                    <strong>{item.title}</strong>
                    <div className="notification-item-actions">
                      <button
                        type="button"
                        className="notification-compact-button notification-delete-button"
                        aria-label={`Xóa thông báo ${item.title}`}
                        title="Xóa thông báo"
                        onClick={() => feed.remove(item.tag)}
                      >
                        <span className="notification-button-face">
                          <Icon icon={faTrashCan} />
                        </span>
                      </button>
                    </div>
                    <span>
                      <NotificationBody body={item.body} />
                    </span>
                    <small>
                      {new Date(item.receivedAt).toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                      })}{' '}
                      · {item.read ? 'Đã đọc' : 'Chưa đọc'}
                    </small>
                  </li>
                ))}
                {reminders.map((debt) => (
                  <li key={debt.id}>
                    <strong>{debt.title}</strong>
                    <div className="notification-item-actions">
                      <button
                        type="button"
                        className="notification-compact-button notification-delete-button"
                        aria-label={`Xóa thông báo ${debt.title}`}
                        title="Xóa thông báo"
                        onClick={() =>
                          setDismissedReminders((previous) => [
                            ...previous,
                            `${debt.id}:${debt.dueDate}`,
                          ])
                        }
                      >
                        <span className="notification-button-face">
                          <Icon icon={faTrashCan} />
                        </span>
                      </button>
                    </div>
                    <span>
                      {debtDirection(data, debt) === 'payable' ? 'Phải trả' : 'Phải thu'} ·{' '}
                      {money(debt.amount)}
                    </span>
                    <span>
                      {data.debtSources.find((source) => source.id === debt.debtSourceId)?.name} ·
                      Hạn {debt.dueDate!.split('-').reverse().join('/')}
                    </span>
                    <small>{debt.reminderReadFor === debt.dueDate ? 'Đã đọc' : 'Chưa đọc'}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
