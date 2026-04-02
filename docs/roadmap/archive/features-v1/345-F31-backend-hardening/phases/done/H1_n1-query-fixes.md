# H1 — N+1 Query Fixes

> **Effort:** ~2 uur | **Impact:** UserListSerializer 150+ queries → ~5 queries, merkbaar snellere pagina's

## Context

`UserListSerializer` maakt 3 extra queries per user via `get_organisations()` en `get_projects()`. Bij een lijst van 50 users = 150+ extra queries. Daarnaast gebruikt `BrandProfileSerializer.get_token_count()` `.count()` ipv de al-geprefetchte data.

## To do

### accounts — UserListSerializer N+1
- [ ] Zoek de ViewSet die `UserListSerializer` gebruikt (waarschijnlijk in `accounts/api/views.py`)
- [ ] Voeg `prefetch_related('memberships__organisation', 'project_memberships__project', 'role_assignments')` toe aan `get_queryset()`
- [ ] Herschrijf `get_organisations()` om prefetched data te gebruiken: `list(obj.memberships.all())` ipv nieuwe query
- [ ] Herschrijf `get_projects()` om prefetched data te gebruiken
- [ ] Verify met `assertNumQueries` of `django-debug-toolbar`

### branding — BrandProfileSerializer
- [ ] `get_token_count()` (L99): verander `obj.design_tokens.count()` → `len(obj.design_tokens.all())`
- [ ] Verify dat `BrandProfileViewSet` al `prefetch_related("design_tokens")` heeft

### generative — GenerationRequestViewSet
- [ ] `GenerationRequestViewSet` (L167): voeg `select_related` toe aan base queryset (niet alleen in `get_queryset()`)
- [ ] `GenerationOutputViewSet` (L383): zelfde fix

### projects — ProjectViewSet.access_roles
- [ ] `access_roles` action (L639): batch de 3 losse queries (memberships, invites, promotions) of gebruik `prefetch_related`

## Done criteria

- [ ] UserListSerializer: ≤5 queries voor list endpoint met 50 users
- [ ] BrandProfileSerializer: geen extra COUNT query per profiel
- [ ] Alle bestaande tests groen
