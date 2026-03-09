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
import { useCreditBalance } from '../../hooks/useCreditBalance';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import styles from './DashboardSummaries.module.css';

/* ── Squad Readiness ──────────────────────────────────────────────── */

export const SquadReadinessCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as any;
  const project = context.project;
  const [memberCount, setMemberCount] = useState<number>(0);

  useEffect(() => {
    if (project && org) {
      // Fetch team member count from project members API
      (async () => {
        try {
          const data = await api.list<any>(
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
      navigate(`/organisations/${org.slug}`);
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
      <div className={styles.cardIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--app-primary)' }}>
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
        const data = await api.list<any>('/media/items/', {
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
      <div className={styles.cardIcon} style={{ background: 'rgba(236, 72, 153, 0.1)', color: 'var(--color-red-400)' }}>
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
                onClick={() => navigate(`/matches/${m.slug || m.id}`)}
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

  const activeJobs = queueCounts?.active || 0;
  const reviewJobs = queueCounts?.review || 0;
  const hasWork = activeJobs > 0 || reviewJobs > 0;

  return (
    <div
      className={styles.summaryCard}
      onClick={() => navigate('/content')}
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
  const org = context.organisation as any;

  if (!org) return null;

  return (
    <div
      className={`${styles.summaryCard} ${styles.tallCard}`}
      onClick={() => navigate(`/organisations/${org.slug}`)}
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
