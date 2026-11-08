import type { FinanceData } from '../model';
import type { IncomeSummary } from '../hooks/use-income-summary';
import IncomeStats from '../components/income-stats';
import IncomeChartsPanel from '../charts/income-charts-panel';

export default function IncomeAnalytics({
  data,
  statistics,
}: {
  data: FinanceData;
  statistics: IncomeSummary['statistics'];
}) {
  return (
    <section className="income-analytics" aria-label="Chỉ số và biểu đồ thu nhập">
      <IncomeStats statistics={statistics} />
      <IncomeChartsPanel data={data} year={statistics.year} />
    </section>
  );
}
