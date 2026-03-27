/**
 * MatchOverview — Overview view content for the unified MatchSheetFlow.
 *
 * Displays match details, lineup action, content phases with progress,
 * and navigation to full match page. Extracted from the old MatchSheet
 * to serve as the "overview" WizardStep inside MatchSheetFlow.
 */
import React, { useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronRight, ChevronDown, MapPin, Calendar,
  CheckCircle2, ExternalLink, Users, FileImage,
  Image, Video, Play, Camera, Music, Target, Hash,
  Flag, BarChart3, Film, Star, Eye,
} from 'lucide-react';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import { CONTENT_TYPES } from '../../pages/identity/ContentGenerationModal';
import { useContentSheet } from './useContentSheet';
import { Avatar } from '../ui/Avatar';
import type { Match } from './ActiveMatchCard';
import type { UseMatchSheetReturn } from './useMatchSheet';
import type { ContentPhase } from '../MatchWizardV2/types';
import styles from './ActiveMatchCard.module.css';

/* ── Content-type icon map ─────────────────────────────── */
const SUBTYPE_ICONS: Record<string, LucideIcon> = {
  flyer: Image,
  lineup: Video,
  lineup_flyer: Users,
  match_intro: Play,
  poster: Camera,
  walkon: Film,
  anthem: Music,
  goal: Target,
  score_update: Hash,
  end_score: Flag,
  match_summary: BarChart3,
  highlights: Film,
};

/* ── Phase key → ContentPhase mapping ──────────────────── */
const PHASE_MAP: Record<string, ContentPhase> = {
  pre_match: 'pre',
  during_match: 'during',
  post_match: 'post',
};

interface MatchOverviewProps {
  match: Match;
  sheet: UseMatchSheetReturn;
  isActiveMatch: boolean;
  onToggleActive: () => void;
  onNavigateToMatch: (tab?: string) => void;
  onStartContent: (subtype: string, phase: ContentPhase) => void;
  onBrowseContent: (phase?: ContentPhase) => void;
  onEditLineup: () => void;
  onPreviewContent: (url: string, isVideo: boolean, title?: string) => void;
  /** Own club logo URL (from useBrandProfile). */
  clubLogoUrl?: string;
}

