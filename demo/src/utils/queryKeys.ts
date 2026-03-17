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
} as const;
