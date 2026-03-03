/**
 * ProjectSeasonSquadPage — season-scoped roster view.
 *
 * Orchestrates:
 *  - useSquadPageData (state, fetch, permissions, breadcrumbs, mutations)
 *  - MembershipEditModal (edit access + functional roles)
 *  - PeriodEditModal (edit season metadata)
 */
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card } from '@django-core/design-system';
import { BreadcrumbContextSwitcher, PageContent, PageHeader } from '@django-core/page-templates';

import LoadingState from '../../components/LoadingState';
import { Table } from '../../shims/design-system';
import PeriodEditModal from '../identity/PeriodEditModal';
import {
  actionButtonStyle,
  compactActionsStyle,
  compactTableStyle,
  compactTdStyle,
  compactTextTdStyle,
  compactThStyle,
} from '../identity/detail/detailStyles';
import { periodPathKey } from '../../utils/periodPath';

import { useSquadPageData } from './useSquadPageData';
import { MembershipEditModal, readFunctionalRolesFromMembership } from './MembershipEditModal';

export default function ProjectSeasonSquadPage() {
  const d = useSquadPageData();

  const breadcrumbs = useMemo(() => {
    const orgCrumb = d.organisation
      ? { label: d.organisation.name, onClick: () => d.navigate(`/organisations/${d.organisation!.slug || d.organisation!.id}`) }
      : { label: 'Federation' };

    const clubCrumb = d.clubProject
      ? { label: d.clubProject.name, onClick: () => d.navigate(`/organisations/${d.orgSlugOrId}/projects/${d.clubProject!.slug || d.clubProject!.id}`) }
      : null;

    const projectCrumb = d.project
      ? {
          label: d.project.name,
          onClick: () =>
            d.navigate(
              d.isTeamRoute
                ? `/organisations/${d.orgSlugOrId}/projects/${d.clubSlugOrId}/teams/${d.project!.slug || d.project!.id}`
                : `/organisations/${d.orgSlugOrId}/projects/${d.project!.slug || d.project!.id}`,
            ),
        }
      : { label: 'Team' };

    return [
      { label: 'Dashboard', onClick: () => d.navigate('/dashboard') },
      orgCrumb,
      ...(clubCrumb ? [clubCrumb] : []),
      projectCrumb,
      {
        label: (
          <BreadcrumbContextSwitcher
            currentId={String(d.resolvedSeasonId || (d.season as any)?.id || '')}
            options={d.seasonsForSwitcher.map((s) => ({
              id: String(s.id),
              label: String(s.name || (s as any).slug || s.id),
              slug: periodPathKey(s) || String(s.id),
            }))}
            onSelect={d.handleSeasonSwitch}
            hasDropdown={d.seasonsForSwitcher.length > 1}
          />
        ) as any,
        current: true,
      },
    ];
  }, [d.clubProject, d.clubSlugOrId, d.isTeamRoute, d.navigate, d.orgSlugOrId, d.organisation, d.project, d.season, d.resolvedSeasonId, d.seasonsForSwitcher]);

  const title = d.season ? `${d.season.name} Squad` : 'Squad';
  const seasonKey = d.seasonKeyOrId;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'hierarchy', label: 'Hierarchy' },
    { id: 'competitions', label: 'Competitions' },
    { id: 'matches', label: 'Matches' },
    { id: 'squad', label: 'Squad' },
  ];

  const navigateToTab = (tabId: string) => {
    if (!seasonKey || tabId === 'squad') return;
    d.navigate(`${d.seasonsBasePath}/${seasonKey}?tab=${encodeURIComponent(tabId)}`);
  };

  return (
    <>
      <div>
        <PageHeader
          title={title}
          breadcrumbs={breadcrumbs}
          actions={
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => d.navigate(`${d.seasonsBasePath}/${periodPathKey(d.season || {}) || d.resolvedSeasonId || d.effectiveSeasonId}`)}
                style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
              >
                Back to season
              </button>
              {d.userCanEditProject && d.season && (
                <button
                  onClick={() => { d.setSelectedEditPeriod(d.season); d.setIsPeriodEditModalOpen(true); }}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #fd7e14', backgroundColor: 'var(--app-surface)', color: '#fd7e14', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                >
                  Edit
                </button>
              )}
              {d.userCanDeleteProject && d.season && (
                <button
                  onClick={d.deleteSeason}
                  style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #dc3545', backgroundColor: 'var(--app-surface)', color: '#dc3545', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                >
                  Delete
                </button>
              )}
            </div>
          }
        />

        <PageContent>
          {d.loading && <LoadingState message="Loading squad..." />}
          {!d.loading && d.error && <Alert variant="error">{d.error}</Alert>}

          {!d.loading && !d.error && (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--app-border)', marginBottom: '20px', flexWrap: 'wrap' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '6px 6px 0 0',
                      border: '1px solid var(--app-border)',
                      borderBottom: tab.id === 'squad' ? '1px solid var(--app-surface)' : '1px solid var(--app-border)',
                      backgroundColor: tab.id === 'squad' ? 'var(--app-surface)' : 'var(--app-surface-2)',
                      color: 'var(--app-text)',
                      cursor: tab.id === 'squad' ? 'default' : 'pointer',
                      fontSize: '13px',
                      fontWeight: tab.id === 'squad' ? 600 : 500,
                      opacity: tab.id === 'squad' ? 1 : 0.9,
                    }}
                    disabled={tab.id === 'squad'}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Members Table */}
              <Card>
                <div style={{ padding: '16px 16px 0 16px' }}>
                  <div className="flex-row gap-12 flex-wrap">
                    <h3 className="m-0 fs-16 fw-600">Players & Staff</h3>
                    <Badge variant="info">{d.members.length} members</Badge>
                  </div>
                  <div className="mt-4 text-muted fs-13">Season-scoped roster (filtered by period).</div>
                </div>

                <div className="p-16">
                  <div className="overflow-x-auto">
                    <Table style={compactTableStyle}>
                      <thead>
                        <tr>
                          <th style={compactThStyle}>Name</th>
                          <th style={compactThStyle}>Email</th>
                          <th style={compactThStyle}>Access</th>
                          <th style={compactThStyle}>Functional</th>
                          <th style={compactThStyle}>Position</th>
                          <th style={compactThStyle}>#</th>
                          <th style={compactThStyle} className="text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.members.map((m: any) => {
                          const user = m.user || m;
                          const name = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '—';
                          const email = user.email || '—';

                          const normalizeAccessRole = (raw: any): 'viewer' | 'editor' | 'admin' => {
                            const r = String(raw || '').trim().toLowerCase();
                            if (r === 'admin') return 'admin';
                            if (r === 'editor') return 'editor';
                            if (r === 'viewer') return 'viewer';
                            if (['coach', 'trainer'].includes(r)) return 'editor';
                            if (['manager', 'owner'].includes(r)) return 'admin';
                            return 'viewer';
                          };

                          const functionalRoles = readFunctionalRolesFromMembership(m);
                          const role = normalizeAccessRole(m.role || 'viewer');
                          const position = m.metadata?.position || '—';
                          const shirtNumber = m.metadata?.shirt_number ?? '';
                          const membershipId = m.id;
                          const userId = user?.id;

                          return (
                            <tr key={String(membershipId || user.id)}>
                              <td style={compactTextTdStyle}>
                                {userId ? (
                                  <Link to={`/users/${userId}`} className="text-blue-600 hover:underline" style={{ textDecoration: 'none' }}>{name}</Link>
                                ) : name}
                              </td>
                              <td style={compactTextTdStyle}>{email}</td>
                              <td style={compactTdStyle}>
                                <Badge variant={role === 'admin' ? 'warning' : 'default'}>{role}</Badge>
                              </td>
                              <td style={compactTdStyle}>
                                {functionalRoles.length ? (
                                  <div className="flex-row gap-6 flex-wrap">
                                    {functionalRoles.map((r: string) => <Badge key={r} variant="default">{r}</Badge>)}
                                  </div>
                                ) : '—'}
                              </td>
                              <td style={compactTextTdStyle}>{position}</td>
                              <td style={compactTdStyle}>{shirtNumber || '—'}</td>
                              <td style={compactTdStyle}>
                                <div style={compactActionsStyle}>
                                  {userId ? (
                                    <button onClick={() => d.navigate(`/users/${userId}`)} style={actionButtonStyle('primary')}>View</button>
                                  ) : <span style={{ color: 'var(--app-muted-text)' }}>—</span>}
                                  {d.userCanEditProject && (
                                    <button onClick={() => { d.setSelectedMembership(m); d.setIsMembershipEditModalOpen(true); }} style={actionButtonStyle('warning')}>Edit</button>
                                  )}
                                  {d.userCanDeleteProject && (
                                    <button onClick={() => d.deleteMembership(m)} style={actionButtonStyle('danger')}>Delete</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {d.members.length === 0 && (
                          <tr>
                            <td colSpan={7} style={{ ...compactTdStyle, textAlign: 'center', padding: '24px' }}>
                              No members found for this season.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </div>
              </Card>
            </>
          )}
        </PageContent>

        <PeriodEditModal
          opened={d.isPeriodEditModalOpen}
          onClose={() => d.setIsPeriodEditModalOpen(false)}
          period={d.selectedEditPeriod}
          showSportVariant={false}
          onSave={d.savePeriodEdit}
        />

        <MembershipEditModal
          opened={d.isMembershipEditModalOpen}
          membership={d.selectedMembership}
          onClose={() => { d.setIsMembershipEditModalOpen(false); d.setSelectedMembership(null); }}
          onSave={d.saveMembershipEdit}
        />
      </div>
    </>
  );
}
