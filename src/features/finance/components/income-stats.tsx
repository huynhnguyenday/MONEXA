import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import {
  faSackDollar,
  faCalendarDays,
  faHeart,
  faPiggyBank,
  faWallet,
} from '@fortawesome/free-solid-svg-icons';
import { money } from '../model';
import type { IncomeSummary } from '../hooks/use-income-summary';
import './income-stats.css';

export default function IncomeStats({ statistics }: { statistics: IncomeSummary['statistics'] }) {
  const stats = [
    {
      label: 'Thu nhập năm',
      value: statistics.annualIncome,
      icon: faSackDollar,
      color: 'blue',
    },
    {
      label: 'Thu nhập tháng',
      value: statistics.monthlyIncome,
      icon: faCalendarDays,
      color: 'blue',
    },
    { label: 'Cấp ngân sách năm', value: statistics.annualBudget, icon: faWallet, color: 'amber' },
    { label: 'Cấp ngân sách tháng', value: statistics.budget, icon: faWallet, color: 'amber' },
    { label: 'Tổng tiết kiệm', value: statistics.totalSavings, icon: faPiggyBank, color: 'green' },
    {
      label: 'Tiết kiệm tháng',
      value: statistics.savingsIn,
      icon: faPiggyBank,
      color: 'green',
    },
    { label: 'Tổng gửi mẹ', value: statistics.totalMother, icon: faHeart, color: 'rose' },
    { label: 'Gửi mẹ tháng', value: statistics.mother, icon: faHeart, color: 'rose' },
  ];
  return (
    <div className="income-stats" role="group" aria-label="Chỉ số thu nhập" tabIndex={0}>
      {stats.map((stat) => (
        <article className={`card income-stat income-${stat.color}`} key={stat.label}>
          <span>
            <Icon icon={stat.icon} />
            {stat.label}
          </span>
          <strong>{money(stat.value)}</strong>
        </article>
      ))}
    </div>
  );
}
