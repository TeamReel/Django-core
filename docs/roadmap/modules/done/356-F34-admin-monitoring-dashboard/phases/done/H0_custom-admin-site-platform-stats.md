# H0 — Custom AdminSite + Platform Stats

> **Effort:** ~3 uur | **Impact:** Dashboard zichtbaar met kerngetallen

## Context

Vervang de standaard Django Admin index met een `TeamReelAdminSite` die een custom dashboard toont bovenaan de pagina. De standaard app-lijst blijft behouden eronder.

## To do

- [ ] Maak `src/dashboard/` app met:
  - `admin_site.py` — `TeamReelAdminSite(AdminSite)` met custom `index()` method
  - `services.py` — `DashboardStatsService` met `get_platform_stats()` method
  - `__init__.py`, `apps.py`
- [ ] `TeamReelAdminSite.index()`:
  - Roept `DashboardStatsService.get_platform_stats()` aan
  - Rendert `admin/dashboard/index.html` (extends `admin/index.html`)
  - Passt stats mee als extra context
- [ ] `DashboardStatsService.get_platform_stats()` retourneert:
  - `organisations_count` — `Organisation.objects.filter(is_active=True).count()`
  - `projects_count` — `Project.objects.filter(is_active=True).count()`
  - `members_count` — `Membership.objects.filter(is_active=True).count()`
  - `periods_count` — `Period.objects.filter(deleted_at__isnull=True).count()`
  - `activities_count` — `Activity.objects.filter(deleted_at__isnull=True).count()`
  - `participations_count` — `Participation.objects.filter(deleted_at__isnull=True).count()`
  - `users_count` — `User.objects.filter(is_active=True).count()`
  - `file_assets_count` — `FileAsset.objects.filter(is_deleted=False).count()`
- [ ] Resultaten cachen met Django cache framework (key: `dashboard:platform_stats`, TTL: 300s)
- [ ] Template `admin/dashboard/index.html`:
  - Stat cards in grid layout (4 kolommen desktop, 2 mobiel)
  - Elke card: label + getal + optioneel icoon (emoji)
  - Sectie "Platform Overview" boven de standaard app-lijst
- [ ] Registreer `TeamReelAdminSite` in `src/config/urls.py` (vervang `admin.site`)
- [ ] Voeg `dashboard` toe aan `INSTALLED_APPS`
- [ ] Tests: `tests/dashboard/test_stats_service.py`
  - `test_platform_stats_returns_all_keys`
  - `test_platform_stats_counts_only_active`
  - `test_platform_stats_cached`
  - `test_admin_index_requires_superuser`

## Done criteria

- [ ] `/admin/` toont Platform Overview sectie met 8 stat cards
- [ ] Stats zijn gecacht (2e request raakt geen DB)
- [ ] Niet-superusers zien geen dashboard stats
- [ ] 4+ tests passing
- [ ] `python manage.py check` slaagt  
