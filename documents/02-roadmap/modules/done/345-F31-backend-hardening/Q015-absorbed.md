# Q015 — AllowAny Security Hardening

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🔴 critical |
| Effort | ~4 uur |

## Wat
12 endpoints in `generative/views_asset.py` en 3 ViewSets in `transactions/api/views.py` staan op `AllowAny`. Anonieme gebruikers kunnen AI-generaties triggeren (OpenAI/Gemini kosten), bestanden opslaan op S3, transacties aanmaken en billing-policies wijzigen. Dit is de grootste security-gap in de backend.

## Scope

### generative/views_asset.py (9 endpoints)
- `generate_asset_view` (L403) — POST triggert AI generatie
- `save_asset_view` (L1375) — POST schrijft naar DB + S3
- `restore_asset_version_view` (L1965) — POST wijzigt BrandAsset
- `review_generation_job_view` (L4073) — POST approve/reject
- `list_asset_history_view` (L1883) — GET lekt S3 paden
- `list_generation_jobs_view` (L2448) — GET lekt job data
- `generation_task_status_view` (L2402) — GET status per task
- `generation_job_counts_view` (L2805) — GET aggregaat tellingen
- `crop_closeup_from_fullbody_view` (L3145) — POST image processing
- `crop_halfbody_from_fullbody_view` (L3320) — POST image processing
- `list_asset_models_view` (L1214) — GET AI model registry
- `list_asset_templates_view` (L1236) — GET template definities

### transactions/api/views.py (3 ViewSets)
- `UsageEventViewSet` (L100) — AllowAny + geen org-scoping
- `TransactionViewSet` (L146) — AllowAny + geen org-scoping
- `BalancePolicyViewSet` (L382) — AllowAny + geen org-scoping

### observability/views.py (2 plain Django views)
- `metrics_summary` (L59) — geen auth, lekt Prometheus metrics
- `demo_health_check` (L128) — geen auth, lekt system health

## Checklist
- [ ] Alle write-endpoints → minimaal `IsAuthenticated`
- [ ] Alle read-endpoints → minimaal `IsAuthenticated`
- [ ] transactions ViewSets → `IsAuthenticated` + org-scoping in get_queryset()
- [ ] observability views → `@login_required` of IP-whitelist
- [ ] Health checks → IP-check of basic token check
- [ ] Tests: verify 401 op alle gelocked endpoints
- [ ] Verify
