/**
 * MatchSheet — Standalone match detail sheet (extracted from ActiveMatchCard).
 *
 * Shows match overview, lineup action, content phase blocks, and
 * a navigate-to-match link. Reusable by ActiveMatchCard + UpcomingMatchesCard.
 */
import React from 'react';
import {
  ChevronRight, ChevronDown, MapPin, Calendar, Trophy,
  CheckCircle2, Circle, ExternalLink, Users, FileImage,
} from 'lucide-react';
import { formatRelativeTime, getDateUrgency } from '../../utils/relativeTime';
import { NavigationSheet } from '../ui/NavigationSheet';
import { CONTENT_TYPES } from '../../pages/identity/ContentGenerationModal';
import type { Match } from './ActiveMatchCard';
import type { UseMatchSheetReturn } from './useMatchSheet';
import styles from './ActiveMatchCard.module.css';

interface MatchSheetProps {
  match: Match;
  sheet: UseMatchSheetReturn;
  onNavigateToMatch: (tab?: string) => void;
}

export const MatchSheet: React.FC<MatchSheetProps> = ({ match, sheet, onNavigateToMatch }) => {
  const date = new Date(match.start_time);
  const relTime = formatRelativeTime(date, 'nl');
  const urgency = getDateUrgency(date);
  const hasLineup = sheet.lineupCount > 0;

  return (
    <NavigationSheet
      isOpen={sheet.sheetOpen}
      onClose={sheet.closeSheet}
      title={match.title || `${sheet.teamName} vs ${sheet.opponent}`}
      icon={<Trophy size={18} />}
    >
      <div className={styles.sheetContent}>
        {/* Match overview */}
        <div className={styles.sheetMatchHeader}>
          <span className={`${styles.badge} ${styles[`badge_${sheet.matchState}`]}`}>
            {sheet.matchState === 'live' ? <><Circle size={8} fill="currentColor" /> LIVE</> : sheet.matchState === 'upcoming' ? 'Aankomend' : 'Gespeeld'}
          </span>
          <span className={`${styles.timeLabel} ${styles[`time_${urgency}`]}`}>
            {relTime}
          </span>
        </div>

        <div className={styles.sheetTeams}>
          <div className={styles.sheetTeam}>
            <span className={styles.sheetTeamName}>{sheet.isHome ? sheet.teamName : sheet.opponent}</span>
          </div>
          <div className={styles.sheetScore}>
            {sheet.score ? <span>{sheet.score}</span> : <span className={styles.vsLabel}>vs</span>}
          </div>
          <div className={styles.sheetTeam}>
            <span className={styles.sheetTeamName}>{sheet.isHome ? sheet.opponent : sheet.teamName}</span>
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
          {/* Lineup */}
          <button
            className={`${styles.sheetAction} ${hasLineup ? styles.sheetActionDone : ''}`}
            onClick={sheet.openLineupSheet}
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
            const total = phase.items.length;
            const doneCount = phase.items.filter(i =>
              sheet.contentDoneSubtypes.includes(i.subtype),
            ).length;
            const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
            const allDone = doneCount === total;
            const isExpanded = sheet.expandedPhases.has(key);

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
                    const isDone = sheet.contentDoneSubtypes.includes(item.subtype);
                    return (
                      <button
                        key={item.id}
                        className={styles.phaseItem}
                        onClick={() => {
                          if (isDone) {
                            sheet.openContentSheet();
                          } else {
                            sheet.openCreateWizard(item.subtype);
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
                        ) : (
                          <span className={styles.phaseItemAction} data-variant="create">Maak →</span>
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
    </NavigationSheet>
  );
};
