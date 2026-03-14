/**
 * CreditsSheetContent — Compact credits view for embedding inside ProfileSheet.
 *
 * Reuses useCreditsData hook + CreditsBalanceTab / CreditsTransactionsTab.
 * No PageHeader, no breadcrumbs — just the core content.
 */
import React from 'react';
import { Alert } from '@django-core/design-system';
import { useCreditsData } from './credits/useCreditsData';
import { CreditsBalanceTab } from './credits/CreditsBalanceTab';
import { CreditsTransactionsTab } from './credits/CreditsTransactionsTab';
import s from './CreditsSheetContent.module.css';

export const CreditsSheetContent: React.FC = () => {
  const data = useCreditsData();

  return (
    <div>
      <div className={s.scopeLabel}>
        {data.scope === 'personal'
          ? 'My Wallet'
          : `Organisation Wallet${data.currentOrgName ? ` (${data.currentOrgName})` : ''}`}
      </div>

      {data.scope === 'personal' ? (
        <PersonalWalletCompact
          personalCredits={data.personalCredits}
          personalError={data.personalError}
          personalLoading={data.personalLoading}
          personalRecentTransactions={data.personalRecentTransactions}
          currentOrgName={data.currentOrgName}
        />
      ) : (
        <>
          {data.toastMessage && (
            <div className={s.toast}>{data.toastMessage}</div>
          )}

          {/* Tab switcher */}
          <div className="flex-row gap-8 mb-16">
            {(['balance', 'transactions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => data.setActiveTab(tab)}
                className={data.activeTab === tab ? s.tabButtonActive : s.tabButton}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {data.activeTab === 'balance' && (
            <CreditsBalanceTab
              loading={data.loading}
              error={data.error}
              credits={data.credits}
              currentOrgId={data.currentOrgId}
              allTransactions={data.allTransactions}
              recentTransactions={data.recentTransactions}
              onViewAllTransactions={() => data.setActiveTab('transactions')}
            />
          )}

          {data.activeTab === 'transactions' && (
            <CreditsTransactionsTab
              transactions={data.transactions}
              transactionsLoading={data.transactionsLoading}
              sourceTypeFilter={data.sourceTypeFilter}
              userFilter={data.userFilter}
              dateFromFilter={data.dateFromFilter}
              dateToFilter={data.dateToFilter}
              searchParams={data.searchParams}
              setSearchParams={data.setSearchParams}
              canSeeTestControls={data.canSeeTestControls}
              handleTestAction={data.handleTestAction}
            />
          )}
        </>
      )}
    </div>
  );
};

// Simplified personal wallet view for sheet context
const PersonalWalletCompact: React.FC<{
  personalCredits: { current_balance: number | string; updated_at: string } | null;
  personalError: string | null;
  personalLoading: boolean;
  personalRecentTransactions: { id: string; source_type: string; timestamp: string; amount: string }[];
  currentOrgName: string;
}> = ({ personalCredits, personalError, personalLoading, personalRecentTransactions, currentOrgName }) => (
  <div>
    {personalError && <Alert variant="info" className="mb-16">{personalError}</Alert>}

    <div className={s.walletCard}>
      <div className={s.walletEmoji}>👤</div>
      <div className={s.walletBalance}>
        {Number(personalCredits?.current_balance ?? 0).toLocaleString()} Credits
      </div>
      <div className={s.walletMeta}>
        {currentOrgName ? `Organisation: ${currentOrgName}` : 'Organisation context required'}
      </div>
      {personalLoading && <div className="text-muted fs-13 mt-8">Loading…</div>}
    </div>

    {personalRecentTransactions.length > 0 && (
      <div>
        <div className="fw-600 fs-13 mb-8">Recent Activity</div>
        <div className="flex-col gap-8">
          {personalRecentTransactions.map((txn) => (
            <div key={txn.id} className={s.txnCard}>
              <div>
                <div className="fw-600 fs-13">{txn.source_type}</div>
                <div className="fs-12 text-muted">
                  {txn.timestamp ? new Date(txn.timestamp).toLocaleString() : ''}
                </div>
              </div>
              <div className="fw-700">{txn.amount}</div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
