/**
 * Core factories — ID helpers, User, Organisation, Project, Period, Activity.
 */
import type {
  User,
  UserDetail,
  Organisation,
  OrganisationDetail,
  Project,
  ProjectDetail,
  Period,
  Activity,
} from '../../types/api';

/* ------------------------------------------------------------------ */
/*  ID generators                                                      */
/* ------------------------------------------------------------------ */

let _seqInt = 1000;
let _seqUuid = 0;

/** Auto-incrementing integer ID. */
export function nextId(): number {
  return _seqInt++;
}

/** Deterministic fake UUID (good enough for tests). */
export function nextUuid(): string {
  _seqUuid++;
  return `00000000-0000-4000-a000-${String(_seqUuid).padStart(12, '0')}`;
}

/** ISO timestamp for "now". */
export function now(): string {
  return new Date().toISOString();
}

/** Reset counters between test suites when needed. */
export function resetFactoryCounters(): void {
  _seqInt = 1000;
  _seqUuid = 0;
}

/* ------------------------------------------------------------------ */
/*  User                                                               */
/* ------------------------------------------------------------------ */

export function buildUser(overrides?: Partial<User>): User {
  const id = overrides?.id ?? nextId();
  return {
    id,
    email: `user${id}@test.com`,
    first_name: 'Test',
    last_name: 'User',
    display_name: 'Test User',
    role: 'user',
    avatar_url: null,
    is_active: true,
    date_joined: now(),
    last_login: now(),
    ...overrides,
  };
}

export function buildUserDetail(overrides?: Partial<UserDetail>): UserDetail {
  return {
    ...buildUser(overrides),
    phone: null,
    bio: '',
    preferences: {},
    organisations: [],
    projects: [],
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Organisation                                                       */
/* ------------------------------------------------------------------ */

export function buildOrganisation(overrides?: Partial<Organisation>): Organisation {
  const id = overrides?.id ?? nextUuid();
  return {
    id,
    name: `Test Org ${id.slice(-4)}`,
    slug: `test-org-${id.slice(-4)}`,
    logo_url: null,
    sport: null,
    member_count: 0,
    project_count: 0,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

export function buildOrganisationDetail(overrides?: Partial<OrganisationDetail>): OrganisationDetail {
  return {
    ...buildOrganisation(overrides),
    description: '',
    website: '',
    contact_email: '',
    settings: {},
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Project                                                            */
/* ------------------------------------------------------------------ */

export function buildProject(overrides?: Partial<Project>): Project {
  const id = overrides?.id ?? nextId();
  const orgId = nextUuid();
  return {
    id,
    organisation: orgId,
    organisation_name: 'Test Org',
    name: `Test Project ${id}`,
    slug: `test-project-${id}`,
    short_name: `TP${id}`,
    project_type: 'team',
    sport: null,
    sport_name: null,
    parent_project: null,
    parent_project_name: null,
    logo_url: null,
    member_count: 0,
    child_count: 0,
    has_brand_profile: false,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

export function buildProjectDetail(overrides?: Partial<ProjectDetail>): ProjectDetail {
  return {
    ...buildProject(overrides),
    description: '',
    settings: {},
    brand_profile: null,
    current_period: null,
    children: [],
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Period                                                             */
/* ------------------------------------------------------------------ */

export function buildPeriod(overrides?: Partial<Period>): Period {
  const id = overrides?.id ?? nextUuid();
  return {
    id,
    project: overrides?.project ?? nextId(),
    name: `Season ${id.slice(-4)}`,
    period_type: 'season',
    parent_period: null,
    parent_period_name: null,
    start_date: '2024-08-01',
    end_date: '2025-06-30',
    is_active: true,
    data: {},
    activity_count: 0,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Activity                                                           */
/* ------------------------------------------------------------------ */

export function buildActivity(overrides?: Partial<Activity>): Activity {
  const id = overrides?.id ?? nextUuid();
  return {
    id,
    period: overrides?.period ?? nextUuid(),
    period_name: 'Season 2024',
    project: overrides?.project ?? nextId(),
    project_name: 'Test Team',
    activity_type: 'match',
    title: `Match ${id.slice(-4)}`,
    description: '',
    status: 'scheduled',
    start_datetime: now(),
    end_datetime: null,
    location: '',
    opponent: null,
    score_home: null,
    score_away: null,
    data: {},
    participant_count: 0,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}
