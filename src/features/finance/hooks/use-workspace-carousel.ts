'use client';
import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react';

// Both full screens stay mounted; swiping either way reveals the other screen.
export function useWorkspaceCarousel() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [side, setSide] = useState(1);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; dx: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const reset = () => {
    gesture.current = null;
    setDragging(false);
    setDrag(0);
  };
  const move = () => {
    setActive((current) => 1 - current);
    setSide((current) => -current);
    setDragging(false);
    setDrag(0);
  };
  return {
    ref,
    active,
    mobile,
    paneStyle: (index: number): CSSProperties => {
      const position = index === active ? 0 : side;
      return {
        '--workspace-slide-position': `${position * 100}%`,
        '--workspace-slide-drag': `${drag}px`,
        '--workspace-slide-transition': dragging ? 'none' : 'transform 240ms ease-out',
      } as CSSProperties;
    },
    onTouchStart: (event: TouchEvent<HTMLDivElement>) => {
      suppressClick.current = false;
      if (!mobile || event.touches.length !== 1) return reset();
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return reset();
      for (
        let element = target;
        element && element !== event.currentTarget;
        element = element.parentElement!
      ) {
        if (
          element.scrollWidth > element.clientWidth + 1 &&
          /auto|scroll/.test(getComputedStyle(element).overflowX)
        )
          return reset();
      }
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
        setSide(dx < 0 ? 1 : -1);
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
      if (start?.horizontal && Math.abs(start.dx) >= threshold) move();
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
      if (event.target !== event.currentTarget || !mobile) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move();
      }
    },
  };
}
