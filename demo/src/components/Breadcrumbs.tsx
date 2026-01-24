import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelection } from '../hooks/useAppSelection';
import { useContextSwitcher } from '@django-core/context-switcher';

export default function Breadcrumbs() {
  const location = useLocation();
  const { context } = useContextSwitcher();
  const {
    orgSlug,
    clubSlugOrId, clubName,
    teamSlugOrId, teamName,
    seasonSlugOrId, seasonName,
    competitionSlugOrId, competitionName,
    matchId
  } = useAppSelection();

  // Build the context chain
  const items = [];

  // Root: Organisation
  if (orgSlug) {
    const orgName = context?.organisation?.name || orgSlug;
    items.push({
        label: orgName,
        path: `/organisations/${orgSlug}`
    });
  }

  // Level 1: Club
  if (clubSlugOrId) {
    items.push({
        label: clubName || clubSlugOrId,
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}`
    });
  }

  // Level 2: Team
  if (teamSlugOrId) {
    items.push({
        label: teamName || teamSlugOrId,
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}`
    });
  }

  // Level 3: Season
  if (seasonSlugOrId) {
    items.push({
        label: seasonName || seasonSlugOrId,
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}`
    });
  }

  // Level 4: Competition
  if (competitionSlugOrId) {
    items.push({
        label: competitionName || competitionSlugOrId,
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}`
    });
  }

  // Level 5: Match
  if (matchId) {
    items.push({
        label: `Match ${matchId}`, // Todo: fetch match name/details if possible
        path: `/organisations/${orgSlug}/projects/${clubSlugOrId}/teams/${teamSlugOrId}/seasons/${seasonSlugOrId}/competitions/${competitionSlugOrId}/matches/${matchId}`
    });
  }

  // Handle "Members" leaf explicitly as requested
  // "Show 'Members' under Season context"
  if (seasonSlugOrId && location.pathname.endsWith('/members')) {
      items.push({
          label: 'Members',
          path: location.pathname, // Current page
          isLeaf: true
      });
  }

  // Work Hierarchy generic pages
  if (items.length === 0) {
      if (location.pathname === '/directory') items.push({ label: 'Directory', path: '/directory' });
      else if (location.pathname === '/federations') items.push({ label: 'Directory', path: '/directory' }, { label: 'Federations', path: '/federations' });
      else if (location.pathname === '/clubs') items.push({ label: 'Directory', path: '/directory' }, { label: 'Clubs', path: '/clubs' });
      else if (location.pathname === '/teams') items.push({ label: 'Directory', path: '/directory' }, { label: 'Teams', path: '/teams' });
      else if (location.pathname === '/seasons') items.push({ label: 'Directory', path: '/directory' }, { label: 'Seasons', path: '/seasons' });
      else if (location.pathname === '/competitions') items.push({ label: 'Directory', path: '/directory' }, { label: 'Competitions', path: '/competitions' });
      else if (location.pathname === '/matches') items.push({ label: 'Directory', path: '/directory' }, { label: 'Matches', path: '/matches' });
  }

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center' }}>
      <ol style={{
          display: 'flex',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          alignItems: 'center',
          flexWrap: 'wrap'
      }}>
        {items.map((item, index) => {
           const isLast = index === items.length - 1;
           return (
            <li key={item.path} style={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 && (
                    <span style={{
                        margin: '0 8px',
                        color: 'var(--app-muted-text)',
                        fontSize: '14px'
                    }}>/</span>
                )}
                <Link
                    to={item.path}
                    style={{
                        color: isLast ? 'var(--app-text)' : 'var(--app-muted-text)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        fontWeight: isLast ? 600 : 400
                    }}
                    aria-current={isLast ? 'page' : undefined}
                >
                    {item.label}
                </Link>
            </li>
           );
        })}
      </ol>
    </nav>
  );
}
