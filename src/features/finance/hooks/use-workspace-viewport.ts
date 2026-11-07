'use client';

import { useLayoutEffect, useRef } from 'react';

/** Keep standalone mobile launches in step with the visible viewport. */
export function useWorkspaceViewport() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      // Pinch zoom should magnify the page without changing its layout height.
      if (viewport && viewport.scale !== 1) return;
      ref.current?.style.setProperty('--workspace-height', `${viewport?.height ?? window.innerHeight}px`);
    };
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    schedule();
    window.addEventListener('pageshow', schedule);
    window.addEventListener('resize', schedule);
    viewport?.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pageshow', schedule);
      window.removeEventListener('resize', schedule);
      viewport?.removeEventListener('resize', schedule);
    };
  }, []);
  return ref;
}
