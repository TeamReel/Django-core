/**
 * Video pipeline types — VideoJob, VideoPreset, PlatformExport, VideoOverlay.
 * Mirrors: src/video/serializers.py
 */

import type { FileRef } from './common';

/* ------------------------------------------------------------------ */
/*  Video Preset                                                       */
/* ------------------------------------------------------------------ */

export interface VideoPreset {
  id: number;
  name: string;
  slug: string;
  description: string;
  codec: string;
  container: string;
  width: number | null;
  height: number | null;
  bitrate: string | null;
  fps: number | null;
  audio_codec: string | null;
  audio_bitrate: string | null;
  extra_flags: Record<string, unknown>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Video Overlay                                                      */
/* ------------------------------------------------------------------ */

export interface VideoOverlay {
  id: number;
  job: string;            // UUID → VideoJob
  overlay_type: string;
  position_x: number;
  position_y: number;
  width: number | null;
  height: number | null;
  start_time: number | null;
  end_time: number | null;
  content: Record<string, unknown>;
  z_index: number;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Platform Export                                                     */
/* ------------------------------------------------------------------ */

export interface PlatformExport {
  id: number;
  job: string;            // UUID → VideoJob
  platform: string;
  status: string;
  output_file: FileRef | null;
  output_url: string | null;
  config: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Video Job (list)                                                   */
/* ------------------------------------------------------------------ */

export interface VideoJobInputFile {
  id: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
}

export interface VideoJobOutputFile {
  id: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  url?: string;
}

export interface VideoJobWorkflowInfo {
  id: number;
  current_state: string;
  template_name: string;
  available_actions: string[];
}

export interface VideoJob {
  id: string;                    // UUID
  job_type: string;
  status: string;
  progress_percent: number;
  input_file: VideoJobInputFile | null;
  output_file: VideoJobOutputFile | null;
  preset: { id: number; name: string } | null;
  config: Record<string, unknown>;
  error_message: string | null;
  retry_count: number;
  output_url: string | null;
  thumbnail_url: string | null;
  workflow_instance: VideoJobWorkflowInfo | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Video Job Detail                                                   */
/* ------------------------------------------------------------------ */

export interface VideoJobDetail extends VideoJob {
  metadata: Record<string, unknown>;
  overlays: VideoOverlay[];
  platform_exports: PlatformExport[];
  created_by: number | null;
  created_by_name: string;
}
