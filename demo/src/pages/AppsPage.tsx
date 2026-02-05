import React from 'react';
import { Globe, Shirt, Trophy, CalendarDays, Timer } from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { useAppSelection } from '../hooks/useAppSelection';
import { SectionPageLayout } from '../components/SectionPageLayout';
import { TileGrid, TileItem } from '../components/TileGrid';

export default function AppsPage() {
  const { context } = useContextSwitcher();
  const orgSlug = context?.organisation?.slug || 'demo';
  const { clubSlugOrId, teamSlugOrId, seasonSlugOrId, competitionSlugOrId, matchId } = useAppSelection();

  // Build tile links based on current context
  // If a deeper level is selected, link to that; otherwise link to index page
  const federationPath = `/${orgSlug}`;
  const clubPath = clubSlugOrId ? `/${orgSlug}/${clubSlugOrId}` : `/${orgSlug}/clubs`;
  const teamPath = clubSlugOrId && teamSlugOrId ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}` : `/${orgSlug}/teams`;
  const seasonPath = clubSlugOrId && teamSlugOrId && seasonSlugOrId ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}` : `/${orgSlug}/seasons`;
  const competitionPath = competitionSlugOrId ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}/${competitionSlugOrId}` : `/${orgSlug}/competitions`;
  const matchPath = matchId ? `/${orgSlug}/${clubSlugOrId}/${teamSlugOrId}/${seasonSlugOrId}/${competitionSlugOrId}/${matchId}` : `/${orgSlug}/matches`;

  const tiles: TileItem[] = [
    {
      path: federationPath,
      label: 'Federation',
      description: 'Manage federation structure, clubs, and competitions',
      icon: Globe,
      color: '#3b82f6',
    },
    {
      path: clubPath,
      label: 'Clubs',
      description: 'Browse and manage clubs in your organisation',
      icon: Shirt,
      color: '#10b981',
    },
    {
      path: seasonPath,
      label: 'Seasons',
      description: 'View current and past seasons',
      icon: CalendarDays,
      color: '#f59e0b',
    },
    {
      path: competitionPath,
      label: 'Competitions',
      description: 'Leagues, cups, and tournament management',
      icon: Trophy,
      color: '#8b5cf6',
    },
    {
      path: matchPath,
      label: 'Matches',
      description: 'Schedule and results for all matches',
      icon: Timer,
      color: '#ef4444',
    },
  ];

  return (
    <SectionPageLayout
      title="Apps"
      description="Select an app to manage your football organisation"
    >
      <TileGrid items={tiles} columns={3} />
    </SectionPageLayout>
  );
}
