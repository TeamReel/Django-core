import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, Card } from '@django-core/design-system';
import SmartEmptyState from '../../components/SmartEmptyState';
import { periodPathKey } from '../../utils/periodPath';
import { CONTENT_TYPES } from '../identity/ContentGenerationModal';
import styles from './CompetitionContentTab.module.css';

type MatchRecord = Record<string, any>;

export interface CompetitionContentTabProps {
  matches: MatchRecord[];
  matchMediaMap: Record<string, Record<string, unknown>[]>;
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
    return items.find((m) => String(m.subtype || m.media_subtype || '').toLowerCase() === subtype.toLowerCase());
  };

  return (
    <Card title="Content Matrix">
      <div className="p-16">
        {matchMediaLoading ? (
          <Alert variant="info">Media laden…</Alert>
        ) : sortedMatches.length === 0 ? (
          <SmartEmptyState type="matches" compact hideActions />
        ) : (
          <div className="overflow-x-auto">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thMatch}>Wedstrijd</th>
                  <th className={styles.thDate}>Datum</th>
                  {matchContentTypes.map(ct => (
                    <th key={ct.id} className={styles.thContentType} title={ct.label}>
                      {ct.icon}
                    </th>
                  ))}
                  <th className={styles.thScore}>Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatches.map((match) => {
                  const matchId = String(match.id);
                  const done = matchContentTypes.filter(ct => getMediaForMatch(matchId, ct.subtype)).length;
                  return (
                    <tr key={matchId} className={styles.matchRow}>
                      <td className={styles.tdMatch}>
                        {(() => {
                          const compId = String(match.period_id || match.period?.id || '').trim();
                          const compKey = periodPathKey(match.period || null) || compId;
                          const matchKey = match.slug || match.id;
                          const matchPath = isTeamRoute
                            ? `/${orgSlugOrId}/${clubSlugOrId}/${projectSlugOrId}/${seasonKeyOrId}/${compKey}/${String(matchKey)}`
                            : `/matches/${String(matchKey)}`;
                          return (
                            <Link to={matchPath} className={styles.matchLink}>
                              {matchDisplayTitle(match)}
                            </Link>
                          );
                        })()}
                      </td>
                      <td className={styles.tdDate}>
                        {match.start_time ? new Date(match.start_time).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }) : '—'}
                      </td>
                      {matchContentTypes.map(ct => {
                        const media = getMediaForMatch(matchId, ct.subtype);
                        return (
                          <td key={ct.id} className={styles.tdContentType}>
                            <span title={media ? 'Gereed' : 'Niet gemaakt'} className={styles.statusIcon}>
                              {media ? '✅' : '⬜'}
                            </span>
                          </td>
                        );
                      })}
                      <td className={styles.tdScore} data-has-content={done > 0}>
                        {done}/{matchContentTypes.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Legend */}
            <div className={`mt-12 flex-row gap-16 flex-wrap ${styles.legend}`}>
              <span>Gereed</span>
              <span>Niet gemaakt</span>
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
