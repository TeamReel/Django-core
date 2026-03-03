import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card } from '@django-core/design-system';
import { periodPathKey } from '../../utils/periodPath';
import { CONTENT_TYPES } from '../identity/ContentGenerationModal';

export interface CompetitionContentTabProps {
  matches: any[];
  matchMediaMap: Record<string, any[]>;
  matchMediaLoading: boolean;
  matchDisplayTitle: (m: any) => string;
  isTeamRoute: boolean;
  orgSlugOrId: string;
  clubSlugOrId: string;
  projectSlugOrId: string;
  seasonKeyOrId: string;
}

export function CompetitionContentTab({
  matches,
  matchMediaMap,
  matchMediaLoading,
  matchDisplayTitle,
  isTeamRoute,
  orgSlugOrId,
  clubSlugOrId,
  projectSlugOrId,
  seasonKeyOrId,
}: CompetitionContentTabProps) {
  const matchContentTypes = [
    ...CONTENT_TYPES.pre_match.items,
    ...CONTENT_TYPES.during_match.items,
    ...CONTENT_TYPES.post_match.items,
  ];

  // Sort matches by date (earliest first)
  const sortedMatches = [...matches].sort((a, b) => {
    const da = a.start_time ? new Date(a.start_time).getTime() : 0;
    const db = b.start_time ? new Date(b.start_time).getTime() : 0;
    return da - db;
  });

  const getMediaForMatch = (matchId: string, subtype: string) => {
    const items = matchMediaMap[matchId] || [];
    return items.find((m: any) => String(m.subtype || m.media_subtype || '').toLowerCase() === subtype.toLowerCase());
  };

  return (
    <Card title="📊 Content Matrix">
      <div className="p-16">
        {matchMediaLoading ? (
          <Alert variant="info">Media laden…</Alert>
        ) : sortedMatches.length === 0 ? (
          <Alert variant="info">Geen wedstrijden gevonden.</Alert>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{
                    textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--app-border, #333)',
                    fontWeight: 700, color: 'var(--app-text-secondary, #999)', fontSize: 11,
                    position: 'sticky', left: 0, background: 'var(--app-surface, #1a1a1a)', zIndex: 1,
                    minWidth: 160,
                  }}>Wedstrijd</th>
                  <th style={{
                    textAlign: 'left', padding: '8px 6px', borderBottom: '2px solid var(--app-border, #333)',
                    fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 11,
                    minWidth: 80,
                  }}>Datum</th>
                  {matchContentTypes.map(ct => (
                    <th key={ct.id} style={{
                      textAlign: 'center', padding: '8px 4px',
                      borderBottom: '2px solid var(--app-border, #333)',
                      fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 10,
                      minWidth: 36, maxWidth: 50,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }} title={ct.label}>
                      {ct.icon}
                    </th>
                  ))}
                  <th style={{
                    textAlign: 'center', padding: '8px 6px',
                    borderBottom: '2px solid var(--app-border, #333)',
                    fontWeight: 600, color: 'var(--app-text-secondary, #999)', fontSize: 11,
                  }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatches.map((match) => {
                  const matchId = String(match.id);
                  const done = matchContentTypes.filter(ct => getMediaForMatch(matchId, ct.subtype)).length;
                  return (
                    <tr key={matchId} style={{ borderBottom: '1px solid var(--app-border, #222)' }}>
                      <td style={{
                        padding: '6px 10px', fontWeight: 600, fontSize: 12,
                        position: 'sticky', left: 0, background: 'var(--app-surface, #1a1a1a)', zIndex: 1,
                        maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {(() => {
                          const compId = String((match as any).period_id || match.period?.id || '').trim();
                          const compKey = periodPathKey((match as any).period || null) || compId;
                          const matchKey = (match as any).slug || match.id;
                          const matchPath = isTeamRoute
                            ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}/${compKey}/${String(matchKey)}`
                            : `/matches/${String(matchKey)}`;
                          return (
                            <Link to={matchPath} style={{ textDecoration: 'none', color: '#60a5fa' }} className="hover:underline">
                              {matchDisplayTitle(match)}
                            </Link>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '6px 6px', fontSize: 11, color: 'var(--app-text-secondary, #999)', whiteSpace: 'nowrap' }}>
                        {match.start_time ? new Date(match.start_time).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) : '—'}
                      </td>
                      {matchContentTypes.map(ct => {
                        const media = getMediaForMatch(matchId, ct.subtype);
                        return (
                          <td key={ct.id} style={{ textAlign: 'center', padding: '6px 4px' }}>
                            <span title={media ? 'Gereed' : 'Niet gemaakt'} style={{ cursor: 'default', fontSize: 14 }}>
                              {media ? '✅' : '⬜'}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center', padding: '6px 6px', fontSize: 11, fontWeight: 600, color: done > 0 ? 'var(--color-green-400)' : 'var(--app-text-secondary, #999)' }}>
                        {done}/{matchContentTypes.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Legend */}
            <div className="mt-12 flex-row gap-16 flex-wrap" style={{ fontSize: 11, color: 'var(--app-text-secondary, #999)' }}>
              <span>✅ = Gereed</span>
              <span>⬜ = Niet gemaakt</span>
              {matchContentTypes.map(ct => (
                <span key={ct.id} title={ct.label}>{ct.icon} {ct.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
