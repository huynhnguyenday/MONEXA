'use client';
import type { FinanceData } from '../model';
import IncomeChart, { allocationChartLabels } from './income-charts';
import './income-charts.css';

export default function IncomeChartsPanel({ data, year }: { data: FinanceData; year: string }) {
  return (
    <div className="income-charts">
      {allocationChartLabels.map((name, index) => (
        <div className="income-chart-slot" key={name}>
          <IncomeChart data={data} year={year} kind={index} />
        </div>
      ))}
    </div>
  );
}
