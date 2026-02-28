import React from 'react';
import { Badge } from '@django-core/design-system';
import { getAssetUrl } from '../../../hooks/useBrandProfile';
import { CONTENT_TYPES } from '../../identity/ContentGenerationModal';
import type { MatchMediaItem } from '../../../components/MediaAssetCard';
import type {
  Organisation,
  Project,
  MatchDetail,
  Period,
  Participation,
  ActivityEvent,
  ContentItem,
} from './types';

interface MatchOverviewTabProps {
  match: MatchDetail;
  org: Organisation | null;
  club: Project | null;
  project: Project | null;
  opponentClub: Project | null;
  competition: Period | null;
  homeTeamName: string;
  awayTeamName: string;
  scoreDisplay: string;
  status: string;
  date: Date | null;
  homeParticipations: Participation[];
  awayParticipations: Participation[];
  matchEvents: ActivityEvent[];
  getLatestMediaForSubtype: (subtype: string) => MatchMediaItem | null;
  getContentItemForSubtype: (subtype: string) => ContentItem | null;
}

export default function MatchOverviewTab({
  match,
  club,
  project,
  competition,
  homeTeamName,
  awayTeamName,
  scoreDisplay,
  status,
  date,
  homeParticipations,
  awayParticipations,
  matchEvents,
  getLatestMediaForSubtype,
  getContentItemForSubtype,
}: MatchOverviewTabProps) {
  // Derive logo URLs
  const homeLogoUrl = (() => {
    const assets =
      (club as any)?.metadata?.teamreel_assets ||
      (project as any)?.metadata?.teamreel_assets;
    const url = assets?.logo?.url;
    return url ? (url.startsWith('http') ? url : getAssetUrl(url)) : null;
  })();
  const awayLogoUrl = (() => {
    const url = match.metadata?.opponent_logo_url;
    return url ? (url.startsWith('http') ? url : getAssetUrl(url)) : null;
  })();

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

  // Lineup stats
  const lineupCount = homeParticipations.length + awayParticipations.length;
  const homeStarters = homeParticipations.filter(
    (p) => String(p.role || '').toLowerCase() === 'starter'
  ).length;

  // Render small team logo or fallback
  const TeamLogo = ({ url, fallback, size = 40 }: { url: string | null; fallback: string; size?: number }) =>
    url ? (
      <img
        src={url}
        alt=""
        style={{ width: size, height: size, objectFit: 'contain', borderRadius: 6 }}
      />
    ) : (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          background: 'var(--app-surface-secondary, #252526)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.45,
        }}
      >
        {fallback}
      </div>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── Scoreboard (compact) ──────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 12,
          border: '1px solid var(--app-border, #333)',
          background: 'var(--app-surface, #1e1e1e)',
          padding: '16px 12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {/* Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
            <TeamLogo url={homeLogoUrl} fallback="🏠" size={44} />
            <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
              {homeTeamName}
            </span>
          </div>

          {/* Score block */}
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{scoreDisplay}</div>
            <Badge
              variant={status === 'finished' ? 'success' : status === 'live' ? 'error' : 'default'}
              size="sm"
              style={{ marginTop: 6 }}
            >
              {status.toUpperCase()}
            </Badge>
            <div style={{ fontSize: 12, color: 'var(--app-muted-text, #888)', marginTop: 4 }}>
              {date
                ? date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) +
                  ' • ' +
                  date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
                : '—'}
            </div>
          </div>

          {/* Away */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
            <TeamLogo url={awayLogoUrl} fallback="⚽" size={44} />
            <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
              {awayTeamName}
            </span>
          </div>
        </div>

        {/* Venue + competition */}
        <div
          style={{
            textAlign: 'center',
            borderTop: '1px solid var(--app-border, #333)',
            marginTop: 12,
            paddingTop: 8,
            fontSize: 12,
            color: 'var(--app-muted-text, #888)',
          }}
        >
          📍 {match.location || match.metadata?.venue || 'Onbekend'} • 🏆{' '}
          {competition?.name || match.period?.name || 'Competitie'}
        </div>
      </div>

      {/* ── Quick status cards ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* Lineup status */}
        <div
          style={{
            borderRadius: 10,
            border: '1px solid var(--app-border, #333)',
            background: 'var(--app-surface, #1e1e1e)',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--app-muted-text, #888)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Opstelling
          </div>
          {lineupCount > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>Ingevuld</div>
                <div style={{ fontSize: 11, color: 'var(--app-muted-text, #888)' }}>
                  {homeStarters} spelers
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 20 }}>⬜</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--app-muted-text, #888)' }}>Niet ingevuld</div>
              </div>
            </div>
          )}
        </div>

        {/* Content status */}
        <div
          style={{
            borderRadius: 10,
            border: '1px solid var(--app-border, #333)',
            background: 'var(--app-surface, #1e1e1e)',
            padding: '12px',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--app-muted-text, #888)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            Content
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 20 }}>{contentDone > 0 ? '🟢' : '⬜'}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: contentDone > 0 ? '#10b981' : 'var(--app-muted-text, #888)' }}>
                {contentDone}/{contentTotal}
              </div>
              <div style={{ fontSize: 11, color: 'var(--app-muted-text, #888)' }}>
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
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.5px', color: 'var(--app-muted-text, #888)',
              marginBottom: 6, paddingLeft: 2,
            }}>
              {category.label}
            </div>
            <div style={{
              borderRadius: 10,
              border: '1px solid var(--app-border, #333)',
              overflow: 'hidden',
              background: 'var(--app-surface, #1e1e1e)',
            }}>
              {category.items.map((item, idx) => {
                const latestMedia = getLatestMediaForSubtype(item.subtype);
                const existingItem = getContentItemForSubtype(item.subtype);
                const isGenerating = existingItem != null && ['queued', 'generating'].includes(existingItem.status);
                const isFailed = existingItem?.status === 'failed';
                const hasMedia = latestMedia != null;

                let statusIcon = '⬜';
                let statusColor = 'var(--app-muted-text, #666)';
                if (isGenerating) { statusIcon = '⏳'; statusColor = '#f59e0b'; }
                else if (isFailed) { statusIcon = '❌'; statusColor = '#ef4444'; }
                else if (hasMedia) { statusIcon = '✅'; statusColor = '#10b981'; }

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      borderBottom: idx < category.items.length - 1 ? '1px solid var(--app-border, #222)' : 'none',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>{statusIcon}</span>
                    <span style={{ fontSize: 15 }}>{item.icon}</span>
                    <span style={{ flex: 1, fontWeight: 500, color: 'var(--app-text, #fff)' }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>
                      {isGenerating ? 'Bezig' : isFailed ? 'Mislukt' : hasMedia ? 'Gereed' : '—'}
                    </span>
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
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.5px', color: 'var(--app-muted-text, #888)',
            marginBottom: 6, paddingLeft: 2,
          }}>
            Wedstrijdverloop
          </div>
          <div style={{
            borderRadius: 10,
            border: '1px solid var(--app-border, #333)',
            overflow: 'hidden',
            background: 'var(--app-surface, #1e1e1e)',
          }}>
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderBottom: idx < matchEvents.length - 1 ? '1px solid var(--app-border, #222)' : 'none',
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'var(--app-muted-text, #666)', minWidth: 28, textAlign: 'right' }}>
                    {evt.minute}'
                  </span>
                  <span>{icon}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>
                    {evt.member?.user_name || 'Onbekend'}
                    {evt.related_member && (
                      <span style={{ fontSize: 11, color: 'var(--app-muted-text, #888)', marginLeft: 4 }}>
                        ({evt.related_member.user_name})
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--app-muted-text, #666)' }}>
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
