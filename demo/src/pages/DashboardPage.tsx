import { useState, useCallback } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { PullToRefresh } from '@django-core/design-system';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell } from 'lucide-react';
import {
  ActiveMatchCard,
  SquadReadinessCard,
  ContentStatsCard,
  UpcomingMatchesCard,
  AIQueueCard,
  CreditsTrendCard,
  OrgStatsCard,
} from '../components/dashboard';
import { QuickActions } from '../components/QuickActions';
import { useUserRole } from '../components/PermissionGuards';
import { ActivityFeed } from '../components/ActivityFeed/ActivityFeed';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { useNavRecents } from '../hooks/useNavItems';
import { useUnreadCount } from '../hooks/useNotifications';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as any;
  const recents = useNavRecents();
  const unreadCount = useUnreadCount();

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    org?.slug,
    org?.id?.toString(),
  );

  // ── Role tiers ──
  const { isSystemAdmin, isLandAdmin, isOrgAdmin, isCoach, isPlayer, isSupporter } = useUserRole();
  const isOrgLevel = isSystemAdmin || isLandAdmin || isOrgAdmin;
  const isMemberLevel = isPlayer || isSupporter;

  // Pull-to-refresh
  const [refreshKey, setRefreshKey] = useState(0);
  const handleRefresh = useCallback(async () => {
    setRefreshKey(k => k + 1);
  }, []);

  // Activity filter scope
  const isSuperadmin =
    Boolean((user as any)?.is_superuser) ||
    String((user as any)?.role || '').toLowerCase() === 'superadmin';
  const hasProjectContext = !!context.project;

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
              {org ? org.name : 'Selecteer een organisatie'}
            </p>
          </div>
          <button
            className={styles.notifBtn}
            onClick={() => navigate('/notifications')}
            aria-label="Notificaties"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className={styles.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
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

            {/* 2. Summary Grid — role-adaptive */}
            <div className={styles.summaryGrid}>
              {!isMemberLevel && <SquadReadinessCard />}
              <ContentStatsCard />
              {!isMemberLevel && <AIQueueCard />}
              {isOrgLevel && <CreditsTrendCard />}
            </div>

            {/* 3. Upcoming Matches (compact list) */}
            <UpcomingMatchesCard />

            {/* 4. Org Overview Stats (org admins only) */}
            {isOrgLevel && <OrgStatsCard />}

            {/* 5. Quick Actions — role-filtered */}
            <QuickActions roleLevel={isOrgLevel ? 'org' : isMemberLevel ? 'member' : 'team'} />

            {/* 6. Recents */}
            {recents.length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Recent bezocht</h3>
                  <Link to="/recents" className={styles.cardLink}>Alles</Link>
                </div>
                <div className={styles.recentsList}>
                  {recents.slice(0, 6).map((item) => (
                    <Link key={item.path} to={item.path} className={styles.recentPill} title={item.label}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
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
