# Q017 — Views.py File Splitting

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
Drie views-bestanden zijn ver boven de 500 LOC limiet. Dit maakt navigatie, review en onderhoud moeilijk.

| Bestand | Regels | Voorstel |
|---------|--------|----------|
| `generative/views_asset.py` | 4241 | Splitsen naar: `views_generate.py`, `views_save.py`, `views_jobs.py`, `views_crop.py` |
| `accounts/api/views.py` | 3525 | Splitsen naar: `views_auth.py`, `views_profile.py`, `views_context.py`, `views_admin.py` |
| `projects/api/views.py` | 1924 | Splitsen naar: `views_project.py`, `views_membership.py`, `views_roles.py` |

## Checklist
- [ ] `generative/views_asset.py` → 4 modules + barrel re-export
- [ ] `accounts/api/views.py` → 4 modules + barrel re-export
- [ ] `projects/api/views.py` → 3 modules + barrel re-export
- [ ] URL-configs bijwerken (imports moeten blijven werken)
- [ ] Tests: bestaande tests moeten groen blijven
- [ ] Verify
