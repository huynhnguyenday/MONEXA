import type { Plugin } from 'chart.js';
import { categoryIcons } from '../icons';
import type { BreakdownGroup } from './group-breakdown';

/** Draw the same solid Font Awesome glyphs used by the category picker. */
export function categoryAxisIcons(
  read: () => { groups: BreakdownGroup[]; enabled: boolean },
): Plugin<'bar'> {
  return {
    id: 'category-axis-icons',
    afterDraw(chart) {
      const { groups, enabled } = read();
      if (!enabled) return;
      const axis = chart.scales.x;
      const context = chart.ctx;
      groups.forEach((group, index) => {
        const definition =
          categoryIcons[group.icon as keyof typeof categoryIcons] ?? categoryIcons.receipt;
        const [width, height, , , paths] = definition.icon;
        const size = 18;
        const scale = size / Math.max(width, height);
        context.save();
        context.translate(axis.getPixelForValue(index) - (width * scale) / 2, axis.top + 6);
        context.scale(scale, scale);
        context.fillStyle = group.color;
        for (const path of typeof paths === 'string' ? [paths] : paths)
          context.fill(new Path2D(path));
        context.restore();
      });
    },
  };
}
