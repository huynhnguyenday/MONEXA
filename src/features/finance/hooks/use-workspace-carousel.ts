'use client';
import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from 'react';

// Both full screens stay mounted; swiping either way reveals the other screen.
export function useWorkspaceCarousel({
  handoffForwardSwipeAtEnd = false,
}: {
  handoffForwardSwipeAtEnd?: boolean;
} = {}) {
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
  const frame = useRef<number | null>(null);
  const pendingDrag = useRef(0);
  const width = useRef(320);
  const dragSide = useRef(1);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );
  const cancelFrame = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  const paint = (dx: number) => {
    const root = ref.current;
    if (!root) return;
    // Dragging changes only the pane transforms, without rerendering the screen.
    Array.from(root.children).forEach((child, index) => {
      if (!(child instanceof HTMLElement)) return;
      child.style.setProperty(
        '--workspace-slide-position',
        index === active ? '0%' : `${dragSide.current * 100}%`,
      );
      child.style.setProperty('--workspace-slide-drag', `${dx}px`);
      child.style.setProperty('--workspace-slide-transition', 'none');
    });
  };
  const settle = () => {
    cancelFrame();
    if (ref.current) delete ref.current.dataset.workspaceDragging;
    Array.from(ref.current?.children ?? []).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      child.style.setProperty('--workspace-slide-drag', '0px');
      child.style.setProperty(
        '--workspace-slide-transition',
        'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      );
    });
  };
  const gesture = useRef<{ x: number; y: number; dx: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const reset = () => {
    gesture.current = null;
    settle();
  };
  const move = (direction: 1 | -1) => {
    const next = active + direction;
    if (next < 0 || next > 1) return settle();
    setActive(next);
    setSide(-direction);
    settle();
  };
  return {
    ref,
    active,
    select: (index: number) => {
      if (index !== active && (index === 0 || index === 1)) {
        move(index > active ? 1 : -1);
      }
    },
    mobile,
    paneStyle: (index: number): CSSProperties => {
      const position = index === active ? 0 : side;
      return {
        '--workspace-slide-position': `${position * 100}%`,
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
      cancelFrame();
      width.current = ref.current?.clientWidth ?? 320;
      dragSide.current = side;
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
        dragSide.current = dx < 0 ? 1 : -1;
      }
      const direction = dx < 0 ? 1 : -1;
      const atBoundary = direction === 1 ? active === 1 : active === 0;
      if (handoffForwardSwipeAtEnd) {
        if (atBoundary && direction === 1) {
          gesture.current = null;
          return;
        }
        event.stopPropagation();
        if (atBoundary) {
          start.dx = dx;
          suppressClick.current = true;
          return;
        }
      }
      start.dx = dx;
      if (ref.current) ref.current.dataset.workspaceDragging = 'true';
      suppressClick.current = true;
      // Allow reversing direction during the same slow gesture.
      dragSide.current = dx < 0 ? 1 : -1;
      pendingDrag.current = Math.max(-width.current, Math.min(width.current, dx));
      if (frame.current === null)
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          paint(pendingDrag.current);
        });
    },
    onTouchEnd: () => {
      const start = gesture.current;
      gesture.current = null;
      const threshold = Math.min(60, width.current * 0.18);
      if (start?.horizontal && Math.abs(start.dx) >= threshold) move(start.dx < 0 ? 1 : -1);
      else {
        settle();
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
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    },
  };
}
