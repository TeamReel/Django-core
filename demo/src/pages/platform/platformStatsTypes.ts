/**
 * TypeScript types for the Platform Stats Dashboard API responses.
 * Maps to the DRF endpoints at /api/v1/dashboard/.
 */

// ─── Overview ────────────────────────────────────────────────────────────────

export interface PlatformCounts {
  organisations: number;
  projects: number;
  members: number;
  users: number;
  file_assets: number;
}

export interface GrowthWeek {
  week: string;
  organisations: number;
  delta_organisations: number;
  members: number;
  delta_members: number;
  content_items: number;
  delta_content_items: number;
  generation_requests: number;
  delta_generation_requests: number;
}

export interface DashboardOverview {
  platform: PlatformCounts;
  growth: GrowthWeek[];
}

// ─── Pipelines ───────────────────────────────────────────────────────────────

export interface AiStats {
  requests_by_status: Record<string, number>;
  requests_by_provider: Record<string, number>;
  total_outputs: number;
  avg_processing_seconds: number;
}

export interface ContentStats {
  items_by_status: Record<string, number>;
  templates_active: number;
  approval_rate: number;
  pending_approvals: number;
}

export interface StaleJob {
  id: string;
  type: string;
  started_at: string;
  minutes_elapsed: number;
}

export interface VideoStats {
  jobs_by_status: Record<string, number>;
  jobs_by_type: Record<string, number>;
  stale_jobs: StaleJob[];
}

export interface DashboardPipelines {
  ai: AiStats;
  content: ContentStats;
  video: VideoStats;
}

// ─── Credits ─────────────────────────────────────────────────────────────────

export interface CreditsDayUsage {
  date: string;
  used: number;
}

export interface CreditsTopOrg {
  id: number;
  name: string;
  balance: number;
  used: number;
}

export interface DashboardCredits {
  total_allocated: number;
  total_used: number;
  usage_by_day: CreditsDayUsage[];
  top_orgs: CreditsTopOrg[];
}

// ─── Date range ──────────────────────────────────────────────────────────────

export type DateRange = '7d' | '30d' | '90d' | 'season';
