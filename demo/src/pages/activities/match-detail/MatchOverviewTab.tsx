import React from 'react';
import { Card, Badge } from '@django-core/design-system';
import { Table } from '../../../shims/design-system';
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
  // Derive logo URLs from club/project metadata
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

  // Content completion matrix: gather all match-level content types
  const allMatchContentItems = [
    ...CONTENT_TYPES.pre_match.items,
    ...CONTENT_TYPES.during_match.items,
    ...CONTENT_TYPES.post_match.items,
  ];

  const renderEventIcon = (type: string) => {
    switch (String(type || '').toLowerCase()) {
      case 'goal':
        return '⚽';
      case 'card_yellow':
        return '🟨';
      case 'card_red':
        return '🟥';
      case 'substitution':
        return 'cS';
      case 'injury':
        return '🚑';
      default:
        return '•';
    }
  };

  const renderLineup = (participations: Participation[] = []) => (
    <Table>
      <thead>
        <tr>
          <th className="w-12">#</th>
          <th>Name</th>
          <th className="w-16">Pos</th>
        </tr>
      </thead>
      <tbody>
        {participations.length === 0 ? (
          <tr>
            <td colSpan={3} className="text-gray-500 text-center py-4">
              No lineup available
            </td>
          </tr>
        ) : (
          participations.map((p) => (
            <tr
              key={p.id}
              className={
                String(p.role || '').toLowerCase() !== 'starter'
                  ? 'bg-gray-50'
                  : ''
              }
            >
              <td className="font-mono text-sm">
                {p.data?.jersey_number || '-'}
              </td>
              <td>
                <div className="font-medium">
                  {p.member?.user_name || 'Unknown Player'}
                  {p.data?.is_captain && (
                    <span className="ml-2 text-yellow-500" title="Captain">
                      ©
                    </span>
                  )}
                </div>
                {String(p.role || '').toLowerCase() !== 'starter' && p.role && (
                  <div className="text-xs text-gray-500 capitalize">
                    {p.role.replace('_', ' ')}
                  </div>
                )}
              </td>
              <td className="text-xs font-bold text-gray-400">
                {p.data?.position}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );

  return (
    <>
      <Card className="mb-6">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 16px',
          }}
        >
          {/* Home team */}
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {homeLogoUrl ? (
              <img
                src={homeLogoUrl}
                alt={homeTeamName}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: 'contain',
                  borderRadius: 8,
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  background: 'var(--app-surface-secondary, #2a2a2a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                🏠
              </div>
            )}
            <h3 style={{ fontSize: '1.25rem', marginBottom: 0, fontWeight: 700 }}>
              {homeTeamName}
            </h3>
          </div>

          {/* Score */}
          <div style={{ textAlign: 'center', minWidth: '140px' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>
              {scoreDisplay}
            </div>
            <div
              style={{
                marginTop: '12px',
                color: 'var(--app-text-secondary)',
              }}
            >
              <Badge
                variant={
                  status === 'finished'
                    ? 'success'
                    : status === 'live'
                      ? 'error'
                      : 'default'
                }
              >
                {status.toUpperCase()}
              </Badge>
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: '0.85rem',
                color: 'var(--app-text-secondary)',
              }}
            >
              {date
                ? `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : '—'}
            </div>
          </div>

          {/* Away team */}
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {awayLogoUrl ? (
              <img
                src={awayLogoUrl}
                alt={awayTeamName}
                style={{
                  width: 64,
                  height: 64,
                  objectFit: 'contain',
                  borderRadius: 8,
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  background: 'var(--app-surface-secondary, #2a2a2a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                ⚽
              </div>
            )}
            <h3 style={{ fontSize: '1.25rem', marginBottom: 0, fontWeight: 700 }}>
              {awayTeamName}
            </h3>
          </div>
        </div>

        <div
          style={{
            textAlign: 'center',
            borderTop: '1px solid var(--app-border)',
            padding: '10px 16px',
            color: 'var(--app-text-secondary)',
            fontSize: '0.9rem',
          }}
        >
          📍 {match.location || match.metadata?.venue || 'Unknown Venue'} • 🏆{' '}
          {competition?.name || match.period?.name || 'Competition'}
        </div>
      </Card>

      {/* Content Generation Matrix */}
      <Card title="📊 Content Status">
        <div style={{ padding: '16px' }}>
          <div className="overflow-x-auto">
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--app-border, #333)',
                      fontWeight: 600,
                      color: 'var(--app-text-secondary, #999)',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Fase
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--app-border, #333)',
                      fontWeight: 600,
                      color: 'var(--app-text-secondary, #999)',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Content
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '8px 10px',
                      borderBottom: '1px solid var(--app-border, #333)',
                      fontWeight: 600,
                      color: 'var(--app-text-secondary, #999)',
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: 80,
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {(
                  ['pre_match', 'during_match', 'post_match'] as const
                ).map((categoryKey) => {
                  const category = CONTENT_TYPES[categoryKey];
                  if (!category) return null;
                  return category.items.map((item, idx) => {
                    const latestMedia = getLatestMediaForSubtype(item.subtype);
                    const existingItem = getContentItemForSubtype(item.subtype);
                    const isGenerating =
                      existingItem != null &&
                      ['queued', 'generating'].includes(existingItem.status);
                    const isFailed = existingItem?.status === 'failed';
                    const hasMedia = latestMedia != null;

                    let statusIcon = '⬜';
                    let statusText = 'Niet gemaakt';
                    let statusColor = 'var(--app-text-secondary, #999)';
                    if (isGenerating) {
                      statusIcon = '⏳';
                      statusText = 'Bezig...';
                      statusColor = '#f59e0b';
                    } else if (isFailed) {
                      statusIcon = '❌';
                      statusText = 'Mislukt';
                      statusColor = '#ef4444';
                    } else if (hasMedia) {
                      statusIcon = '✅';
                      statusText = 'Gereed';
                      statusColor = '#10b981';
                    }

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom:
                            idx === category.items.length - 1
                              ? '2px solid var(--app-border, #333)'
                              : '1px solid var(--app-border, #222)',
                        }}
                      >
                        {idx === 0 && (
                          <td
                            rowSpan={category.items.length}
                            style={{
                              padding: '8px 10px',
                              fontWeight: 600,
                              fontSize: 12,
                              color: 'var(--app-text-secondary, #aaa)',
                              verticalAlign: 'top',
                              borderRight:
                                '1px solid var(--app-border, #333)',
                            }}
                          >
                            {category.label}
                          </td>
                        )}
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ marginRight: 6 }}>{item.icon}</span>
                          {item.label}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            textAlign: 'center',
                          }}
                        >
                          <span
                            title={statusText}
                            style={{
                              cursor: 'default',
                              color: statusColor,
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {statusIcon} {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              fontSize: 12,
              color: 'var(--app-text-secondary, #999)',
            }}
          >
            {(() => {
              const total = allMatchContentItems.length;
              const done = allMatchContentItems.filter(
                (item) => getLatestMediaForSubtype(item.subtype) != null
              ).length;
              const generating = allMatchContentItems.filter((item) => {
                const ci = getContentItemForSubtype(item.subtype);
                return (
                  ci != null &&
                  ['queued', 'generating'].includes(ci.status)
                );
              }).length;
              return (
                <>
                  <span>
                    ✅ {done}/{total} gereed
                  </span>
                  {generating > 0 && <span>⏳ {generating} bezig</span>}
                </>
              );
            })()}
          </div>
        </div>
      </Card>

      {/* Match Events & Lineups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Match Events">
          {matchEvents.length === 0 ? (
            <div className="text-gray-500 text-sm italic">
              No events recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {matchEvents.map((evt) => {
                const isHome =
                  String(evt.team_project?.id || '') ===
                  String(match.project?.id || '');
                return (
                  <div key={evt.id} className="flex items-center text-sm">
                    <div className="font-mono font-bold w-8 text-right mr-3 text-gray-400">
                      {evt.minute}'
                    </div>
                    <div
                      className={`flex-1 flex items-center ${isHome ? 'flex-row' : 'flex-row-reverse text-right'}`}
                    >
                      <span className="text-xl mx-2" title={evt.event_type}>
                        {renderEventIcon(evt.event_type)}
                      </span>
                      <div>
                        <div className="font-medium">
                          {evt.member?.user_name || 'Unknown'}
                        </div>
                        {evt.related_member && (
                          <div className="text-xs text-gray-500">
                            ({evt.related_member.user_name})
                          </div>
                        )}
                        {String(evt.event_type || '').toLowerCase() ===
                          'substitution' &&
                          evt.related_member && (
                            <div className="text-xs text-green-600">
                              IN: {evt.related_member.user_name}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Lineups">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                {homeTeamName}
              </div>
              {renderLineup(homeParticipations)}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                {awayTeamName}
              </div>
              {renderLineup(awayParticipations)}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
