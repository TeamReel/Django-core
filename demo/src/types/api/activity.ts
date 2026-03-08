/**
 * Period & Activity types.
 * Mirrors: src/activities/api/serializers.py
 */

import type { NameRef, OrgRef, ProjectRef, PeriodRef, SportRefExtended } from './common';

/* ------------------------------------------------------------------ */
/*  Period (Season / Competition)                                      */
/* ------------------------------------------------------------------ */

/** Period shape (PeriodSerializer). */
export interface Period {
  id: string;             // UUID
  organisation: OrgRef;
  project: ProjectRef;
  parent_period: PeriodRef | null;
  sport: SportRefExtended | null;
  period_type: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  /** Note: backend stores as `metadata`, serializes as `data`. */
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: NameRef;
  children_count: number;
  activities_count: number;
  matches_count: number;
  children_activities_count: number;
  children_matches_count: number;
  matches_total_count: number;
  members_count: number;
}

/* ------------------------------------------------------------------ */
/*  Activity (Match / Training / Event)                                */
/* ------------------------------------------------------------------ */

/** Activity list shape (ActivitySerializer). */
export interface Activity {
  id: string;             // UUID
  slug: string;
  organisation: OrgRef;
  project: ProjectRef;
  period: PeriodRef;
  opponent_project: ProjectRef | null;
  title: string;
  activity_type: 'match' | 'training' | 'event' | string;
  start_time: string;
  end_time: string | null;
  location: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: NameRef;
  participations_count: number;
}

/** Activity detail shape (ActivityDetailSerializer). */
export interface ActivityDetail extends Activity {
  participations: Participation[];
  events: ActivityEvent[];
}

/* ------------------------------------------------------------------ */
/*  Participation                                                      */
/* ------------------------------------------------------------------ */

/** Participation in an activity (ParticipationSerializer). */
export interface Participation {
  id: string;             // UUID
  member: { id: number | string; user_name: string };
  activity: { id: string; title: string; start_time: string } | null;
  period: PeriodRef | null;
  role: string;
  status: string;
  notes: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: NameRef;
}

/* ------------------------------------------------------------------ */
/*  Activity Event (goals, cards, subs, etc.)                          */
/* ------------------------------------------------------------------ */

/** Activity event (ActivityEventSerializer). */
export interface ActivityEvent {
  id: string;             // UUID
  activity: { id: string; title: string; start_time: string };
  event_type: string;
  minute: number | null;
  occurred_at: string | null;
  member: { id: number | string; user_name: string } | null;
  related_member: { id: number | string; user_name: string } | null;
  team_project: { id: number; name: string } | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by: NameRef;
}
