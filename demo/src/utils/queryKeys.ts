/**
 * queryKeys — Centralised query key factory for TanStack Query.
 *
 * Convention: nested objects with descriptive keys. Each leaf returns
 * a readonly tuple used as the `queryKey` in `useQuery()`.
 *
 * Benefits:
 * - Type-safe keys prevent typos
 * - Easy invalidation: `queryClient.invalidateQueries({ queryKey: queryKeys.activities.all })`
 * - Hierarchical: invalidating `['activities']` also invalidates `['activities', 'closest', ...]`
 */
export const queryKeys = {
  // Activities (matches, events)
  activities: {
    all: ['activities'] as const,
    match: (matchId: string) => ['activities', 'match', matchId] as const,
    closest: (projectId: string) => ['activities', 'closest', projectId] as const,
    upcoming: (filters?: Record<string, string>) =>
      ['activities', 'upcoming', filters] as const,
    past: (filters?: Record<string, string>) =>
      ['activities', 'past', filters] as const,
  },

  // Members
  members: {
    all: ['members'] as const,
    byProject: (projectId: string) =>
      ['members', 'project', projectId] as const,
  },

  // Generative requests
  generative: {
    all: ['generative'] as const,
    requests: (filters?: Record<string, string>) =>
      ['generative', 'requests', filters] as const,
  },

  // Media items
  media: {
    all: ['media'] as const,
    items: (filters?: Record<string, string>) =>
      ['media', 'items', filters] as const,
    byActivity: (activityId: string) =>
      ['media', 'activity', activityId] as const,
    /** Batch readiness for multiple match IDs */
    batchReadiness: (matchIds: string[]) =>
      ['media', 'batchReadiness', ...matchIds.slice().sort()] as const,
  },

  // Credits
  credits: {
    balance: (orgSlug?: string) =>
      ['credits', 'balance', orgSlug] as const,
  },

  // Content templates
  templates: {
    all: ['templates'] as const,
    active: () => ['templates', 'active'] as const,
    flags: (orgId?: string) => ['templates', 'flags', orgId] as const,
  },

  // Branding
  branding: {
    assets: (projectId?: string) =>
      ['branding', 'assets', projectId] as const,
  },

  // Queue counts
  queue: {
    counts: () => ['queue', 'counts'] as const,
  },

  // Content items
  content: {
    all: ['content'] as const,
    byProject: (projectId: string) =>
      ['content', 'project', projectId] as const,
    item: (contentId: string) =>
      ['content', 'item', contentId] as const,
  },

  // Video jobs
  videoJobs: {
    all: ['videoJobs'] as const,
    byProject: (projectId: string) =>
      ['videoJobs', 'project', projectId] as const,
    job: (jobId: string) =>
      ['videoJobs', 'job', jobId] as const,
  },

  // Platform stats dashboard
  platformStats: {
    all: ['platformStats'] as const,
    overview: (range?: string) =>
      ['platformStats', 'overview', range] as const,
    pipelines: (range?: string) =>
      ['platformStats', 'pipelines', range] as const,
    credits: (range?: string) =>
      ['platformStats', 'credits', range] as const,
    explorer: () =>
      ['platformStats', 'explorer'] as const,
  },
} as const;
