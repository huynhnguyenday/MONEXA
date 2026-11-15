import { Chart } from 'chart.js';

// A horizontal swipe moves the workspace, rather than inspecting chart points.
Chart.register({
  id: 'workspaceGesture',
  beforeEvent(chart) {
    if (chart.canvas.closest('[data-workspace-dragging="true"]')) return false;
  },
});
