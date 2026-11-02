'use client';
import AppHeader from './layout/app-header';
import AppSidebar from './layout/app-sidebar';
import OverviewPanel from './panels/overview-panel';
import FinanceSkeleton from './panels/finance-skeleton';
import DebtPanel from './panels/debt-panel';
import CategoryPanel from './panels/category-panel';
import DebtSourcePanel from './panels/debt-source-panel';
import FinanceDialogs from './dialogs/finance-dialogs';
import { FinanceError, FinanceFeedback } from './components/finance-feedback';
import { useDashboard } from './hooks/use-dashboard';
import { viewLabels } from './types';

export default function Dashboard() {
  const dashboard = useDashboard();
  const error = (
    <FinanceError
      error={dashboard.error}
      busy={dashboard.busy}
      loading={dashboard.loading}
      conflict={dashboard.conflict}
      onRetry={() => void dashboard.refresh()}
    />
  );
  return (
    <div className={`shell compact-layout ${dashboard.navOpen ? 'nav-expanded' : ''}`}>
      {dashboard.navOpen && (
        <AppSidebar
          view={dashboard.tab}
          ready={dashboard.ready}
          busy={dashboard.busy}
          canExport={!!dashboard.snapshot}
          onNavigate={dashboard.navigate}
          onExport={dashboard.exportData}
          onImport={() => dashboard.importRef.current?.click()}
          onLogout={() => void dashboard.logout()}
          onDismiss={dashboard.closeNavigation}
        />
      )}
      <main className="workspace" id="overview">
        <h1 className="sr-only">MONEXA · {viewLabels[dashboard.tab]}</h1>
        <AppHeader
          view={dashboard.tab}
          debtView={dashboard.debtView}
          onDebtViewChange={dashboard.setDebtView}
          month={dashboard.month}
          onMonthChange={dashboard.setMonth}
          navOpen={dashboard.navOpen}
          toggleRef={dashboard.navToggleRef}
          onToggleNav={dashboard.toggleNav}
          ready={dashboard.ready}
          loading={dashboard.loading}
          onCreate={() =>
            dashboard.open({
              type:
                dashboard.tab === 'overview'
                  ? 'expense'
                  : dashboard.tab === 'debts'
                    ? 'debt'
                    : 'category',
            })
          }
        />
        <div className="workspace-content" aria-busy={dashboard.loading}>
          {dashboard.loading ? (
            <FinanceSkeleton view={dashboard.tab} debtView={dashboard.debtView} />
          ) : !dashboard.snapshot ? (
            <div className="compact-empty card">
              <p>Chưa tải được dữ liệu.</p>
              <button className="button primary" onClick={() => void dashboard.refresh()}>
                Thử lại
              </button>
            </div>
          ) : dashboard.tab === 'overview' ? (
            <OverviewPanel
              key={dashboard.month}
              data={dashboard.data}
              stats={dashboard.stats}
              month={dashboard.month}
              ready={dashboard.ready}
              onAdd={() => dashboard.open({ type: 'expense' })}
              onEdit={(expense) => {
                const debt = expense.debtId && dashboard.data.debts.find((item) => item.id === expense.debtId);
                dashboard.open(debt ? { type: 'debt', debt } : { type: 'expense', expense });
              }}
              onDelete={(expense) => void dashboard.deleteExpense(expense)}
              onBudget={() => dashboard.open({ type: 'budget' })}
              onBudgetHistory={() => dashboard.open({ type: 'budget-history' })}
            />
          ) : dashboard.tab === 'debts' ? (
            <DebtPanel
              data={dashboard.data}
              ready={dashboard.ready}
              onAdd={() => dashboard.open({ type: 'debt' })}
              view={dashboard.debtView}
              onEdit={(debt) => dashboard.open({ type: 'debt', debt })}
              onDelete={(debt) => void dashboard.deleteDebt(debt)}
              onSettle={(debt) => void dashboard.settle(debt)}
            />
          ) : dashboard.tab === 'categories' ? (
            <CategoryPanel
              data={dashboard.data}
              ready={dashboard.ready}
              month={dashboard.month}
              onAdd={() => dashboard.open({ type: 'category' })}
              onEdit={(category) => dashboard.open({ type: 'category', category })}
              onDelete={(category) => void dashboard.deleteCategory(category)}
            />
          ) : (
            <DebtSourcePanel
              data={dashboard.data}
              ready={dashboard.ready}
              month={dashboard.month}
              onAdd={() => dashboard.open({ type: 'debtSource' })}
              onEdit={(debtSource) => dashboard.open({ type: 'debtSource', debtSource })}
              onDelete={(debtSource) => void dashboard.deleteDebtSource(debtSource)}
            />
          )}
        </div>
        <input
          ref={dashboard.importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => void dashboard.importData(event.target.files?.[0])}
        />
      </main>
      <FinanceFeedback
        error={!dashboard.modal && error}
        notice={dashboard.notice}
        onDismissNotice={() => dashboard.setNotice('')}
        hasLegacy={dashboard.hasLegacy && !!dashboard.snapshot}
        ready={dashboard.ready}
        onMigrate={() => void dashboard.migrateLegacy()}
        onDismissLegacy={() => dashboard.setHasLegacy(false)}
      />
      <FinanceDialogs
        modal={dashboard.modal}
        onClose={dashboard.close}
        formProps={dashboard.formProps}
        error={error}
        month={dashboard.month}
      />
    </div>
  );
}
