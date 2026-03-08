/**
 * Common API types shared across all domains.
 *
 * These mirror the DRF response envelope patterns and provide
 * generic wrappers for paginated lists, errors, and nested references.
 */

/* ------------------------------------------------------------------ */
/*  Envelope types                                                     */
/* ------------------------------------------------------------------ */

/** Standard paginated list response from DRF. */
export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  page_size?: number;
  total_pages?: number;
}

/** Single-object envelope: `{ data: T }`. */
export interface ApiEnvelope<T> {
  data: T;
  meta?: {
    timestamp?: string;
    version?: string;
  };
}

/** API error shape thrown by the API client. */
export interface ApiErrorBody {
  error: string;
  detail?: string;
  code?: string;
  status?: number;
  field_errors?: Record<string, string[]>;
}

/* ------------------------------------------------------------------ */
/*  Shared nested references (used by many serializers)                */
/* ------------------------------------------------------------------ */

/** Minimal user reference nested in many API responses. */
export interface UserRef {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active?: boolean;
  avatar_url?: string | null;
}

/** Compact `{ id, name }` reference used for `created_by` etc. */
export interface NameRef {
  id: number | string;
  name: string;
}

/** Organisation stub nested in projects, activities, etc. */
export interface OrgRef {
  id: string;          // UUID
  name: string;
  slug: string;
  sport?: SportRef | null;
  user_role?: string | null;
}

/** Project stub nested in activities, periods, etc. */
export interface ProjectRef {
  id: number;
  name: string;
  slug: string;
  club_name?: string | null;
}

/** Period stub nested in activities, participations, etc. */
export interface PeriodRef {
  id: string;          // UUID
  name: string;
  start_date: string;
  end_date: string;
  parent_period?: PeriodRef | null;
}

/** Sport stub — compact version. */
export interface SportRef {
  id: number;
  name: string;
  slug: string;
  sport_icon: string;
}

/** Sport stub — extended version (on Period, etc.). */
export interface SportRefExtended extends SportRef {
  is_variant: boolean;
  parent_sport_id: number | null;
  category_name: string | null;
  category_icon: string | null;
}

/** File reference nested in brand assets, video jobs, etc. */
export interface FileRef {
  id: string;          // UUID
  filename?: string;
  name?: string;
  url?: string | null;
  size?: number;
  file_size?: number;
  mime_type?: string;
  content_type?: string;
}
