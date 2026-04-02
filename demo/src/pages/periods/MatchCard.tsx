/**
 * MatchCard — expandable card for a single match in SeasonMatchesTab.
 */
import React, { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Users, Clapperboard,
  MapPin, CheckCircle2, Circle, Loader2, Zap, Eye, Star,
} from 'lucide-react';
import { CONTENT_TYPES } from '../../components/MatchWizardV2/types';
import styles from './SeasonMatchesTab.module.css';

/** Minimal match shape consumed by MatchCard — compatible with MatchRecord and Activity. */
interface MatchCardMatch {
  id: string;
  start_time?: string;
  location?: string;
  period?: { id?: string; name?: string } | null;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

// ── Helper re-exports used by the card ──
function getLineupInfo(match: MatchCardMatch) {
  const lineupMeta = match?.metadata?.lineup as Record<string, unknown> | undefined;
  if (!lineupMeta) return { filled: false, count: 0, formation: '' };
  const positions = (lineupMeta.positions as unknown[]) || [];
  return {
    filled: positions.length > 0,
    count: positions.length,
    formation: (lineupMeta.formation as string) || '',
  };
}

function getScoreDisplay(match: MatchCardMatch): string | null {
  const md = match?.metadata;
  if (!md) return null;
  const home = md.score_home ?? md.home_score;
  const away = md.score_away ?? md.away_score;
  if (home == null || away == null) return null;
  return `${home} – ${away}`;
}

// ── Types ──
interface ContentDetail {
  mediaCount: number;
  generatingCount: number;
  totalChecked: number;
  mediaSubtypes: string[];
  generatingSubtypes: string[];
}

export interface MatchCardProps {
  match: MatchCardMatch;
  expanded: boolean;
  onToggle: () => void;
  contentDetail?: ContentDetail;
  contentLoading: boolean;
  matchDisplayTitle: (m: MatchCardMatch) => string;
  matchPath: string;
  isActive: boolean;
  onSetActive: () => void;
}

/** Content phases for breakdown display. */
const CONTENT_PHASES: { key: string; label: string; items: typeof CONTENT_TYPES.pre }[] = [
  { key: 'pre', label: 'Pre-match', items: CONTENT_TYPES.pre },
  { key: 'during', label: 'Tijdens', items: CONTENT_TYPES.during },
  { key: 'post', label: 'Na afloop', items: CONTENT_TYPES.post },
];

const MatchCard = memo(function MatchCard({
  match, expanded, onToggle, contentDetail, contentLoading, matchDisplayTitle, matchPath,
  isActive, onSetActive,
}: MatchCardProps) {
  const [contentExpanded, setContentExpanded] = useState(false);
  const date = match.start_time ? new Date(match.start_time) : null;
  const lineup = getLineupInfo(match);
  const score = getScoreDisplay(match);
  const matchLocation = String(match.location || match.metadata?.venue || '');
  const competition = String(match.period?.name || '');

  const metaParts: string[] = [];
  if (date) {
    metaParts.push(date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }));
  }
  if (matchLocation) metaParts.push(matchLocation);
  if (competition) metaParts.push(competition);

