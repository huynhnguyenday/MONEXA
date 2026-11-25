'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import './toast.css';
export default function Toast({
  children,
  tone = 'error',
}: {
  children: ReactNode;
  tone?: 'success' | 'error' | 'pending';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showPopover();
    const timer = setTimeout(() => node?.hidePopover(), 1500);
    return () => {
      clearTimeout(timer);
      node?.hidePopover();
    };
  }, [children, tone]);
  return (
    <div
      ref={ref}
      popover="manual"
      className={`monexa-toast monexa-toast-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
