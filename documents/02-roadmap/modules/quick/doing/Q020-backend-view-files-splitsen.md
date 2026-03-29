# Q020 — Backend grote view-bestanden opsplitsen

| | |
|---|---|
| Status | � REVIEW |
| Bron | Code Review / Codebase Audit |
| Impact | 🟡 important |
| Effort | ~4 uur |

## Wat
Meerdere backend view-bestanden bevatten te veel logica en zijn moeilijk te onderhouden. De video module is de grootste knelpunt.

## Bestanden
| Bestand | Regels | Probleem |
|---------|--------|---------|
| `video/services/lineup_builder.py` | 2173 | Grootste Python bestand |
| `video/views/job.py` | 1988 | Mega ViewSet met 10+ actions |
| `video/services/then_vs_now_composer.py` | 1800 | Monolithisch |
| `video/services/lineup_composer.py` | 1725 | Monolithisch |
| `generative/_asset_helpers.py` | 1701 | Grote helper module |
| `video/services/match_flyer_generator.py` | 1515 | Monolithisch |
| `accounts/api/views_admin.py` | 1434 | Te veel admin actions |
| `accounts/api/views_context.py` | 1348 | Te veel context endpoints |

## Checklist
- [x] `video/views/job.py` → split in mixin pattern (1724 → 501 + 810 + 726)
- [ ] `video/services/` → composition pipelines, bewust niet gesplitst
- [x] `accounts/api/views_admin.py` → gesplitst (1434 → 744 + 720)
- [x] `accounts/api/views_context.py` → gesplitst (1348 → 546 + 816)
- [ ] `generative/_asset_helpers.py` → al deels gesplitst in H14, rest afronden
- [x] Tests blijven passing (348 passed, 5 skipped)
- [x] Verify (Django check: no issues)
