# H2 — Views File Splitting

> **Effort:** ~6 uur | **Impact:** 3 mega-bestanden (4241 + 3525 + 1924 LOC) worden navigeerbaar en reviewbaar

## Context

Drie views-bestanden zijn ver boven de 500 LOC grens. Na H0 (security hardening) zijn er al wijzigingen in `generative/views_asset.py`, dus de split bouwt daarop voort. Het bewezen barrel re-export pattern uit H4 (serializer splitting) wordt hergebruikt.

## To do

### generative/views_asset.py (4241 LOC → 4 modules)
- [ ] Read full file, identificeer logische groepen
- [ ] `views_generate.py` — asset generation FBVs (`generate_asset_view`, models, templates)
- [ ] `views_save.py` — save/restore/history FBVs (`save_asset_view`, `restore_asset_version_view`, `list_asset_history_view`)
- [ ] `views_jobs.py` — generation job management (`list_generation_jobs_view`, `generation_task_status_view`, `generation_job_counts_view`, `review_generation_job_view`)
- [ ] `views_crop.py` — image processing FBVs (`crop_closeup_from_fullbody_view`, `crop_halfbody_from_fullbody_view`)
- [ ] `views_asset.py` → barrel die alles re-exporteert
- [ ] URL-config updaten als nodig (of via barrel)

### accounts/api/views.py (3525 LOC → 4 modules)
- [ ] `views_auth.py` — login, register, token refresh, password reset
- [ ] `views_profile.py` — profile CRUD, avatar, password change
- [ ] `views_context.py` — auth_me, default_context, active context resolution
- [ ] `views_admin.py` — admin-only user management, impersonation
- [ ] `views.py` → barrel re-export
- [ ] URL-config bijwerken

### projects/api/views.py (1924 LOC → 3 modules)
- [ ] `views_project.py` — ProjectViewSet, ClubViewSet, TeamViewSet
- [ ] `views_membership.py` — ProjectMembershipViewSet, invite/promote logic
- [ ] `views_roles.py` — access_roles action, role resolution helpers
- [ ] `views.py` → barrel re-export
- [ ] URL-config bijwerken

### Verificatie
- [ ] Alle URL-routes werken (test via `python manage.py show_urls` of vergelijkbaar)
- [ ] Alle bestaande tests groen
- [ ] Geen bestand >1000 LOC (exclusief barrel)

## Done criteria

- [ ] `generative/views_asset.py` → 4 bestanden, elk <1200 LOC
- [ ] `accounts/api/views.py` → 4 bestanden, elk <1000 LOC
- [ ] `projects/api/views.py` → 3 bestanden, elk <800 LOC
- [ ] Barrel re-exports behouden backward compatibility
- [ ] Alle tests groen
