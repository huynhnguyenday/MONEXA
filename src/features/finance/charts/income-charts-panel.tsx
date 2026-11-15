'use client';
import type { FinanceData } from '../model';
import { useWorkspaceCarousel } from '../hooks/use-workspace-carousel';
import IncomeChart, { allocationChartLabels } from './income-charts';
import './income-charts.css';

export default function IncomeChartsPanel({ data, year }: { data: FinanceData; year: string }) {
  const carousel = useWorkspaceCarousel();
  return (
    <div className="income-charts">
      <div
        className="income-chart-select income-mobile-tabs"
        role="group"
        aria-label="Chọn biểu đồ thu nhập"
      >
        {allocationChartLabels.map((name, index) => (
          <button
            type="button"
            key={name}
            aria-pressed={carousel.active === index}
            onClick={() => carousel.select(index)}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        className="income-chart-carousel"
        ref={carousel.ref}
        onTouchStart={(event) => {
          event.stopPropagation();
          carousel.onTouchStart(event);
        }}
        onTouchMove={(event) => {
          event.stopPropagation();
          carousel.onTouchMove(event);
        }}
        onTouchEnd={(event) => {
          event.stopPropagation();
          carousel.onTouchEnd();
        }}
        onTouchCancel={(event) => {
          event.stopPropagation();
          carousel.onTouchCancel();
        }}
        onClickCapture={carousel.onClickCapture}
        onKeyDown={carousel.onKeyDown}
        role="region"
        aria-label="Biểu đồ thu nhập. Vuốt ngang để chuyển biểu đồ."
        tabIndex={0}
      >
        {allocationChartLabels.map((name, index) => (
          <div
            className="income-chart-slot"
            key={name}
            style={carousel.paneStyle(index)}
            inert={carousel.mobile && carousel.active !== index}
          >
            <IncomeChart data={data} year={year} kind={index} />
          </div>
        ))}
      </div>
    </div>
  );
}
