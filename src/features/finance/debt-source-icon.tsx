'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuildingColumns, faUser } from '@fortawesome/free-solid-svg-icons';
import { faTiktok } from '@fortawesome/free-brands-svg-icons';
import { siShopee } from 'simple-icons';
import type { DebtSource } from './model';

export function DebtSourceIcon({ icon, className }: { icon: DebtSource['icon']; className?: string }) {
  const iconClassName = ['debt-source-icon', `debt-source-icon-${icon}`, className].filter(Boolean).join(' ');
  if (icon === 'tiktok') return <FontAwesomeIcon icon={faTiktok} className={iconClassName} aria-hidden="true" />;
  if (icon === 'bank') return <FontAwesomeIcon icon={faBuildingColumns} className={iconClassName} aria-hidden="true" />;
  if (icon === 'person') return <FontAwesomeIcon icon={faUser} className={iconClassName} aria-hidden="true" />;
  if (icon === 'shopee') return <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d={siShopee.path} /></svg>;
  if (icon === 'momo') return (
    <svg className={iconClassName} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="currentColor" />
      <text x="16" y="19" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="900" letterSpacing="-.8">Mo</text>
      <text x="16" y="26" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize="6" fontWeight="700" letterSpacing="1">Mo</text>
    </svg>
  );
  return (
    <svg className={iconClassName} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M6 7h20l-1.4 19H7.4L6 7Zm5-1a5 5 0 0 1 10 0" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
      <text x="16" y="21" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="900">SE</text>
    </svg>
  );
}
