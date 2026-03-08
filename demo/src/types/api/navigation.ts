/**
 * Navigation types — Recents, Favorites.
 * Mirrors: src/navigation/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  Recent Item                                                        */
/* ------------------------------------------------------------------ */

export interface RecentItem {
  id: number;
  user: number;
  content_type: string;
  object_id: string;
  label: string;
  url: string;
  metadata: Record<string, unknown>;
  accessed_at: string;
}

/* ------------------------------------------------------------------ */
/*  Favorite                                                           */
/* ------------------------------------------------------------------ */

export interface FavoriteItem {
  id: number;
  user: number;
  content_type: string;
  object_id: string;
  label: string;
  url: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
