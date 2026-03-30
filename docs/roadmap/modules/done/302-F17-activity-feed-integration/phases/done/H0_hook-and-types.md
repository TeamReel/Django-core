# H0 — Hook + Types

> **Effort:** ~1 uur | **Impact:** Data layer klaar voor UI

## To do

- [ ] `demo/src/types/activityFeed.ts` — Response interfaces (`ActivityLogItem`, `ActivityFeedResponse`, `ActivityLogGroup`)
- [ ] `demo/src/hooks/useActivityFeed.ts` — Hook: fetch `/api/v1/activity-feed/`, cursor pagination, org-scoped, filter params (verb, project, actor)
- [ ] Verb → menselijk leesbare tekst mapping (NL): `content.created` → "heeft content aangemaakt"
- [ ] Unit tests voor hook

## Done criteria

- [ ] Hook fetcht activity feed data correct
- [ ] TypeScript interfaces matchen B62 API response
- [ ] `tsc --noEmit` passeert
