/**
 * ActiveMatchCard — Shows the most relevant match (closest to now).
 *
 * Logic: fetch recent past + near future matches, pick the one whose
 * start_time is closest to Date.now(). This ensures match-day content
 * creation always has the right match in focus.
 *
 * Clicking the card opens a MatchSheet (iOS-like slide-up panel)
 * with match overview + quick actions instead of navigating away.
 * Match links use vanity URLs built from the active hierarchy context.
 */
import React, { memo, useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Zap, ChevronRight, MapPin, Clock, CheckCircle2,
  Circle, Trophy, Sparkles, Calendar, Users, ExternalLink,
  FileImage, AlertCircle,
} from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import { routes } from '../../routes';
import { useAppSelection } from '../../hooks/useAppSelection';
import { useClosestMatch } from '../../hooks/useClosestMatch';
import { slugify } from '../../utils/periodPath';
import { NavigationSheet } from '../ui/NavigationSheet';
import { LineupSheet } from './LineupSheet';
import { ContentSheet } from './ContentSheet';
import { useContentSheet } from './useContentSheet';
import { CONTENT_TYPES } from '../../pages/identity/ContentGenerationModal';
import type { ContentTemplate } from '../../pages/identity/ContentGenerationModal';
import styles from './ActiveMatchCard.module.css';

const ContentGenerationModal = lazy(() =>
  import('../../pages/identity/ContentGenerationModal'),
);

/* ── Types ──────────────────────────────────────────────────────────── */

export interface Match {
  id: string;
  title: string;
  slug?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  organisation?: { id: string; name: string; slug: string };
  project: { id: string; name: string; slug?: string; club_name?: string };
  opponent_project?: { name: string; slug?: string; club_name?: string };
  metadata: Record<string, any>;
  period?: { id: string; name: string; parent_period?: { id: string; name: string } };
}

/* ── Vanity URL builder ────────────────────────────────────────────── */

function buildMatchVanityUrl(
  match: Match,
  hierarchy: { orgSlug: string; clubSlugOrId?: string | null; teamSlugOrId?: string | null; seasonSlugOrId?: string | null; competitionSlugOrId?: string | null },
): string {
  const org = hierarchy.orgSlug || match.organisation?.slug;
  const club = hierarchy.clubSlugOrId;
  const team = hierarchy.teamSlugOrId || match.project?.slug;
  const season = hierarchy.seasonSlugOrId || (match.period?.parent_period?.name ? slugify(match.period.parent_period.name) : '');
  const competition = hierarchy.competitionSlugOrId || (match.period?.name ? slugify(match.period.name) : '');
  const matchKey = match.slug || match.id;

  if (org && club && team && season && competition && matchKey) {
    return routes.match({ orgId: org, clubId: club, projectId: team, seasonId: season, competitionId: competition, matchId: matchKey });
  }
  // Fallback to legacy redirect route
  return routes.matchById({ matchId: matchKey });
}

