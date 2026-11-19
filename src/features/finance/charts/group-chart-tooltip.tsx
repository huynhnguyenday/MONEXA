'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Chart, TooltipModel } from 'chart.js';
import './group-chart-tooltip.css';

/** Render outside the canvas/carousel so axis icons and clipped cards cannot cover it. */
export function useGroupChartTooltip() {
  const element = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const hide = useCallback(() => {
    if (element.current) element.current.hidden = true;
  }, []);
  useEffect(() => {
    setMounted(true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('blur', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('blur', hide);
    };
  }, [hide]);
  const external = useCallback(
    ({ chart, tooltip }: { chart: Chart<'bar'>; tooltip: TooltipModel<'bar'> }) => {
      const node = element.current;
      if (!node) return;
      if (!tooltip.opacity) {
        hide();
        return;
      }
      const heading = node.querySelector('strong')!;
      const content = node.querySelector('span')!;
      heading.textContent = tooltip.title.join(' ');
      content.textContent = tooltip.body
        .flatMap((item) => [...item.before, ...item.lines, ...item.after])
        .join('\n');
      node.hidden = false;
      const canvas = chart.canvas.getBoundingClientRect();
      const edge = 8;
      const x = canvas.left + tooltip.caretX;
      const y = canvas.top + tooltip.caretY;
      const left = Math.max(
        edge,
        Math.min(x - node.offsetWidth / 2, window.innerWidth - node.offsetWidth - edge),
      );
      const above = y - node.offsetHeight - 12;
      const top = Math.max(
        edge,
        Math.min(above >= edge ? above : y + 12, window.innerHeight - node.offsetHeight - edge),
      );
      node.style.left = `${left}px`;
      node.style.top = `${top}px`;
    },
    [hide],
  );
  return {
    external,
    hide,
    tooltip: mounted
      ? createPortal(
          <div ref={element} className="group-chart-tooltip" role="tooltip" hidden>
            <strong />
            <span />
          </div>,
          document.body,
        )
      : null,
  };
}
