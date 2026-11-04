'use client';
import {
  createElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import './finance-tooltip.css';

export default function FinanceTooltip({
  as = 'button',
  className,
  label,
  content,
  children,
  placement = 'top',
}: {
  as?: 'button' | 'article';
  className: string;
  label: string;
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom';
}) {
  const id = useId();
  const anchor = useRef<HTMLElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const show = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    document.dispatchEvent(new CustomEvent('finance-tooltip-open', { detail: id }));
    setOpen(true);
  };
  const hideSoon = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  useEffect(() => {
    const other = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    const outside = (event: PointerEvent) => {
      if (
        !anchor.current?.contains(event.target as Node) &&
        !popup.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('finance-tooltip-open', other);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      document.removeEventListener('finance-tooltip-open', other);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [id]);
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const update = () => {
      if (!anchor.current || !popup.current) return;
      const rect = anchor.current.getBoundingClientRect();
      const height = popup.current.offsetHeight;
      const width = popup.current.offsetWidth;
      const above = rect.top - height - 8;
      const below = rect.bottom + 8;
      const top =
        placement === 'top'
          ? above >= 12
            ? above
            : below
          : below + height <= innerHeight - 12
            ? below
            : above;
      setPosition({
        left: Math.max(
          12,
          Math.min(rect.left + rect.width / 2 - width / 2, innerWidth - width - 12),
        ),
        top: Math.max(12, Math.min(top, innerHeight - height - 12)),
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, placement, content]);
  return (
    <>
      {createElement(
        as,
        {
          ref: anchor,
          className,
          ...(as === 'button' ? { type: 'button' } : { role: 'button', tabIndex: 0 }),
          'aria-label': label,
          'aria-describedby': open ? id : undefined,
          'aria-expanded': open,
          onMouseEnter: show,
          onMouseLeave: hideSoon,
          onFocus: show,
          onBlur: () => setOpen(false),
          onClick: show,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (as === 'article' && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              show();
            }
          },
        },
        children,
      )}
      {open &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="tooltip"
            className="finance-tooltip"
            style={{
              left: position?.left ?? 0,
              top: position?.top ?? 0,
              visibility: position ? 'visible' : 'hidden',
            }}
            onMouseEnter={show}
            onMouseLeave={hideSoon}
          >
            <strong>{label}</strong>
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
