'use client';
import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
export type VisibleScrollbarState = {
  indicatorRef: RefObject<HTMLDivElement | null>;
  thumbRef: RefObject<HTMLSpanElement | null>;
};
export function useVisibleScrollbar<T extends HTMLElement>(
  elementRef: RefObject<T | null>,
  enabled = true,
  insetTop = 0,
  insetBottom = 0,
): VisibleScrollbarState {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = elementRef.current,
      indicator = indicatorRef.current,
      thumb = thumbRef.current;
    if (!element || !indicator || !thumb) return;
    let frame: number | null = null;
    const update = () => {
      frame = null;
      const viewportHeight = element.clientHeight,
        contentHeight = element.scrollHeight;
      const trackHeight = Math.max(0, element.offsetHeight - insetTop - insetBottom);
      const maxScroll = contentHeight - viewportHeight;
      const visible = enabled && maxScroll > 0 && trackHeight > 0;
      indicator.style.display = visible ? '' : 'none';
      if (!visible) return;
      const height = Math.min(
        trackHeight,
        Math.max(18, (trackHeight * viewportHeight) / contentHeight),
      );
      const progress = Math.max(0, Math.min(1, element.scrollTop / maxScroll));
      thumb.style.height = height + 'px';
      thumb.style.transform =
        'translateY(' + (insetTop + progress * (trackHeight - height)) + 'px)';
    };
    // Paint the indicator without rerendering the history and charts.
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    const resizeObserver = new ResizeObserver(schedule);
    const observeChildren = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(element);
      Array.from(element.children).forEach((child) => resizeObserver.observe(child));
    };
    observeChildren();
    const mutationObserver = new MutationObserver(() => {
      observeChildren();
      schedule();
    });
    mutationObserver.observe(element, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      characterData: true,
      childList: true,
      subtree: true,
    });
    element.addEventListener('scroll', schedule, { passive: true });
    update();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      element.removeEventListener('scroll', schedule);
    };
  }, [elementRef, enabled, insetTop, insetBottom]);
  return { indicatorRef, thumbRef };
}
