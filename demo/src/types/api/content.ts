/**
 * Content generation types — ContentTemplate, ContentItem, ContentApproval.
 * Mirrors: src/content_generation/serializers.py
 */

import type { NameRef, SportRef } from './common';

/* ------------------------------------------------------------------ */
/*  Content Template                                                   */
/* ------------------------------------------------------------------ */

/** Content template (ContentTemplateSerializer). */
export interface ContentTemplate {
  id: number;
  name: string;
  description: string;
  template_type: string;
  template_subtype: string;
  sport_type: string;
  sport: number | null;
  sport_detail: (SportRef & { parent_sport_id: number | null }) | null;
  formation: number | null;
  formation_detail: { id: number; code: string; name: string } | null;
  style_variant: string;
  input_requirements: Record<string, unknown>;
  ai_workflow_id: string;
  template_settings: Record<string, unknown>;
  timeout_minutes: number;
  is_active: boolean;
  credits_required: string;     // decimal string
  organisation: string | null;  // UUID FK
  organisation_detail: NameRef | null;
  project: number | null;
  project_detail: NameRef | null;
  created_by: number | null;
  created_by_detail: { id: number; username: string } | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/*  Content Item                                                       */
/* ------------------------------------------------------------------ */

/** Generated content item (ContentItemSerializer). */
export interface ContentItem {
  id: number;
  template: number;
  template_detail: { id: number; name: string; template_type: string };
  project: number | null;
  activity: string | null;      // UUID
  activity_detail: { id: string; title: string } | null;
  status: string;
  input_data: Record<string, unknown>;
  output_file: string | null;   // UUID
  output_file_detail: {
    id: string;
    url: string | null;
    file_size: number;
    mime_type: string;
  } | null;
  thumbnail_url: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_by: number | null;
  created_by_detail: { id: number; username: string } | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  approval_history: ContentApproval[];
}

/* ------------------------------------------------------------------ */
/*  Content Approval                                                   */
/* ------------------------------------------------------------------ */

/** Content approval entry (ContentApprovalSerializer). */
export interface ContentApproval {
  id: number;
  content_item: number;
  content_item_detail: { id: number; name: string } | null;
  reviewer: number;
  reviewer_detail: { id: number; username: string } | null;
  status: string;
  feedback_text: string;
  reviewed_at: string | null;
}
