# Q3 — API Module Tests

**Status:** ✅ Done
**Effort:** 4 uur
**Scope:** 10 API module test files, 51 new tests (167 total)
**Vereist:** Q1, A2

---

## Doel

De domain API modules (uit A2) zijn de interface met de backend. Tests hier vangen breaking API changes vroegtijdig op.

## Test targets

Elk domain module uit A2:
- `api/activities.ts`
- `api/members.ts`
- `api/organisations.ts`
- `api/projects.ts`
- `api/periods.ts`
- `api/branding.ts`
- `api/content.ts`
- `api/media.ts`
- `api/video.ts`
- `api/credits.ts`

## Test pattern

```typescript
describe('activitiesApi', () => {
  it('list() calls correct endpoint with params', async () => {
    const handler = http.get('*/api/v1/activities/', () => {
      return HttpResponse.json({ results: [mockActivity], count: 1 });
    });
    server.use(handler);

    const result = await activitiesApi.list('project-123');
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject(mockActivity);
  });

  it('get() returns single activity', async () => { ... });
  it('createMatch() sends correct payload', async () => { ... });
  it('handles 404 with ApiError', async () => { ... });
  it('handles 500 with ApiError', async () => { ... });
});
```

## Verificatie

- [x] 10+ API module test files
- [x] Happy path + error paths getest
- [x] MSW handlers matchen productie API structuur
- [x] `npx vitest run` passing
