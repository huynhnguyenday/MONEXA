'use client';
import { useEffect, useState, type CSSProperties, type Ref } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faBars,
  faXmark,
  faCalendarDays,
  faChartLine,
  faClockRotateLeft,
} from '@fortawesome/free-solid-svg-icons';
import MonthPicker from '@/components/month-picker';
import { MonthPickerSkeleton } from '../components/loading-skeleton';
import type { FinanceView } from '../types';
import DebtNotifications from './debt-notifications';
import './header-debt-tabs.css';

type Props = {
  view: FinanceView;
  debtView: 'calendar' | 'history';
  debtPage: number;
  onDebtPageChange: (index: number) => void;
  month: string;
  onMonthChange: (month: string) => void;
  navOpen: boolean;
  toggleRef: Ref<HTMLButtonElement>;
  onToggleNav: () => void;
  ready: boolean;
  loading?: boolean;
};
export default function AppHeader({
  view,
  debtView,
  debtPage,
  onDebtPageChange,
  month,
  onMonthChange,
  navOpen,
  toggleRef,
  onToggleNav,
  ready,
  loading = false,
}: Props) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return (
    <header className="workspace-header">
      <div className="workspace-navigation">
        <button
          type="button"
          className="icon-button menu-toggle"
          aria-label={navOpen ? 'Thu gọn điều hướng' : 'Mở thanh điều hướng'}
          aria-expanded={navOpen}
          aria-controls="main-navigation"
          ref={toggleRef}
          onClick={onToggleNav}
        >
          <Icon icon={navOpen ? faXmark : faBars} />
        </button>
      </div>
      <div className="header-center">
        {view === 'overview' || view === 'income' ? (
          loading ? (
            <MonthPickerSkeleton />
          ) : (
            <MonthPicker value={month} onChange={onMonthChange} compact />
          )
        ) : view === 'debts' ? (
          <div
            className="header-debt-tabs"
            data-active={debtView}
            style={{ '--mobile-debt-position': `${debtPage * 100}%` } as CSSProperties}
            role="group"
            aria-label="Nội dung công nợ"
          >
            <button
              type="button"
              aria-label="Công nợ"
              title="Công nợ"
              aria-pressed={debtView === 'calendar' && (!mobile || debtPage === 0)}
              onClick={() => onDebtPageChange(0)}
            >
              <Icon icon={faCalendarDays} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="debt-chart-tab"
              aria-label="Biểu đồ công nợ"
              title="Biểu đồ công nợ"
              aria-pressed={debtView === 'calendar' && debtPage === 1}
              onClick={() => onDebtPageChange(1)}
            >
              <Icon icon={faChartLine} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Lịch sử công nợ"
              title="Lịch sử công nợ"
              aria-pressed={debtView === 'history'}
              onClick={() => onDebtPageChange(2)}
            >
              <Icon icon={faClockRotateLeft} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <div id="header-workspace-tabs" />
      </div>
      <div className="header-primary-action">
        <DebtNotifications ready={ready} />
      </div>
    </header>
  );
}
