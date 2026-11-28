import type { ActiveElement, Chart, ChartEvent, CoreChartOptions, ChartType } from 'chart.js';

export const usesTapInspection = () =>
  window.matchMedia('(max-width: 1023px), (hover: none), (pointer: coarse)').matches;

export function inspectionEvents(
  inspect: (point: ActiveElement, chart: Chart, hover: boolean) => void,
): Pick<CoreChartOptions<ChartType>, 'events' | 'onHover' | 'onClick'> {
  const handle = (event: ChartEvent, elements: ActiveElement[], chart: Chart) => {
    const tap = usesTapInspection();
    if ((tap && event.type !== 'click') || (!tap && event.type !== 'mousemove')) return;
    const point = elements[0];
    if (point) inspect(point, chart, !tap);
  };
  return {
    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
    onHover: handle,
    onClick: handle,
  };
}
