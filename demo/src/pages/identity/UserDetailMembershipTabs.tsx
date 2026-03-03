/**
 * UserDetailMembershipTabs — Federations, Clubs, Teams table tabs.
 */
import { Table } from '../../shims/design-system';
import {
  actionButtonStyle,
  compactTableStyle,
  compactThStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactActionsStyle,
} from './detail/detailStyles';
import type { UserDetailDataReturn } from './useUserDetailData';

interface Props {
  data: UserDetailDataReturn;
}

export function UserDetailMembershipTabs({ data }: Props) {
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
          <button type="button" onClick={() => setIsLinkModalOpen(true)} style={actionButtonStyle('neutral')} disabled={!user}>Add to…</button>
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
                    <button type="button" disabled={!orgSlugOrId} onClick={async () => {
                      if (!orgSlugOrId) return;
                      const next = window.prompt('Set federation role (admin/member):', currentRole) || '';
                      const role = next.trim().toLowerCase();
                      if (!role) return;
                      try { await updateOrganisationMembershipRole(orgSlugOrId, role); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to update role'); }
                    }} className="border-none bg-transparent p-0 fw-700" style={{ color: orgSlugOrId ? 'var(--app-primary)' : 'var(--app-muted-text)', cursor: orgSlugOrId ? 'pointer' : 'not-allowed', textDecoration: orgSlugOrId ? 'underline' : 'none' }} title={orgSlugOrId ? 'Click to edit role' : 'Missing federation id'}>
                      {currentRole}
                    </button>
                  </td>
                  <td style={compactTdStyle}>
                    <div style={compactActionsStyle}>
                      <button type="button" className="app-action-button" onClick={() => orgPath && navigate(orgPath)} disabled={!orgPath} style={actionButtonStyle('primary')}>View</button>
                      <button type="button" className="app-action-button" style={actionButtonStyle('warning')} disabled={!orgSlugOrId} onClick={async () => {
                        if (!orgSlugOrId) return;
                        const next = window.prompt('Set federation role (admin/member):', currentRole) || '';
                        const role = next.trim().toLowerCase();
                        if (!role) return;
                        try { await updateOrganisationMembershipRole(orgSlugOrId, role); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to update role'); }
                      }}>Edit</button>
                      <button type="button" className="app-action-button" style={actionButtonStyle('danger')} disabled={!orgSlugOrId} onClick={async () => {
                        if (!orgSlugOrId) return;
                        if (!window.confirm('Unlink this user from the federation?')) return;
                        try { await removeOrganisationMembership(orgSlugOrId); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to unlink federation'); }
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!userOrgs.length && <tr><td style={compactTdStyle} colSpan={3}><em className="text-muted">No federation memberships.</em></td></tr>}
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
          <button type="button" onClick={() => setIsLinkModalOpen(true)} style={actionButtonStyle('neutral')} disabled={!user}>Add to…</button>
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
              const slug = String(c?.slug || (direct as any)?.slug || '').trim();
              const clubPath = primaryOrgSlug && slug ? `/organisations/${primaryOrgSlug}/projects/${slug}` : '';
              const membershipId = (direct as any)?.membership_id;
              return (
                <tr key={String(c?.id)}>
                  <td style={compactTextTdStyle}>{renderNavLink(String(c?.name || ''), clubPath)}</td>
                  <td style={compactTextTdStyle}>
                    {direct ? (
                      <button type="button" disabled={!projectId} onClick={() => {
                        if (!projectId) return;
                        setEditingMembership({ projectId, projectName: String(c?.name || 'Club'), currentRole: String((direct as any)?.role || 'viewer'), membershipId });
                        setIsEditMembershipModalOpen(true);
                      }} className="border-none bg-transparent p-0 fw-700" style={{ color: projectId ? 'var(--app-primary)' : 'var(--app-muted-text)', cursor: projectId ? 'pointer' : 'not-allowed', textDecoration: projectId ? 'underline' : 'none' }} title={projectId ? 'Click to edit role' : 'Missing project id'}>
                        {String((direct as any)?.role || '') || '—'}
                      </button>
                    ) : (
                      <span title="This user is linked to this club via team membership."><span className="text-muted fw-700">Via team</span></span>
                    )}
                  </td>
                  <td style={compactTdStyle}>
                    <div style={compactActionsStyle}>
                      <button type="button" className="app-action-button" onClick={() => clubPath && navigate(clubPath)} disabled={!clubPath} style={actionButtonStyle('primary')}>View</button>
                      <button type="button" className="app-action-button" onClick={() => {
                        if (!projectId || !direct) return;
                        setEditingMembership({ projectId, projectName: String(c?.name || 'Club'), currentRole: String((direct as any)?.role || 'viewer'), membershipId });
                        setIsEditMembershipModalOpen(true);
                      }} disabled={!projectId || !direct} style={actionButtonStyle('warning')}>Edit</button>
                      <button type="button" className="app-action-button" style={actionButtonStyle('danger')} disabled={!projectId || !direct} onClick={async () => {
                        if (!projectId || !direct) return;
                        if (!window.confirm('Remove this user from the club?')) return;
                        try { await removeProjectMembership(projectId, membershipId); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to remove membership'); }
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!clubsForTab.length && <tr><td style={compactTdStyle} colSpan={3}><em className="text-muted">No club memberships.</em></td></tr>}
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
          <button type="button" onClick={() => setIsLinkModalOpen(true)} style={actionButtonStyle('neutral')} disabled={!user}>Add to…</button>
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
              const teamPath = primaryOrgSlug && clubSlug && teamSlugOrId ? `/${primaryOrgSlug}/${clubSlug}/${teamSlugOrId}` : '';
              const clubPath = primaryOrgSlug && clubSlug ? `/${primaryOrgSlug}/${clubSlug}` : '';
              const projectId = String(t?.id || '').trim();
              const membershipId = (t as any)?.membership_id;
              return (
                <tr key={String(t?.id)}>
                  <td style={compactTextTdStyle}>{renderNavLink(String(t?.parent_name || ''), clubPath)}</td>
                  <td style={compactTextTdStyle}>{renderNavLink(String(t?.name || ''), teamPath)}</td>
                  <td style={compactTextTdStyle}>
                    <button type="button" disabled={!projectId} onClick={() => {
                      if (!projectId) return;
                      setEditingMembership({ projectId, projectName: String(t?.name || 'Team'), currentRole: String(t?.role || 'viewer'), membershipId });
                      setIsEditMembershipModalOpen(true);
                    }} className="border-none bg-transparent p-0 fw-700" style={{ color: projectId ? 'var(--app-primary)' : 'var(--app-muted-text)', cursor: projectId ? 'pointer' : 'not-allowed', textDecoration: projectId ? 'underline' : 'none' }} title={projectId ? 'Click to edit role' : 'Missing project id'}>
                      {String(t?.role || '') || '—'}
                    </button>
                  </td>
                  <td style={compactTdStyle}>
                    <div style={compactActionsStyle}>
                      <button type="button" className="app-action-button" onClick={() => teamPath && navigate(teamPath)} disabled={!teamPath} style={actionButtonStyle('primary')}>View</button>
                      <button type="button" className="app-action-button" onClick={() => {
                        if (!projectId) return;
                        setEditingMembership({ projectId, projectName: String(t?.name || 'Team'), currentRole: String(t?.role || 'viewer'), membershipId });
                        setIsEditMembershipModalOpen(true);
                      }} disabled={!projectId} style={actionButtonStyle('warning')}>Edit</button>
                      <button type="button" className="app-action-button" style={actionButtonStyle('danger')} disabled={!projectId} onClick={async () => {
                        if (!projectId) return;
                        if (!window.confirm('Remove this user from the team?')) return;
                        try { await removeProjectMembership(projectId, membershipId); } catch (e) { alert(e instanceof Error ? e.message : 'Failed to remove membership'); }
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!teamMemberships.length && <tr><td style={compactTdStyle} colSpan={4}><em className="text-muted">No team memberships.</em></td></tr>}
          </tbody>
        </Table>
      </div>
    );
  }

  return null;
}
