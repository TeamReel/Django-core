/**
 * Gallery Page — Content Showcase
 *
 * The highlight of the app: a beautiful gallery showing all generated content.
 * Flyers, lineups, goal moments, transformation videos, and more.
 *
 * Uses /api/v1/media/items/ to display content with filtering.
 */

import React from 'react';
import { ContentLibraryView } from '../content/ContentLibraryPage';

export default function AIStudioPage() {
  // Render the gallery - ContentLibraryView handles all the logic
  return <ContentLibraryView embedded={false} />;
}
