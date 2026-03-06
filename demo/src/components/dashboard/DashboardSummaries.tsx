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
import { getApiBaseUrl } from '../../utils/apiBase';
import { useCreditBalance } from '../../hooks/useCreditBalance';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import styles from './DashboardSummaries.module.css';

/* ── Helpers ──────────────────────────────────────────────────────── */

function extractItems<T = any>(json: any): T[] {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.results)) return json.results;
  return [];
}

/* ── Squad Readiness ──────────────────────────────────────────────── */

export const SquadReadinessCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as any;
  const memberCount = org?.member_count || 0;

  // For a real implementation we'd use useSeasonContext + member media data.
  // For now, show member count + navigate to team page.
  return (
    <div
      className={styles.summaryCard}
      onClick={() => navigate(org ? `/organisations/${org.slug}` : '/')}
      role="button"
      tabIndex={0}
    >
      <div className={styles.cardIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--app-primary)' }}>
        <Users size={18} />
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardValue}>{memberCount}</div>
        <div className={styles.cardLabel}>Leden</div>
      </div>
      <ChevronRight size={16} className={styles.cardArrow} />
    </div>
  );
};

/* ── Content Stats ────────────────────────────────────────────────── */

export const ContentStatsCard: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    (async () => {
      try {
        // Content created in the last 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch(
          `${apiBaseUrl}/api/v1/media/items/?created_at__gte=${encodeURIComponent(weekAgo)}&page_size=1`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
        );
        if (res.ok) {
          const data = await res.json();
          setCount(data?.meta?.pagination?.count ?? extractItems(data).length);
        }
      } catch {
        setCount(0);
      }
    })();
  }, [apiBaseUrl]);

  return (
    <div
      className={styles.summaryCard}
      onClick={() => navigate('/content')}
      role="button"
      tabIndex={0}
    >
      <div className={styles.cardIcon} style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
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
  const [matches, setMatches] = useState<CompactMatch[]>([]);
  const navigate = useNavigate();
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    (async () => {
      try {
        const now = new Date().toISOString();
        const res = await fetch(
          `${apiBaseUrl}/api/v1/activities/?activity_type=match&start_time__gte=${encodeURIComponent(now)}&ordering=start_time&page_size=3`,
          { credentials: 'include', headers: { 'Content-Type': 'application/json' } },
        );
        if (res.ok) {
          setMatches(extractItems<CompactMatch>(await res.json()));
        }
      } catch {
        // silent
      }
    })();
  }, [apiBaseUrl]);

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
  const queueCounts = useQueueCounts(15000);
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
        color: hasWork ? '#f59e0b' : '#22c55e',
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
  const org = context.organisation as any;

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
        color: lowBalanceAlert ? '#ef4444' : '#22c55e',
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
