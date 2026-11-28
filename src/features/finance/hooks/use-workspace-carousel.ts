'use client';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from 'react';

export const WorkspaceEntryContext = createContext<{
  index: number;
  onChange: (index: number) => void;
} | null>(null);

// Keep every screen mounted while swiping around the route in either direction.
export function useWorkspaceCarousel({
  handoffAtEdges = false,
  count = 2,
  activeIndex,
  onActiveChange,
}: {
  handoffAtEdges?: boolean;
  count?: number;
  activeIndex?: number;
  onActiveChange?: (index: number, direction: number) => void;
} = {}) {
  const parent = useContext(WorkspaceEntryContext);
  const ref = useRef<HTMLDivElement>(null);
  const [localActive, setLocalActive] = useState(0);
  const active = activeIndex ?? parent?.index ?? localActive;
  const [side, setSide] = useState(1);
  const position = (index: number, direction: number) =>
    index === active
      ? 0
      : direction > 0
        ? (index - active + count) % count
        : -((active - index + count) % count);
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
        `${position(index, dragSide.current) * 100}%`,
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
    const next = (active + direction + count) % count;
    change(next, direction);
    setSide(-direction);
    settle();
  };
  const change = (index: number, direction: 1 | -1) => {
    setLocalActive(index);
    parent?.onChange(index);
    onActiveChange?.(index, direction);
  };
  return {
    ref,
    active,
    select: (index: number) => {
      if (index !== active && index >= 0 && index < count) {
        const direction = index > active ? 1 : -1;
        change(index, direction);
        setSide(-direction);
        settle();
      }
    },
    mobile,
    paneStyle: (index: number): CSSProperties => {
      return {
        '--workspace-slide-position': `${position(index, side) * 100}%`,
      } as CSSProperties;
    },
    onTouchStart: (event: TouchEvent<HTMLDivElement>) => {
      suppressClick.current = false;
      if (!mobile || event.touches.length !== 1) return reset();
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input, textarea, select, [contenteditable="true"], .react-datepicker-popper, .expense-chart-tooltip',
        )
      )
        return reset();
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
      const atBoundary = direction === 1 ? active === count - 1 : active === 0;
      start.dx = dx;
      // Nested charts hand off both edges; the route's outer carousel wraps.
      if (handoffAtEdges && atBoundary) return settle();
      event.stopPropagation();
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
    onTouchEnd: (event: TouchEvent<HTMLDivElement>) => {
      const start = gesture.current;
      gesture.current = null;
      const threshold = Math.min(60, width.current * 0.18);
      if (start?.horizontal) {
        const direction = start.dx < 0 ? 1 : -1;
        const atBoundary = direction === 1 ? active === count - 1 : active === 0;
        if (handoffAtEdges && atBoundary) return settle();
        event.stopPropagation();
      }
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
