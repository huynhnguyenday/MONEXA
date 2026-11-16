import type { Plugin } from 'chart.js';

/** Place the existing source logo components at Chart.js tick positions. */
export function debtSourceAxisIcons(read: () => HTMLElement | null): Plugin<'bar'> {
  return {
    id: 'debt-source-axis-icons',
    afterDraw(chart) {
      const axis = chart.scales.x;
      const layer = read();
      if (!axis || !layer) return;
      layer.querySelectorAll<HTMLElement>('[data-source-axis-icon]').forEach((node, index) => {
        node.style.left = `${axis.getPixelForValue(index)}px`;
        node.style.top = `${axis.top + 6}px`;
        node.style.width = `${Math.min(22, Math.max(8, axis.width / Math.max(1, axis.ticks.length) - 2))}px`;
      });
    },
  };
}
