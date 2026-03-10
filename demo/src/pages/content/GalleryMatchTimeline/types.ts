/**
 * GalleryMatchTimeline types
 */
import type { ContentItem } from '../contentLibraryTypes';

export interface MatchGroup {
  /** Activity (match) ID — or '__other__' for ungrouped items */
  activityId: string;
  /** Display title */
  title: string;
  /** ISO date string */
  date: string;
  /** Opponent name */
  opponent: string;
  /** home | away */
  homeAway: string;
  /** Scores */
  scoreHome?: number;
  scoreAway?: number;
  /** Content items in this group */
  items: ContentItem[];
}

export interface GalleryMatchTimelineProps {
  items: ContentItem[];
  onPreview: (item: ContentItem) => void;
  onDownload: (item: ContentItem) => void;
  onShare: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
  onNavigateToMatches?: () => void;
}
