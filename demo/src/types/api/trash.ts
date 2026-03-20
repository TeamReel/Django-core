/**
 * Trash API types.
 * Mirrors: src/trash/api/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  ContentType                                                        */
/* ------------------------------------------------------------------ */

/** ContentType detail (ContentTypeSerializer). */
export interface ContentTypeDetail {
  id: number;
  app_label: string;
  model: string;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  TrashItem                                                          */
/* ------------------------------------------------------------------ */

/** Single trash item (TrashItemSerializer). */
export interface TrashItem {
  id: string;              // UUID
  content_type: number;    // ContentType ID
  content_type_detail: ContentTypeDetail;
  object_id: string;       // Original object UUID
  organisation: string;    // Organisation UUID
  deleted_at: string;      // ISO datetime
  deleted_by: number | null;      // User ID
  deleted_by_email: string | null;
  expires_at: string;      // ISO datetime
  object_repr: string;     // Human-readable representation
  original_data: Record<string, unknown>;
  restore_path: string | null;
  is_expired: boolean;
}

/* ------------------------------------------------------------------ */
/*  TrashStats                                                         */
/* ------------------------------------------------------------------ */

/** Trash statistics per content type (TrashStatsSerializer). */
export interface TrashStats {
  content_type: string;    // e.g., "activities.activity"
  count: number;           // Items of this type in trash
  total: number;           // Total trash items across all types
}
