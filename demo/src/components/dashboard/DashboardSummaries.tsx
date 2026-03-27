/**
 * DashboardSummaries — Compact summary cards for the dashboard.
 *
 * Each card is a self-contained widget with its own data fetching.
 * Designed to be arranged in a responsive grid.
 */
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContextSwitcher } from '@django-core/context-switcher';
import {
  Users, Calendar, Image, Cpu, CreditCard, TrendingUp,
  ChevronRight, Flame, Zap, CheckCircle2, Clock, AlertCircle,
  Shield,
} from 'lucide-react';
import { Spinner } from '@django-core/design-system';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import type { ProjectMembership } from '@/types/api/project';
import type { MediaItem } from '@/types/api/media';
import { useCreditBalance } from '../../hooks/useCreditBalance';
import { useQueueCounts } from '../../hooks/useQueueCounts';
import { useProjectMembers } from '../../hooks/useProjectMembers';
import { useAppSelection } from '../../hooks/useAppSelection';
import { queryKeys } from '../../utils/queryKeys';
import type { Organisation } from '../../types';
import { routes } from '../../routes';
import { NavigationSheet } from '../ui/NavigationSheet';
import styles from './DashboardSummaries.module.css';

const CreditsSheetContent = lazy(() =>
  import('../../pages/config/CreditsSheetContent').then(m => ({ default: m.CreditsSheetContent })),
);

/* ── Squad Readiness ──────────────────────────────────────────────── */

export const SquadReadinessCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as Organisation | null;
  const project = context.project;
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;
  const [sheetOpen, setSheetOpen] = useState(false);

  // Shared members query — deduped across cards (D5)
  const { data: membersData } = useProjectMembers(projectId);
  const members = membersData?.results ?? [];
  const memberCount = projectId
    ? (membersData?.count ?? members.length ?? 0)
    : (org?.member_count || 0);

  return (
    <>
      <div
        className={styles.summaryCard}
        onClick={() => setSheetOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSheetOpen(true); } }}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
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

      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Selectie"
        icon={<Users size={18} />}
      >
        <div className={styles.squadBadge}>{memberCount} spelers</div>

        <div className={styles.squadList}>
          {members.map((m) => {
            const name = m.user?.first_name
              ? `${m.user.first_name} ${m.user.last_name || ''}`.trim()
              : 'Onbekend';
            const role = m.role || 'speler';
            const avatarUrl = m.user?.avatar_url;
            return (
              <div key={m.id} className={styles.squadRow}>
                <div className={styles.squadAvatar}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className={styles.squadAvatarImg} loading="lazy" />
                  ) : (
                    <span className={styles.squadAvatarInitial}>{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.squadInfo}>
                  <span className={styles.squadName}>{name}</span>
                  <span className={styles.squadRole}>{role}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button
          className={styles.sheetNavLink}
          onClick={() => {
            setSheetOpen(false);
            if (project) navigate(`/teams/${project.slug || project.id}/squad`);
            else if (org) navigate(routes.orgDetailLegacy({ orgId: org.slug || '' }));
          }}
        >
          Bekijk volledige selectie <ChevronRight size={14} />
        </button>
      </NavigationSheet>
    </>
  );
};

/* ── Content Stats ────────────────────────────────────────────────── */

export const ContentStatsCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const project = context.project;
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;

  const mediaFilters = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const p: Record<string, string> = { created_at__gte: weekAgo };
    if (projectId) p.project = projectId;
    return p;
  }, [projectId]);

  const { data: mediaData } = useQuery({
    queryKey: queryKeys.media.items(mediaFilters),
    queryFn: () => api.list<MediaItem>('/media/items/', { params: mediaFilters, pageSize: 1 }),
    staleTime: 2 * 60 * 1000, // 2 min
  });

  const count = mediaData ? (mediaData.count ?? mediaData.results.length) : null;

  return (
    <div
      className={styles.summaryCard}
      onClick={() => navigate('/content')}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/content'); } }}
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
  const navigate = useNavigate();
  const project = context.project;
  const { teamIdForApi } = useAppSelection();
  const projectId = project?.id ?? teamIdForApi ?? undefined;

  const matchFilters = useMemo(() => {
    const now = new Date().toISOString();
    const p: Record<string, string> = {
      activity_type: 'match',
      start_time__gte: now,
      ordering: 'start_time',
    };
    if (projectId) p.project = projectId;
    return p;
  }, [projectId]);

  const { data: matchData } = useQuery({
    queryKey: queryKeys.activities.upcoming(matchFilters),
    queryFn: () => api.list<CompactMatch>('/activities/', { params: matchFilters, pageSize: 3 }),
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const matches = matchData?.results ?? [];

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
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSheetOpen(true); } }}
      role="button"
      tabIndex={0}
    >
      <div className={`${styles.cardIcon} ${hasWork ? styles.iconAmber : styles.iconGreen}`}>
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
      <div className={styles.queueSheetContent}>
        {/* Status overview */}
        <div className={styles.queueStatsGrid}>
          <div className={styles.queueStatCell}>
            <div className={`${styles.queueStatValue} ${activeJobs > 0 ? styles.queueStatValueActive : ''}`}>{activeJobs}</div>
            <div className={styles.queueStatLabel}>Actief</div>
          </div>
          <div className={styles.queueStatCell}>
            <div className={`${styles.queueStatValue} ${reviewJobs > 0 ? styles.queueStatValueReview : ''}`}>{reviewJobs}</div>
            <div className={styles.queueStatLabel}>Te reviewen</div>
          </div>
          <div className={styles.queueStatCell}>
            <div className={`${styles.queueStatValue} ${styles.queueStatValueGreen}`}>{completedJobs}</div>
            <div className={styles.queueStatLabel}>Voltooid</div>
          </div>
          <div className={styles.queueStatCell}>
            <div className={`${styles.queueStatValue} ${rejectedJobs > 0 ? styles.queueStatValueRed : ''}`}>{rejectedJobs}</div>
            <div className={styles.queueStatLabel}>Afgewezen</div>
          </div>
        </div>

        {/* Pipeline breakdown */}
        <div className={styles.queuePipeline}>
          <div className={styles.queuePipelineTitle}>Pipeline</div>
          <div className={styles.queuePipelineRow}>
            <span className={styles.queuePipelineLabel}>AI generatie</span>
            <span className={styles.queuePipelineValue}>{aiJobs}</span>
          </div>
          <div className={styles.queuePipelineRow}>
            <span className={styles.queuePipelineLabel}>Video processing</span>
            <span className={styles.queuePipelineValue}>{videoJobs}</span>
          </div>
          <div className={styles.queuePipelineTotal}>
            <span className={styles.queuePipelineTotalLabel}>Totaal</span>
            <span className={styles.queuePipelineTotalValue}>{allJobs}</span>
          </div>
        </div>

        {/* Navigate to full content page */}
        <button
          onClick={() => { setSheetOpen(false); navigate('/content'); }}
          className={styles.sheetNavLink}
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const { balance, lowBalanceAlert, threshold } = useCreditBalance(
    org?.slug,
    org?.id?.toString(),
  );

  return (
    <>
      <div
        className={`${styles.summaryCard} ${lowBalanceAlert ? styles.alertCard : ''}`}
        onClick={() => setSheetOpen(true)}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
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

      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Credits"
        icon={<CreditCard size={18} />}
      >
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner size="md" /></div>}>
          <CreditsSheetContent />
        </Suspense>
      </NavigationSheet>
    </>
  );
};

