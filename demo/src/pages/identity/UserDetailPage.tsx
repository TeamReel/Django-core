/**
 * UserDetailPage — Orchestrator. Routes between tabs and renders lightweight
 * Balance/Transactions tabs inline. Heavy tabs are delegated to sub-components.
 */
import React from 'react';
import { Alert, Button, Card } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';

import LoadingState from '../../components/LoadingState';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import { actionButtonStyle, ctaButtonStyle } from './detail/detailStyles';
import { useUserDetailData } from './useUserDetailData';
import { UserDetailModals } from './UserDetailModals';
import { UserDetailOverviewTab } from './UserDetailOverviewTab';
import { UserDetailIdentityTab } from './UserDetailIdentityTab';
import { UserDetailMembershipTabs } from './UserDetailMembershipTabs';
import { UserDetailActivityTabs } from './UserDetailActivityTabs';

const UserDetailPage: React.FC = () => {
  const data = useUserDetailData();
  const {
    userId, orgId, navigate, user, loading, error, userDisplayName, backPath,
    activeTab, setTab,
    userBalance, userBalanceLoading, userBalanceError, setUserBalanceReloadToken,
    getPreferredOrganisationId, setIsViewModalOpen, setIsEditModalOpen,
    setIsLinkModalOpen, setIsCreateTxnModalOpen,
    handleDeleteUser, currentUserIdForTxn, targetUserIdForTxn,
  } = data;

  if (loading) return <LoadingState message="Loading user..." />;
  if (error) return <Alert variant="error" title="Error">{error}</Alert>;
  if (!user) return <div>User not found</div>;

  return (
    <>
      <PageHeader
        title={userDisplayName}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          ...(orgId ? [{ label: 'Federations', href: '/organisations' }] : []),
          ...(orgId ? [{ label: 'Members', href: backPath }] : [{ label: 'Users', href: backPath }]),
          { label: userDisplayName, current: true },
        ]}
        actions={
          <div className="flex-row gap-10">
            <button type="button" className="app-action-button" onClick={() => {
              const orgIdForTxn = getPreferredOrganisationId();
              if (!orgIdForTxn) { alert('Select an organisation first (context switcher), then try again'); return; }
              if (!Number.isFinite(currentUserIdForTxn)) { alert('No current user id available'); return; }
              if (!Number.isFinite(targetUserIdForTxn)) { alert('No target user id available'); return; }
              setIsCreateTxnModalOpen(true);
            }} style={ctaButtonStyle('primary')} disabled={!user}>Create transaction</button>
            <button type="button" className="app-action-button" onClick={() => setIsLinkModalOpen(true)} style={ctaButtonStyle('neutral')} disabled={!user}>Add to…</button>
            <Button variant="secondary" size="sm" onClick={() => setIsViewModalOpen(true)}>View</Button>
            <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>Edit</Button>
            <Button variant="secondary" size="sm" onClick={handleDeleteUser}>Delete</Button>
          </div>
        }
      />

      <PageContent>
        {activeTab === 'overview' && <UserDetailOverviewTab data={data} />}
        {activeTab === 'identity' && <UserDetailIdentityTab data={data} />}

        {activeTab === 'balance' && (
          <div className="grid gap-12">
            <Card>
              <div className="flex-between gap-12">
                <h3 className="m-0">Balance</h3>
                <button type="button" onClick={() => setUserBalanceReloadToken((n) => n + 1)} style={actionButtonStyle('neutral')} disabled={userBalanceLoading}>Refresh</button>
              </div>
              {userBalanceError && <div className="mt-12"><Alert variant="warning">{userBalanceError}</Alert></div>}
              <div className="mt-12 grid gap-12" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Card>
                  <div className="text-muted fs-12">Current balance</div>
                  <div style={{ fontWeight: 900, fontSize: '28px', marginTop: '6px' }}>
                    {userBalanceLoading ? 'Loading…' : userBalance != null ? userBalance : '—'}
                  </div>
                </Card>
                <Card>
                  <div className="text-muted fs-12">Quick links</div>
                  <div className="mt-10 flex-row gap-8 flex-wrap">
                    <button type="button" onClick={() => setTab('transactions')} style={actionButtonStyle('primary')}>View transactions</button>
                    <button type="button" onClick={() => setIsCreateTxnModalOpen(true)} style={actionButtonStyle('neutral')}>Create transaction</button>
                  </div>
                </Card>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="grid gap-12">
            <TransactionsPanel
              title="Transactions"
              description="User-scoped transactions (charged_user_id)"
              filters={{ organization_id: getPreferredOrganisationId(), charged_user_id: String((user as any)?.id || userId) }}
            />
          </div>
        )}

        {(activeTab === 'federations' || activeTab === 'clubs' || activeTab === 'teams') && (
          <UserDetailMembershipTabs data={data} />
        )}

        {(activeTab === 'hierarchy' || activeTab === 'seasons' || activeTab === 'competitions' || activeTab === 'matches') && (
          <UserDetailActivityTabs data={data} />
        )}
      </PageContent>

      <UserDetailModals data={data} />
    </>
  );
};

export default UserDetailPage;
