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
      label: 'Federatie',
      description: 'Beheer federatiestructuur, clubs en competities',
      icon: Globe,
      color: 'var(--color-blue-500)',
    },
    {
      path: clubPath,
      label: 'Clubs',
      description: 'Clubs in je organisatie bekijken en beheren',
      icon: Shirt,
      color: 'var(--color-green-400)',
    },
    {
      path: seasonPath,
      label: 'Seizoenen',
      description: 'Huidige en afgelopen seizoenen bekijken',
      icon: CalendarDays,
      color: 'var(--color-amber-400)',
    },
    {
      path: competitionPath,
      label: 'Competities',
      description: 'Competities, bekers en toernooien beheren',
      icon: Trophy,
      color: 'var(--color-violet-500)',
    },
    {
      path: matchPath,
      label: 'Wedstrijden',
      description: 'Planning en resultaten van alle wedstrijden',
      icon: Timer,
      color: 'var(--color-red-500)',
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
