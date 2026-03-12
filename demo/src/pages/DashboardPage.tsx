import { useState, useCallback } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { PullToRefresh } from '@django-core/design-system';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  ActiveMatchCard,
  SquadReadinessCard,
  UpcomingMatchesCard,
  AIQueueCard,
  CreditsTrendCard,
  OrgStatsCard,
  ContentBreakdownCard,
  MemberContentProgressCard,
  ContentOverviewCard,
  AssetsOverviewCard,
} from '../components/dashboard';
import { SmartActionsCard } from '../components/dashboard/SmartActionsCard';
import { useUserRole } from '../components/PermissionGuards';
import { ActivityFeed } from '../components/ActivityFeed/ActivityFeed';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { usePreloadRoutes } from '../hooks/usePreloadRoutes';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
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
  ]);

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    org?.slug,
    org?.id?.toString(),
  );

  // ── Role tiers ──
  const { isSystemAdmin, isLandAdmin, isOrgAdmin, isCoach, isPlayer, isSupporter } = useUserRole();
  const isOrgLevel = isSystemAdmin || isLandAdmin || isOrgAdmin;
  const isMemberLevel = isPlayer || isSupporter;
  const isTeamScope = hasProjectContext;

  // Pull-to-refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(async () => {
    setRefreshKey(k => k + 1);
  }, []);

  // Activity filter scope
  const isSuperadmin =
    Boolean(user?.is_superuser) ||
    String(user?.role || '').toLowerCase() === 'superadmin';

  const activityFilterProps = isSuperadmin
    ? {}
    : hasProjectContext
      ? { projectId: context.project?.id?.toString() }
      : { organisationId: org?.id?.toString() };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullText="Trek om te vernieuwen"
      releaseText="Laat los om te vernieuwen"
      refreshingText="Vernieuwen..."
    >
      <div key={refreshKey} className={styles.page}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.greeting}>
              Welkom, {user?.first_name || 'there'}
            </h1>
            <p className={styles.orgSubtitle}>
              {project ? project.name : org ? org.name : 'Selecteer een organisatie'}
            </p>
          </div>
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
        <div className={styles.twoCol}>
          <div className={styles.mainCol}>

            {/* 1. Active Match — the match closest to now */}
            <ActiveMatchCard />

            {/* 2. Compact status row — only unique-value cards */}
            <div className={styles.summaryGrid}>
              {!isMemberLevel && <SquadReadinessCard />}
              {!isMemberLevel && <AIQueueCard />}
              {isOrgLevel && <CreditsTrendCard />}
            </div>

            {/* 3. Content breakdown with progress bars */}
            <ContentBreakdownCard />

            {/* 3b. Content overview — full inventory */}
            <ContentOverviewCard />

            {/* 4. Smart contextual quick actions */}
            <SmartActionsCard />

            {/* 5. Member content progress */}
            {!isMemberLevel && <MemberContentProgressCard />}

            {/* 5b. Asset inventory — team & member assets */}
            {!isMemberLevel && <AssetsOverviewCard />}

            {/* 6. Upcoming Matches (compact list) */}
            <UpcomingMatchesCard />

            {/* 7. Org Overview Stats (org admins without team scope) */}
            {isOrgLevel && !isTeamScope && <OrgStatsCard />}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <div className={styles.sideCol}>
            <ActivityFeed
              title="Activiteiten"
              limit={5}
              {...activityFilterProps}
            />
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
