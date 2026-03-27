/**
 * Core entity type definitions.
 *
 * User and Project are canonical in types/api/ — re-exported here
 * so existing imports from '@/types' keep working.
 */

// Canonical types — single source of truth
export type { User } from './api/user';
export type { Project, ProjectDetail } from './api/project';
import type { User } from './api/user';

/**
 * Organisation entity
 */
export interface Organisation {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  member_count?: number;
  project_count?: number;
  clubs_count?: number;
  teams_count?: number;
  matches_count?: number;
  seasons_count?: number;
  credit_balance?: number;
  marketing_hub_balance?: number;
  is_active?: boolean;
  enable_theme_toggle?: boolean;
  created_at?: string;
  updated_at?: string;
  logo_url?: string;
  user_role?: 'admin' | 'member';
  role?: string;
  sport?: {
    id: string;
    name: string;
    slug: string;
    sport_icon: string;
  } | null;
  metadata?: {
    type?: string;
    country?: string;
    [key: string]: unknown;
  };
  sport_variants_count?: number;
  competitions_count?: number;
}

/**
 * Audit event entity
 */
export interface AuditEvent {
  id: string;
  event_type: string;
  timestamp: string;
  user?: User;
  organisation_id?: string;
  project_id?: string;
  resource_type?: string;
  resource_id?: string;
  resource_display?: string;
  outcome?: string;
  result?: string;
  metadata?: Record<string, unknown>;
  details?: string;
}

/**
 * Period entity (season or competition)
 */
export interface Period {
  id: string;
  name: string;
  slug?: string;
  project_id?: string | number;
  project?: { id?: string | number; name?: string; slug?: string };
  parent_period_id?: string | number | null;
  parent_period?: { id?: string | number; name?: string; slug?: string; parent_period_id?: string | number | null } | null;
  type?: string;
  period_type?: string;
  start_date?: string;
  end_date?: string;
  activities_count?: number;
  matches_count?: number;
  children_count?: number;
  created_at?: string;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/**
 * Activity entity (match, training, event)
 */
export interface Activity {
  id: string;
  title?: string;
  name?: string;
  slug?: string;
  activity_type?: string;
  project_id?: string | number;
  project?: { id?: string | number; name?: string; slug?: string };
  project_name?: string;
  period_id?: string;
  period?: { id?: string; name?: string; slug?: string; parent_period?: { id?: string; name?: string; slug?: string } | null; parent_period_id?: string | number | null } | null;
  start_time?: string;
  end_time?: string | null;
  location?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}
