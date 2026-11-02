'use client';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faShapes,
  faHandshake,
  faMoneyBillTransfer,
  faDownload,
  faUpload,
  faRightFromBracket,
} from '@fortawesome/free-solid-svg-icons';
import type { FinanceView } from '../types';
import './app-sidebar.css';
type Props = {
  view: FinanceView;
  ready: boolean;
  busy: boolean;
  canExport: boolean;
  onNavigate: (view: FinanceView) => void;
  onExport: () => void;
  onImport: () => void;
  onLogout: () => void;
  onDismiss: () => void;
};
export default function AppSidebar({
  view,
  ready,
  busy,
  canExport,
  onNavigate,
  onExport,
  onImport,
  onLogout,
  onDismiss,
}: Props) {
  return (
    <>
      <button className="nav-backdrop" aria-label="Đóng thanh điều hướng" onClick={onDismiss} />
      <aside className="sidebar" id="main-navigation">
        <nav className="main-nav" aria-label="Điều hướng">
          {(
            [
              { id: 'overview', name: 'Tổng quan', icon: faShapes },
              { id: 'debts', name: 'Công nợ', icon: faHandshake },
              { id: 'categories', name: 'Danh mục', icon: faShapes },
              { id: 'debt-sources', name: 'Nguồn công nợ', icon: faMoneyBillTransfer },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'nav-active' : 'nav-button'}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <Icon icon={item.icon} /> {item.name}
            </button>
          ))}
        </nav>
        <div className="sidebar-data">
          <span className="sidebar-section-label">Dữ liệu</span>
          <button className="nav-button" disabled={!canExport || busy} onClick={onExport}>
            <Icon icon={faDownload} /> Xuất dữ liệu
          </button>
          <button className="nav-button" disabled={!ready} onClick={onImport}>
            <Icon icon={faUpload} /> Nhập dữ liệu
          </button>
        </div>
        <button className="nav-button sidebar-logout" disabled={busy} onClick={onLogout}>
          <Icon icon={faRightFromBracket} /> Đăng xuất
        </button>
      </aside>
    </>
  );
}