export const MatchOverview: React.FC<MatchOverviewProps> = ({
  match,
  sheet,
  isActiveMatch,
  onToggleActive,
  onNavigateToMatch,
  onStartContent,
  onBrowseContent,
  onEditLineup,
  onPreviewContent,
  clubLogoUrl,
}) => {
  const date = new Date(match.start_time);
  const relTime = formatRelativeTime(date, 'nl');
  const urgency = getDateUrgency(date);
  const hasLineup = sheet.lineupCount > 0;

  // Logo resolution — same approach as MatchesCard
  const opponentLogoUrl = (match.opponent_project as Record<string, unknown> | undefined)?.logo_url as string | undefined;
  const ownLogoUrl = (match.project as Record<string, unknown>)?.logo_url as string | undefined || clubLogoUrl;
  const homeLogo = (match.metadata?.identity?.home_team_logo_url as string | undefined)
    || (sheet.isHome ? ownLogoUrl : opponentLogoUrl);
  const awayLogo = (match.metadata?.identity?.away_team_logo_url as string | undefined)
    || (!sheet.isHome ? ownLogoUrl : opponentLogoUrl);
  const homeName = sheet.isHome ? sheet.teamName : sheet.opponent;
  const awayName = sheet.isHome ? sheet.opponent : sheet.teamName;

  // Fetch media for "Bekijk" preview URLs
  const content = useContentSheet(match);

  // Goal conditional: only count goal subtype when goals were actually scored
  const hasGoals = Boolean(
    (match.metadata?.home_score as number | undefined) ||
    (match.metadata?.away_score as number | undefined),
  );

  /** Subtypes that are visually disabled (not yet available) */
  const disabledSubtypes = new Set(
    (['pre_match', 'during_match', 'post_match'] as const).flatMap(key => {
      const phase = CONTENT_TYPES[key];
      if (!phase) return [];
      return phase.items.filter(i => !i.enabled).map(i => i.subtype);
    }),
  );

  /** Subtypes excluded from readiness % (disabled + goal when no goals scored) */
  const excludedFromReadiness = new Set([
    ...disabledSubtypes,
    ...(!hasGoals ? ['goal'] : []),
  ]);

  // Overall readiness — only count enabled (and non-excluded) items
  const totalContentItems =
    (['pre_match', 'during_match', 'post_match'] as const).reduce((sum, key) => {
      const phase = CONTENT_TYPES[key];
      if (!phase) return sum;
      return sum + phase.items.filter(i => !excludedFromReadiness.has(i.subtype)).length;
    }, 0);
  const doneEnabledCount = sheet.contentDoneSubtypes.filter(s => !excludedFromReadiness.has(s)).length;
  const readinessPercent = totalContentItems > 0
    ? Math.round((doneEnabledCount / totalContentItems) * 100)
    : 0;

  // Handle "Bekijk" click — find media URL and show in preview modal
  const handlePreview = useCallback((subtype: string, label: string) => {
    const media = content.getLatestMediaForSubtype(subtype);
    if (media?.file_url) {
      const isVideo = media.mime_type?.includes('video') ||
                      media.file_url.match(/\.(mp4|webm|mov)(\?|$)/i) !== null;
      onPreviewContent(media.file_url, isVideo, label);
    }
  }, [content.getLatestMediaForSubtype, onPreviewContent]);

  return (
    <div className={styles.sheetContent}>
      {/* Match overview */}
      <div className={styles.sheetMatchHeader}>
        <span className={`${styles.badge} ${styles[`badge_${sheet.matchState}`]}`}>
          {sheet.matchState === 'live' ? 'LIVE' : sheet.matchState === 'upcoming' ? 'Aankomend' : 'Gespeeld'}
        </span>
        <button
          type="button"
          className={`${styles.activeBadge} ${isActiveMatch ? styles.activeBadgeOn : ''}`}
          onClick={onToggleActive}
          title={isActiveMatch ? 'Niet meer actief' : 'Markeer als actief'}
          aria-pressed={isActiveMatch}
        >
          <Star size={14} /> {isActiveMatch ? 'Actief' : 'Activeer'}
        </button>
        <span className={`${styles.timeLabel} ${styles[`time_${urgency}`]}`}>
          {relTime}
        </span>
      </div>

      <div className={styles.sheetTeams}>
        <div className={styles.sheetTeam}>
          <Avatar src={homeLogo} name={homeName} size="sm" alt={`${homeName} logo`} />
          <span className={styles.sheetTeamName}>{homeName}</span>
        </div>
        <div className={styles.sheetScore}>
          {sheet.score ? <span>{sheet.score}</span> : <span className={styles.vsLabel}>vs</span>}
        </div>
        <div className={styles.sheetTeam}>
          <Avatar src={awayLogo} name={awayName} size="sm" alt={`${awayName} logo`} />
          <span className={styles.sheetTeamName}>{awayName}</span>
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
        {/* Period/competition name hidden — adds noise without value (roadmap #21 H0) */}
      </div>

      {/* Overall readiness bar */}
      <div className={styles.readinessBar}>
        <div className={styles.readinessBarHeader}>
          <span className={styles.readinessBarLabel}>Wedstrijd gereedheid</span>
          <span className={styles.readinessBarValue}>{readinessPercent}%</span>
        </div>
        <div className={styles.readinessBarTrack}>
          <div
            className={styles.readinessBarFill}
            style={{ width: `${readinessPercent}%` }}
            data-complete={readinessPercent === 100 ? 'true' : 'false'}
          />
        </div>
        <span className={styles.readinessBarSub}>
          {doneEnabledCount} van {totalContentItems} items{hasLineup ? ' · Opstelling klaar' : ''}
        </span>
      </div>

      {/* Quick actions */}
      <div className={styles.sheetActions}>
        {/* Lineup */}
        <button
          className={`${styles.sheetAction} ${hasLineup ? styles.sheetActionDone : ''}`}
          onClick={onEditLineup}
        >
          {hasLineup ? (
            <CheckCircle2 size={18} className={styles.iconDone} />
          ) : (
            <Users size={18} />
          )}
          <div className={styles.sheetActionText}>
            <span className={styles.sheetActionLabel}>Opstelling</span>
            <span className={styles.sheetActionSub}>
              {hasLineup
                ? `${sheet.lineupCount} spelers${sheet.lineupFormation ? ` · ${sheet.lineupFormation}` : ''}`
                : 'Opstelling invullen'
              }
            </span>
          </div>
          {hasLineup && <span className={styles.readyBadge}>Klaar</span>}
          <ChevronRight size={16} />
        </button>

        {/* Content phase blocks */}
        {([
          { key: 'pre_match' as const, phase: CONTENT_TYPES.pre_match },
          { key: 'during_match' as const, phase: CONTENT_TYPES.during_match },
          { key: 'post_match' as const, phase: CONTENT_TYPES.post_match },
        ]).map(({ key, phase }) => {
          if (!phase) return null;
          const enabledItems = phase.items.filter(i => !excludedFromReadiness.has(i.subtype));
          const total = enabledItems.length;
          const doneCount = enabledItems.filter(i =>
            sheet.contentDoneSubtypes.includes(i.subtype),
          ).length;
          const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
          const allDone = total > 0 && doneCount === total;
          const isExpanded = sheet.expandedPhases.has(key);
          const contentPhase = PHASE_MAP[key];

          return (
            <div key={key} className={styles.phaseBlock}>
              <button
                className={styles.phaseHeader}
                onClick={() => sheet.togglePhase(key)}
                aria-expanded={isExpanded}
                aria-label={`${phase.label} ${doneCount}/${total} — ${isExpanded ? 'inklappen' : 'uitklappen'}`}
              >
                <div className={styles.phaseHeaderLeft}>
                  {allDone ? (
                    <CheckCircle2 size={16} className={styles.iconDone} />
                  ) : (
                    <FileImage size={16} />
                  )}
                  <span className={styles.phaseTitle}>{phase.label}</span>
                </div>
                <div className={styles.phaseHeaderRight}>
                  <span className={styles.phaseCount}>{doneCount}/{total}</span>
                  <ChevronDown
                    size={16}
                    className={`${styles.phaseChevron} ${isExpanded ? styles.phaseChevronOpen : ''}`}
                  />
                </div>
              </button>
              <div className={styles.phaseProgressTrack}>
                <div
                  className={styles.phaseProgressFill}
                  style={{ width: `${pct}%` }}
                  data-done={allDone ? 'true' : 'false'}
                />
              </div>

              <div className={`${styles.phaseItems} ${isExpanded ? styles.phaseItemsOpen : ''}`}>
                {phase.items.map((item) => {
                  const isDisabled = disabledSubtypes.has(item.subtype);
                  const isDone = !isDisabled && sheet.contentDoneSubtypes.includes(item.subtype);
                  const ItemIcon = SUBTYPE_ICONS[item.subtype] ?? FileImage;
                  return (
                    <div key={item.id} className={`${styles.phaseItem} ${isDisabled ? styles.phaseItemDisabled : ''}`}>
                      <button
                        className={styles.phaseItemBtn}
                        onClick={() => {
                          if (!isDisabled) onStartContent(item.subtype, contentPhase);
                        }}
                        disabled={isDisabled}
                        aria-label={`${item.label}: ${isDisabled ? 'binnenkort beschikbaar' : isDone ? 'opnieuw aanmaken' : 'maak aan'}`}
                      >
                        <span className={`${styles.phaseItemIcon} ${isDone ? styles.phaseItemIconDone : ''}`}>
                          {isDone ? (
                            <CheckCircle2 size={16} className={styles.iconDone} />
                          ) : (
                            <ItemIcon size={16} />
                          )}
                        </span>
                        <span className={`${styles.phaseItemLabel} ${isDone ? styles.phaseItemDone : ''}`}>
                          {item.label}
                        </span>
                        {isDisabled ? (
                          <span className={styles.phaseItemAction} data-variant="disabled">Binnenkort</span>
                        ) : isDone ? (
                          <span className={styles.phaseItemAction} data-variant="create">Opnieuw →</span>
                        ) : (
                          <span className={styles.phaseItemAction} data-variant="create">Maak →</span>
                        )}
                      </button>
                      {isDone && (
                        <button
                          className={styles.phaseItemPreviewBtn}
                          onClick={() => handlePreview(item.subtype, item.label)}
                          aria-label={`${item.label} bekijken`}
                          title="Bekijk"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <button
          className={`${styles.sheetAction} ${styles.sheetActionPrimary}`}
          onClick={() => onNavigateToMatch()}
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
  );
};
