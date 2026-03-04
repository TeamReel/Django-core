import React from 'react';
import { Badge } from '@django-core/design-system';
import { CONTENT_TYPES } from '../../identity/ContentGenerationModal';
import styles from './MatchOverviewTab.module.css';
import type { MatchMediaItem } from '../../../components/MediaAssetCard';
import type {
  Organisation,
  MatchDetail,
  Period,
  Participation,
  ActivityEvent,
  ContentItem,
} from './types';

interface MatchOverviewTabProps {
  match: MatchDetail;
  org: Organisation | null;
  competition: Period | null;
  isHome: boolean;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  scoreDisplay: string;
  status: string;
  date: Date | null;
  homeParticipations: Participation[];
  awayParticipations: Participation[];
  matchEvents: ActivityEvent[];
  getLatestMediaForSubtype: (subtype: string) => MatchMediaItem | null;
  getContentItemForSubtype: (subtype: string) => ContentItem | null;
  /** Called when user taps a content row to generate or preview */
  onContentAction?: (subtype: string, label: string) => void;
}

export default function MatchOverviewTab({
  match,
  competition,
  isHome,
  homeTeamName,
  awayTeamName,
  homeLogoUrl,
  awayLogoUrl,
  scoreDisplay,
  status,
  date,
  homeParticipations,
  awayParticipations,
  matchEvents,
  getLatestMediaForSubtype,
  getContentItemForSubtype,
  onContentAction,
}: MatchOverviewTabProps) {
  // Logo URLs are passed from parent (resolved via useBrandProfile)

  // Content stats
  const allMatchContentItems = [
    ...CONTENT_TYPES.pre_match.items,
    ...CONTENT_TYPES.during_match.items,
    ...CONTENT_TYPES.post_match.items,
  ];
  const contentDone = allMatchContentItems.filter(
    (i) => getLatestMediaForSubtype(i.subtype) != null
  ).length;
  const contentGenerating = allMatchContentItems.filter((i) => {
    const ci = getContentItemForSubtype(i.subtype);
    return ci != null && ['queued', 'generating'].includes(ci.status);
  }).length;
  const contentTotal = allMatchContentItems.length;

  // Lineup stats — lineup is saved in match.metadata.lineup, NOT in participations
  const savedLineup = match.metadata?.lineup;
  const lineupGk = savedLineup?.goalkeeper?.filter(Boolean) || [];
  const lineupPlayers = savedLineup?.player?.filter(Boolean) || [];
  const lineupFilledCount = lineupGk.length + lineupPlayers.length;
  const lineupFormation = savedLineup?.formation || match.metadata?.formation || '';

  // Render small team logo or fallback
  const TeamLogo = ({ url, fallback, size = 40 }: { url: string | null; fallback: string; size?: number }) =>
    url ? (
      <img
        src={url}
        alt=""
        className="rounded-6 object-contain"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        className={`flex-center rounded-6 ${styles.teamLogoFallback}`}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {fallback}
      </div>
    );

  return (
    <div className="flex-col gap-12">
      {/* ── Scoreboard (compact) ──────────────────────────────────────── */}
      <div
        className="rounded-12 border bg-surface px-12 py-16"
      >
        <div className="flex-center gap-12">
          {/* Home */}
          <div className="flex-col gap-4 flex-1 items-center">
            <TeamLogo url={homeLogoUrl} fallback="🏠" size={44} />
            <span className="fs-13 fw-700 text-center leading-tight">
              {homeTeamName}
            </span>
          </div>

          {/* Score block */}
          <div className={`text-center ${styles.scoreBlock}`}>
            <div className={`fw-800 ${styles.scoreDisplay}`}>{scoreDisplay}</div>
            <Badge
              variant={status === 'finished' ? 'success' : status === 'live' ? 'error' : 'default'}
              size="sm"
              className={styles.statusBadge}
            >
              {status.toUpperCase()}
            </Badge>
            <div className="fs-12 text-muted mt-4">
              {date
                ? date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) +
                  ' • ' +
                  date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </div>
          </div>

          {/* Away */}
          <div className="flex-col gap-4 flex-1 items-center">
            <TeamLogo url={awayLogoUrl} fallback="⚽" size={44} />
            <span className="fs-13 fw-700 text-center leading-tight">
              {awayTeamName}
            </span>
          </div>
        </div>

        {/* Venue + competition */}
        <div
          className="text-center border-top mt-12 fs-12 text-muted pt-8"
        >
          📍 {match.location || match.metadata?.venue || 'Onbekend'} • 🏆{' '}
          {competition?.name || match.period?.name || 'Competitie'}
        </div>
      </div>

      {/* ── Quick status cards ────────────────────────────────────────── */}
      <div className="grid-cols-2 gap-8">
        {/* Lineup status */}
        <div
          className={`border bg-surface p-12 ${styles.statusCard}`}
        >
          <div className={`fs-11 fw-600 text-muted uppercase tracking-wide ${styles.statusCardLabel}`}>
            Opstelling
          </div>
          {lineupFilledCount > 0 ? (
            <div className="flex-row gap-6">
              <span className="fs-20">✅</span>
              <div>
                <div className="fs-14 fw-700 text-success">Ingevuld</div>
                <div className="fs-11 text-muted">
                  {lineupFilledCount} spelers{lineupFormation ? ` • ${lineupFormation}` : ''}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-row gap-6">
              <span className="fs-20">⬜</span>
              <div>
                <div className="fs-14 fw-700 text-muted">Niet ingevuld</div>
              </div>
            </div>
          )}
        </div>

        {/* Content status */}
        <div
          className={`border bg-surface p-12 ${styles.statusCard}`}
        >
          <div className={`fs-11 fw-600 text-muted uppercase tracking-wide ${styles.statusCardLabel}`}>
            Content
          </div>
          <div className="flex-row gap-6">
            <span className="fs-20">{contentDone > 0 ? '🟢' : '⬜'}</span>
            <div>
              <div className={`fs-14 fw-700 ${styles.contentStatusValue}`} data-has-content={contentDone > 0 ? 'true' : 'false'}>
                {contentDone}/{contentTotal}
              </div>
              <div className="fs-11 text-muted">
                {contentGenerating > 0 ? `${contentGenerating} bezig` : contentDone > 0 ? 'gereed' : 'niet gemaakt'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content checklist (compact) ───────────────────────────────── */}
      {(['pre_match', 'during_match', 'post_match'] as const).map((categoryKey) => {
        const category = CONTENT_TYPES[categoryKey];
        if (!category) return null;

        return (
          <div key={categoryKey}>
            <div className={`status-label ${styles.categoryLabel}`}>
              {category.label}
            </div>
            <div className="border overflow-hidden bg-surface rounded-8">
              {category.items.map((item, idx) => {
                const latestMedia = getLatestMediaForSubtype(item.subtype);
                const existingItem = getContentItemForSubtype(item.subtype);
                const isGenerating = existingItem != null && ['queued', 'generating'].includes(existingItem.status);
                const isFailed = existingItem?.status === 'failed';
                const hasMedia = latestMedia != null;

                let statusIcon = '⬜';
                let statusColor = 'var(--app-muted-text, #666)';
                if (isGenerating) { statusIcon = '⏳'; statusColor = 'var(--color-amber-400)'; }
                else if (isFailed) { statusIcon = '❌'; statusColor = 'var(--color-red-500)'; }
                else if (hasMedia) { statusIcon = '✅'; statusColor = 'var(--color-green-400)'; }

                return (
                  <div
                    key={item.id}
                    onClick={() => onContentAction?.(item.subtype, item.label)}
                    className={`flex-row gap-8 px-12 py-8 fs-13 ${styles.contentRow}`}
                    data-clickable={onContentAction ? 'true' : 'false'}
                  >
                    <span className="fs-14">{statusIcon}</span>
                    <span className="fs-15">{item.icon}</span>
                    <span className="flex-1 fw-500 text-primary">
                      {item.label}
                    </span>
                    {hasMedia && !isGenerating ? (
                      <span className="fs-11 fw-600 text-success">Bekijk ↗</span>
                    ) : isGenerating ? (
                      <span className="fs-11 fw-600 text-warning">⏳ Bezig</span>
                    ) : isFailed ? (
                      <span className="fs-11 fw-600 text-error">Opnieuw ↻</span>
                    ) : (
                      <span className={`fs-11 fw-600 ${styles.actionCreate}`}>Maak →</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── Match Events (compact) ────────────────────────────────────── */}
      {matchEvents.length > 0 && (
        <div>
          <div className={`status-label ${styles.categoryLabel}`}>
            Wedstrijdverloop
          </div>
          <div className="border overflow-hidden bg-surface rounded-8">
            {matchEvents.map((evt, idx) => {
              const isHome = String(evt.team_project?.id || '') === String(match.project?.id || '');
              const icon = (() => {
                switch (String(evt.event_type || '').toLowerCase()) {
                  case 'goal': return '⚽';
                  case 'card_yellow': return '🟨';
                  case 'card_red': return '🟥';
                  case 'substitution': return '🔄';
                  case 'injury': return '🚑';
                  default: return '•';
                }
              })();
              return (
                <div
                  key={evt.id}
                  className={`flex-row gap-8 fs-13 px-12 py-6 ${styles.eventRow}`}
                >
                  <span className={`fs-12 fw-700 text-muted text-right ${styles.eventMinute}`}>
                    {evt.minute}'
                  </span>
                  <span>{icon}</span>
                  <span className="flex-1 fw-500">
                    {evt.member?.user_name || 'Onbekend'}
                    {evt.related_member && (
                      <span className="fs-11 text-muted ml-4">
                        ({evt.related_member.user_name})
                      </span>
                    )}
                  </span>
                  <span className={`text-muted ${styles.eventTeamName}`}>
                    {isHome ? homeTeamName : awayTeamName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
