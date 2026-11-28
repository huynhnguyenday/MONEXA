import IncomeLayout from '../layout/income-layout';
import { LoadingSkeleton, ChartSkeleton } from '../components/loading-skeleton';
import '../components/income-stats.css';
import '../components/income-balances.css';
import '../components/income-action-card.css';
import '../charts/income-charts.css';

export default function IncomeSkeleton() {
  return (
    <IncomeLayout
      loading
      analytics={
        <section className="income-analytics">
          <div className="income-stats">
            {Array.from({ length: 8 }, (_, index) => (
              <article key={index} className="card income-stat">
                <LoadingSkeleton style={{ width: '80%', height: 16 }} />
                <LoadingSkeleton style={{ width: '90%', height: 20 }} />
              </article>
            ))}
          </div>
          <div className="income-charts">
            {[0, 1].map((index) => (
              <div className="income-chart-slot" key={index}>
                <article className="card income-chart">
                  <LoadingSkeleton style={{ height: 20, width: '50%' }} />
                  <ChartSkeleton />
                </article>
              </div>
            ))}
          </div>
        </section>
      }
      management={
        <section className="income-management">
          <div className="income-balances">
            <article className="card income-balance">
              {[0, 1, 2].map((index) => (
                <div className="income-balance-part" key={index}>
                  <LoadingSkeleton style={{ height: 16, width: '80%' }} />
                  <LoadingSkeleton style={{ height: 20, width: '90%' }} />
                </div>
              ))}
            </article>
          </div>
          <div className="income-action-cards">
            {[0, 1].map((index) => (
              <article className="card income-actions" key={index}>
                <LoadingSkeleton style={{ height: 44, flexShrink: 0 }} />
                <LoadingSkeleton style={{ flex: 1, minHeight: 0 }} />
              </article>
            ))}
          </div>
        </section>
      }
    />
  );
}
