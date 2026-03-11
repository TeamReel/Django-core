/**
 * Media & job factories — BrandProfile, MediaItem, FileAsset, VideoJob,
 * WorkflowInstance, CreditsBalance, Sport.
 */
import type {
  BrandProfile,
  MediaItem,
  FileAsset,
  VideoJob,
  WorkflowInstance,
  CreditsBalance,
  Sport,
} from '../../types/api';
import { nextId, nextUuid, now } from './factoriesCore';

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
