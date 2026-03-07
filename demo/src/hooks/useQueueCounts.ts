/**
 * useQueueCounts — Lightweight singleton hook for queue tab badges.
 *
 * Uses a **single shared poll loop** (module-level) so that multiple
 * components (sidebar, navbar, dashboard) all read the same data
 * without duplicate network requests.
 *
 * Features:
 * - `useSyncExternalStore` for tear-free reads
 * - Pauses polling when the browser tab is hidden
 * - Resumes + fetches immediately when the tab becomes visible
 * - Optimistic increment via `teamreel:queue-update` event
 */
import { useSyncExternalStore } from 'react';
import { getApiBaseUrl } from '../utils/apiBase';

// ─── Types ──────────────────────────────────────────────────────────

export interface QueueCounts {
  /** Needs Review = AI completed + pending_review */
  review: number;
  /** In Progress = AI queued/processing + Video queued/processing */
  active: number;
  /** Approved + Completed */
  completed: number;
  /** Rejected + Failed + Cancelled */
  rejected: number;
  /** All AI jobs */
  ai_queue: number;
  /** All video jobs */
  video: number;
  /** Total of all items */
  all: number;
}

const EMPTY_COUNTS: QueueCounts = {
  review: 0,
  active: 0,
  completed: 0,
  rejected: 0,
  ai_queue: 0,
  video: 0,
  all: 0,
};

// ─── Singleton store ────────────────────────────────────────────────

const POLL_INTERVAL = 30_000; // 30 s
let snapshot: QueueCounts = EMPTY_COUNTS;
const listeners = new Set<() => void>();
let subscriberCount = 0;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let fetching = false;

function notify() {
  listeners.forEach((l) => l());
}

function setSnapshot(next: QueueCounts) {
  // Only notify when data actually changed (shallow key compare)
  const prev = snapshot;
  if (
    prev.review === next.review &&
    prev.active === next.active &&
    prev.completed === next.completed &&
    prev.rejected === next.rejected &&
    prev.ai_queue === next.ai_queue &&
    prev.video === next.video &&
    prev.all === next.all
  ) return;
  snapshot = next;
  notify();
}

async function fetchCounts() {
  if (document.hidden || fetching) return;
  fetching = true;

  const apiBase = getApiBaseUrl();

  try {
    // Use lightweight server-side counts endpoints instead of fetching all jobs.
    // This reduces ~500 KB of data transfer to ~200 bytes per poll.
    const [aiCountsRes, videoCountsRes] = await Promise.all([
      fetch(`${apiBase}/api/v1/generative/jobs/counts/`, { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch(`${apiBase}/api/v1/video/jobs/counts/`, { credentials: 'include' }).then((r) =>
        r.ok ? r.json() : null,
      ),
    ]);

    // Unwrap envelope if needed
    const ai = aiCountsRes?.data ?? aiCountsRes;
    const vid = videoCountsRes?.data ?? videoCountsRes;

    if (ai && vid) {
      setSnapshot({
        review: (ai.ai_review ?? 0) + (vid.video_review ?? 0),
        active: (ai.ai_active ?? 0) + (vid.video_active ?? 0),
        completed: (ai.ai_approved ?? 0) + (vid.video_completed ?? 0),
        rejected: (ai.ai_rejected ?? 0) + (ai.ai_failed ?? 0) + (vid.video_failed ?? 0),
        ai_queue: ai.ai_total ?? 0,
        video: vid.video_total ?? 0,
        all: (ai.ai_total ?? 0) + (vid.video_total ?? 0),
      });
    } else if (ai) {
      // Video counts endpoint not available yet — only update AI counts
      setSnapshot({
        ...snapshot,
        review: ai.ai_review ?? 0,
        active: ai.ai_active ?? 0,
        completed: ai.ai_approved ?? 0,
        rejected: (ai.ai_rejected ?? 0) + (ai.ai_failed ?? 0),
        ai_queue: ai.ai_total ?? 0,
        all: (ai.ai_total ?? 0) + snapshot.video,
      });
    }
  } catch {
    // Silently ignore — don't break UI if queue API is down
  } finally {
    fetching = false;
  }
}

function startPolling() {
  fetchCounts();
  pollTimer = setInterval(fetchCounts, POLL_INTERVAL);
  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('teamreel:queue-update', handleOptimisticUpdate);
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  document.removeEventListener('visibilitychange', handleVisibility);
  window.removeEventListener('teamreel:queue-update', handleOptimisticUpdate);
}

function handleVisibility() {
  if (document.hidden) {
    // Pause polling while tab is hidden
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  } else {
    // Tab became visible — fetch immediately + restart timer
    fetchCounts();
    pollTimer = setInterval(fetchCounts, POLL_INTERVAL);
  }
}

function handleOptimisticUpdate() {
  const prev = snapshot;
  snapshot = { ...prev, active: prev.active + 1, all: prev.all + 1 };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  subscriberCount++;
  if (subscriberCount === 1) startPolling();
  return () => {
    listeners.delete(listener);
    subscriberCount--;
    if (subscriberCount === 0) stopPolling();
  };
}

function getSnapshot() {
  return snapshot;
}

// ─── Hook ───────────────────────────────────────────────────────────

/**
 * Returns shared queue counts. All components read from the same
 * singleton poll loop — no duplicate requests regardless of how many
 * components call this hook.
 *
 * @param _pollInterval — Ignored (kept for call-site compatibility).
 *   The singleton always polls at 30 s.
 */
export function useQueueCounts(_pollInterval?: number): QueueCounts {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Force an immediate re-fetch (e.g. after approving a job). */
export function refreshQueueCounts() {
  fetchCounts();
}
