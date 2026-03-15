/**
 * DashboardSummaries — Compact summary cards for the dashboard.
 *
 * Each card is a self-contained widget with its own data fetching.
 * Designed to be arranged in a responsive grid.
 */
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Users, Calendar, Image, Cpu, CreditCard, TrendingUp,
  ChevronRight, Flame, Zap, CheckCircle2, Clock, AlertCircle,
} from 'lucide-react';
import { api } from '@/api';
import type { ProjectMembership } from '@/types/api/project';
import type { MediaItem } from '@/types/api/media';
import { useCreditBalance } from '../../hooks/useCreditBalance';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import type { Organisation } from '../../types';
import { routes } from '../../routes';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './DashboardSummaries.module.css';

/* ── Squad Readiness ──────────────────────────────────────────────── */

export const SquadReadinessCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as Organisation | null;
  const project = context.project;
  const [memberCount, setMemberCount] = useState<number>(0);

  useEffect(() => {
    if (project && org) {
      // Fetch team member count from project members API
      (async () => {
        try {
          const data = await api.list<ProjectMembership>(
            `/organisations/${org.slug}/projects/${project.slug}/members/`,
            { pageSize: 1 },
          );
          setMemberCount(data.count ?? data.results.length);
        } catch {
          setMemberCount(0);
        }
      })();
    } else {
      setMemberCount(org?.member_count || 0);
    }
  }, [org?.slug, project?.slug]);

  const handleClick = () => {
    if (project) {
      navigate(`/teams/${project.slug || project.id}/squad`);
    } else if (org) {
      navigate(routes.orgDetailLegacy({ orgId: org.slug || '' }));
    } else {
      navigate('/');
    }
  };

  return (
    <div
      className={styles.summaryCard}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className={`${styles.cardIcon} ${styles.iconPrimary}`}>
        <Users size={18} />
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardValue}>{memberCount}</div>
        <div className={styles.cardLabel}>{project ? 'Selectie' : 'Leden'}</div>
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </div>
  );
};

/* ── Content Stats ────────────────────────────────────────────────── */

export const ContentStatsCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const [count, setCount] = useState<number | null>(null);
  const navigate = useNavigate();
  const project = context.project;

  useEffect(() => {
    (async () => {
      try {
        // Content created in the last 7 days, scoped to project if available
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const params: Record<string, string> = { created_at__gte: weekAgo };
        if (project) params.project = project.id;
        const data = await api.list<MediaItem>('/media/items/', {
          params,
          pageSize: 1,
        });
        setCount(data.count ?? data.results.length);
      } catch {
        setCount(0);
      }
    })();
  }, [project?.id]);

  return (
    <div
      className={styles.summaryCard}
      onClick={() => navigate('/content')}
      role="button"
      tabIndex={0}
    >
      <div className={`${styles.cardIcon} ${styles.iconRed}`}>
        <Image size={18} />
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardValue}>{count ?? '—'}</div>
        <div className={styles.cardLabel}>Content (7d)</div>
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </div>
  );
};

/* ── Upcoming Matches (compact) ───────────────────────────────────── */

interface CompactMatch {
  id: string;
  title: string;
  slug?: string;
  start_time: string;
  opponent_project?: { name: string };
  project: { name: string };
}

