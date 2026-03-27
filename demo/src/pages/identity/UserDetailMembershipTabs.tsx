/**
 * UserDetailMembershipTabs — Federations, Clubs, Teams table tabs.
 */
import { Table } from '../../shims/design-system';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';

import type { UserDetailDataReturn } from './useUserDetailData';

interface Props {
  data: UserDetailDataReturn;
}

export function UserDetailMembershipTabs({ data }: Props) {
  const { pushToast } = useToast();
  const confirm = useConfirm();
  const {
    activeTab, navigate, user,
    userOrgs, clubsForTab, teamMemberships, clubSlugById,
    primaryOrgSlug, directClubMembershipById, renderNavLink,
    setIsLinkModalOpen, setEditingMembership, setIsEditMembershipModalOpen,
    updateOrganisationMembershipRole, removeOrganisationMembership, removeProjectMembership,
  } = data;

  if (activeTab === 'federations') {
    return (
      <div className="card">
        <div className="flex-between gap-10">
          <h3 className="m-0">Federations</h3>
          <button type="button" onClick={() => setIsLinkModalOpen(true)} className="action-btn action-btn-neutral" disabled={!user}>Add to…</button>
        </div>
        <Table className="detail-table">
          <thead>
            <tr>
              <th className="detail-th">Name</th>
              <th className="detail-th">Role</th>
              <th className="detail-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {userOrgs.map((o) => {
              const orgSlugOrId = String(o?.slug || o?.id || '').trim();
              const orgPath = orgSlugOrId ? `/organisations/${orgSlugOrId}` : '';
              const currentRole = String(o?.role || o?.user_role || '').trim() || 'member';
              return (
                <tr key={String(o?.id || o?.slug)}>
                  <td className="detail-td-text">{renderNavLink(String(o?.name || orgSlugOrId || ''), orgPath)}</td>
                  <td className="detail-td-text">
                    <button type="button" disabled={!orgSlugOrId} onClick={async () => {
                      if (!orgSlugOrId) return;
                      const next = window.prompt('Set federation role (admin/member):', currentRole) || '';
                      const role = next.trim().toLowerCase();
                      if (!role) return;
                      try { await updateOrganisationMembershipRole(orgSlugOrId, role); } catch (e) { pushToast({ message: e instanceof Error ? e.message : 'Rol bijwerken mislukt', type: 'error' }); }
                    }} className="border-none bg-transparent p-0 fw-700" style={{ color: orgSlugOrId ? 'var(--app-primary)' : 'var(--app-muted-text)', cursor: orgSlugOrId ? 'pointer' : 'not-allowed', textDecoration: orgSlugOrId ? 'underline' : 'none' }} title={orgSlugOrId ? 'Click to edit role' : 'Missing federation id'}>
                      {currentRole}
                    </button>
                  </td>
                  <td className="detail-td">
                    <div className="detail-actions">
                      <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => orgPath && navigate(orgPath)} disabled={!orgPath}>Bekijken</button>
                      <button type="button" className="app-action-button action-btn action-btn-warning" disabled={!orgSlugOrId} onClick={async () => {
                        if (!orgSlugOrId) return;
                        const next = window.prompt('Set federation role (admin/member):', currentRole) || '';
                        const role = next.trim().toLowerCase();
                        if (!role) return;
                        try { await updateOrganisationMembershipRole(orgSlugOrId, role); } catch (e) { pushToast({ message: e instanceof Error ? e.message : 'Rol bijwerken mislukt', type: 'error' }); }
                      }}>Bewerken</button>
                      <button type="button" className="app-action-button action-btn action-btn-danger" disabled={!orgSlugOrId} onClick={async () => {
                        if (!orgSlugOrId) return;
                        const ok = await confirm({ title: 'Ontkoppelen', message: 'Gebruiker ontkoppelen van de federatie?', confirmLabel: 'Ontkoppelen', variant: 'danger' });
                        if (!ok) return;
                        try { await removeOrganisationMembership(orgSlugOrId); } catch (e) { pushToast({ message: e instanceof Error ? e.message : 'Ontkoppelen mislukt', type: 'error' }); }
                      }}>Verwijderen</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!userOrgs.length && <tr><td className="detail-td" colSpan={3}><em className="text-muted">No federation memberships.</em></td></tr>}
          </tbody>
        </Table>
      </div>
    );
  }

  if (activeTab === 'clubs') {
    return (
      <div className="card">
        <div className="flex-between gap-10">
          <h3 className="m-0">Clubs</h3>
          <button type="button" onClick={() => setIsLinkModalOpen(true)} className="action-btn action-btn-neutral" disabled={!user}>Add to…</button>
        </div>
        <Table className="detail-table">
          <thead>
            <tr>
              <th className="detail-th">Name</th>
              <th className="detail-th">Role</th>
              <th className="detail-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clubsForTab.map((c) => {
              const projectId = String(c?.id || '').trim();
              const direct = projectId ? directClubMembershipById.get(projectId) : null;
              const slug = String(c?.slug || direct?.slug || '').trim();
              const clubPath = primaryOrgSlug && slug ? `/organisations/${primaryOrgSlug}/projects/${slug}` : '';
              const membershipId = (direct as unknown as Record<string, unknown>)?.membership_id as string | undefined;
              return (
                <tr key={String(c?.id)}>
                  <td className="detail-td-text">{renderNavLink(String(c?.name || ''), clubPath)}</td>
                  <td className="detail-td-text">
                    {direct ? (
                      <button type="button" disabled={!projectId} onClick={() => {
                        if (!projectId) return;
                        setEditingMembership({ projectId, projectName: String(c?.name || 'Club'), currentRole: String((direct as unknown as Record<string, unknown>)?.role || 'viewer'), membershipId });
                        setIsEditMembershipModalOpen(true);
                      }} className="border-none bg-transparent p-0 fw-700" style={{ color: projectId ? 'var(--app-primary)' : 'var(--app-muted-text)', cursor: projectId ? 'pointer' : 'not-allowed', textDecoration: projectId ? 'underline' : 'none' }} title={projectId ? 'Click to edit role' : 'Missing project id'}>
                        {String((direct as unknown as Record<string, unknown>)?.role || '') || '—'}
                      </button>
                    ) : (
                      <span title="This user is linked to this club via team membership."><span className="text-muted fw-700">Via team</span></span>
                    )}
                  </td>
                  <td className="detail-td">
                    <div className="detail-actions">
                      <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => clubPath && navigate(clubPath)} disabled={!clubPath}>Bekijken</button>
                      <button type="button" className="app-action-button action-btn action-btn-warning" onClick={() => {
                        if (!projectId || !direct) return;
                        setEditingMembership({ projectId, projectName: String(c?.name || 'Club'), currentRole: String((direct as unknown as Record<string, unknown>)?.role || 'viewer'), membershipId });
                        setIsEditMembershipModalOpen(true);
                      }} disabled={!projectId || !direct}>Bewerken</button>
                      <button type="button" className="app-action-button action-btn action-btn-danger" disabled={!projectId || !direct} onClick={async () => {
                        if (!projectId || !direct) return;
                        const ok = await confirm({ title: 'Lid verwijderen', message: 'Gebruiker verwijderen uit de club?', confirmLabel: 'Verwijderen', variant: 'danger' });
                        if (!ok) return;
                        try { await removeProjectMembership(projectId, membershipId); } catch (e) { pushToast({ message: e instanceof Error ? e.message : 'Lidmaatschap verwijderen mislukt', type: 'error' }); }
                      }}>Verwijderen</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!clubsForTab.length && <tr><td className="detail-td" colSpan={3}><em className="text-muted">No club memberships.</em></td></tr>}
          </tbody>
        </Table>
      </div>
    );
  }

  if (activeTab === 'teams') {
    return (
      <div className="card">
        <div className="flex-between gap-10">
          <h3 className="m-0">Teams</h3>
          <button type="button" onClick={() => setIsLinkModalOpen(true)} className="action-btn action-btn-neutral" disabled={!user}>Add to…</button>
        </div>
        <Table className="detail-table">
          <thead>
            <tr>
              <th className="detail-th">Club</th>
              <th className="detail-th">Team</th>
              <th className="detail-th">Role</th>
              <th className="detail-th text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teamMemberships.map((t: Record<string, unknown>) => {
              const clubIdValue = String(t?.parent || '').trim();
              const clubSlug = clubSlugById.get(clubIdValue) || '';
              const teamSlugOrId = String(t?.slug || t?.id || '').trim();
              const teamPath = primaryOrgSlug && clubSlug && teamSlugOrId ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}` : '';
              const clubPath = primaryOrgSlug && clubSlug ? `/${primaryOrgSlug}/${clubSlug}` : '';
              const projectId = String(t?.id || '').trim();
              const membershipId = t?.membership_id as string | undefined;
              return (
                <tr key={String(t?.id)}>
                  <td className="detail-td-text">{renderNavLink(String(t?.parent_name || ''), clubPath)}</td>
                  <td className="detail-td-text">{renderNavLink(String(t?.name || ''), teamPath)}</td>
                  <td className="detail-td-text">
                    <button type="button" disabled={!projectId} onClick={() => {
                      if (!projectId) return;
                      setEditingMembership({ projectId, projectName: String(t?.name || 'Team'), currentRole: String(t?.role || 'viewer'), membershipId });
                      setIsEditMembershipModalOpen(true);
                    }} className="border-none bg-transparent p-0 fw-700" style={{ color: projectId ? 'var(--app-primary)' : 'var(--app-muted-text)', cursor: projectId ? 'pointer' : 'not-allowed', textDecoration: projectId ? 'underline' : 'none' }} title={projectId ? 'Click to edit role' : 'Missing project id'}>
                      {String(t?.role || '') || '—'}
                    </button>
                  </td>
                  <td className="detail-td">
                    <div className="detail-actions">
                      <button type="button" className="app-action-button action-btn action-btn-primary" onClick={() => teamPath && navigate(teamPath)} disabled={!teamPath}>Bekijken</button>
                      <button type="button" className="app-action-button action-btn action-btn-warning" onClick={() => {
                        if (!projectId) return;
                        setEditingMembership({ projectId, projectName: String(t?.name || 'Team'), currentRole: String(t?.role || 'viewer'), membershipId });
                        setIsEditMembershipModalOpen(true);
                      }} disabled={!projectId}>Bewerken</button>
                      <button type="button" className="app-action-button action-btn action-btn-danger" disabled={!projectId} onClick={async () => {
                        if (!projectId) return;
                        const ok = await confirm({ title: 'Lid verwijderen', message: 'Gebruiker verwijderen uit het team?', confirmLabel: 'Verwijderen', variant: 'danger' });
                        if (!ok) return;
                        try { await removeProjectMembership(projectId, membershipId); } catch (e) { pushToast({ message: e instanceof Error ? e.message : 'Lidmaatschap verwijderen mislukt', type: 'error' }); }
                      }}>Verwijderen</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!teamMemberships.length && <tr><td className="detail-td" colSpan={4}><em className="text-muted">No team memberships.</em></td></tr>}
          </tbody>
        </Table>
      </div>
    );
  }

  return null;
}
