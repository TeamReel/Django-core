# Q040 — Silent Exception Cleanup Fase 2

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
Q033 pakt 30 silent `except: pass` in video/generative aan. Er zijn nog ~49 over in de rest van de codebase (79 totaal). Deze moeten minstens loggen met `logger.exception()` zodat fouten niet ongemerkt verdwijnen.

## Scope (na Q033)
- `accounts/api/views_admin*.py` — 12×
- `accounts/management/commands/` — 4×
- `activities/api/serializers_*.py` — 3×
- `branding/` — 5×
- `content_generation/` — 4×
- `notifications/` — 3×
- Overige — 18×

## Aanpak
Per case beoordelen:
- **Loggen**: `except Exception: logger.exception("context")`
- **Specifieke exception**: `except (ValueError, KeyError)` i.p.v. bare `except Exception`
- **Bewust negeren**: `# noqa: S110` toevoegen met comment waarom

## Checklist
- [x] Alle resterende S110 violations reviewen en fixen (53 violations in 29 bestanden)
- [x] Verify: `ruff check src/ --select=S110` → 0 errors
- [x] Tests: `pytest -x` → 490 passed
