/**
 * Types, constants, and utility functions for the Approvals/Queue page.
 */
import {
  type WorkflowInstance,
  classifyState,
} from '../hooks/useWorkflows';
import { type GenerationJob } from '../hooks/useGenerationJobs';
import { type VideoJob } from '../hooks/useVideoJobs';

export type FilterState = 'all' | 'review' | 'active' | 'completed' | 'rejected' | 'ai_queue' | 'video';
export type ContentTypeFilter = 'all' | 'ai_video' | 'ai_image' | 'lineup_video' | 'video_processing';

export const CONTENT_TYPE_CHIPS: { key: ContentTypeFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Alles', icon: 'clipboard-list' },
  { key: 'ai_video', label: 'AI Video', icon: '🎬' },
  { key: 'ai_image', label: 'AI Image', icon: '🖼️' },
  { key: 'lineup_video', label: 'Lineup Video', icon: '⚽' },
  { key: 'video_processing', label: 'Video Processing', icon: '⚙️' },
];

export interface VideoFollowUpInfo {
  membershipId: string;
  projectId: string;
  organisationId: string;
  approvedImageUrl: string;
  kitType: string;
  memberName: string;
}

export interface PhotoCompositeFollowUpInfo {
  membershipId: string;
  projectId: string;
  approvedImageUrl: string;
  memberName: string;
  backgroundUrl?: string;
}

/** Filter AI jobs by the active sidebar tab */
export function filterAiJobsByTab(jobs: GenerationJob[], tab: FilterState): GenerationJob[] {
  switch (tab) {
    case 'review':
      return jobs.filter(j => j.status === 'completed' && (j.approval_status === 'pending_review' || !j.approval_status));
    case 'active':
      return jobs.filter(j => j.status === 'queued' || j.status === 'waiting' || j.status === 'processing' || j.status === 'retrying');
    case 'completed':
      return jobs.filter(j => j.approval_status === 'approved');
    case 'rejected':
      return jobs.filter(j => j.approval_status === 'rejected');
    case 'ai_queue':
      return jobs;
    case 'video':
      return [];
    case 'all':
    default:
      return jobs;
  }
}

/** Filter video jobs by the active sidebar tab */
export function filterVideoJobsByTab(jobs: VideoJob[], tab: FilterState): VideoJob[] {
  switch (tab) {
    case 'video':
      return jobs;
    case 'active':
      return jobs.filter(j => j.status === 'queued' || j.status === 'processing');
    case 'completed':
      return jobs.filter(j =>
        j.status === 'completed' &&
        (!j.workflow_instance || j.workflow_instance.current_state === 'approved')
      );
    case 'rejected':
      return jobs.filter(j =>
        j.status === 'failed' ||
        j.status === 'cancelled' ||
        j.workflow_instance?.current_state === 'rejected'
      );
    case 'review':
      return jobs.filter(j =>
        j.status === 'completed' && (
          j.workflow_instance?.current_state === 'ready_for_review' ||
          j.approval_status === 'pending' ||
          (!j.workflow_instance && !j.approval_status)
        )
      );
    case 'ai_queue':
      return [];
    case 'all':
    default:
      return jobs;
  }
}

/** Format duration for video jobs */
export function formatVideoDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const sec = Math.round((e - s) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  return `${min}m ${sec % 60}s`;
}

/** Map filter to state categories */
export function matchesFilter(instance: WorkflowInstance, filter: FilterState): boolean {
  if (filter === 'all') return true;
  const category = classifyState(instance.current_state);
  switch (filter) {
    case 'review': return category === 'review';
    case 'active': return category === 'active' || category === 'initial';
    case 'completed': return category === 'terminal_success';
    case 'rejected': return category === 'terminal_failure';
    default: return true;
  }
}

/** Entity display name from content_type_name */
export function getEntityLabel(contentTypeName: string): string {
  const labels: Record<string, string> = {
    activity: 'Match',
    projectmembership: 'Member',
    mediitem: 'Media',
    videojob: 'Video',
    contentitem: 'Content',
    project: 'Project',
    period: 'Season',
  };
  return labels[contentTypeName?.toLowerCase()] || contentTypeName || 'Item';
}

/** Sort priority: review first, then active, then terminal */
export function sortPriority(a: WorkflowInstance, b: WorkflowInstance): number {
  const order: Record<string, number> = {
    review: 0,
    active: 1,
    initial: 2,
    terminal_failure: 3,
    terminal_success: 4,
  };
  const aOrder = order[classifyState(a.current_state)] ?? 2;
  const bOrder = order[classifyState(b.current_state)] ?? 2;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
}
