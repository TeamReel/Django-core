# Q052 — Competition Name from Period Hierarchy

| | |
|---|---|
| Status | ✅ DONE |
| Bron | F35 Reverse Engineering Analyse |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat
Competition name wordt als hardcoded string opgeslagen in `activity.metadata.teamreel.vars.competition_name` i.p.v. afgeleid uit de Period hiërarchie (Season → Competition → Week). De CTE-based Period tree is gebouwd maar wordt niet gebruikt hiervoor.

## Checklist
- [x] Backend: Fix `resolve_match_context()` in `match_context.py` om season/competition uit Period hierarchy te halen
- [x] Backend: `select_related("period__parent_period")` op alle 5 callers
- [x] Backend: Metadata string als fallback als hiërarchie niet ingesteld
- [x] Tests (7 unit tests voor alle resolution paths)
- [x] Verify

## Implementatie

### Aanpak
Q055 had `resolve_match_context()` al gecentraliseerd als single source of truth voor alle 6+ video services. De fix was dus **alleen in `match_context.py`** nodig (geen aparte utility). De resolution logica:
1. Metadata `teamreel.vars.season_name` / `competition_name` → hoogste prioriteit  
2. `activity.period.parent_period.name` → season, `activity.period.name` → competition  
3. Flat period (geen parent) → beide = period.name  
4. Legacy `metadata.competition_name` → fallback voor competition

### Gewijzigde bestanden
| Bestand | Wijziging |
|---------|-----------|
| `src/video/services/match_context.py` | Period hierarchy resolution |
| `src/video/services/lineup_builder.py` | `select_related("period__parent_period")` |
| `src/video/services/match_flyer_generator.py` | `select_related("period__parent_period")` |
| `src/video/services/goal_celebration_builder.py` | `select_related("period__parent_period")` |
| `src/video/services/processors/match_intro.py` | `select_related("period__parent_period")` (review fix) |
| `tests/video/test_match_context.py` | **7 unit tests** |

## Review

**Review fix**: `match_intro.py` was gemist bij de implementatie — had `select_related("period")` maar niet `"period__parent_period"`. Veroorzaakt lazy DB query bij elke match intro video. Gefixt.
