/**
 * Project & Project Membership types.
 * Mirrors: src/projects/api/serializers.py
 */

import type { UserRef, OrgRef } from './common';

/* ------------------------------------------------------------------ */
/*  Project                                                            */
/* ------------------------------------------------------------------ */

/** Project list shape (ProjectListSerializer). */
export interface Project {
  id: number;
  organisation: OrgRef;
  organisation_id?: number | string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  is_private: boolean;
  team_type: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  member_count: number;
  seasons_count: number;
  competitions_count: number;
  matches_count: number;
  sport_variants_count: number;
  parent_id: number | null;
  parent_name: string | null;
  // Alternate parent reference fields that may appear in API responses
  parent?: any;
  parent_project?: any;
  parent_project_id?: number | string | null;
  parent_project_name?: string | null;
}

/** Project detail shape (ProjectDetailSerializer). */
export interface ProjectDetail extends Project {
  creator: UserRef;
  metadata: Record<string, unknown>;
  current_user_access: {
    effective_role: string;
    source: string;
    permissions: string[];
  };
}

/* ------------------------------------------------------------------ */
/*  Project Membership                                                 */
/* ------------------------------------------------------------------ */

/** Project membership (ProjectMembershipSerializer). */
export interface ProjectMembership {
  id: number;
  user: UserRef & { avatar_url?: string | null };
  organisation_membership_id: string;    // UUID
  period: string | null;                 // UUID
  role: string;
  metadata: Record<string, unknown>;
  functional_roles: string[];
  assignment_reason: string;
  created_at: string;
}

/** Project invite (ProjectInviteSerializer). */
export interface ProjectInvite {
  id: number;
  email: string;
  role: string;
  status: string;
  invited_by: UserRef;
  project_name: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  is_expired: boolean;
}

/** Membership promotion request (ProjectMembershipPromotionSerializer). */
export interface ProjectMembershipPromotion {
  id: number;
  project: number;
  project_name: string;
  target_user: number;
  requested_by: number;
  from_role: string;
  to_role: string;
  status: string;
  is_suspicious: boolean;
  suspicious_reason: string | null;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
}
