import { useState, useCallback } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { PullToRefresh } from '@django-core/design-system';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  ActiveMatchCard,
  ContentCarousel,
  HeroBanner,
  MatchesCard,
  SquadReadinessCard,
  AIQueueCard,
  CreditsTrendCard,
  OrgStatsCard,
  ContentProgressCard,
  ContentPipelineCard,
  ContentStreakWidget,
  NextStepCard,
  SeasonProgressCard,
  MediaReadinessCard,
} from '../components/dashboard';
import { SmartActionsCard } from '../components/dashboard/SmartActionsCard';
import { useUserRole } from '../components/PermissionGuards';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { usePreloadRoutes } from '../hooks/usePreloadRoutes';
import { useClosestMatch } from '../hooks/useClosestMatch';
import { useContentStreak } from '../hooks/useContentStreak';
import { useMatchDayMode } from '../hooks/useMatchDayMode';
import { CONTENT_TYPES } from './identity/ContentGenerationModal';
import { useSetNavTitle } from '../providers/BackNavigationProvider';
import { useBrandProfile } from '../hooks/useBrandProfile';
import { Avatar } from '../components/ui/Avatar';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  useSetNavTitle('Home');
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation;
  const project = context.project;
  const hasProjectContext = !!project;

  // Preload likely next destinations from dashboard
  usePreloadRoutes([
    () => import('./identity/DirectoryPage'),
    () => import('./identity/SeasonDetailPage'),
    () => import('./activities/MatchDetailWrapper'),
    () => import('./aistudio/AIStudioPage'),
    () => import('./ApprovalsPage'),
  ]);

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    org?.slug,
    org?.id?.toString(),
  );

  // ── Match-day mode (H4) ──
  const { data: matchData } = useClosestMatch(project?.id);
  const activeMatch = matchData?.match ?? null;
  const totalContentItems =
    (CONTENT_TYPES.pre_match?.items.length ?? 0) +
    (CONTENT_TYPES.during_match?.items.length ?? 0) +
    (CONTENT_TYPES.post_match?.items.length ?? 0);
  const matchDay = useMatchDayMode(
    activeMatch,
    matchData?.contentDoneSubtypes ?? [],
    totalContentItems,
  );

  // ── Content streak ──
  const { data: streakData, isLoading: streakLoading } = useContentStreak(
    project?.id,
    activeMatch?.id,
  );

  // ── Role tiers ──
  const { isSystemAdmin, isLandAdmin, isOrgAdmin, isCoach, isPlayer, isSupporter } = useUserRole();

  // ── Club branding ──
  const { getAssetUrl: getClubAssetUrl } = useBrandProfile({
    organisationId: org?.id?.toString(),
    projectId: project?.id,
  });
  const clubLogoUrl = getClubAssetUrl('club_logo');
  const isOrgLevel = isSystemAdmin || isLandAdmin || isOrgAdmin;
  const isMemberLevel = isPlayer || isSupporter;
  const isTeamScope = hasProjectContext;

  // ── Subtitle: show date instead of org name ──
  const todayStr = new Date().toLocaleDateString('nl-NL', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // Pull-to-refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(async () => {
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullText="Trek om te vernieuwen"
      releaseText="Laat los om te vernieuwen"
      refreshingText="Vernieuwen..."
    >
      <div key={refreshKey} className={styles.page}>

        {/* ── Hero Banner (always shown — switches to match-day mode) ── */}
        <HeroBanner matchDay={matchDay} activeMatch={activeMatch} />

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className={styles.header}>
          {matchDay.isMatchDay ? (
            <div className={styles.matchDayHeader}>
              <p className={styles.matchDaySubtitle}>
                {activeMatch?.title || 'Wedstrijd'}{activeMatch?.location ? ` · ${activeMatch.location}` : ''}
              </p>
            </div>
          ) : (
            <div className={styles.headerBranding}>
              <Avatar
                src={clubLogoUrl}
                name={project?.name || org?.name}
                size="md"
                alt={`${project?.name || org?.name || 'Club'} logo`}
              />
              <div>
                <h1 className={styles.greeting}>
                  Welkom, {user?.first_name || 'there'}
                </h1>
                <p className={styles.orgSubtitle}>
                  {todayStr}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Low balance banner (org admins only) ──────────────── */}
        {isOrgLevel && lowBalanceAlert && (
          <div className={styles.lowBanner}>
            <AlertTriangle size={18} />
            <div className={styles.lowBannerText}>
              <strong>Laag tegoed</strong>
              Nog {balance} credits (drempel: {threshold}).
            </div>
            <button className={styles.lowBannerBtn} onClick={() => navigate('/credits')}>
              Opwaarderen
            </button>
          </div>
        )}

        {/* ── Main layout ────────────────────────────────────────── */}
        <div className={styles.mainCol}>

          {/* 0. Content Streak — prominent position under hero */}
          {streakData && (
            <ContentStreakWidget
              streak={streakData}
              hasHistory={streakData.totalMatchesChecked >= 2}
              loading={streakLoading}
              onAction={activeMatch ? () => navigate(`/matches/${activeMatch.id}?tab=content`) : undefined}
            />
          )}

          {/* 1. Active Match */}
          {matchDay.isMatchDay && <div className={styles.matchDayActiveMatch}><ActiveMatchCard /></div>}
          {!matchDay.isMatchDay && <ActiveMatchCard />}

          {/* 2. Next step suggestion — context-aware guidance */}
          <NextStepCard />

          {/* 3. Matches — upcoming/past with tab switcher */}
          <MatchesCard />

          {/* 4. Content Pipeline — processing → review → approved */}
          <ContentPipelineCard />

          {/* 5. Content Carousel — recent generated content */}
          <ContentCarousel />

          {/* 6. Compact status row — only unique-value cards */}
          <div className={styles.summaryGrid}>
            {!isMemberLevel && <SquadReadinessCard />}
            {!isMemberLevel && <AIQueueCard />}
            {isOrgLevel && <CreditsTrendCard />}
            {isOrgLevel && !isTeamScope && <OrgStatsCard />}
          </div>

          {/* 7. Content progress (merged breakdown + inventory) */}
          <ContentProgressCard />

          {/* 8. Season progress — matches played, content generated */}
          <SeasonProgressCard />

          {/* 9. Smart contextual quick actions */}
          <SmartActionsCard />

          {/* 10. Media readiness (Club · Team · Members hierarchy) */}
          {!isMemberLevel && <MediaReadinessCard />}
        </div>
      </div>
    </PullToRefresh>
  );
}
