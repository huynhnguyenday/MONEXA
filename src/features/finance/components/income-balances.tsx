import { FontAwesomeIcon as Icon } from '@fortawesome/react-fontawesome';
import { faWallet, faMoneyBillWave, faBuildingColumns } from '@fortawesome/free-solid-svg-icons';
import { money } from '../model';
import type { IncomeSummary } from '../hooks/use-income-summary';
import './income-balances.css';

export default function IncomeBalances({ balances }: { balances: IncomeSummary['balances'] }) {
  const amounts = balances.unallocated;
  return (
    <div className="income-balances">
      <article className="card income-balance" aria-label="Số dư chưa phân bổ">
        <div className="income-balance-heading">
          <h2>
            <Icon icon={faWallet} />
            Chưa phân bổ
          </h2>
          <strong>{money(amounts.total)}</strong>
        </div>
        <div className="income-balance-sources">
          <span>
            <Icon icon={faMoneyBillWave} />
            Tiền mặt <b>{money(amounts.cash)}</b>
          </span>
          <span>
            <Icon icon={faBuildingColumns} />
            Chuyển khoản <b>{money(amounts.bank)}</b>
          </span>
        </div>
      </article>
    </div>
  );
}
