'use client';
import { useRef, useState, type CSSProperties, type TouchEvent } from 'react';

// Three mounted panels move with the finger; the offscreen neighbour wraps
// instantly while the current and incoming panels animate into place.
export function useDebtCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; dx: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const mobile = () => window.matchMedia('(max-width: 1023px)').matches;
  const reset = () => {
    gesture.current = null;
    setDragging(false);
    setDrag(0);
  };
  const move = (step: number) => {
    setPrevious(active);
    setActive((active + step + 3) % 3);
    setDragging(false);
    setDrag(0);
  };
  return {
    ref,
    active,
    paneStyle: (index: number): CSSProperties => {
      const position = ((index - active + 4) % 3) - 1;
      return {
        '--debt-slide-position': `${position * 100}%`,
        '--debt-slide-drag': `${drag}px`,
        '--debt-slide-transition':
          dragging || (index !== active && index !== previous)
            ? 'none'
            : 'transform 240ms ease-out',
      } as CSSProperties;
    },
    onTouchStart: (event: TouchEvent<HTMLDivElement>) => {
      suppressClick.current = false;
      if (!mobile() || event.touches.length !== 1) return reset();
      const point = event.touches[0];
      gesture.current = { x: point.clientX, y: point.clientY, dx: 0, horizontal: false };
    },
    onTouchMove: (event: TouchEvent<HTMLDivElement>) => {
      const start = gesture.current;
      if (!start || event.touches.length !== 1) return;
      const point = event.touches[0];
      const dx = point.clientX - start.x;
      const dy = point.clientY - start.y;
      if (!start.horizontal) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return reset();
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
        start.horizontal = true;
      }
      start.dx = dx;
      suppressClick.current = true;
      setDragging(true);
      setDrag(Math.max(-ref.current!.clientWidth, Math.min(ref.current!.clientWidth, dx)));
    },
    onTouchEnd: () => {
      const start = gesture.current;
      gesture.current = null;
      const threshold = Math.min(60, (ref.current?.clientWidth ?? 320) * 0.18);
      if (start?.horizontal && Math.abs(start.dx) >= threshold) move(start.dx < 0 ? 1 : -1);
      else {
        setDragging(false);
        setDrag(0);
      }
    },
    onTouchCancel: reset,
    onClickCapture: (event: React.MouseEvent<HTMLDivElement>) => {
      if (suppressClick.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || !mobile()) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    },
  };
}
