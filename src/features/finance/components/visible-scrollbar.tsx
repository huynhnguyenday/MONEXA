import type { VisibleScrollbarState } from '../hooks/use-visible-scrollbar';
import './visible-scrollbar.css';

export function VisibleScrollbar({ state }: { state: VisibleScrollbarState }) {
  return (
    <div className="finance-scrollbar-indicator" ref={state.indicatorRef} aria-hidden="true">
      <span className="finance-scrollbar-thumb" ref={state.thumbRef} />
    </div>
  );
}
