'use client';
import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import Pagination from '@/components/pagination';
import { dateKey, debtDirection, money, upcomingDebtReminders, type FinanceData } from '../model';
import './debt-notifications.css';

export default function DebtNotifications({ data, ready, onRead }: {
  data: FinanceData; ready: boolean; onRead: (ids: string[]) => Promise<boolean>;
}) {
  const [today, setToday] = useState('');
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const update = () => setToday(dateKey());
    update();
    const timer = setInterval(update, 20000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const reminders = today ? upcomingDebtReminders(data.debts, today) : [];
  const unread = reminders.filter((debt) => debt.reminderReadFor !== debt.dueDate);
  const pages = Math.max(1, Math.ceil(reminders.length / 2));
  const activePage = Math.min(page, pages - 1);
  return <div className="debt-notifications" ref={root}>
    <button type="button" ref={button} className="icon-button notification-bell" disabled={!ready}
      aria-label={`Thông báo công nợ${unread.length ? `, ${unread.length} chưa đọc` : ''}`}
      aria-expanded={open} aria-controls="debt-notifications-panel"
      onClick={() => { setOpen(!open); setPage(0); }}>
      <Icon icon={faBell} />
      {unread.length > 0 && <span className="notification-count" aria-hidden="true">{unread.length > 99 ? '99+' : unread.length}</span>}
    </button>
    {open && <section id="debt-notifications-panel" className="notification-panel" aria-label="Thông báo công nợ">
      <div className="notification-heading"><h2>Nhắc hạn công nợ</h2>
        {unread.length > 0 && <button type="button" className="button secondary" disabled={!ready}
          onClick={() => void onRead(unread.map((debt) => debt.id))}>Đánh dấu đã đọc</button>}
      </div>
      {!reminders.length ? <p>Không có công nợ đến hạn vào ngày mai.</p> : <>
        <p className="notification-description">Đến hạn ngày mai · nhắc một lần cho mỗi khoản.</p>
        <ul>{reminders.slice(activePage * 2, activePage * 2 + 2).map((debt) => <li key={debt.id}>
          <strong>{debt.title}</strong>
          <span>{debtDirection(data, debt) === 'payable' ? 'Phải trả' : 'Phải thu'} · {money(debt.amount)}</span>
          <span>{data.debtSources.find((source) => source.id === debt.debtSourceId)?.name} · Hạn {debt.dueDate!.split('-').reverse().join('/')}</span>
          <small>{debt.reminderReadFor === debt.dueDate ? 'Đã đọc' : 'Chưa đọc'}</small>
        </li>)}</ul>
        {pages > 1 && <Pagination label="Thông báo công nợ" page={activePage} pages={pages} total={reminders.length} onChange={setPage} />}
      </>}
    </section>}
  </div>;
}
