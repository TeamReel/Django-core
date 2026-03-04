import { useState, useCallback } from 'react';
import { useAuth } from '@django-core/auth-ui';
import { useContextSwitcher } from '@django-core/context-switcher';
import { PullToRefresh } from '@django-core/design-system';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Megaphone, ClipboardList, PersonStanding,
  Music, Target, Flag, Film, FolderOpen, Users, ChevronRight,
} from 'lucide-react';
import { ActivityFeed } from '../components/ActivityFeed/ActivityFeed';
import { TransactionWidget } from '../components/TransactionWidget/TransactionWidget';
import { useCreditBalance } from '../hooks/useCreditBalance';
import { UpcomingMatchesWidget } from '../components/UpcomingMatchesWidget';
import { useNavRecents } from '../hooks/useNavItems';
import { useAppSelection } from '../hooks/useAppSelection';
import { useUserRole } from '../components/PermissionGuards';
import styles from './DashboardPage.module.css';

/** Content types available from the dashboard quick-create */
const QUICK_CREATE_TYPES = [
  { key: 'flyer', label: 'Match Flyer', Icon: Megaphone },
  { key: 'lineup', label: 'Lineup', Icon: ClipboardList },
  { key: 'walkon', label: 'Walk-on Video', Icon: PersonStanding },
  { key: 'anthem', label: 'Anthem Video', Icon: Music },
  { key: 'goal', label: 'Goal Celebration', Icon: Target },
  { key: 'end_score', label: 'Final Score', Icon: Flag },
  { key: 'highlights', label: 'Highlights', Icon: Film },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as any;
  const recents = useNavRecents();
  const { matchId } = useAppSelection();
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
            {/* Upcoming Matches — most actionable, goes first */}
            <UpcomingMatchesWidget />

            {/* Quick Create Content */}
            {!isPlayer && (
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Content maken</h3>
                  {matchId && (
                    <Link to={`/matches/${matchId}?tab=content`} className={styles.cardLink}>
                      Alles <ChevronRight size={14} style={{ verticalAlign: 'middle' }} />
                    </Link>
                  )}
                </div>
                {matchId ? (
                  <div className={styles.quickGrid}>
                    {QUICK_CREATE_TYPES.map((ct) => (
                      <button
                        key={ct.key}
                        className={styles.quickBtn}
                        onClick={() => navigate(`/matches/${matchId}?tab=content`)}
                      >
                        <ct.Icon size={22} />
                        <span>{ct.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, opacity: 0.7 }}>
                    Stel een wedstrijd als actief in om content te genereren.
                  </p>
                )}
              </div>
            )}

            {/* Recents */}
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

            {/* Stats (compact 4-col row) */}
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
