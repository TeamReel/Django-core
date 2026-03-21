/**
 * MatchSummarySheet — Compacte wedstrijd-preview in NavigationSheet.
 *
 * Opent wanneer de gebruiker op een wedstrijd tapt in de hub.
 * De gebruiker blijft op de hub en kan optioneel doorklikken
 * via de "Ga naar wedstrijd" knop.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Trophy, ArrowRight } from 'lucide-react';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import type { MatchRecord } from '../periods/SeasonMatchesTab';
import s from './MatchSummarySheet.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MatchSummarySheetProps {
  match: MatchRecord | null;
  isOpen: boolean;
  onClose: () => void;
  matchDisplayTitle: (m: MatchRecord) => string;
  /** Full path to the MatchDetailPage for this match. */
  matchDetailPath: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getScore(m: MatchRecord): { home: string | number; away: string | number } | null {
  const meta = m.metadata;
  if (!meta) return null;
  const tr = meta.teamreel as Record<string, Record<string, unknown>> | undefined;
  const home = meta.score_home ?? tr?.match_context?.score_home;
  const away = meta.score_away ?? tr?.match_context?.score_away;
  if (home != null && away != null) return { home: home as string, away: away as string };
  return null;
}

function getStatus(m: MatchRecord): 'finished' | 'live' | 'scheduled' {
  const s = String(m.metadata?.status || 'scheduled').toLowerCase();
  if (s === 'finished' || s === 'completed') return 'finished';
  if (s === 'live' || s === 'in_progress') return 'live';
  return 'scheduled';
}

function formatDate(m: MatchRecord): string {
  const raw = m.start_time || m.date || m.metadata?.date;
  if (!raw) return '';
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_LABELS: Record<string, string> = {
  finished: 'Afgelopen',
  live: 'Live',
  scheduled: 'Gepland',
};

// ── Component ─────────────────────────────────────────────────────────────────

export const MatchSummarySheet: React.FC<MatchSummarySheetProps> = ({
  match,
  isOpen,
  onClose,
  matchDisplayTitle,
  matchDetailPath,
}) => {
  const navigate = useNavigate();

  const handleGoToMatch = () => {
    onClose();
    // Navigate after close animation starts
    setTimeout(() => navigate(matchDetailPath), 0);
  };

  const title = match ? matchDisplayTitle(match) : 'Wedstrijd';
  const score = match ? getScore(match) : null;
  const status = match ? getStatus(match) : 'scheduled';
  const dateStr = match ? formatDate(match) : '';
  const venue = match?.metadata?.venue as string | undefined;
  const competitionName = match?.period?.name;

  return (
    <NavigationSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      {match && (
        <div className={s.content}>
          {/* Score hero */}
          <div className={s.hero}>
            <div className={s.scoreRow}>
              {score ? (
                <span className={s.score}>
                  {score.home} - {score.away}
                </span>
              ) : (
                <span className={s.noScore}>vs</span>
              )}
            </div>

            <span
              className={s.statusBadge}
              data-status={status}
            >
              {STATUS_LABELS[status]}
            </span>
          </div>

          {/* Info section */}
          <div className={s.infoSection}>
            {dateStr && (
              <div className={s.infoRow}>
                <Calendar size={16} className={s.infoIcon} aria-hidden="true" />
                <span>{dateStr}</span>
              </div>
            )}
            {venue && (
              <div className={s.infoRow}>
                <MapPin size={16} className={s.infoIcon} aria-hidden="true" />
                <span>{venue}</span>
              </div>
            )}
            {competitionName && (
              <div className={s.infoRow}>
                <Trophy size={16} className={s.infoIcon} aria-hidden="true" />
                <span>{competitionName}</span>
              </div>
            )}
          </div>

          {/* Primary action */}
          <button
            className={s.actionButton}
            onClick={handleGoToMatch}
            type="button"
          >
            <span>Ga naar wedstrijd</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </NavigationSheet>
  );
};

export default MatchSummarySheet;