/* ── Org Stats Card ── */

export const OrgStatsCard: React.FC = () => {
  const { context } = useContextSwitcher();
  const navigate = useNavigate();
  const org = context.organisation as Organisation | null;
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!org) return null;

  const clubsCount = org.clubs_count || org.project_count || 0;
  const teamsCount = org.teams_count || 0;

  return (
    <>
      <div
        className={styles.summaryCard}
        onClick={() => setSheetOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSheetOpen(true); } }}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
      >
        <div className={`${styles.cardIcon} ${styles.iconPrimary}`}>
          <TrendingUp size={18} />
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardValue}>{teamsCount} teams</div>
          <div className={styles.cardLabel}>Organisatie</div>
        </div>
        <ChevronRight size={16} className={styles.cardArrow} />
      </div>

      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Organisatie overzicht"
        icon={<TrendingUp size={18} />}
      >
        <div className={styles.miniStats}>
          <div className={styles.miniStat}>
            <span className={styles.miniValue}>{clubsCount}</span>
            <span className={styles.miniLabel}>Clubs</span>
          </div>
          <div className={styles.miniStat}>
            <span className={styles.miniValue}>{teamsCount}</span>
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

        <button
          className={styles.sheetNavLink}
          onClick={() => {
            setSheetOpen(false);
            navigate(routes.orgDetailLegacy({ orgId: org.slug || '' }));
          }}
        >
          Bekijk organisatie <ChevronRight size={14} />
        </button>
      </NavigationSheet>
    </>
  );
};
