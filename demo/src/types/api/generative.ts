/**
 * AI generation types — GenerationTemplate, GenerationRequest, GenerationOutput.
 * Mirrors: src/generative/serializers.py
 */

/* ------------------------------------------------------------------ */
/*  Generation Template                                                */
/* ------------------------------------------------------------------ */

/** Generation template (GenerationTemplateSerializer). */
export interface GenerationTemplate {
  id: number;
  organisation: string;           // UUID FK
  organisation_name: string;
  name: string;
  slug: string;
  version: string;                // semver
  parent_template: number | null;
  parent_template_name: string | null;
  is_latest: boolean;
  description: string;
  template_type: string;
  template_subtype: string;
  input_schema: Record<string, unknown>;  // JSON Schema
  pipeline_config: Record<string, unknown>;
  provider: string | null;
  estimated_cost: string;         // decimal string
  retention_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number;
  created_by_username: string;
}

/* ------------------------------------------------------------------ */
/*  Generation Request                                                 */
/* ------------------------------------------------------------------ */

/** AI generation request (GenerationRequestSerializer). */
export interface GenerationRequest {
  id: number;
  template: number;
  template_name: string;
  template_version: string;
  requester: number;
  requester_username: string;
  project: number | null;
  project_name: string | null;
  status: string;
  status_display: string;
  input_data: Record<string, unknown>;
  retry_count: number;
  error_category: string | null;
  error_category_display: string | null;
  error_message: string | null;
  estimated_cost: string;        // decimal string
  actual_cost: string | null;
  transaction_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  has_output: boolean;
}

/* ------------------------------------------------------------------ */
/*  Generation Output                                                  */
/* ------------------------------------------------------------------ */

/** AI generation output (GenerationOutputSerializer). */
export interface GenerationOutput {
  request: number;
  request_id: number;
  output_type: string;
  output_type_display: string;
  file_id: string | null;        // UUID
  text_content: string | null;
  metadata: Record<string, unknown>;
  presigned_url: string | null;
  storage_info: {
    storage_backend: string;
    storage_path: string;
    original_name: string;
    file_size_bytes: number;
    file_size_kb: number;
    mime_type: string;
    created_at: string;
  } | null;
  expires_at: string | null;
  is_expired: boolean;
  created_at: string;
}
