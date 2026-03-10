/**
 * GalleryMatchTimeline — Match-grouped content history
 *
 * Groups content items by match and displays them as a chronological timeline.
 * Each match shows a header card with date/opponent/score and a horizontal
 * scrollable row of content thumbnails. Items without a match are shown in a
 * separate "Other" section at the bottom.
 *
 * Additional features:
 * - "Today" banner if a match is happening today
 * - Quick stats (total items, matches with content)
 * - Share-all / download-all per match
 * - Expand/collapse match groups for speed
 * - View toggle: timeline vs flat grid
 */

import React from 'react';
import { GalleryMatchTimelineContent } from './GalleryMatchTimelineContent';
import type { GalleryMatchTimelineProps } from './types';

// Re-export types for backward compatibility
export type { MatchGroup, GalleryMatchTimelineProps } from './types';

export function GalleryMatchTimeline(props: GalleryMatchTimelineProps) {
  return <GalleryMatchTimelineContent {...props} />;
}