function buildMatchVanityUrlWithTab(
  match: Match,
  hierarchy: { orgSlug: string; clubSlugOrId?: string | null; teamSlugOrId?: string | null; seasonSlugOrId?: string | null; competitionSlugOrId?: string | null },
  tab: string,
): string {
  const base = buildMatchVanityUrl(match, hierarchy);
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

/* ── Component ─────────────────────────────────────────────────────── */

export const ActiveMatchCard = memo(function ActiveMatchCard() {
  const { context } = useContextSwitcher();
  const hierarchy = useAppSelection();
  const navigate = useNavigate();
  const project = context.project;

  // ── Data via TanStack Query (D4) ──
  const { data: matchData, isLoading: loading } = useClosestMatch(project?.id);
  const match = matchData?.match ?? null;

  // Local state for counts (overridable by sheet callbacks)
  const [contentCount, setContentCount] = useState(0);
  const [contentDoneSubtypes, setContentDoneSubtypes] = useState<string[]>([]);
  const [lineupCount, setLineupCount] = useState(0);
  const [lineupFormationState, setLineupFormationState] = useState<string | undefined>(undefined);
  const [badgeBump, setBadgeBump] = useState<'lineup' | 'content' | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [lineupSheetOpen, setLineupSheetOpen] = useState(false);
  const [contentSheetOpen, setContentSheetOpen] = useState(false);

  // Content sheet hook for template data + generation modal
  // context-switcher Organisation type doesn't include sport, but runtime data does
  const orgSport = (context.organisation as any)?.sport as
    | { id: string | number; name?: string; slug?: string; parent_sport_id?: number | null }
    | null
    | undefined;
  const content = useContentSheet(match, orgSport, match?.project?.id);

  // Quick-generate modal state (opened from phase item rows in match sheet)
  const [quickGenOpen, setQuickGenOpen] = useState(false);
  const [quickGenTemplate, setQuickGenTemplate] = useState<ContentTemplate | null>(null);
  const [quickGenLabel, setQuickGenLabel] = useState('');

  const handleQuickGenerate = useCallback((subtype: string, label: string) => {
    // Find the first available template matching this subtype
    const templates = content.availableTemplates[subtype];
    const template = templates?.[0] ?? null;
    setQuickGenTemplate(template);
    setQuickGenLabel(label);
    setQuickGenOpen(true);
  }, [content.availableTemplates]);

  const closeQuickGen = useCallback(() => {
    setQuickGenOpen(false);
    setQuickGenTemplate(null);
    setQuickGenLabel('');
  }, []);

  // Sync query counts → local state (callback overrides take precedence until next refetch)
  useEffect(() => {
    if (matchData) {
      setContentCount(matchData.contentCount);
      setContentDoneSubtypes(matchData.contentDoneSubtypes);
      setLineupCount(matchData.lineupCount);
      if (matchData.lineupFormation) setLineupFormationState(matchData.lineupFormation);
    }
  }, [matchData]);

  // Derived state
  const matchState = useMemo(() => {
    if (!match) return null;
    const now = Date.now();
    const start = new Date(match.start_time).getTime();
    const end = match.end_time ? new Date(match.end_time).getTime() : start + 2 * 60 * 60 * 1000;

    if (now >= start && now <= end) return 'live' as const;
    if (now < start) return 'upcoming' as const;
    return 'played' as const;
  }, [match]);

  // Prefer club name (parent_project) over team name
  const teamName = match?.project?.club_name || match?.project?.name || 'Team';
  const opponent = match?.opponent_project?.club_name || match?.opponent_project?.name || match?.title?.split(' vs ')?.[1] || 'Tegenstander';

  // Vanity URL + navigation (hooks must be before early returns)
  const matchUrl = useMemo(
    () => match ? buildMatchVanityUrl(match, hierarchy) : '',
    [match?.id, match?.slug, hierarchy.orgSlug, hierarchy.clubSlugOrId, hierarchy.teamSlugOrId, hierarchy.seasonSlugOrId, hierarchy.competitionSlugOrId],
  );

  const handleNavigateToMatch = useCallback((tab?: string) => {
    if (!match) return;
    setSheetOpen(false);
    const url = tab ? buildMatchVanityUrlWithTab(match, hierarchy, tab) : matchUrl;
    navigate(url, { state: { from: 'dashboard' } });
  }, [match?.id, matchUrl, hierarchy.orgSlug, hierarchy.clubSlugOrId, hierarchy.teamSlugOrId, hierarchy.seasonSlugOrId, hierarchy.competitionSlugOrId, navigate]);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.loadingState}>
          <div className={`${styles.shimmerLine} ${styles.shimmerWidth40}`} />
          <div className={`${styles.shimmerLine} ${styles.shimmerWidth70Tall}`} />
          <div className={`${styles.shimmerLine} ${styles.shimmerWidth55}`} />
        </div>
      </div>
    );
  }

  if (!match) {
    return null; // Don't show empty card at all — saves space
  }

  const date = new Date(match.start_time);
  const relTime = formatRelativeTime(date, 'nl');
  const urgency = getDateUrgency(date);
  const score = match.metadata?.score || match.metadata?.final_score;
  const isHome = match.metadata?.is_home !== false;
  const lineupFormation = lineupFormationState || (match?.metadata?.lineup as any)?.formation as string | undefined;
  const hasLineup = lineupCount > 0;

  return (
    <>
      <div
        className={`${styles.card} ${styles[matchState || '']}`}
        onClick={() => setSheetOpen(true)}
        role="button"
        tabIndex={0}
      >
        {/* Status badge */}
        <div className={styles.topRow}>
          <span className={`${styles.badge} ${styles[`badge_${matchState}`]}`}>
            {matchState === 'live' ? <><Circle size={8} fill="currentColor" /> LIVE</> : matchState === 'upcoming' ? 'Aankomend' : 'Gespeeld'}
          </span>
          <span className={`${styles.timeLabel} ${styles[`time_${urgency}`]}`}>
            {relTime}
          </span>
        </div>

        {/* Match teams */}
        <div className={styles.matchRow}>
          <div className={styles.teamSide}>
            <span className={styles.teamName}>{isHome ? teamName : opponent}</span>
          </div>

          <div className={styles.scoreBox}>
            {score ? (
              <span className={styles.score}>{score}</span>
            ) : (
              <span className={styles.vsLabel}>vs</span>
            )}
          </div>

          <div className={`${styles.teamSide} ${styles.teamRight}`}>
            <span className={styles.teamName}>{isHome ? opponent : teamName}</span>
          </div>
        </div>

        {/* Meta row */}
        <div className={styles.metaRow}>
          {match.location && (
            <span className={styles.metaItem}>
              <MapPin size={12} /> {match.location}
            </span>
          )}
          {match.metadata?.venue && !match.location && (
            <span className={styles.metaItem}>
              <MapPin size={12} /> {match.metadata.venue}
            </span>
          )}
          <span className={styles.metaItem}>
            <Clock size={12} />
            {date.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })}
            {' '}
            {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Status indicators */}
        <div className={styles.statusRow}>
          <span className={`${styles.contentBadge} ${badgeBump === 'content' ? styles.badgeBump : ''}`}>
            {contentCount > 0 ? (
              <><CheckCircle2 size={14} /> {contentCount} items</>
            ) : (
              <><Circle size={14} /> Nog geen content</>
            )}
          </span>

          <span className={`${styles.lineupBadge} ${hasLineup ? styles.lineupFilled : ''} ${badgeBump === 'lineup' ? styles.badgeBump : ''}`}>
            <Users size={14} />
            {hasLineup
              ? <>{lineupCount} spelers{lineupFormation ? ` · ${lineupFormation}` : ''}</>
              : <>Opstelling invullen</>
            }
          </span>
        </div>
      </div>

      {/* ── Match Sheet (iOS-like slide-up panel) ────────────────── */}
      <NavigationSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={match.title || `${teamName} vs ${opponent}`}
        icon={<Trophy size={18} />}
      >
        <div className={styles.sheetContent}>
          {/* Match overview */}
          <div className={styles.sheetMatchHeader}>
            <span className={`${styles.badge} ${styles[`badge_${matchState}`]}`}>
              {matchState === 'live' ? <><Circle size={8} fill="currentColor" /> LIVE</> : matchState === 'upcoming' ? 'Aankomend' : 'Gespeeld'}
            </span>
            <span className={`${styles.timeLabel} ${styles[`time_${urgency}`]}`}>
              {relTime}
            </span>
          </div>

          <div className={styles.sheetTeams}>
            <div className={styles.sheetTeam}>
              <span className={styles.sheetTeamName}>{isHome ? teamName : opponent}</span>
            </div>
            <div className={styles.sheetScore}>
              {score ? <span>{score}</span> : <span className={styles.vsLabel}>vs</span>}
            </div>
            <div className={styles.sheetTeam}>
              <span className={styles.sheetTeamName}>{isHome ? opponent : teamName}</span>
            </div>
          </div>

          <div className={styles.sheetMeta}>
            {match.location && (
              <span className={styles.metaItem}>
                <MapPin size={14} /> {match.location}
              </span>
            )}
            <span className={styles.metaItem}>
              <Calendar size={14} />
              {date.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' om '}
              {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {match.period?.name && (
              <span className={styles.metaItem}>
                <Trophy size={14} /> {match.period.name}
              </span>
            )}
          </div>

          {/* Quick actions — Lineup + Content phases + Navigate */}
          <div className={styles.sheetActions}>
            {/* ── Lineup ── */}
            <button className={`${styles.sheetAction} ${hasLineup ? styles.sheetActionDone : ''}`} onClick={() => { setSheetOpen(false); setLineupSheetOpen(true); }}>
              {hasLineup ? (
                <CheckCircle2 size={18} className={styles.iconDone} />
              ) : (
                <Users size={18} />
              )}
              <div className={styles.sheetActionText}>
                <span className={styles.sheetActionLabel}>Opstelling</span>
                <span className={styles.sheetActionSub}>
                  {hasLineup
                    ? `${lineupCount} spelers${lineupFormation ? ` · ${lineupFormation}` : ''}`
                    : 'Opstelling invullen'
                  }
                </span>
              </div>
              {hasLineup && <span className={styles.readyBadge}>Klaar</span>}
              <ChevronRight size={16} />
            </button>

            {/* ── Content phase blocks with item rows ── */}
            {([
              { key: 'pre_match' as const, phase: CONTENT_TYPES.pre_match },
              { key: 'during_match' as const, phase: CONTENT_TYPES.during_match },
              { key: 'post_match' as const, phase: CONTENT_TYPES.post_match },
            ]).map(({ key, phase }) => {
              if (!phase) return null;
              const total = phase.items.length;
              const doneCount = phase.items.filter(i =>
                contentDoneSubtypes.includes(i.subtype)
              ).length;
              const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
              const allDone = doneCount === total;

              return (
                <div key={key} className={styles.phaseBlock}>
                  {/* Phase header with progress */}
                  <div className={styles.phaseHeader}>
                    <div className={styles.phaseHeaderLeft}>
                      {allDone ? (
                        <CheckCircle2 size={16} className={styles.iconDone} />
                      ) : (
                        <FileImage size={16} />
                      )}
                      <span className={styles.phaseTitle}>{phase.label}</span>
                    </div>
                    <span className={styles.phaseCount}>{doneCount}/{total}</span>
                  </div>
                  <div className={styles.phaseProgressTrack}>
                    <div
                      className={styles.phaseProgressFill}
                      style={{ width: `${pct}%` }}
                      data-done={allDone ? 'true' : 'false'}
                    />
                  </div>

                  {/* Individual content items */}
                  <div className={styles.phaseItems}>
                    {phase.items.map((item) => {
                      const isDone = contentDoneSubtypes.includes(item.subtype);
                      const hasTemplate = (content.availableTemplates[item.subtype]?.length ?? 0) > 0;

                      return (
                        <button
                          key={item.id}
                          className={styles.phaseItem}
                          onClick={() => {
                            if (isDone) {
                              // Open content sheet to view existing
                              setSheetOpen(false);
                              setContentSheetOpen(true);
                            } else if (hasTemplate) {
                              // Quick-generate directly
                              handleQuickGenerate(item.subtype, item.label);
                            } else {
                              // Fallback: open full content sheet
                              setSheetOpen(false);
                              setContentSheetOpen(true);
                            }
                          }}
                          aria-label={`${item.label}: ${isDone ? 'bekijk' : 'maak aan'}`}
                        >
                          <span className={styles.phaseItemIcon}>
                            {isDone ? (
                              <CheckCircle2 size={14} className={styles.iconDone} />
                            ) : (
                              <Circle size={14} />
                            )}
                          </span>
                          <span className={`${styles.phaseItemLabel} ${isDone ? styles.phaseItemDone : ''}`}>
                            {item.label}
                          </span>
                          {isDone ? (
                            <span className={styles.phaseItemAction} data-variant="done">Bekijk ↗</span>
                          ) : hasTemplate ? (
                            <span className={styles.phaseItemAction} data-variant="create">Maak →</span>
                          ) : (
                            <span className={styles.phaseItemAction} data-variant="disabled">—</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button
              className={`${styles.sheetAction} ${styles.sheetActionPrimary}`}
              onClick={() => handleNavigateToMatch()}
            >
              <ExternalLink size={18} />
              <div className={styles.sheetActionText}>
                <span className={styles.sheetActionLabel}>Open wedstrijd</span>
                <span className={styles.sheetActionSub}>Volledig wedstrijdoverzicht</span>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </NavigationSheet>

      {/* ── Lineup Sheet (inline editing from dashboard) ──────── */}
      <LineupSheet
        isOpen={lineupSheetOpen}
        onClose={() => setLineupSheetOpen(false)}
        match={match}
        onBack={() => { setLineupSheetOpen(false); setSheetOpen(true); }}
        onLineupSaved={(count, formation) => {
          setLineupCount(count);
          setLineupFormationState(formation);
          setBadgeBump('lineup');
          setTimeout(() => setBadgeBump(null), 400);
        }}
      />

      {/* ── Content Sheet (inline content from dashboard) ─────── */}
      <ContentSheet
        isOpen={contentSheetOpen}
        onClose={() => setContentSheetOpen(false)}
        match={match}
        onBack={() => { setContentSheetOpen(false); setSheetOpen(true); }}
        organisationId={match?.organisation?.id}
        onContentGenerated={(newCount) => {
          setContentCount(newCount);
          setBadgeBump('content');
          setTimeout(() => setBadgeBump(null), 400);
        }}
      />

      {/* ── Quick-generate modal (portal — stacks above match sheet) ── */}
      {quickGenOpen &&
        createPortal(
          <Suspense fallback={null}>
            <ContentGenerationModal
              isOpen={quickGenOpen}
              onClose={closeQuickGen}
              onGenerated={() => {
                closeQuickGen();
                void content.refreshMedia().then(() => {
                  setContentCount((prev) => prev + 1);
                  setBadgeBump('content');
                  setTimeout(() => setBadgeBump(null), 400);
                });
              }}
              matchData={match ? {
                id: match.id,
                title: match.title,
                project: { id: match.project.id, name: match.project.name },
                opponent_project: match.opponent_project
                  ? { id: '', name: match.opponent_project.name }
                  : undefined,
                start_time: match.start_time,
                location: match.location,
                metadata: match.metadata,
              } : null}
              organisationSport={orgSport
                ? { id: orgSport.id, name: orgSport.name ?? '', slug: orgSport.slug }
                : undefined}
              organisationId={match?.organisation?.id}
              template={quickGenTemplate}
              contentTypeLabel={quickGenLabel}
            />
          </Suspense>,
          document.body,
        )}
    </>
  );
});
