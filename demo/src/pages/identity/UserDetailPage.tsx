import React from 'react';
import { Alert, Badge, Button, Card, Input } from '@django-core/design-system';
import { PageContent, PageHeader } from '@django-core/page-templates';

import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import { periodPathKey } from '../../utils/periodPath';
import TransactionsPanel from '../../components/transactions/TransactionsPanel';
import {
  actionButtonStyle,
  ctaButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from './detail/detailStyles';
import { useUserDetailData } from './useUserDetailData';
import { UserDetailModals } from './UserDetailModals';

export const UserDetailPage: React.FC = () => {
  const data = useUserDetailData();
  const {
    userId,
    orgId,
    navigate,
    user,
    loading,
    error,
    userDisplayName,
    backPath,
    activeTab,
    setTab,
    userOrgs,
    userProjects,
    primaryOrgSlug,
    clubMemberships,
    directClubMembershipById,
    teamMemberships,
    clubsForTab,
    clubSlugById,
    teamSeasonPairs,
    hierarchySearch,
    setHierarchySearch,
    hierarchyRows,
    linkedCompetitions,
    linkedMatches,
    loadingRelations,
    saveMatchEdits,
    deleteMatch,
    identityEditing,
    setIdentityEditing,
    identityFirstName,
    setIdentityFirstName,
    identityLastName,
    setIdentityLastName,
    identitySaving,
    setIdentitySaving,
    identitySaveError,
    setIdentitySaveError,
    identitySaveSuccess,
    setIdentitySaveSuccess,
    userBalance,
    userBalanceLoading,
    userBalanceError,
    setUserBalanceReloadToken,
    fetchUser,
    handleSaveUser,
    handleDeleteUser,
    getCsrfToken,
    getPreferredOrganisationId,
    renderNavLink,
    updateOrganisationMembershipRole,
    removeOrganisationMembership,
    removeProjectMembership,
    setIsViewModalOpen,
    setIsEditModalOpen,
    setIsLinkModalOpen,
    isCreateTxnModalOpen,
    setIsCreateTxnModalOpen,
    setIsMatchEditModalOpen,
    setSelectedEditMatch,
    setIsEditMembershipModalOpen,
    setEditingMembership,
    currentUserIdForTxn,
    targetUserIdForTxn,
  } = data;

  if (loading) {
    return <LoadingState message="Loading user..." />;
  }
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
            <button
              type="button"
              className="app-action-button"
              onClick={() => {
                const orgIdForTxn = getPreferredOrganisationId();
                if (!orgIdForTxn) {
                  alert('Select an organisation first (context switcher), then try again');
                  return;
                }
                if (!Number.isFinite(currentUserIdForTxn)) {
                  alert('No current user id available');
                  return;
                }
                if (!Number.isFinite(targetUserIdForTxn)) {
                  alert('No target user id available');
                  return;
                }
                setIsCreateTxnModalOpen(true);
              }}
              style={ctaButtonStyle('primary')}
              disabled={!user}
            >
              Create transaction
            </button>
            <button
              type="button"
              className="app-action-button"
              onClick={() => setIsLinkModalOpen(true)}
              style={ctaButtonStyle('neutral')}
              disabled={!user}
            >
              Add to…
            </button>
            <Button variant="secondary" size="sm" onClick={() => setIsViewModalOpen(true)}>
              View
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDeleteUser}>
              Delete
            </Button>
          </div>
        }
      />

      <PageContent>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-16">
                <div className="flex items-center justify-between mb-3 gap-12">
                  <div className="text-sm font-semibold text-gray-900">
                    Federations <span className="text-gray-500 fw-600">({userOrgs.length})</span>
                  </div>
                  <button type="button" className="app-action-button" onClick={() => setTab('federations')} style={actionButtonStyle('neutral')}>
                    View all
                  </button>
                </div>
                {userOrgs.length === 0 ? (
                  <div className="text-sm text-gray-500">No federations.</div>
                ) : (
                  <div className="space-y-2">
                    {userOrgs.slice(0, 6).map((o: any) => {
                      const orgSlugOrId = String(o?.slug || o?.id || '').trim();
                      const orgPath = orgSlugOrId ? `/organisations/${encodeURIComponent(orgSlugOrId)}` : '';
                      return orgPath ? (
                        <button
                          key={String(o?.id || o?.slug || orgSlugOrId)}
                          type="button"
                          className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                          onClick={() => navigate(orgPath)}
                        >
                          {String(o?.name || orgSlugOrId)}
                        </button>
                      ) : (
                        <div key={String(o?.id || o?.slug || orgSlugOrId)} className="text-sm text-gray-900 fw-600">
                          {String(o?.name || 'Federation')}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="p-16">
                <div className="flex items-center justify-between mb-3 gap-12">
                  <div className="text-sm font-semibold text-gray-900">
                    Clubs <span className="text-gray-500 fw-600">({clubsForTab.length})</span>
                  </div>
                  <button type="button" className="app-action-button" onClick={() => setTab('clubs')} style={actionButtonStyle('neutral')}>
                    View all
                  </button>
                </div>
                {clubsForTab.length === 0 ? (
                  <div className="text-sm text-gray-500">No clubs.</div>
                ) : (
                  <div className="space-y-2">
                    {clubsForTab.slice(0, 6).map((c: any) => {
                      const orgKey = String(primaryOrgSlug || '').trim();
                      const clubKeyOrId = String(c?.slug || c?.id || '').trim();
                      const clubPath = orgKey && clubKeyOrId ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(clubKeyOrId)}` : '';
                      return clubPath ? (
                        <button
                          key={String(c?.id || clubKeyOrId)}
                          type="button"
                          className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                          onClick={() => navigate(clubPath)}
                        >
                          {String(c?.name || 'Club')}
                        </button>
                      ) : (
                        <div key={String(c?.id || clubKeyOrId)} className="text-sm text-gray-900 fw-600">
                          {String(c?.name || 'Club')}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="p-16">
                <div className="flex items-center justify-between mb-3 gap-12">
                  <div className="text-sm font-semibold text-gray-900">
                    Teams <span className="text-gray-500 fw-600">({teamMemberships.length})</span>
                  </div>
                  <button type="button" className="app-action-button" onClick={() => setTab('teams')} style={actionButtonStyle('neutral')}>
                    View all
                  </button>
                </div>
                {teamMemberships.length === 0 ? (
                  <div className="text-sm text-gray-500">No teams.</div>
                ) : (
                  <div className="space-y-2">
                    {teamMemberships.slice(0, 6).map((t: any) => {
                      const orgKey = String(primaryOrgSlug || '').trim();
                      const clubIdValue = String(t?.parent || '').trim();
                      const clubKeyOrId = String(clubSlugById.get(clubIdValue) || clubIdValue || '').trim();
                      const teamKeyOrId = String(t?.slug || t?.id || '').trim();
                      const teamPath = orgKey && clubKeyOrId && teamKeyOrId
                        ? `/${encodeURIComponent(orgKey)}/${encodeURIComponent(clubKeyOrId)}/${encodeURIComponent(teamKeyOrId)}`
                        : '';
                      return teamPath ? (
                        <button
                          key={String(t?.id || teamKeyOrId)}
                          type="button"
                          className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                          onClick={() => navigate(teamPath)}
                        >
                          {String(t?.name || 'Team')}
                        </button>
                      ) : (
                        <div key={String(t?.id || teamKeyOrId)} className="text-sm text-gray-900 fw-600">
                          {String(t?.name || 'Team')}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card className="p-16">
                <div className="flex items-center justify-between mb-3 gap-12">
                  <div className="text-sm font-semibold text-gray-900">
                    Matches <span className="text-gray-500 fw-600">({linkedMatches.length})</span>
                  </div>
                  <button type="button" className="app-action-button" onClick={() => setTab('matches')} style={actionButtonStyle('neutral')}>
                    View all
                  </button>
                </div>
                {linkedMatches.length === 0 ? (
                  <div className="text-sm text-gray-500">No matches.</div>
                ) : (
                  <div className="space-y-2">
                    {linkedMatches.slice(0, 6).map((m: any) => {
                      const matchKeyOrId = String((m as any)?.slug || (m as any)?.id || '').trim();
                      const matchPath = matchKeyOrId ? `/matches/${encodeURIComponent(matchKeyOrId)}` : '';
                      return matchPath ? (
                        <button
                          key={String(m?.id || matchKeyOrId)}
                          type="button"
                          className="app-unstyled-button text-blue-600 hover:underline text-left fw-600"
                          onClick={() => navigate(matchPath)}
                        >
                          {String(m?.title || m?.name || 'Match')}
                        </button>
                      ) : (
                        <div key={String(m?.id || 'match')} className="text-sm text-gray-900 fw-600">
                          {String(m?.title || m?.name || 'Match')}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            <Card>
              <h3 style={{ marginTop: 0 }}>User</h3>
              <div className="grid" style={{ gridTemplateColumns: '160px 1fr', gap: '8px 16px' }}>
                <div className="text-muted">Name</div>
                <div className="fw-600">{userDisplayName}</div>

                <div className="text-muted">Email</div>
                <div>{user.email}</div>

                <div className="text-muted">Role</div>
                <div>
                  <Badge variant={String(user.role || '').toLowerCase() === 'superadmin' ? 'primary' : 'default'}>
                    {user.role}
                  </Badge>
                </div>

                <div className="text-muted">Status</div>
                <div>
                  <Badge variant={user.is_active ? 'success' : 'error'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'identity' && user && (
          <div className="space-y-6">
            {/* Profile Photo Section */}
            <Card className="p-20">
              <h3 className="mb-16" style={{ marginTop: 0 }}>Profile Photo</h3>
              <div className="flex-row gap-24" style={{ alignItems: 'flex-start' }}>
                <div
                  className="overflow-hidden flex-center rounded-full"
                  style={{
                    width: 120,
                    height: 120,
                    backgroundColor: 'var(--app-surface-alt, #f5f5f5)',
                    border: '2px solid var(--app-border)',
                    flexShrink: 0,
                  }}
                >
                  {(user as any).avatar_url ? (
                    <img
                      src={(user as any).avatar_url}
                      alt={`${userDisplayName} avatar`}
                      className="w-full h-full"
                      style={{ objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 48, color: 'var(--app-muted-text)' }}>
                      {String(user.first_name || user.email || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-muted fs-13 mb-8">
                    This is the user's primary profile photo. It's displayed across the platform.
                  </div>
                  {(user as any).avatar_url && (
                    <div className="mt-8 fs-12 text-muted">
                      <strong>URL:</strong>{' '}
                      <a
                        href={(user as any).avatar_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="word-break-all"
                        style={{ color: '#007bff' }}
                      >
                        {(user as any).avatar_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Profile Details Section */}
            <Card className="p-20">
              <div className="flex-between mb-16">
                <h3 className="m-0">Profile Details</h3>
                {!identityEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setIdentityFirstName(user.first_name || '');
                      setIdentityLastName(user.last_name || '');
                      setIdentityEditing(true);
                      setIdentitySaveError(null);
                      setIdentitySaveSuccess(false);
                    }}
                    style={actionButtonStyle('primary')}
                  >
                    Edit
                  </button>
                )}
              </div>

              {identitySaveSuccess && (
                <Alert variant="success" className="mb-16">
                  Profile updated successfully!
                </Alert>
              )}

              {identitySaveError && (
                <Alert variant="error" className="mb-16">
                  {identitySaveError}
                </Alert>
              )}

              {identityEditing ? (
                <div className="flex-col gap-16">
                  <div>
                    <label className="block fw-600" style={{ marginBottom: 6 }}>First Name</label>
                    <Input
                      value={identityFirstName}
                      onChange={(e) => setIdentityFirstName((e.target as any).value)}
                      placeholder="First name"
                      disabled={identitySaving}
                    />
                  </div>
                  <div>
                    <label className="block fw-600" style={{ marginBottom: 6 }}>Last Name</label>
                    <Input
                      value={identityLastName}
                      onChange={(e) => setIdentityLastName((e.target as any).value)}
                      placeholder="Last name"
                      disabled={identitySaving}
                    />
                  </div>
                  <div>
                    <label className="block fw-600" style={{ marginBottom: 6 }}>Email</label>
                    <Input value={user.email || ''} disabled />
                    <div className="fs-12 text-muted mt-4">
                      Email cannot be changed here.
                    </div>
                  </div>
                  <div className="flex-row gap-8 mt-8">
                    <button
                      type="button"
                      disabled={identitySaving}
                      onClick={async () => {
                        setIdentitySaving(true);
                        setIdentitySaveError(null);
                        setIdentitySaveSuccess(false);
                        try {
                          await handleSaveUser({
                            first_name: identityFirstName,
                            last_name: identityLastName,
                          });
                          await fetchUser();
                          setIdentityEditing(false);
                          setIdentitySaveSuccess(true);
                          setTimeout(() => setIdentitySaveSuccess(false), 3000);
                        } catch (e) {
                          setIdentitySaveError(e instanceof Error ? e.message : 'Failed to save');
                        } finally {
                          setIdentitySaving(false);
                        }
                      }}
                      style={{
                        ...ctaButtonStyle('primary'),
                        opacity: identitySaving ? 0.6 : 1,
                        cursor: identitySaving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {identitySaving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      disabled={identitySaving}
                      onClick={() => {
                        setIdentityEditing(false);
                        setIdentitySaveError(null);
                      }}
                      style={ctaButtonStyle('neutral')}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: '160px 1fr', gap: '12px 16px' }}>
                  <div className="text-muted">First Name</div>
                  <div className="fw-600">{user.first_name || '—'}</div>

                  <div className="text-muted">Last Name</div>
                  <div className="fw-600">{user.last_name || '—'}</div>

                  <div className="text-muted">Email</div>
                  <div>{user.email || '—'}</div>

                  <div className="text-muted">Role</div>
                  <div>
                    <Badge variant={String(user.role || '').toLowerCase() === 'superadmin' ? 'primary' : 'default'}>
                      {user.role || 'User'}
                    </Badge>
                  </div>

                  <div className="text-muted">Status</div>
                  <div>
                    <Badge variant={user.is_active ? 'success' : 'error'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="text-muted">Last Login</div>
                  <div>{user.last_login ? new Date(user.last_login).toLocaleString() : '—'}</div>

                  <div className="text-muted">Date Joined</div>
                  <div>{user.date_joined ? new Date(user.date_joined).toLocaleString() : '—'}</div>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="grid gap-12">
            <Card>
              <div className="flex-between gap-12">
                <h3 className="m-0">Balance</h3>
                <button
                  type="button"
                  onClick={() => setUserBalanceReloadToken((n) => n + 1)}
                  style={actionButtonStyle('neutral')}
                  disabled={userBalanceLoading}
                >
                  Refresh
                </button>
              </div>

              {userBalanceError ? (
                <div className="mt-12">
                  <Alert variant="warning">{userBalanceError}</Alert>
                </div>
              ) : null}

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
                    <button type="button" onClick={() => setTab('transactions')} style={actionButtonStyle('primary')}>
                      View transactions
                    </button>
                    <button type="button" onClick={() => setIsCreateTxnModalOpen(true)} style={actionButtonStyle('neutral')}>
                      Create transaction
                    </button>
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
              filters={{
                organization_id: getPreferredOrganisationId(),
                charged_user_id: String((user as any)?.id || userId),
              }}
            />
          </div>
        )}

        {activeTab === 'hierarchy' && (
          <Card>
            <div className="flex-between gap-12">
              <h3 className="m-0">Hierarchy</h3>
              <Input value={hierarchySearch} onChange={(e) => setHierarchySearch((e.target as any).value)} placeholder="Search…" />
            </div>
            <div className="mt-12">
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Club</th>
                    <th style={compactThStyle}>Team</th>
                    <th style={compactThStyle}>Season</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hierarchyRows.map((r) => (
                    <tr key={`${r.teamId}::${r.seasonId}`}>
                      <td style={compactTextTdStyle}>
                        {renderNavLink(
                          r.clubName || '-',
                          r.clubSlug ? `/organisations/${primaryOrgSlug}/projects/${r.clubSlug}` : ''
                        )}
                      </td>
                      <td style={compactTextTdStyle}>{renderNavLink(r.teamName || '-', r.teamPath)}</td>
                      <td style={compactTextTdStyle}>{renderNavLink(r.seasonName || r.seasonId, r.seasonPath)}</td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          {r.teamPath ? (
                            <button type="button" className="app-action-button" onClick={() => navigate(r.teamPath)} style={actionButtonStyle('primary')}>
                              View Team
                            </button>
                          ) : (
                            <button type="button" className="app-action-button" disabled style={{ ...actionButtonStyle('primary'), opacity: 0.5, cursor: 'not-allowed' }}>
                              View Team
                            </button>
                          )}
                          {r.seasonPath ? (
                            <button type="button" className="app-action-button" onClick={() => navigate(r.seasonPath)} style={actionButtonStyle('primary')}>
                              View Season
                            </button>
                          ) : (
                            <button type="button" className="app-action-button" disabled style={{ ...actionButtonStyle('primary'), opacity: 0.5, cursor: 'not-allowed' }}>
                              View Season
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!hierarchyRows.length && (
                    <tr>
                      <td style={compactTdStyle} colSpan={4}>
                        <em className="text-muted">No linked seasons found.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card>
        )}

        {activeTab === 'federations' && (
          <Card>
            <div className="flex-between gap-10">
              <h3 className="m-0">Federations</h3>
              <button type="button" onClick={() => setIsLinkModalOpen(true)} style={actionButtonStyle('neutral')} disabled={!user}>
                Add to…
              </button>
            </div>

            <Table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Name</th>
                  <th style={compactThStyle}>Role</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userOrgs.map((o: any) => {
                  const orgSlugOrId = String(o?.slug || o?.id || '').trim();
                  const orgPath = orgSlugOrId ? `/organisations/${orgSlugOrId}` : '';
                  const currentRole = String(o?.role || o?.user_role || '').trim() || 'member';
                  return (
                    <tr key={String(o?.id || o?.slug)}>
                      <td style={compactTextTdStyle}>{renderNavLink(String(o?.name || orgSlugOrId || ''), orgPath)}</td>
                      <td style={compactTextTdStyle}>
                        <button
                          type="button"
                          disabled={!orgSlugOrId}
                          onClick={async () => {
                            if (!orgSlugOrId) return;
                            const next = window.prompt('Set federation role (admin/member):', currentRole) || '';
                            const role = next.trim().toLowerCase();
                            if (!role) return;
                            try {
                              await updateOrganisationMembershipRole(orgSlugOrId, role);
                            } catch (e) {
                              alert(e instanceof Error ? e.message : 'Failed to update role');
                            }
                          }}
                          className="border-none bg-transparent p-0 fw-700"
                          style={{
                            color: orgSlugOrId ? '#007bff' : 'var(--app-muted-text)',
                            cursor: orgSlugOrId ? 'pointer' : 'not-allowed',
                            textDecoration: orgSlugOrId ? 'underline' : 'none',
                          }}
                          title={orgSlugOrId ? 'Click to edit role' : 'Missing federation id'}
                        >
                          {currentRole}
                        </button>
                      </td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          <button type="button" className="app-action-button" onClick={() => orgPath && navigate(orgPath)} disabled={!orgPath} style={actionButtonStyle('primary')}>
                            View
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            style={actionButtonStyle('warning')}
                            disabled={!orgSlugOrId}
                            onClick={async () => {
                              if (!orgSlugOrId) return;
                              const next = window.prompt('Set federation role (admin/member):', currentRole) || '';
                              const role = next.trim().toLowerCase();
                              if (!role) return;
                              try {
                                await updateOrganisationMembershipRole(orgSlugOrId, role);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to update role');
                              }
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            style={actionButtonStyle('danger')}
                            disabled={!orgSlugOrId}
                            onClick={async () => {
                              if (!orgSlugOrId) return;
                              if (!window.confirm('Unlink this user from the federation?')) return;
                              try {
                                await removeOrganisationMembership(orgSlugOrId);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to unlink federation');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!userOrgs.length && (
                  <tr>
                    <td style={compactTdStyle} colSpan={3}>
                      <em className="text-muted">No federation memberships.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}

        {activeTab === 'clubs' && (
          <Card>
            <div className="flex-between gap-10">
              <h3 className="m-0">Clubs</h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                style={actionButtonStyle('neutral')}
                disabled={!user}
              >
                Add to…
              </button>
            </div>
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Name</th>
                  <th style={compactThStyle}>Role</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clubsForTab.map((c: any) => {
                  const projectId = String(c?.id || '').trim();
                  const direct = projectId ? directClubMembershipById.get(projectId) : null;
                  const slug = String(c?.slug || direct?.slug || '').trim();
                  const clubPath = primaryOrgSlug && slug ? `/organisations/${primaryOrgSlug}/projects/${slug}` : '';
                  const membershipId = (direct as any)?.membership_id;
                  return (
                    <tr key={String(c?.id)}>
                      <td style={compactTextTdStyle}>{renderNavLink(String(c?.name || ''), clubPath)}</td>
                      <td style={compactTextTdStyle}>
                        {direct ? (
                          <button
                            type="button"
                            disabled={!projectId}
                            onClick={() => {
                              if (!projectId) return;
                              setEditingMembership({ projectId, projectName: String(c?.name || 'Club'), currentRole: String(direct?.role || 'viewer'), membershipId });
                              setIsEditMembershipModalOpen(true);
                            }}
                            className="border-none bg-transparent p-0 fw-700"
                            style={{
                              color: projectId ? '#007bff' : 'var(--app-muted-text)',
                              cursor: projectId ? 'pointer' : 'not-allowed',
                              textDecoration: projectId ? 'underline' : 'none',
                            }}
                            title={projectId ? 'Click to edit role' : 'Missing project id'}
                          >
                            {String(direct?.role || '') || '—'}
                          </button>
                        ) : (
                          <span title="This user is linked to this club via team membership.">
                            <span className="text-muted fw-700">Via team</span>
                          </span>
                        )}
                      </td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          <button type="button" className="app-action-button" onClick={() => clubPath && navigate(clubPath)} disabled={!clubPath} style={actionButtonStyle('primary')}>
                            View
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            onClick={() => {
                              if (!projectId) return;
                              if (!direct) return;
                              setEditingMembership({ projectId, projectName: String(c?.name || 'Club'), currentRole: String(direct?.role || 'viewer'), membershipId });
                              setIsEditMembershipModalOpen(true);
                            }}
                            disabled={!projectId || !direct}
                            style={actionButtonStyle('warning')}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            style={actionButtonStyle('danger')}
                            disabled={!projectId || !direct}
                            onClick={async () => {
                              if (!projectId) return;
                              if (!direct) return;
                              if (!window.confirm('Remove this user from the club?')) return;
                              try {
                                await removeProjectMembership(projectId, membershipId);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to remove membership');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!clubsForTab.length && (
                  <tr>
                    <td style={compactTdStyle} colSpan={3}>
                      <em className="text-muted">No club memberships.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}

        {activeTab === 'teams' && (
          <Card>
            <div className="flex-between gap-10">
              <h3 className="m-0">Teams</h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(true)}
                style={actionButtonStyle('neutral')}
                disabled={!user}
              >
                Add to…
              </button>
            </div>
            <Table style={compactTableStyle}>
              <thead>
                <tr>
                  <th style={compactThStyle}>Club</th>
                  <th style={compactThStyle}>Team</th>
                  <th style={compactThStyle}>Role</th>
                  <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMemberships.map((t: any) => {
                  const clubIdValue = String(t?.parent || '').trim();
                  const clubSlug = clubSlugById.get(clubIdValue) || '';
                  const teamSlugOrId = String(t?.slug || t?.id || '').trim();
                  const teamPath = primaryOrgSlug && clubSlug && teamSlugOrId
                    ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}`
                    : '';
                  const clubPath = primaryOrgSlug && clubSlug ? `/${primaryOrgSlug}/${clubSlug}` : '';
                  const projectId = String(t?.id || '').trim();
                  const membershipId = (t as any)?.membership_id;
                  return (
                    <tr key={String(t?.id)}>
                      <td style={compactTextTdStyle}>{renderNavLink(String(t?.parent_name || ''), clubPath)}</td>
                      <td style={compactTextTdStyle}>{renderNavLink(String(t?.name || ''), teamPath)}</td>
                      <td style={compactTextTdStyle}>
                        <button
                          type="button"
                          disabled={!projectId}
                          onClick={() => {
                            if (!projectId) return;
                            setEditingMembership({ projectId, projectName: String(t?.name || 'Team'), currentRole: String(t?.role || 'viewer'), membershipId });
                            setIsEditMembershipModalOpen(true);
                          }}
                          className="border-none bg-transparent p-0 fw-700"
                          style={{
                            color: projectId ? '#007bff' : 'var(--app-muted-text)',
                            cursor: projectId ? 'pointer' : 'not-allowed',
                            textDecoration: projectId ? 'underline' : 'none',
                          }}
                          title={projectId ? 'Click to edit role' : 'Missing project id'}
                        >
                          {String(t?.role || '') || '—'}
                        </button>
                      </td>
                      <td style={compactTdStyle}>
                        <div style={compactActionsStyle}>
                          <button type="button" className="app-action-button" onClick={() => teamPath && navigate(teamPath)} disabled={!teamPath} style={actionButtonStyle('primary')}>
                            View
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            onClick={() => {
                              if (!projectId) return;
                              setEditingMembership({ projectId, projectName: String(t?.name || 'Team'), currentRole: String(t?.role || 'viewer'), membershipId });
                              setIsEditMembershipModalOpen(true);
                            }}
                            disabled={!projectId}
                            style={actionButtonStyle('warning')}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="app-action-button"
                            style={actionButtonStyle('danger')}
                            disabled={!projectId}
                            onClick={async () => {
                              if (!projectId) return;
                              if (!window.confirm('Remove this user from the team?')) return;
                              try {
                                await removeProjectMembership(projectId, membershipId);
                              } catch (e) {
                                alert(e instanceof Error ? e.message : 'Failed to remove membership');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!teamMemberships.length && (
                  <tr>
                    <td style={compactTdStyle} colSpan={4}>
                      <em className="text-muted">No team memberships.</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Card>
        )}

        {activeTab === 'seasons' && (
          <div className="grid gap-12">
            {loadingRelations && <Alert variant="info">Loading seasons, competitions and matches…</Alert>}

            <Card>
              <h3 style={{ marginTop: 0 }}>Seasons</h3>
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Season</th>
                    <th style={compactThStyle}>Team</th>
                    <th style={compactThStyle}>Club</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teamSeasonPairs.map((r) => {
                    const clubSlug = clubSlugById.get(r.clubId) || '';
                    const teamSlugOrId = String(r.teamSlug || r.teamId).trim();
                    const seasonPath = primaryOrgSlug && clubSlug && teamSlugOrId && r.seasonId
                      ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}/${r.seasonId}`
                      : '';
                    return (
                      <tr key={`${r.teamId}::${r.seasonId}`}>
                        <td style={compactTextTdStyle}>{renderNavLink(r.seasonName || r.seasonId, seasonPath)}</td>
                        <td style={compactTextTdStyle}>
                          {renderNavLink(
                            r.teamName || r.teamId,
                            primaryOrgSlug && clubSlug && teamSlugOrId
                              ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}`
                              : ''
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                          {renderNavLink(
                            r.clubName || r.clubId,
                            primaryOrgSlug && clubSlug ? `/${primaryOrgSlug}/${clubSlug}` : ''
                          )}
                        </td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button type="button" className="app-action-button" onClick={() => seasonPath && navigate(seasonPath)} disabled={!seasonPath} style={actionButtonStyle('primary')}>
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!teamSeasonPairs.length && (
                    <tr>
                      <td style={compactTdStyle} colSpan={4}>
                        <em className="text-muted">No season-linked team memberships.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>
          </div>
        )}

        {activeTab === 'competitions' && (
          <div className="grid gap-12">
            {loadingRelations && <Alert variant="info">Loading competitions…</Alert>}
            <Card>
              <h3 style={{ marginTop: 0 }}>Competitions</h3>
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Name</th>
                    <th style={compactThStyle}>Season</th>
                    <th style={compactThStyle}>Team</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedCompetitions.map((c: any) => {
                    const teamIdValue = String(c?.project_id ?? c?.project?.id ?? '').trim();
                    const team = teamMemberships.find((t: any) => String(t?.id) === teamIdValue);
                    const clubIdValue = String(team?.parent || '').trim();
                    const clubSlug = clubSlugById.get(clubIdValue) || '';
                    const teamSlugOrId = String(team?.slug || team?.id || '').trim();
                    const parentSeasonId = String(c?.parent_period_id ?? c?.parent_period?.id ?? '').trim();
                    const competitionPath = primaryOrgSlug && clubSlug && teamSlugOrId && parentSeasonId && c?.id
                      ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}/${parentSeasonId}/${c.id}`
                      : '';
                    return (
                      <tr key={String(c?.id)}>
                        <td style={compactTextTdStyle}>{renderNavLink(String(c?.name || ''), competitionPath)}</td>
                        <td style={compactTextTdStyle}>
                          {renderNavLink(
                            String(c?.parent_period?.name || ''),
                            parentSeasonId && primaryOrgSlug && clubSlug && teamSlugOrId
                              ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}/${parentSeasonId}`
                              : ''
                          )}
                        </td>
                        <td style={compactTextTdStyle}>
                          {renderNavLink(
                            String(team?.name || ''),
                            primaryOrgSlug && clubSlug && teamSlugOrId
                              ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}`
                              : ''
                          )}
                        </td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button type="button" className="app-action-button" onClick={() => competitionPath && navigate(competitionPath)} disabled={!competitionPath} style={actionButtonStyle('primary')}>
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!linkedCompetitions.length && (
                    <tr>
                      <td style={compactTdStyle} colSpan={4}>
                        <em className="text-muted">No competitions found for linked seasons.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="grid gap-12">
            {loadingRelations && <Alert variant="info">Loading matches…</Alert>}
            <Card>
              <h3 style={{ marginTop: 0 }}>Matches</h3>
              <Table style={compactTableStyle}>
                <thead>
                  <tr>
                    <th style={compactThStyle}>Title</th>
                    <th style={compactThStyle}>Start</th>
                    <th style={compactThStyle}>Team</th>
                    <th style={{ ...compactThStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedMatches.slice(0, 200).map((m: any) => {
                    const teamIdValue = String(m?.project?.id || m?.project_id || '').trim();
                    const team = teamMemberships.find((t: any) => String(t?.id) === teamIdValue);
                    const clubIdValue = String(team?.parent || '').trim();
                    const clubKeyOrId = String(clubSlugById.get(clubIdValue) || clubIdValue || '').trim();
                    const teamSlugOrId = String(team?.slug || team?.id || '').trim();
                    const teamPath = primaryOrgSlug && clubKeyOrId && teamSlugOrId
                      ? `/${primaryOrgSlug}/${clubKeyOrId}/${teamSlugOrId}`
                      : '';
                    const teamName = String(team?.name || m?.project?.name || m?.project_name || '').trim();

                    const matchKeyOrId = String((m as any)?.slug || (m as any)?.id || '').trim();
                    const competition = (m as any)?.period || null;
                    const competitionKeyOrId = String(periodPathKey(competition) || competition?.slug || competition?.id || '').trim();
                    const season = competition?.parent_period || null;
                    const seasonKeyOrId = String(periodPathKey(season) || season?.slug || season?.id || competition?.parent_period_id || '').trim();

                    const matchPath = (primaryOrgSlug && clubKeyOrId && teamSlugOrId && seasonKeyOrId && competitionKeyOrId && matchKeyOrId)
                      ? `/${primaryOrgSlug}/${clubKeyOrId}/${teamSlugOrId}/${seasonKeyOrId}/${competitionKeyOrId}/${matchKeyOrId}`
                      : (matchKeyOrId ? `/matches/${matchKeyOrId}` : '');
                    return (
                      <tr key={String(m?.id)}>
                        <td style={compactTextTdStyle}>
                          {matchPath ? (
                            <a
                              href={matchPath}
                              className="text-blue-600 hover:underline fw-700 inline-block truncate"
                              style={{
                                textDecoration: 'none',
                                maxWidth: '100%',
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(matchPath);
                              }}
                              title="Open match details"
                            >
                              {String(m?.title || '') || '—'}
                            </a>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td style={compactTextTdStyle}>{String(m?.start_time || '')}</td>
                        <td style={compactTextTdStyle}>{renderNavLink(teamName, teamPath)}</td>
                        <td style={compactTdStyle}>
                          <div style={compactActionsStyle}>
                            <button
                              type="button"
                              className="app-action-button"
                              onClick={() => {
                                if (matchPath) navigate(matchPath);
                              }}
                              disabled={!matchPath}
                              style={actionButtonStyle('primary')}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              className="app-action-button"
                              onClick={() => {
                                setSelectedEditMatch(m);
                                setIsMatchEditModalOpen(true);
                              }}
                              style={actionButtonStyle('warning')}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="app-action-button"
                              onClick={async () => {
                                if (!m?.id) return;
                                if (!window.confirm(`Delete match ${m.title || m.id}?`)) return;
                                try {
                                  await deleteMatch(m);
                                } catch (e) {
                                  alert(e instanceof Error ? e.message : 'Failed to delete match');
                                }
                              }}
                              disabled={!m?.id}
                              style={actionButtonStyle('danger')}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!linkedMatches.length && (
                    <tr>
                      <td style={compactTdStyle} colSpan={4}>
                        <em className="text-muted">No matches found.</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              {linkedMatches.length > 200 && (
                <div className="mt-8 text-muted">
                  Showing first 200 matches.
                </div>
              )}
            </Card>
          </div>
        )}
      </PageContent>

      <UserDetailModals data={data} />
    </>
  );
};

export default UserDetailPage;
