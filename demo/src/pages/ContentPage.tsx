import React from 'react';
import { Library, Sparkles, Film, Image, Clapperboard } from 'lucide-react';
import { SectionPageLayout } from '../components/SectionPageLayout';
import { TileGrid, TileItem } from '../components/TileGrid';

export default function ContentPage() {
  const tiles: TileItem[] = [
    {
      path: '/contentlib',
      label: 'Content Library',
      description: 'Browse all generated content: flyers, lineups, reels, and more',
      icon: Clapperboard,
      color: '#dc2626',
    },
    {
      path: '/medialib',
      label: 'Media Library',
      description: 'Search and manage your media assets with AI-powered tagging',
      icon: Library,
      color: '#3b82f6',
    },
    {
      path: '/studio',
      label: 'AI Studio',
      description: 'Generate highlights, thumbnails, and content with AI',
      icon: Sparkles,
      color: '#8b5cf6',
    },
    {
      path: '/studio/videos',
      label: 'Video Projects',
      description: 'Edit and render video content',
      icon: Film,
      color: '#10b981',
    },
    {
      path: '/studio/images',
      label: 'Image Projects',
      description: 'Create and edit graphics and thumbnails',
      icon: Image,
      color: '#f59e0b',
    },
  ];

  return (
    <SectionPageLayout
      title="Content"
      description="Create, manage, and distribute your media content"
    >
      <TileGrid items={tiles} columns={2} />
    </SectionPageLayout>
  );
}