export const UpcomingMatchesCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const [matches, setMatches] = useState<CompactMatch[]>([]);
  const navigate = useNavigate();
  const project = context.project;

  useEffect(() => {
    (async () => {
      try {
        const now = new Date().toISOString();
        const params: Record<string, string> = {
          activity_type: 'match',
          start_time__gte: now,
          ordering: 'start_time',
        };
        if (project) params.project = project.id;
        const { results } = await api.list<CompactMatch>('/activities/', {
          params,
          pageSize: 3,
        });
        setMatches(results);
      } catch {
        // silent
      }
    })();
  }, [project?.id]);

  return (
    <div className={`${styles.summaryCard} ${styles.tallCard}`}>
      <div className={styles.tallHeader}>
        <Calendar size={16} />
        <span className={styles.tallTitle}>Wedstrijden</span>
        <button
          className={styles.seeAll}
          onClick={() => navigate('/matches')}
        >
          Alles <ChevronRight size={12} />
        </button>
      </div>

      {matches.length === 0 ? (
        <div className={styles.emptyMini}>Geen komende wedstrijden</div>
      ) : (
        <div className={styles.matchList}>
          {matches.map((m) => {
            const d = new Date(m.start_time);
            const opp = m.opponent_project?.name || '—';
            return (
              <div
                key={m.id}
                className={styles.matchItem}
                onClick={() => navigate(routes.matchById({ matchId: m.slug || m.id }))}
              >
                <div className={styles.matchDate}>
                  <span className={styles.matchDay}>{d.getDate()}</span>
                  <span className={styles.matchMonth}>
                    {d.toLocaleDateString('nl-NL', { month: 'short' })}
                  </span>
                </div>
                <div className={styles.matchInfo}>
                  <span className={styles.matchOpponent}>vs {opp}</span>
                  <span className={styles.matchTime}>
                    {d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── AI Queue Status ──────────────────────────────────────────────── */

export const AIQueueCard: React.FC = () => {
  const queueCounts = useQueueCounts();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeJobs = queueCounts?.active || 0;
  const reviewJobs = queueCounts?.review || 0;
  const completedJobs = queueCounts?.completed || 0;
  const rejectedJobs = queueCounts?.rejected || 0;
  const aiJobs = queueCounts?.ai_queue || 0;
  const videoJobs = queueCounts?.video || 0;
  const allJobs = queueCounts?.all || 0;
  const hasWork = activeJobs > 0 || reviewJobs > 0;

  return (
    <>
    <div
      className={styles.summaryCard}
      onClick={() => setSheetOpen(true)}
      role="button"
      tabIndex={0}
    >
      <div className={styles.cardIcon} style={{
        background: hasWork ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        color: hasWork ? 'var(--color-amber-400)' : 'var(--color-green-400)',
      }}>
        <Cpu size={18} />
      </div>
      <div className={styles.cardContent}>
        {hasWork ? (
          <>
            <div className={styles.cardValue}>
              {activeJobs > 0 && <span>{activeJobs} actief</span>}
              {reviewJobs > 0 && <span className={styles.reviewBadge}>{reviewJobs} review</span>}
            </div>
            <div className={styles.cardLabel}>AI Queue</div>
          </>
        ) : (
          <>
            <div className={styles.cardValue}>
              <CheckCircle2 size={14} /> Idle
            </div>
            <div className={styles.cardLabel}>AI Queue</div>
          </>
        )}
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </div>

    {/* ── AI Queue Sheet ───────────────────────────────── */}
    <NavigationSheet
      isOpen={sheetOpen}
      onClose={() => setSheetOpen(false)}
      title="AI Queue"
      icon={<Cpu size={18} />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status overview */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: activeJobs > 0 ? 'var(--color-amber-400)' : 'var(--text-secondary)' }}>{activeJobs}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Actief</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: reviewJobs > 0 ? 'var(--color-blue-400)' : 'var(--text-secondary)' }}>{reviewJobs}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Te reviewen</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-green-400)' }}>{completedJobs}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Voltooid</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: rejectedJobs > 0 ? 'var(--color-red-400)' : 'var(--text-secondary)' }}>{rejectedJobs}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Afgewezen</div>
          </div>
        </div>

        {/* Pipeline breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Pipeline</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AI generatie</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{aiJobs}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Video processing</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{videoJobs}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Totaal</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{allJobs}</span>
          </div>
        </div>

        {/* Navigate to full content page */}
        <button
          onClick={() => { setSheetOpen(false); navigate('/content'); }}
          style={{ width: '100%', padding: '10px 16px', borderRadius: 8, border: '1px solid var(--border-primary)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          Bekijk alle content <ChevronRight size={14} />
        </button>
      </div>
    </NavigationSheet>
    </>
  );
};

/* ── Credits Trend ────────────────────────────────────────────────── */

export const CreditsTrendCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation;

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    org?.slug,
    org?.id?.toString(),
  );

  return (
    <div
      className={`${styles.summaryCard} ${lowBalanceAlert ? styles.alertCard : ''}`}
      onClick={() => navigate('/credits')}
      role="button"
      tabIndex={0}
    >
      <div className={styles.cardIcon} style={{
        background: lowBalanceAlert ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        color: lowBalanceAlert ? 'var(--color-red-400)' : 'var(--color-green-400)',
      }}>
        <CreditCard size={18} />
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardValue}>
          {balance ?? '—'}
          {lowBalanceAlert && <AlertCircle size={14} className={styles.warnIcon} />}
        </div>
        <div className={styles.cardLabel}>Credits</div>
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </div>
  );
};

/* ── Org Stats Card ── */

export const OrgStatsCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as Organisation | null;

  if (!org) return null;

  return (
    <div
      className={`${styles.summaryCard} ${styles.tallCard}`}
      onClick={() => navigate(routes.orgDetailLegacy({ orgId: org.slug || '' }))}
      role="button"
      tabIndex={0}
    >
      <div className={styles.tallHeader}>
        <TrendingUp size={16} />
        <span className={styles.tallTitle}>Overzicht</span>
      </div>
      <div className={styles.miniStats}>
        <div className={styles.miniStat}>
          <span className={styles.miniValue}>{org.clubs_count || org.project_count || 0}</span>
          <span className={styles.miniLabel}>Clubs</span>
        </div>
        <div className={styles.miniStat}>
          <span className={styles.miniValue}>{org.teams_count || 0}</span>
          <span className={styles.miniLabel}>Teams</span>
        </div>
        <div className={styles.miniStat}>
          <span className={styles.miniValue}>{org.matches_count || 0}</span>
          <span className={styles.miniLabel}>Wedstrijden</span>
        </div>
        <div className={styles.miniStat}>
          <span className={styles.miniValue}>{org.member_count || 0}</span>
          <span className={styles.miniLabel}>Leden</span>
        </div>
      </div>
    </div>
  );
};
