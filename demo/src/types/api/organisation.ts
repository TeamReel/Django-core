/**
 * Organisation & Membership types.
 * Mirrors: src/organisations/api/serializers.py
 */

import type { UserRef, SportRef } from './common';

/* ------------------------------------------------------------------ */
/*  Organisation                                                       */
/* ------------------------------------------------------------------ */

/** Organisation list shape (OrganisationListSerializer). */
export interface Organisation {
  id: string;            // UUID
  name: string;
  slug: string;
  is_active: boolean;
  member_count: number;
  project_count: number;
  clubs_count?: number;
  teams_count?: number;
  total_players_count?: number;
  seasons_count?: number;
  competitions_count?: number;
  matches_count?: number;
  sport_variants_count?: number;
  enable_theme_toggle: boolean;
  sport: SportRef | null;
  user_role: 'admin' | 'member' | null;
  metadata: Record<string, unknown>;
}

/** Organisation detail shape (OrganisationSerializer). */
export interface OrganisationDetail extends Omit<Organisation, 'clubs_count' | 'teams_count' | 'total_players_count' | 'seasons_count' | 'competitions_count' | 'matches_count' | 'sport_variants_count'> {
  description: string;
  created_at: string;
  updated_at: string;
  creator: UserRef;
  admin_count: number;
}

/* ------------------------------------------------------------------ */
/*  Membership                                                         */
/* ------------------------------------------------------------------ */

/** Organisation membership (MembershipSerializer). */
export interface OrgMembership {
  id: string;            // UUID
  user: UserRef;
  organisation: { id: string; name: string; slug: string };
  role: string;
  joined_at: string;
  invited_by: UserRef | null;
  is_active: boolean;
}

/** Lightweight list variant (MembershipListSerializer). */
export interface OrgMembershipListItem {
  id: string;
  user: Pick<UserRef, 'id' | 'email' | 'first_name' | 'last_name' | 'is_active'>;
  organisation: { id: string; name: string; slug: string };
  role: string;
  joined_at: string;
  invited_by: UserRef | null;
  is_active: boolean;
}
