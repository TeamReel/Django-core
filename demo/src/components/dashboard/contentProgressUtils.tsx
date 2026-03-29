import React from 'react';
import { User, Trophy, Calendar, BarChart3 } from 'lucide-react';

/* ── Constants ──────────────────────────────── */

export const SUBTYPE_LABELS: Record<string, string> = {
  flyer: 'Match Flyer', lineup: 'Lineup Video', lineup_flyer: 'Lineup Flyer',
  match_intro: 'Match Intro', poster: 'Elftalfoto', walkon: 'Walk-on Video',
  anthem: 'Anthem Video', goal: 'Doelpunt', score_update: 'Score Update',
  end_score: 'Eindstand', match_summary: 'Samenvatting', highlights: 'Highlights',
  profile_photo: 'Profielfoto', in_tenue: 'In Tenue', closeup: 'Close-up',
  short_intro: 'Korte Intro', video: 'Video', image: 'Afbeelding', other: 'Overig',
};

export const SUBTYPE_OUTPUT: Record<string, 'image' | 'video' | 'text'> = {
  flyer: 'image', lineup: 'video', lineup_flyer: 'image', match_intro: 'video',
  poster: 'image', walkon: 'video', anthem: 'video', goal: 'video',
  score_update: 'image', end_score: 'image', match_summary: 'text', highlights: 'video',
  profile_photo: 'image', in_tenue: 'image', closeup: 'image', short_intro: 'video',
  video: 'video', image: 'image', other: 'image',
};

/* ── Helpers ──────────────────────────────── */

export function inferMediaItemSubtype(title: string, mimeType: string): string {
  const n = title.toLowerCase();
  if (n.includes('lineup') && mimeType.startsWith('video/')) return 'lineup';
  if (n.includes('lineup')) return 'lineup_flyer';
  if (n.includes('flyer')) return 'flyer';
  if (n.includes('intro')) return 'match_intro';
  if (n.includes('poster') || n.includes('elftal')) return 'poster';
  if (n.includes('walkon') || n.includes('walk-on')) return 'walkon';
  if (n.includes('anthem')) return 'anthem';
  if (n.includes('goal') || n.includes('doelpunt')) return 'goal';
  if (n.includes('end') && n.includes('score')) return 'end_score';
  if (n.includes('score')) return 'score_update';
  if (n.includes('highlight')) return 'highlights';
  if (n.includes('profile')) return 'profile_photo';
  if (n.includes('tenue')) return 'in_tenue';
  if (n.includes('closeup') || n.includes('close-up')) return 'closeup';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'other';
}

/* ── Types ──────────────────────────────── */

export interface GenRequestItem {
  template?: number | { template_type?: string; template_subtype?: string };
  template_type?: string;
  input_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  result?: { media_item_id?: string };
}

export interface MediaItemExt {
  id: string;
  title?: string;
  mime_type?: string;
  activity_id?: string;
  activity?: string;
  activity_title?: string;
  activity_date?: string;
  member_id?: string;
  member?: string | number;
}

export interface CategoryCount {
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
}

export interface ContentItem {
  subtype: string;
  count: number;
  outputType: 'image' | 'video' | 'text';
}

export interface MatchGroup {
  matchId: string;
  title: string;
  date?: string;
  items: ContentItem[];
  total: number;
}

export interface SectionData {
  key: string;
  label: string;
  icon: React.ReactNode;
  total: number;
  matches?: MatchGroup[];
  items?: ContentItem[];
}

/* ── Category icon helpers ──────────────────── */

export function getCategoryIcon(key: string): React.ReactNode {
  switch (key) {
    case 'member': return <User size={14} />;
    case 'match': return <Trophy size={14} />;
    case 'season': return <Calendar size={14} />;
    default: return <BarChart3 size={14} />;
  }
}
