/**
 * HubTeamOnlyView — Hub-style page for teams that have no seasons yet.
 *
 * Rendered by TeamDetailPage's TeamSeasonRedirect as fallback when a team
 * has 0 seasons. Uses useTeamDetailData + useTeamTabData (no SeasonProvider).
 *
 * RBAC tab visibility:
 *   Supporter → Overview (1)
 *   Player   → Overview, Selectie (2)
 *   Admin    → Overview, Selectie, Beheer (3)
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Pencil, Calendar, Users, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@django-core/auth-ui';
import { useUserRole } from '../../components/PermissionGuards';
import { ShareButton } from '../../components/ShareButton';
import MobileTabBar from '../../components/MobileTabBar';
import { EntityEditModal } from '../../components/EntityEditModal';
import { CreateWizardProvider } from '../../components/CreateWizard/CreateWizardContext';
import { PeriodCreateFlow } from '../../components/CreateWizard/flows/PeriodCreateFlow';
import { ListSection } from '../../components/ListSection';
import { useTeamDetailData } from './useTeamDetailData';
import { useTeamTabData } from './useTeamTabData';
import { TeamSelectieTab } from './TeamSelectieTab';
import { TeamBeheerTab } from './TeamBeheerTab';
import { periodPathKey } from '../../utils/periodPath';
import { getApiV1BaseUrl } from '../../utils/apiFetch';
import type { MemberRecord } from './teamSelectieHelpers';
import s from './HubTeamOnlyView.module.css';
import { routes } from '../../routes';

export default function HubTeamOnlyView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const { isPlayer, isSupporter, isAdmin: isGlobalAdmin } = useUserRole();
  const isAdmin = !isPlayer && !isSupporter;

  const {
    org, club, team, setTeam, loading, error,
    orgIdForDirectoryLists, clubIdForDirectoryLists, teamIdForDirectoryLists,
    orgSlugForDirectoryLists, orgKeyForRoutes, clubKeyForRoutes, teamKeyForRoutes,
    isProjectEditModalOpen, setIsProjectEditModalOpen,
    isProjectDetailModalOpen, setIsProjectDetailModalOpen,
    brandProfileId,
    backToClubHref,
    apiBaseUrl,
    refetch,
  } = useTeamDetailData();

  // ── Season creation state ──
  const [isSeasonCreateOpen, setIsSeasonCreateOpen] = useState(false);

  // Redirect to 4-seg hub after season creation
  useEffect(() => {
    const handler = async () => {
      try {
        const apiV1 = getApiV1BaseUrl();
        const url = `${apiV1}/periods/?project_id=${encodeURIComponent(teamIdForDirectoryLists)}&parent_id=null&page_size=5&ordering=-created_at`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        const results: Record<string, unknown>[] = data?.results || data || [];
        const season = results[0];
        if (season) {
          const key = periodPathKey(season as { name?: string; slug?: string; id?: string | number })
            || String((season as { id?: string }).id || '');
          if (key) {
            navigate(`/${orgKeyForRoutes}/${clubKeyForRoutes}/${teamKeyForRoutes}/${encodeURIComponent(key)}`);
          }
        }
      } catch { /* ignore — user stays on team-only view */ }
    };
    window.addEventListener('teamreel:queue-update', handler);
    return () => window.removeEventListener('teamreel:queue-update', handler);
  }, [teamIdForDirectoryLists, orgKeyForRoutes, clubKeyForRoutes, teamKeyForRoutes, navigate]);

  // ── Active tab (RBAC-gated) ──
  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    const raw = String(params.get('tab') || 'overview').trim().toLowerCase();
    const ALIAS: Record<string, string> = {
      people: 'selectie', users: 'selectie', members: 'selectie',
      squad: 'selectie', team: 'selectie',
      assets: 'beheer', transactions: 'beheer', credits: 'beheer',
      competitions: 'beheer', workflow: 'beheer', settings: 'beheer',
    };
    const aliased = ALIAS[raw] ?? raw;
    const allowed = isSupporter
      ? new Set(['overview'])
      : isPlayer
        ? new Set(['overview', 'selectie'])
        : new Set(['overview', 'selectie', 'beheer']);
    return allowed.has(aliased) ? aliased : 'overview';
  }, [location.search, isPlayer, isSupporter]);

  // ── Redirect stale tab URLs to their normalized equivalents ──
  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const raw = params.get('tab');
    if (!raw) return;
    const tabTarget = activeTab === 'overview' ? undefined : activeTab;
    if (raw !== tabTarget) {
      const next = new URLSearchParams(location.search);
      if (!tabTarget) next.delete('tab');
      else next.set('tab', tabTarget);
      const qs = next.toString();
      navigate(qs ? `${location.pathname}?${qs}` : location.pathname, { replace: true });
    }
  }, [activeTab, location.search, location.pathname, navigate]);

  // ── Tab data (hierarchy + members) ──
  const tabData = useTeamTabData({
    activeTabFromUrl: activeTab === 'selectie' ? 'members' : activeTab,
    apiBaseUrl,
    teamIdForDirectoryLists,
    clubIdForDirectoryLists,
    orgSlugForDirectoryLists,
    orgId: String(org?.id || ''),
    clubId: clubIdForDirectoryLists,
  });

  // ── Edit mode for member editing ──
  const currentUserId = String(authUser?.id || '').trim();
  const userEditMode: 'all' | 'own' | 'none' = useMemo(() => {
    if (isGlobalAdmin) return 'all';
    if (!currentUserId || !tabData.fullMembers?.length) return 'none';
    const myMembership = tabData.fullMembers.find(
      (m) => String(m?.user?.id || '').trim() === currentUserId,
    );
    if (!myMembership) return 'none';
    const role = String(myMembership?.role || '').toLowerCase();
    if (role === 'admin') return 'all';
    if (role === 'editor') return 'none';
    return 'own';
  }, [currentUserId, tabData.fullMembers, isGlobalAdmin]);

  // ── Loading ──
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

  // ── Error: redirect to club hub instead of showing error page ──
  if (error || !org || !club || !team) {
    return <Navigate to={backToClubHref} replace />;
  }

  return (
    <>
      <div className={s.page}>
        {/* ── Header (hub-style: no ← Club back, no SeasonSwitcher) ── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <h1>{team.name || 'Team'}</h1>
            <span className={s.noSeasonBadge}>Nog geen seizoen</span>
          </div>
          <div className={s.actions}>
            {isAdmin && (
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setIsProjectEditModalOpen(true)}
                title="Team bewerken"
              >
                <Pencil size={16} />
              </button>
            )}
            <ShareButton compact className={s.shareBtn} />
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className={s.mobileTabBarWrap}>
          <MobileTabBar
            tabs={[
              { id: 'overview', label: 'Overview' },
              ...(!isSupporter ? [{ id: 'selectie', label: 'Selectie' }] : []),
              ...(isAdmin ? [{ id: 'beheer', label: 'Beheer' }] : []),
            ]}
            activeTab={activeTab}
          />
        </div>

        {/* ── Tab Content ── */}
        <div className={s.tabContent}>
          {/* Overview — team info + season CTA */}
          {activeTab === 'overview' && (
            <>
              {/* Team info */}
              <ListSection title="Team info">
                {club && (
                  <ListSection.Row
                    icon={Shield}
                    label="Club"
                    value={club.name || ''}
                  />
                )}
                {team.description && (
                  <ListSection.Row
                    label="Beschrijving"
                    value={team.description}
                  />
                )}
                <ListSection.Row
                  icon={Users}
                  label="Leden"
                  value={String(tabData.overviewMembersCount ?? tabData.fullMembers?.length ?? 0)}
                  onTap={!isSupporter ? () => navigate(`${location.pathname}?tab=selectie`) : undefined}
                />
              </ListSection>

              {/* Asset status */}
              {tabData.brandAssets.length > 0 && (
                <ListSection title="Asset status">
                  {tabData.brandAssets.map((a) => (
                    <ListSection.Row
                      key={a.label}
                      icon={a.present ? CheckCircle : AlertCircle}
                      label={a.label}
                      value={a.present ? 'Aanwezig' : 'Ontbreekt'}
                    />
                  ))}
                </ListSection>
              )}

              {/* Season creation CTA (admin only) */}
              {isAdmin && (
                <div className={s.seasonCta}>
                  <Calendar size={40} className={s.seasonCtaIcon} aria-hidden="true" />
                  <p className={s.seasonCtaTitle}>Start je eerste seizoen</p>
                  <p className={s.seasonCtaText}>
                    Maak een seizoen aan om wedstrijden, competities en content
                    voor dit team te beheren.
                  </p>
                  <button
                    type="button"
                    className={s.seasonCtaBtn}
                    onClick={() => setIsSeasonCreateOpen(true)}
                  >
                    <Calendar size={16} />
                    Seizoen aanmaken
                  </button>
                </div>
              )}
            </>
          )}

          {/* Selectie — team members */}
          {activeTab === 'selectie' && !isSupporter && teamIdForDirectoryLists && (
            <TeamSelectieTab
              members={tabData.fullMembers as unknown as MemberRecord[]}
              membersLoading={tabData.fullMembersLoading}
              memberDetailHref={isAdmin ? (m) => {
                const memberId = String(m?.id || m?.user?.id || '');
                return `/${orgKeyForRoutes}/${clubKeyForRoutes}/${teamKeyForRoutes}/members/${memberId}`;
              } : undefined}
              showAdminLink={isAdmin}
              onAdminLinkClick={isAdmin ? () => {
                navigate(`${routes.team({ orgId: orgKeyForRoutes, clubId: clubKeyForRoutes, projectId: teamKeyForRoutes })}/directory`);
              } : undefined}
              apiBaseUrl={apiBaseUrl}
              teamId={teamIdForDirectoryLists}
              editMode={userEditMode}
              currentUserId={currentUserId}
              onRefresh={tabData.refreshFullMembers}
            />
          )}

          {/* Beheer — admin only */}
          {activeTab === 'beheer' && isAdmin && orgIdForDirectoryLists && teamIdForDirectoryLists && (
            <div className={s.beheerSections}>
              <section className={s.beheerSection}>
                <h2 className={s.beheerSectionTitle}>Team instellingen</h2>
                <TeamBeheerTab
                  org={org}
                  team={team}
                  setTeam={setTeam}
                  brandProfileId={brandProfileId ?? undefined}
                  club={club}
                  organisationId={orgIdForDirectoryLists}
                  teamId={teamIdForDirectoryLists}
                />
              </section>
            </div>
          )}
        </div>
      </div>

      {/* ── Season creation wizard ── */}
      <CreateWizardProvider
        initialFlow="season"
        initialPrefill={{
          organisationId: String(org?.id || ''),
          organisationSlug: orgKeyForRoutes,
          clubProjectId: String(club?.id || ''),
          clubName: club?.name || '',
          teamProjectId: String(team?.id || ''),
          teamName: team?.name || '',
        }}
      >
        <PeriodCreateFlow
          isOpen={isSeasonCreateOpen}
          onClose={() => setIsSeasonCreateOpen(false)}
        />
      </CreateWizardProvider>

      <EntityEditModal
        isOpen={isProjectEditModalOpen}
        onClose={() => setIsProjectEditModalOpen(false)}
        onSaved={() => refetch()}
        entityType="team"
        entityId={team?.slug || team?.id || ''}
        entityName={team?.name}
        organisationId={String(org?.id || '')}
        projectId={team?.slug || team?.id}
        initialEntityData={team ? {
          id: String(team.id),
          name: team.name || '',
          slug: team.slug,
          description: team.description,
          is_active: team.is_active ?? true,
        } : undefined}
        canEditGeneral={true}
        canEditBrand={true}
      />
    </>
  );
}
