import { Chart } from 'chart.js';

// A horizontal swipe moves the workspace, rather than inspecting chart points.
Chart.register({
  id: 'workspaceGesture',
  beforeEvent(chart, { event }) {
    if (chart.canvas.closest('[data-workspace-dragging="true"]')) return false;
    // Touch devices inspect points on tap; touchmove/touchend must not dismiss it.
    if (
      window.matchMedia('(max-width: 767px), (pointer: coarse)').matches &&
      event.type !== 'click'
    ) return false;
  },
});
