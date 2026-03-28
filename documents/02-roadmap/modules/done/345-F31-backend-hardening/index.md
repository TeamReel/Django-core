# 345 — F31 Backend Hardening

| | |
|---|---|
| Status | ✅ DONE |
| Type | Feature (cross-cutting) |
| Impact | 🔴 Kritiek — security gaps + performance + onderhoudbaarheid |
| Effort | ~20 uur |
| Bron | Backend Code Review (maart 2026) |

## Doel

De backend codebase beveiligen, versnellen en onderhoudbaar maken. De code review heeft 35 issues gevonden waarvan 12 kritiek (security). Dit module pakt de top-4 probleemgebieden aan in volgorde van impact.

## Huidige staat

### Security — 🔴 Kritiek
- **15 endpoints op AllowAny** die data muteren, AI-kosten triggeren, of interne info lekken
- **3 ViewSets zonder org-scoping** — iedereen kan transacties/policies zien en wijzigen
- **2 observability views zonder auth** — lekken Prometheus metrics en system health

### Performance — 🟡 N+1 Queries
- `UserListSerializer` maakt 3 extra queries per user (150+ bij 50 users)
- `BrandProfileSerializer.get_token_count()` doet `.count()` ipv prefetched data
- `GenerationRequestViewSet` base queryset mist `select_related`

### Code Quality — 🟡 Mega-bestanden
- `generative/views_asset.py` — **4241 regels** (12 FBVs, allemaal AllowAny)
- `accounts/api/views.py` — **3525 regels** (20+ views, auth/profile/context/admin)
- `projects/api/views.py` — **1924 regels** (5 ViewSets + helpers)
- `projects/api/serializers.py` — **689 regels**, duplicate `UserNestedSerializer`

### Test Coverage — 🟡 Grote gaten
- **15 van 27 apps** hebben 0 tests
- Business-critical apps zonder tests: `content_generation`, `notifications`, `generative`, `video`
- Totaal ~3307 tests, maar geconcentreerd in 12 apps

## Design beslissingen

| Beslissing | Keuze | Reden |
|-----------|-------|-------|
| Security first | H0 = AllowAny hardening | Financieel risico (AI kosten) + data-integriteit |
| Auth approach | `IsAuthenticated` minimaal, org-scoping op ViewSets | Bestaand patroon in codebase |
| Observability auth | `@login_required` + staff check | Simpel, geen extra middleware |
| File splitting | Barrel re-export pattern | Bewezen in H4 (activities/organisations serializers) |
| Test prioriteit | Business-critical apps eerst | content_generation > notifications > generative |
| N+1 fix approach | `prefetch_related` op ViewSet level | Standaard Django best practice |

## Fasering

| Fase | Titel | Effort | Afh. |
|------|-------|--------|------|
| H0 | Security hardening — AllowAny + org-scoping | ~4 uur | — |
| H1 | N+1 query fixes | ~2 uur | — |
| H2 | Views file splitting (3 mega-bestanden) | ~6 uur | H0 (generative changes overlap) |
| H3 | Serializer + duplicate cleanup | ~2 uur | — |
| H4 | Test coverage uitbreiding (4 business-critical apps) | ~6 uur | H0, H1 (test de fixes) |

## Acceptatiecriteria

- [ ] 0 AllowAny op data-muterende endpoints
- [ ] Alle ViewSets met org-scoping in `get_queryset()`
- [ ] Observability views achter auth
- [ ] UserListSerializer: ≤5 queries voor lijst van 50 users
- [ ] Geen Python bestanden >2000 LOC (exclusief seed commands)
- [ ] content_generation, notifications, contextual_notifications, workflows hebben tests
- [ ] Alle bestaande tests blijven groen (3307+)

## Relatie tot Q-items

Q015–Q018 zijn als quick-items aangemaakt tijdens de review. Ze worden nu opgenomen in dit feature module:

| Q-item | → Fase |
|--------|--------|
| Q015 AllowAny Security Hardening | → H0 |
| Q016 N+1 Fix UserListSerializer | → H1 |
| Q017 Views File Splitting | → H2 |
| Q018 Backend Test Coverage | → H4 |
