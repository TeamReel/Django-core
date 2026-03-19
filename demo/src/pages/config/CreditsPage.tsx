/**
 * CreditsPage — orchestrator.
 *
 * Split into:
 *   creditsTypes.ts          — shared types + parseTransactionEnvelope
 *   useCreditsData.ts        — all state, fetch effects and actions
 *   CreditsBalanceTab.tsx     — hero card, stats grid, timeline, recent list
 *   CreditsTransactionsTab.tsx — filters, table, test controls
 */
import React from 'react';
import { Card, Alert } from '@django-core/design-system';
import {
  PageHeader,
  PageContent,
  BreadcrumbContextSwitcher,
} from '@django-core/page-templates';

import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import { useCreditsData } from './credits/useCreditsData';
import { CreditsBalanceTab } from './credits/CreditsBalanceTab';
import { CreditsTransactionsTab } from './credits/CreditsTransactionsTab';
import styles from './CreditsPage.module.css';

export const CreditsPage: React.FC = () => {
  const data = useCreditsData();
  useSetBackNavigation({ label: 'Profile', path: '/profile' });

  return (
    <div className={styles.creditsWrapper}>
      <PageHeader
        title="Credits"
        subtitle="View your organisation's credit balance"
        breadcrumbs={[
          { label: 'Profile', href: '/profile' },
          { label: 'Credits' },
          {
            label: data.isSuperAdmin ? (
              <BreadcrumbContextSwitcher
                currentId={data.currentOrgId || ''}
                options={data.organisationOptions}
                onSelect={data.handleOrganisationSwitch}
                hasDropdown={true}
                type="organisation"
              />
            ) : (data.currentOrgName || 'Organisation'),
          },
        ]}
        actions={
          <div className="flex-row gap-12">
            <div
              className="fs-11 rounded-6 fw-600 cursor-default text-inverse"
              style={{
                padding: 'var(--space-1) var(--space-3)',
                backgroundColor: data.isSuperAdmin ? 'var(--color-blue-500)' : '#a855f7',
                letterSpacing: '0.5px',
              }}
            >
              {data.isSuperAdmin ? 'ADMIN' : 'ORG'}
            </div>
          </div>
        }
      />

      <PageContent>
        {/* Scope header */}
        <div className={styles.scopeLabel}>
          {data.scope === 'personal'
            ? 'Mijn Portemonnee'
            : `Organisatie Portemonnee${data.currentOrgName ? ` (${data.currentOrgName})` : ''}`}
        </div>

        {data.scope === 'personal' ? (
          <PersonalWalletView
            personalCredits={data.personalCredits}
            personalError={data.personalError}
            personalLoading={data.personalLoading}
            personalRecentTransactions={data.personalRecentTransactions}
            currentOrgName={data.currentOrgName}
          />
        ) : (
          <>
            {/* Toast notification */}
            {data.toastMessage && (
              <div className={styles.toast}>
                {data.toastMessage}
              </div>
            )}

            {/* Tab Switcher */}
            <div className={styles.tabSwitcher}>
              {(['balance', 'transactions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => data.setActiveTab(tab)}
                  className={data.activeTab === tab ? styles.tabButtonActive : styles.tabButton}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Balance Tab */}
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

            {/* Transactions Tab */}
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
      </PageContent>
    </div>
  );
};

// ── PersonalWalletView (inline — ~80 lines) ──────────────────────────
interface PersonalWalletViewProps {
  personalCredits: { current_balance: number | string; updated_at: string } | null;
  personalError: string | null;
  personalLoading: boolean;
  personalRecentTransactions: { id: string; source_type: string; timestamp: string; amount: string }[];
  currentOrgName: string;
}

const PersonalWalletView: React.FC<PersonalWalletViewProps> = ({
  personalCredits,
  personalError,
  personalLoading,
  personalRecentTransactions,
  currentOrgName,
}) => (
  <div>
    {personalError && (
      <Alert variant="info" className="mb-16">
        {personalError}
      </Alert>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <div className="p-6 text-center">
          <div className="text-4xl mb-4"></div>
          <h2 className="text-xl font-bold mb-2">My Personal Wallet</h2>
          <div className="text-3xl font-bold text-gray-800 mb-2">
            {Number(personalCredits?.current_balance ?? 0).toLocaleString()} Credits
          </div>
          <div className="text-xs text-gray-500 mb-6">
            {currentOrgName ? `Organisation: ${currentOrgName}` : 'Organisation context required'}
            {personalCredits?.updated_at
              ? ` • Updated ${new Date(personalCredits.updated_at).toLocaleString()}`
              : ''}
          </div>
          <p className="text-gray-500 mb-6">
            Personal credits allow you to generate content for your own projects or when not covered by
            an Organisation plan.
          </p>
          <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm mb-4">
            <strong>Beta:</strong> Personal top-ups are coming soon. For now, your personal wallet is
            read-only and reflects backend balances.
          </div>
          {personalLoading && <div className="text-sm text-gray-500">Loading…</div>}
        </div>
      </Card>

      <Card title="Recent Activity">
        <div className="p-6">
          {personalRecentTransactions.length === 0 ? (
            <div className="text-center text-gray-500 italic">No recent personal activity.</div>
          ) : (
            <div className="flex-col gap-10">
              {personalRecentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className={`flex-between rounded-8 ${styles.txnCard}`}
                >
                  <div className="flex-col gap-2">
                    <div className="fw-600 fs-13">{txn.source_type}</div>
                    <div className="fs-12 opacity-70">
                      {txn.timestamp ? new Date(txn.timestamp).toLocaleString() : ''}
                    </div>
                  </div>
                  <div className="fw-700">{txn.amount}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  </div>
);

export default CreditsPage;
