/**
 * Mock data factories for API types.
 *
 * Each factory returns a valid default shape that tests can override:
 *
 * ```ts
 * import { buildUser, buildProject } from '@/test/factories';
 *
 * const user = buildUser({ email: 'custom@test.com' });
 * const project = buildProject({ name: 'FC Test' });
 * ```
 *
 * Factories use auto-incrementing IDs to avoid collisions across tests.
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
  BrandProfile,
  MediaItem,
  FileAsset,
  VideoJob,
  WorkflowInstance,
  CreditsBalance,
  Sport,
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
function now(): string {
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

/* ------------------------------------------------------------------ */
/*  BrandProfile                                                       */
/* ------------------------------------------------------------------ */

export function buildBrandProfile(overrides?: Partial<BrandProfile>): BrandProfile {
  return {
    id: overrides?.id ?? nextId(),
    project: overrides?.project ?? nextId(),
    project_name: 'Test Team',
    name: 'Default Brand',
    primary_color: '#1a1a2e',
    secondary_color: '#16213e',
    accent_color: '#e94560',
    text_color: '#ffffff',
    background_color: '#0f3460',
    font_family: 'Inter',
    heading_font_family: null,
    logo_url: null,
    is_active: true,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  MediaItem                                                          */
/* ------------------------------------------------------------------ */

export function buildMediaItem(overrides?: Partial<MediaItem>): MediaItem {
  const id = overrides?.id ?? nextUuid();
  return {
    id,
    project_id: nextId(),
    file_id: nextUuid(),
    storage_path: `media/${id}.jpg`,
    activity_id: null,
    activity_title: null,
    title: `Media ${id.slice(-4)}`,
    description: '',
    mime_type: 'image/jpeg',
    file_size_bytes: 102400,
    width: 1920,
    height: 1080,
    duration_seconds: null,
    state: 'ready',
    extraction_metadata: {},
    tags: [],
    thumbnails: [],
    file_url: `https://cdn.test.com/media/${id}.jpg`,
    created_by_name: 'Test User',
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  FileAsset                                                          */
/* ------------------------------------------------------------------ */

export function buildFileAsset(overrides?: Partial<FileAsset>): FileAsset {
  const id = overrides?.id ?? nextUuid();
  return {
    id,
    organization: nextUuid(),
    uploaded_by: nextId(),
    uploaded_by_name: 'Test User',
    original_name: 'test-file.jpg',
    storage_path: `uploads/${id}.jpg`,
    file_size: 102400,
    mime_type: 'image/jpeg',
    is_public: false,
    presigned_url: null,
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  VideoJob                                                           */
/* ------------------------------------------------------------------ */

export function buildVideoJob(overrides?: Partial<VideoJob>): VideoJob {
  const id = overrides?.id ?? nextUuid();
  return {
    id,
    job_type: 'transcode',
    status: 'pending',
    progress_percent: 0,
    input_file: null,
    output_file: null,
    preset: null,
    config: {},
    error_message: null,
    retry_count: 0,
    output_url: null,
    thumbnail_url: null,
    workflow_instance: null,
    created_at: now(),
    updated_at: now(),
    started_at: null,
    completed_at: null,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  WorkflowInstance                                                   */
/* ------------------------------------------------------------------ */

export function buildWorkflowInstance(overrides?: Partial<WorkflowInstance>): WorkflowInstance {
  const id = overrides?.id ?? nextUuid();
  return {
    id,
    workflow: nextUuid(),
    current_state: 'draft',
    context: {},
    version: 1,
    available_actions: [],
    created_at: now(),
    updated_at: now(),
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  CreditsBalance                                                     */
/* ------------------------------------------------------------------ */

export function buildCreditsBalance(overrides?: Partial<CreditsBalance>): CreditsBalance {
  return {
    organisation_id: overrides?.organisation_id ?? nextUuid(),
    total_credits: 100,
    used_credits: 25,
    remaining_credits: 75,
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Sport                                                              */
/* ------------------------------------------------------------------ */

export function buildSport(overrides?: Partial<Sport>): Sport {
  const id = overrides?.id ?? nextId();
  return {
    id,
    name: 'Voetbal',
    slug: 'voetbal',
    sport_icon: '⚽',
    parent_sport_id: null,
    is_category: false,
    is_variant: false,
    squad_size: 11,
    match_duration_minutes: 90,
    variants: [],
    positions: [],
    configuration: {},
    ...overrides,
  };
}
