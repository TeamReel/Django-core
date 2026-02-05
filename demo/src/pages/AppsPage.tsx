import React from 'react';
import { Globe, Shirt, Trophy, CalendarDays, Timer } from 'lucide-react';
import { useContextSwitcher } from '@django-core/context-switcher';
import { SectionPageLayout } from '../components/SectionPageLayout';
import { TileGrid, TileItem } from '../components/TileGrid';

export default function AppsPage() {
  const { context } = useContextSwitcher();
  const orgSlug = context?.organisation?.slug || 'demo';

  const tiles: TileItem[] = [
    {
      path: `/${orgSlug}`,
      label: 'Federation',
      description: 'Manage federation structure, clubs, and competitions',
      icon: Globe,
      color: '#3b82f6',
    },
    {
      path: `/${orgSlug}/clubs`,
      label: 'Clubs',
      description: 'Browse and manage clubs in your organisation',
      icon: Shirt,
      color: '#10b981',
    },
    {
      path: `/${orgSlug}/seasons`,
      label: 'Seasons',
      description: 'View current and past seasons',
      icon: CalendarDays,
      color: '#f59e0b',
    },
    {
      path: `/${orgSlug}/competitions`,
      label: 'Competitions',
      description: 'Leagues, cups, and tournament management',
      icon: Trophy,
      color: '#8b5cf6',
    },
    {
      path: `/${orgSlug}/matches`,
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
