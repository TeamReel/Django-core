# H0 — Security Hardening: AllowAny + Org-Scoping

> **Effort:** ~4 uur | **Impact:** Dicht 15 onbeveiligde endpoints, voorkomt ongeautoriseerde AI-kosten en data-mutaties

## Context

De code review vond 15 endpoints met `AllowAny` permissions die data muteren, AI-generaties triggeren (OpenAI/Gemini kosten), of interne systeem-informatie lekken. Daarnaast missen 3 ViewSets in transactions org-scoping — iedereen kan transacties en billing-policies zien/wijzigen.

## To do

### generative/views_asset.py — 12 FBVs naar IsAuthenticated
- [ ] `generate_asset_view` (L403) — AllowAny → IsAuthenticated (POST triggert AI generatie)
- [ ] `list_asset_models_view` (L1214) — AllowAny → IsAuthenticated
- [ ] `list_asset_templates_view` (L1236) — AllowAny → IsAuthenticated
- [ ] `save_asset_view` (L1375) — AllowAny → IsAuthenticated (POST schrijft DB + S3)
- [ ] `list_asset_history_view` (L1883) — AllowAny → IsAuthenticated
- [ ] `restore_asset_version_view` (L1965) — AllowAny → IsAuthenticated (POST wijzigt BrandAsset)
- [ ] `generation_task_status_view` (L2402) — AllowAny → IsAuthenticated
- [ ] `list_generation_jobs_view` (L2448) — AllowAny → IsAuthenticated
- [ ] `generation_job_counts_view` (L2805) — AllowAny → IsAuthenticated
- [ ] `crop_closeup_from_fullbody_view` (L3145) — AllowAny → IsAuthenticated
- [ ] `crop_halfbody_from_fullbody_view` (L3320) — AllowAny → IsAuthenticated
- [ ] `review_generation_job_view` (L4073) — AllowAny → IsAuthenticated

### transactions/api/views.py — 3 ViewSets: auth + org-scoping
- [ ] `UsageEventViewSet` (L100) — AllowAny → IsAuthenticated + org-scoping in get_queryset()
- [ ] `TransactionViewSet` (L146) — AllowAny → IsAuthenticated + org-scoping in get_queryset()
- [ ] `BalancePolicyViewSet` (L382) — AllowAny → IsAuthenticated + org-scoping in get_queryset()

### observability/views.py — 2 plain Django views
- [ ] `metrics_summary` (L59) — geen auth → `@login_required` + `@staff_member_required`
- [ ] `demo_health_check` (L128) — geen auth → `@login_required` + `@staff_member_required`

### Tests
- [ ] Verify 401 op alle gelocked generative endpoints (unauthenticated request)
- [ ] Verify 401 op transactions ViewSets (unauthenticated)
- [ ] Verify 403 op observability views (non-staff)
- [ ] Verify org-scoping: user A kan niet transacties van org B zien

## Done criteria

- [ ] 0 AllowAny op data-muterende endpoints
- [ ] Transactions ViewSets filteren op user's organisatie
- [ ] Observability views alleen toegankelijk voor staff
- [ ] Alle bestaande tests blijven groen
- [ ] Nieuwe auth-tests voor de gelocked endpoints
