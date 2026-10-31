'use client';
import type { Ref } from 'react';
import Image from 'next/image';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faBars, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import MonthPicker from '@/components/month-picker';
import type { FinanceView } from '../types';

type Props = {
  view: FinanceView;
  month: string;
  onMonthChange: (month: string) => void;
  navOpen: boolean;
  toggleRef: Ref<HTMLButtonElement>;
  onToggleNav: () => void;
  ready: boolean;
  onCreate: () => void;
};
export default function AppHeader({
  view,
  month,
  onMonthChange,
  navOpen,
  toggleRef,
  onToggleNav,
  ready,
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
          <MonthPicker value={month} onChange={onMonthChange} />
        ) : (
          <span className="header-debt-context">
            {view === 'debts' ? 'Công nợ' : 'Danh mục'}
            <small>{view === 'debts' ? 'Tất cả thời gian' : 'Tên, icon và màu'}</small>
          </span>
        )}
      </div>
      <div className="header-primary-action">
        <button className="button primary" disabled={!ready} onClick={onCreate}>
          <Icon icon={faPlus} />
          {view === 'overview'
            ? 'Tạo chi tiêu'
            : view === 'debts'
              ? 'Ghi công nợ'
              : 'Thêm danh mục'}
        </button>
      </div>
    </header>
  );
}
