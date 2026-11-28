'use client';
import type { Ref } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import MonthPicker from '@/components/month-picker';
import { MonthPickerSkeleton } from '../components/loading-skeleton';
import type { FinanceView } from '../types';
import DebtNotifications from './debt-notifications';
import './header-debt-tabs.css';

type Props = {
  view: FinanceView;
  debtView: 'calendar' | 'history';
  onDebtViewChange: (view: 'calendar' | 'history') => void;
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
  onDebtViewChange,
  month,
  onMonthChange,
  navOpen,
  toggleRef,
  onToggleNav,
  ready,
  loading = false,
}: Props) {
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
            role="group"
            aria-label="Nội dung công nợ"
          >
            <button
              type="button"
              aria-pressed={debtView === 'calendar'}
              onClick={() => onDebtViewChange('calendar')}
            >
              Công nợ
            </button>
            <button
              type="button"
              aria-pressed={debtView === 'history'}
              onClick={() => onDebtViewChange('history')}
            >
              Lịch sử
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
