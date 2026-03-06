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
  RecentContentCard,
  ContentBreakdownCard,
  MemberContentProgressCard,
} from '../components/dashboard';
import { QuickActions } from '../components/QuickActions';
import { useUserRole } from '../components/PermissionGuards';
import { ActivityFeed } from '../components/ActivityFeed/ActivityFeed';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { useNavRecents } from '../hooks/useNavItems';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as any;
  const project = context.project as any;
  const hasProjectContext = !!project;
  const recents = useNavRecents();

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    org?.slug,
    org?.id?.toString(),
  );

  // ── Role tiers ──
  const { isSystemAdmin, isLandAdmin, isOrgAdmin, isCoach, isPlayer, isSupporter } = useUserRole();
  const isOrgLevel = isSystemAdmin || isLandAdmin || isOrgAdmin;
  const isMemberLevel = isPlayer || isSupporter;
  // Team-focused: when a project is selected, scope cards to that team
  const isTeamScope = hasProjectContext;

  // Pull-to-refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(async () => {
    setRefreshKey(k => k + 1);
  }, []);

  // Activity filter scope
  const isSuperadmin =
    Boolean((user as any)?.is_superuser) ||
    String((user as any)?.role || '').toLowerCase() === 'superadmin';

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

            {/* 3. Content breakdown by type with progress bars */}
            <ContentBreakdownCard />

            {/* 4. Recent content with thumbnails */}
            <RecentContentCard />

            {/* 5. Member content progress */}
            {!isMemberLevel && <MemberContentProgressCard />}

            {/* 6. Upcoming Matches (compact list) */}
            <UpcomingMatchesCard />

            {/* 7. Org Overview Stats (org admins without team scope) */}
            {isOrgLevel && !isTeamScope && <OrgStatsCard />}

            {/* 8. Quick Actions — role-filtered */}
            <QuickActions roleLevel={isOrgLevel ? 'org' : isMemberLevel ? 'member' : 'team'} />
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
