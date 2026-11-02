'use client';
import type { Ref } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faBars, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import MonthPicker from '@/components/month-picker';
import { MonthPickerSkeleton } from '../components/loading-skeleton';
import type { FinanceView } from '../types';

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
  onCreate: () => void;
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
  onCreate,
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
        <a className="compact-brand" href="/" aria-label="MONEXA">
          <Image src="/monexa.webp" width={28} height={28} alt="" />
          <span>MONEXA</span>
        </a>
      </div>
      <div className="header-center">
        {view === 'overview' ? (
          loading ? <MonthPickerSkeleton /> : <MonthPicker value={month} onChange={onMonthChange} />
        ) : view === 'debts' ? (
          <div className="header-debt-tabs" role="group" aria-label="Nội dung công nợ">
            <button type="button" aria-pressed={debtView === 'calendar'} onClick={() => onDebtViewChange('calendar')}>Công nợ</button>
            <button type="button" aria-pressed={debtView === 'history'} onClick={() => onDebtViewChange('history')}>Lịch sử</button>
          </div>
        ) : view === 'categories' ? (
          <span className="header-page-context">Danh mục</span>
        ) : (
          <span className="header-page-context">Nguồn công nợ</span>
        )}
      </div>
      <div className="header-primary-action">
        {view === 'debts' && <button className="button primary" disabled={!ready} onClick={onCreate}>
          <Icon icon={faPlus} />
          Ghi công nợ
        </button>}
      </div>
    </header>
  );
}
