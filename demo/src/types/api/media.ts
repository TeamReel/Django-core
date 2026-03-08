/**
 * Media library types — MediaItem, Collection, MediaItemRelation.
 * Mirrors: src/medialib/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  Media Tag                                                          */
/* ------------------------------------------------------------------ */

export interface MediaTag {
  id: number;
  name: string;
  slug: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Media Thumbnail                                                    */
/* ------------------------------------------------------------------ */

export interface MediaThumbnail {
  id: number;
  size_label: string;
  width: number;
  height: number;
  url: string;
}

/* ------------------------------------------------------------------ */
/*  Media Item                                                         */
/* ------------------------------------------------------------------ */

/** Media item (MediaItemSerializer). */
export interface MediaItem {
  id: string;                    // UUID
  project_id: number;
  file_id: string;               // UUID
  storage_path: string;
  activity_id: string | null;    // UUID
  activity_title: string | null;
  title: string;
  description: string;
  mime_type: string;
  file_size_bytes: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  state: string;
  extraction_metadata: Record<string, unknown>;
  tags: MediaTag[];
  thumbnails: MediaThumbnail[];
  file_url: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Collection                                                         */
/* ------------------------------------------------------------------ */

/** Media collection (CollectionSerializer). */
export interface MediaCollection {
  id: number;
  project: number;
  name: string;
  description: string;
  item_count: number;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Media Item Relation                                                */
/* ------------------------------------------------------------------ */

/** Generic relation linking a media item to a business object. */
export interface MediaItemRelation {
  id: number;
  target_app: string;
  target_model: string;
  target_id: string;
  relation_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
