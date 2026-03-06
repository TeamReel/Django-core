import { useState, useCallback } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { PullToRefresh } from '@django-core/design-system';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ChevronRight, FolderOpen, Users,
} from 'lucide-react';
import { NextMatchHero } from '../components/NextMatchHero';
import { ContentStreakWidget } from '../components/ContentStreakWidget';
import { QuickActions } from '../components/QuickActions';
import { ActivityFeed } from '../components/ActivityFeed/ActivityFeed';
import { TransactionWidget } from '../components/TransactionWidget/TransactionWidget';
import { UpcomingMatchesWidget } from '../components/UpcomingMatchesWidget';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { useNavRecents } from '../hooks/useNavItems';
import { useUserRole } from '../components/PermissionGuards';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as any;
  const recents = useNavRecents();
  const { isPlayer } = useUserRole();

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    org?.slug,
    org?.id?.toString(),
  );

  // Pull-to-refresh: increment key to force child widgets to re-mount and refetch
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
        {/* ── Greeting ──────────────────────────────────────────── */}
        <h1 className={styles.greeting}>
          Welkom, {user?.first_name || 'there'}
        </h1>
        <p className={styles.orgSubtitle}>
          {org ? org.name : 'Selecteer een organisatie'}
        </p>

        {/* ── Low balance banner ────────────────────────────────── */}
        {lowBalanceAlert && (
          <div className={styles.lowBanner}>
            <AlertTriangle size={20} />
            <div className={styles.lowBannerText}>
              <strong>Laag tegoed</strong>
              Nog {balance} credits (drempel: {threshold}).
            </div>
            <button className={styles.lowBannerBtn} onClick={() => navigate('/credits')}>
              Opwaarderen
            </button>
          </div>
        )}

        {/* ── Two-column wrapper (desktop only) ─────────────────── */}
        <div className={styles.twoCol}>
          {/* ── Main column ──────────────────────────────────────── */}
          <div>
            {/* 1. Next Match Hero — readiness ring + CTA */}
            {!isPlayer && <NextMatchHero />}

            {/* 2. Content Streak */}
            {!isPlayer && <ContentStreakWidget />}

            {/* 3. Quick Actions — 1-tap nav */}
            <QuickActions />

            {/* 4. Upcoming Matches (remaining) */}
            <UpcomingMatchesWidget />

            {/* 5. Recents */}
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

            {/* 6. Org quick links */}
            {org && (
              <div className={styles.card}>
                <div className={styles.statsRow}>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{org.clubs_count || org.project_count || 0}</div>
                    <div className={styles.statLabel}>Clubs</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{org.teams_count || 0}</div>
                    <div className={styles.statLabel}>Teams</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{org.matches_count || 0}</div>
                    <div className={styles.statLabel}>Wedstrijden</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{org.member_count || 0}</div>
                    <div className={styles.statLabel}>Leden</div>
                  </div>
                </div>
                <div className={styles.ctaRow}>
                  <Link
                    to={`/organisations/${org.slug}/projects`}
                    className={`${styles.ctaBtn} ${styles.ctaPrimary}`}
                  >
                    <FolderOpen size={16} /> Projects
                  </Link>
                  <Link
                    to={`/organisations/${org.slug}`}
                    className={`${styles.ctaBtn} ${styles.ctaSecondary}`}
                  >
                    <Users size={16} /> Team
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar (stacks below on mobile) ─────────────────── */}
          <div>
            <ActivityFeed
              title="Activiteiten"
              limit={5}
              {...activityFilterProps}
            />

            {org?.id && (
              <TransactionWidget
                organisationId={org.id.toString()}
                limit={3}
              />
            )}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}
