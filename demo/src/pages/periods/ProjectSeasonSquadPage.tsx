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

import { SkeletonList } from '../../components/Skeleton';
import SmartEmptyState from '../../components/SmartEmptyState';
import { Table } from '../../shims/design-system';
import PeriodEditModal from '../identity/PeriodEditModal';
import { periodPathKey } from '../../utils/periodPath';
import { routes } from '../../routes';

import { useSquadPageData } from './useSquadPageData';
import { MemberRoleEditModal, readFunctionalRoles } from '@/components/MemberRoleEditModal';
import styles from './ProjectSeasonSquadPage.module.css';

export default function ProjectSeasonSquadPage() {
  const d = useSquadPageData();

  const breadcrumbs = useMemo(() => {
    const orgCrumb = d.organisation
      ? { label: d.organisation.name, onClick: () => d.navigate(routes.orgDetailLegacy({ orgId: d.organisation!.slug || d.organisation!.id })) }
      : { label: 'Federation' };

    const clubCrumb = d.clubProject
      ? { label: d.clubProject.name, onClick: () => d.navigate(routes.orgProjectDetailLegacy({ orgId: d.orgSlugOrId, projectId: d.clubProject!.slug || d.clubProject!.id })) }
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
      { label: 'Dashboard', onClick: () => d.navigate(routes.dashboard()) },
      orgCrumb,
      ...(clubCrumb ? [clubCrumb] : []),
      projectCrumb,
      {
        label: (
          <BreadcrumbContextSwitcher
            currentId={String(d.resolvedSeasonId || d.season?.id || '')}
            options={d.seasonsForSwitcher.map((s) => ({
              id: String(s.id),
              label: String(s.name || s.slug || s.id),
              slug: periodPathKey(s) || String(s.id),
            }))}
            onSelect={d.handleSeasonSwitch}
            hasDropdown={d.seasonsForSwitcher.length > 1}
          />
        ),
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
            <div className={styles.actionsWrap}>
              <button
                onClick={() => d.navigate(`${d.seasonsBasePath}/${periodPathKey(d.season || {}) || d.resolvedSeasonId || d.effectiveSeasonId}`)}
                className={styles.actionBtn}
              >
                Back to season
              </button>
              {d.userCanEditProject && d.season && (
                <button
                  onClick={() => { d.setSelectedEditPeriod(d.season); d.setIsPeriodEditModalOpen(true); }}
                  className={styles.actionBtn}
                  data-variant="edit"
                >
                  Edit
                </button>
              )}
              {d.userCanDeleteProject && d.season && (
                <button
                  onClick={d.deleteSeason}
                  className={styles.actionBtn}
                  data-variant="delete"
                >
                  Delete
                </button>
              )}
            </div>
          }
        />

        <PageContent>
          {d.loading && <SkeletonList count={5} variant="row" />}
          {!d.loading && d.error && <Alert variant="error">{d.error}</Alert>}

          {!d.loading && !d.error && (
            <>
              {/* Tabs */}
              <div className={styles.tabBar}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    className={styles.tabBtn}
                    data-active={tab.id === 'squad' || undefined}
                    disabled={tab.id === 'squad'}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Members Table */}
              <Card>
                <div className={styles.cardPaddingTop}>
                  <div className="flex-row gap-12 flex-wrap">
                    <h3 className="m-0 fs-16 fw-600">Players & Staff</h3>
                    <Badge variant="info">{d.members.length} members</Badge>
                  </div>
                  <div className="mt-4 text-muted fs-13">Season-scoped roster (filtered by period).</div>
                </div>

                <div className="p-16">
                  <div className="overflow-x-auto">
                    <Table className="detail-table">
                      <thead>
                        <tr>
                          <th className="detail-th">Name</th>
                          <th className="detail-th">Email</th>
                          <th className="detail-th">Access</th>
                          <th className="detail-th">Functional</th>
                          <th className="detail-th">Position</th>
                          <th className="detail-th">#</th>
                          <th className="detail-th text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.members.map((m) => {
                          const user = (m.user || m) as { id?: string | number; name?: string; first_name?: string; last_name?: string; email?: string };
                          const name = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || '—';
                          const email = user.email || '—';

                          const normalizeAccessRole = (raw: unknown): 'viewer' | 'editor' | 'admin' => {
                            const r = String(raw || '').trim().toLowerCase();
                            if (r === 'admin') return 'admin';
                            if (r === 'editor') return 'editor';
                            if (r === 'viewer') return 'viewer';
                            if (['coach', 'trainer'].includes(r)) return 'editor';
                            if (['manager', 'owner'].includes(r)) return 'admin';
                            return 'viewer';
                          };

                          const functionalRoles = readFunctionalRoles(m);
                          const role = normalizeAccessRole(m.role || 'viewer');
                          const position = String(m.metadata?.position || '—');
                          const shirtNumber = String(m.metadata?.shirt_number ?? '');
                          const membershipId = m.id;
                          const userId = user?.id;

                          return (
                            <tr key={String(membershipId || user.id)}>
                              <td className="detail-td-text">
                                {userId ? (
                                  <Link to={routes.userDetail({ userId: String(userId) })} className={`text-blue-600 hover:underline ${styles.noUnderline}`}>{name}</Link>
                                ) : name}
                              </td>
                              <td className="detail-td-text">{email}</td>
                              <td className="detail-td">
                                <Badge variant={role === 'admin' ? 'warning' : 'default'}>{role}</Badge>
                              </td>
                              <td className="detail-td">
                                {functionalRoles.length ? (
                                  <div className="flex-row gap-6 flex-wrap">
                                    {functionalRoles.map((r: string) => <Badge key={r} variant="default">{r}</Badge>)}
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="detail-td-text">{position}</td>
                              <td className="detail-td">{shirtNumber || '—'}</td>
                              <td className="detail-td">
                                <div className="detail-actions">
                                  {userId ? (
                                    <button onClick={() => d.navigate(routes.userDetail({ userId: String(userId) }))} className="action-btn action-btn-primary">Bekijken</button>
                                  ) : <span className="text-muted">—</span>}
                                  {d.userCanEditProject && (
                                    <button onClick={() => { d.setSelectedMembership(m); d.setIsMembershipEditModalOpen(true); }} className="action-btn action-btn-warning">Bewerken</button>
                                  )}
                                  {d.userCanDeleteProject && (
                                    <button onClick={() => d.deleteMembership(m)} className="action-btn action-btn-danger">Verwijderen</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {d.members.length === 0 && (
                          <tr>
                            <td colSpan={7} className={`detail-td ${styles.emptyRow}`}>
                              <SmartEmptyState type="members" compact hideActions />
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

        <MemberRoleEditModal
          opened={d.isMembershipEditModalOpen}
          member={d.selectedMembership}
          onClose={() => { d.setIsMembershipEditModalOpen(false); d.setSelectedMembership(null); }}
          onSave={d.saveMembershipEdit}
        />
      </div>
    </>
  );
}
