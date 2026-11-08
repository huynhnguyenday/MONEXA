'use client';
import { useState } from 'react';
import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faChartLine, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import type { FinanceData } from '../model';
import IncomeChart, { allocationChartLabels } from './income-charts';
import './income-charts.css';

export default function IncomeChartsPanel({ data, year }: { data: FinanceData; year: string }) {
  const [chart, setChart] = useState(0);
  return (
    <div className="income-charts">
      <label className="income-chart-select">
        <Icon icon={faChartLine} aria-hidden="true" />
        <select
          aria-label="Chọn biểu đồ thu nhập"
          value={chart}
          onChange={(event) => setChart(Number(event.target.value))}
        >
          {allocationChartLabels.map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <Icon icon={faChevronDown} className="income-chart-select-chevron" aria-hidden="true" />
      </label>
      {allocationChartLabels.map((name, index) => (
        <div className={`income-chart-slot ${chart === index ? 'is-selected' : ''}`} key={name}>
          <IncomeChart data={data} year={year} kind={index} />
        </div>
      ))}
    </div>
  );
}