  return (
    <div className={`${styles.card} ${isActive ? styles.cardActive : ''}`} data-expanded={expanded}>
      {/* Header row — always visible */}
      <button className={styles.cardHeader} onClick={onToggle} type="button" aria-expanded={expanded}>
        {/* Date badge */}
        {date ? (
          <div className={styles.dateBadge}>
            <div className={styles.dateDay}>{date.getDate()}</div>
            <div className={styles.dateMonth}>
              {date.toLocaleDateString('nl-NL', { month: 'short' })}
            </div>
          </div>
        ) : (
          <div className={styles.dateBadge}>
            <div className={styles.dateDay}>—</div>
          </div>
        )}

        {/* Title + meta */}
        <div className={styles.cardInfo}>
          <div className={styles.matchTitle}>
            {isActive && <Star size={12} className={styles.activeStar} />}
            {matchDisplayTitle(match)}
          </div>
          <div className={styles.matchMeta}>{metaParts.join(' · ') || '—'}</div>
        </div>

        {/* Mini indicators */}
        <div className={styles.indicators}>
          <div className={styles.indicatorLineup} data-ready={lineup.filled} title={lineup.filled ? `Opstelling: ${lineup.count} spelers` : 'Geen opstelling'}>
            <Users size={12} />
          </div>
          {score && <div className={styles.scoreBadge}>{score}</div>}
        </div>

        <ChevronRight size={16} className={styles.chevron} data-expanded={expanded} />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className={styles.cardBody}>
          {/* Lineup status */}
          <div className={styles.statusRow}>
            <div className={lineup.filled ? styles.statusIconGreen : styles.statusIconMuted}>
              {lineup.filled ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            </div>
            <div className={styles.statusInfo}>
              <div className={styles.statusLabel}>Opstelling</div>
              <div className={styles.statusDetail}>
                {lineup.filled
                  ? `${lineup.count} spelers${lineup.formation ? ` · ${lineup.formation}` : ''}`
                  : 'Nog niet ingevuld'}
              </div>
            </div>
          </div>

          {/* Content status */}
          <div
            className={`${styles.statusRow} ${styles.statusRowClickable}`}
            onClick={() => contentDetail && setContentExpanded((v) => !v)}
          >
            {contentLoading ? (
              <>
                <div className={styles.statusIconBlue}>
                  <Loader2 size={14} className={styles.spin} />
                </div>
                <div className={styles.statusInfo}>
                  <div className={styles.statusLabel}>Content</div>
                  <div className={styles.statusDetail}>Laden...</div>
                </div>
              </>
            ) : contentDetail ? (
              <>
                <div className={contentDetail.mediaCount > 0 ? styles.statusIconGreen : styles.statusIconMuted}>
                  <Clapperboard size={14} />
                </div>
                <div className={styles.statusInfo}>
                  <div className={styles.statusLabel}>
                    Content
                    <ChevronDown
                      size={12}
                      className={`${styles.contentChevron} ${contentExpanded ? styles.contentChevronOpen : ''}`}
                    />
                  </div>
                  <div className={styles.statusDetail}>
                    {contentDetail.mediaCount} / {contentDetail.totalChecked} gegenereerd
                    {contentDetail.generatingCount > 0 && ` · ${contentDetail.generatingCount} bezig`}
                  </div>
                  <div className={styles.contentProgressBar}>
                    <div
                      className={styles.contentProgressFill}
                      style={{ width: `${Math.round((contentDetail.mediaCount / contentDetail.totalChecked) * 100)}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className={styles.statusIconMuted}>
                  <Clapperboard size={14} />
                </div>
                <div className={styles.statusInfo}>
                  <div className={styles.statusLabel}>Content</div>
                  <div className={styles.statusDetail}>Tik om status te laden</div>
                </div>
              </>
            )}
          </div>

          {/* Expanded content breakdown */}
          {contentExpanded && contentDetail && (
            <div className={styles.contentBreakdown}>
              {CONTENT_PHASES.map((phase) => (
                <div key={phase.key} className={styles.contentPhase}>
                  <div className={styles.contentPhaseLabel}>{phase.label}</div>
                  <div className={styles.contentPhaseItems}>
                    {phase.items.map((item) => {
                      const hasMedia = contentDetail.mediaSubtypes.includes(item.key);
                      const isGenerating = contentDetail.generatingSubtypes.includes(item.subtype);
                      return (
                        <div key={item.key} className={styles.contentItem}>
                          <span className={styles.contentItemIcon}>
                            {hasMedia ? (
                              <span className="status-success"><CheckCircle2 size={12} /></span>
                            ) : isGenerating ? (
                              <span className="status-info"><Loader2 size={12} className={styles.spin} /></span>
                            ) : (
                              <span className="status-muted"><Circle size={12} /></span>
                            )}
                          </span>
                          <span className={styles.contentItemLabel}>{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Match info */}
          {(matchLocation || competition) && (
            <div className={styles.statusRow}>
              <div className={styles.statusIconMuted}>
                <MapPin size={14} />
              </div>
              <div className={styles.statusInfo}>
                <div className={styles.statusLabel}>Details</div>
                <div className={styles.statusDetail}>
                  {[matchLocation, competition].filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.actionBtn} ${isActive ? styles.actionBtnActiveOn : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSetActive();
              }}
              title={isActive ? 'Niet meer actief' : 'Markeer als actief'}
            >
              <Star size={14} /> {isActive ? 'Actief' : 'Actief'}
            </button>
            <Link to={matchPath} className={styles.actionBtn}>
              <Eye size={14} /> Bekijk
            </Link>
            <button
              type="button"
              className={styles.actionBtnPrimary}
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('teamreel:open-quick-create', {
                  detail: { matchId: String(match.id) },
                }));
              }}
            >
              <Zap size={14} /> Content
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default MatchCard;
