import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Alert, Button } from '@django-core/design-system';
import { useAuth } from '@django-core/auth-ui';
import {
  Check, Pencil, Eye, Trash2, MoreHorizontal,
} from 'lucide-react';

import { setActiveContext, getActiveContext } from '../../utils/activeContext';
import { getApiBaseUrl } from '../../utils/apiBase';
import { getCsrfToken } from '../../utils/csrf';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import { useUserRole } from '../../components/PermissionGuards';

import TeamCreditsTab from './detail/TeamCreditsTab';
import MobileTabBar from '../../components/MobileTabBar';
import { EntityEditModal } from '../../components/EntityEditModal';
import ProjectDetailModal from './ProjectDetailModal';
import { AssetsTab } from '../../components/AssetsTab';
import { KitsTab } from '../../components/KitsTab';

import { useTeamDetailData } from './useTeamDetailData';
import { useTeamTabData } from './useTeamTabData';
import { TeamOverviewTab } from './TeamOverviewTab';
import { TeamHierarchyTab } from './TeamHierarchyTab';
import { TeamSelectieTab } from './TeamSelectieTab';
import { TeamMediaTab } from './TeamMediaTab';
import s from './TeamOrganisationDetailPage.module.css';

export default function TeamOrganisationDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const { isAdmin: isGlobalAdmin } = useUserRole();

  const {
    org, club, team, setTeam, loading, error,
    orgIdForDirectoryLists, clubIdForDirectoryLists, teamIdForDirectoryLists,
    orgSlugForDirectoryLists, orgKeyForRoutes, clubKeyForRoutes, teamKeyForRoutes,
    activatingContext, setActivatingContext,
    activeContextState, setActiveContextState,
    isProjectEditModalOpen, setIsProjectEditModalOpen,
    isProjectDetailModalOpen, setIsProjectDetailModalOpen,
    brandProfileId,
    clubTeamsForSwitcherLoading,
    teamBreadcrumbOptions, handleTeamSwitch,
    backToClubHref, federationClubsHref,
    apiBaseUrl, isPlayer,
  } = useTeamDetailData();

  // ── Stack navigation: back arrow → club ──
  useSetBackNavigation({ label: club?.name || 'Club', path: backToClubHref });

  // ── Tab logic ──
  const activeTabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const tab = String(params.get('tab') || (isPlayer ? 'hierarchy' : 'overview')).trim().toLowerCase();
    const normalized = tab === 'people' || tab === 'users' ? 'members'
      : (tab === 'balance' || tab === 'transactions') ? 'credits'
      : (tab === 'seasons' || tab === 'competitions' || tab === 'matches') ? 'hierarchy'
      : (tab === 'assets' || tab === 'kits') ? 'identity'
      : tab;
    const allowed = isPlayer
      ? new Set(['overview', 'hierarchy', 'members'])
      : new Set([
          'overview', 'hierarchy',
          'members', 'media', 'identity', 'credits',
        ]);
    return allowed.has(normalized) ? normalized : 'overview';
  }, [location.search, isPlayer]);

  const makeTabHref = (tabId: string): string => {
    const params = new URLSearchParams(location.search);
    const t = String(tabId || '').trim().toLowerCase();
    const normalized = t === 'people' || t === 'users' ? 'members' : t;
    if (!normalized || normalized === 'overview') params.delete('tab');
    else params.set('tab', normalized);
    const qs = params.toString();
    return qs ? `${location.pathname}?${qs}` : location.pathname;
  };

  // ── Tab data (hierarchy + overview members) ──
  const tabData = useTeamTabData({
    activeTabFromUrl,
    apiBaseUrl,
    teamIdForDirectoryLists,
    clubIdForDirectoryLists,
    orgSlugForDirectoryLists,
    orgId: String(org?.id || ''),
    clubId: clubIdForDirectoryLists,
  });

  /* ── Derive edit mode from user's team membership role ── */
  const currentUserId = String(authUser?.id || '').trim();
  const userEditMode: 'all' | 'own' | 'none' = useMemo(() => {
    // System / Org / Club admins always get full edit access
    if (isGlobalAdmin) return 'all';

    if (!currentUserId || !tabData.fullMembers?.length) return 'none';
    const myMembership = tabData.fullMembers.find(
      (m: any) => String(m?.user?.id || '').trim() === currentUserId,
    );
    if (!myMembership) return 'none';
    const role = String(myMembership?.role || '').toLowerCase();
    if (role === 'admin') return 'all';   // Team Admin: edit any member
    if (role === 'editor') return 'none';  // Team Editor: no member editing
    return 'own';                          // Team Member (viewer): own only
  }, [currentUserId, tabData.fullMembers, isPlayer, isGlobalAdmin]);

  /* ── Overflow menu ── */
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  /* ── Identity sub-tab (Assets | Kits) ── */
  const [identitySubtab, setIdentitySubtab] = useState<'assets' | 'kits'>('assets');
  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  if (loading) {
    return (
      <div className={s.page}>
        <div className={s.headerRow}>
          <div className={s.titleBlock}><h1>Team</h1></div>
        </div>
        <div className={s.skeleton}>
          <div className={s.skeletonBar} />
          <div className={s.skeletonBarShort} />
          <div className={s.skeletonBarFull} />
          <div className={s.skeletonCard} />
          <div className={s.skeletonCard} />
        </div>
      </div>
    );
  }

  if (error || !org || !club || !team) {
    return (
      <div className={s.page}>
        <div className={s.errorBox}>
          <div className={s.errorMsg}>{error || 'Team not found'}</div>
          <button type="button" className={s.backBtn} onClick={() => navigate(backToClubHref)}>
            Terug
          </button>
        </div>
      </div>
    );
  }

  const isActive = !!team && String(activeContextState?.team?.id ?? '') === String(team.id ?? '');

  return (
    <>
      <div className={s.page}>
        {/* ── Header ── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <Link to={backToClubHref} className={s.parentLink}>
              {club?.name || 'Club'}
            </Link>
            <h1>{team.name}</h1>
            <p>{(team as any)?.team_type === 'legends' ? 'Legends Team' : 'Team'}</p>
          </div>

          <div className={s.actions}>
            <button
              type="button"
              className={`${s.activeBtn} ${isActive ? s.activeBtnOn : ''}`}
              disabled={activatingContext || isActive}
              onClick={async () => {
                if (!team || isActive) return;
                try {
                  setActivatingContext(true);
                  await setActiveContext('team', String(team.id));
                  const context = await getActiveContext();
                  setActiveContextState(context);
                } finally {
                  setActivatingContext(false);
                }
              }}
              title="Stel dit team in als actieve context"
            >
              {isActive && <Check size={14} />}
              {isActive ? 'Actief' : 'Activeren'}
            </button>

            {!isPlayer && (
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setIsProjectEditModalOpen(true)}
                title="Bewerken"
              >
                <Pencil size={16} />
              </button>
            )}

            <div className={s.overflowWrap} ref={overflowRef}>
              <button type="button" className={s.iconBtn} onClick={() => setOverflowOpen((v) => !v)} title="Meer">
                <MoreHorizontal size={16} />
              </button>
              {overflowOpen && (
                <div className={s.overflowMenu}>
                  <button type="button" onClick={() => { setIsProjectDetailModalOpen(true); setOverflowOpen(false); }}>
                    <Eye size={14} /> Bekijken
                  </button>
                  <button type="button" onClick={() => { navigate(backToClubHref); setOverflowOpen(false); }}>
                    <Eye size={14} /> Terug naar club
                  </button>
                  {!isPlayer && (
                    <button
                      type="button"
                      onClick={async () => {
                        const newType = (team as any)?.team_type === 'legends' ? 'regular' : 'legends';
                        try {
                          const res = await fetch(
                            `${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`,
                            {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                              credentials: 'include',
                              body: JSON.stringify({ team_type: newType }),
                            },
                          );
                          if (!res.ok) throw new Error('Failed');
                          setTeam((prev: any) => prev ? { ...prev, team_type: newType } : prev);
                        } catch {
                          alert('Kon team type niet opslaan');
                        }
                        setOverflowOpen(false);
                      }}
                    >
                      {(team as any)?.team_type === 'legends' ? '⚽ Maak Regulier' : '⭐ Maak Legends'}
                    </button>
                  )}
                  {!isPlayer && (
                    <button
                      type="button"
                      className={s.overflowDanger}
                      onClick={async () => {
                        if (!window.confirm(`Weet je zeker dat je team ${team.name} wilt verwijderen?`)) return;
                        try {
                          const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`, {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                            credentials: 'include',
                          });
                          if (!res.ok) throw new Error('Failed');
                          navigate(backToClubHref);
                        } catch {
                          alert('Kon team niet verwijderen');
                        }
                        setOverflowOpen(false);
                      }}
                    >
                      <Trash2 size={14} /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'hierarchy', label: 'Hierarchy' },
            { id: 'members', label: 'Selectie' },
            ...(!isPlayer ? [{ id: 'media', label: 'Media' }] : []),
            ...(!isPlayer ? [{ id: 'identity', label: 'Identity' }] : []),
            ...(!isPlayer ? [{ id: 'credits', label: 'Credits' }] : []),
          ]}
          activeTab={activeTabFromUrl}
        />

        {/* ── Tab Content ── */}
        <div className={s.tabContent}>
          {activeTabFromUrl === 'overview' && (
            <TeamOverviewTab
              hierarchySeasons={tabData.hierarchySeasons}
              hierarchyCompetitionsBySeasonId={tabData.hierarchyCompetitionsBySeasonId}
              hierarchyMatchesCountBySeasonId={tabData.hierarchyMatchesCountBySeasonId}
              hierarchyLoading={tabData.hierarchyLoading}
              hierarchyError={tabData.hierarchyError}
              overviewMembers={tabData.overviewMembers}
              overviewMembersCount={tabData.overviewMembersCount}
              overviewMembersLoading={tabData.overviewMembersLoading}
              overviewMembersError={tabData.overviewMembersError}
              orgKeyForRoutes={orgKeyForRoutes}
              clubKeyForRoutes={clubKeyForRoutes}
              teamKeyForRoutes={teamKeyForRoutes}
              team={team}
              club={club}
              org={org}
              makeTabHref={makeTabHref}
              brandAssets={tabData.brandAssets}
              assetStats={tabData.assetStats}
              fullMembersLoading={tabData.fullMembersLoading}
              contentCount={tabData.contentCount}
              contentCountLoading={tabData.contentCountLoading}
              teamMatches={tabData.teamMatches}
              teamMatchesLoading={tabData.teamMatchesLoading}
            />
          )}

          {activeTabFromUrl === 'hierarchy' && teamIdForDirectoryLists && (
            <TeamHierarchyTab
              hierarchySeasons={tabData.hierarchySeasons}
              hierarchyCompetitionsBySeasonId={tabData.hierarchyCompetitionsBySeasonId}
              hierarchyMatchesCountBySeasonId={tabData.hierarchyMatchesCountBySeasonId}
              hierarchyMatchesCountByCompetitionId={tabData.hierarchyMatchesCountByCompetitionId}
              hierarchyLoading={tabData.hierarchyLoading}
              hierarchyError={tabData.hierarchyError}
              hierarchySearch={tabData.hierarchySearch}
              setHierarchySearch={tabData.setHierarchySearch}
              teamMatchesByPeriodId={tabData.teamMatchesByPeriodId}
              teamMatchesLoading={tabData.teamMatchesLoading}
              orgKeyForRoutes={orgKeyForRoutes}
              clubKeyForRoutes={clubKeyForRoutes}
              teamKeyForRoutes={teamKeyForRoutes}
            />
          )}

          {activeTabFromUrl === 'members' && teamIdForDirectoryLists && (
            <TeamSelectieTab
              members={tabData.fullMembers}
              membersLoading={tabData.fullMembersLoading}
              memberDetailHref={!isPlayer ? (m: any) => {
                const memberId = String(m?.id || m?.user?.id || '');
                return `/${orgKeyForRoutes}/${clubKeyForRoutes}/${teamKeyForRoutes}/members/${memberId}`;
              } : undefined}
              showAdminLink={!isPlayer}
              onAdminLinkClick={!isPlayer ? () => {
                navigate(`/${orgKeyForRoutes}/${clubKeyForRoutes}/${teamKeyForRoutes}/directory`);
              } : undefined}
              apiBaseUrl={apiBaseUrl}
              teamId={teamIdForDirectoryLists}
              editMode={userEditMode}
              currentUserId={currentUserId}
              onRefresh={tabData.refreshFullMembers}
            />
          )}

          {activeTabFromUrl === 'credits' && orgIdForDirectoryLists && teamIdForDirectoryLists && (
            <TeamCreditsTab view="balance" projectId={teamIdForDirectoryLists} projectName={team.name} organisationId={orgIdForDirectoryLists} />
          )}

          {activeTabFromUrl === 'media' && team && org && (
            <TeamMediaTab
              members={tabData.fullMembers}
              membersLoading={tabData.fullMembersLoading}
            />
          )}

          {activeTabFromUrl === 'identity' && team && org && (
            <div>
              <div className={s.identityToggle}>
                <button
                  type="button"
                  className={`${s.identityToggleBtn} ${identitySubtab === 'assets' ? s.identityToggleBtnActive : ''}`}
                  onClick={() => setIdentitySubtab('assets')}
                >
                  Assets
                </button>
                <button
                  type="button"
                  className={`${s.identityToggleBtn} ${identitySubtab === 'kits' ? s.identityToggleBtnActive : ''}`}
                  onClick={() => setIdentitySubtab('kits')}
                >
                  Kits
                </button>
              </div>
              {identitySubtab === 'assets' && (
                <AssetsTab
                  level="team"
                  organisationId={String(org.id)}
                  projectId={String(team.id)}
                  parentProjectId={club ? String(club.id) : undefined}
                  entityName={team.name}
                  sponsorMode={((team as any)?.metadata?.sponsor_mode as 'club' | 'custom') || 'club'}
                  onSponsorModeChange={async (mode) => {
                    if (!team) return;
                    const csrfToken = getCsrfToken();
                    const res = await fetch(`${apiBaseUrl}/api/v1/projects/${encodeURIComponent(String(team.id))}/`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}) },
                      credentials: 'include',
                      body: JSON.stringify({ metadata: { ...((team as any)?.metadata || {}), sponsor_mode: mode } }),
                    });
                    if (res.ok) {
                      const raw = await res.json().catch(() => null);
                      const updated: any = raw?.data ?? raw;
                      setTeam((prev) => ({ ...prev, ...updated }));
                    }
                  }}
                />
              )}
              {identitySubtab === 'kits' && (
                <KitsTab
                  projectSlug={team.slug || String(team.id)}
                  projectName={team.name}
                  brandProfileId={brandProfileId}
                  orgId={String(org.id)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <ProjectDetailModal
        opened={isProjectDetailModalOpen}
        onClose={() => setIsProjectDetailModalOpen(false)}
        project={team}
      />

      <EntityEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSaved={() => window.location.reload()}
        entityType="team"
        entityId={team?.slug || team?.id || ''}
        entityName={team?.name}
        organisationId={String(org?.id || '')}
        projectId={team?.slug || team?.id}
        initialEntityData={team ? {
          id: String(team.id),
          name: team.name || '',
          slug: team.slug,
          description: (team as any).description,
          is_active: (team as any).is_active ?? true,
        } : undefined}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </>
  );
}
