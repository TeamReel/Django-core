# Q072 — Legacy brand resolution opschonen

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review — pipeline analyse Q063-Q065 |
| Impact | 🟢 nice-to-have |
| Effort | ~2 uur |

## Wat
Na Q053-Q063 zijn er twee brand resolution patronen:

1. **`BrandResolver`** (nieuw, correct): zoekt op project/org, gebruikt in processors
2. **`_common.py:resolve_brand_color(activity_id)`** (oud): zoekt op activity_id

De oude `resolve_brand_color()` wordt nog gebruikt door:
- `goal_celebration_composer.py` (via `_resolve_brand_color` alias)
- `lineup_composer.py` (via `_resolve_brand_color` alias)
- `team_poster_generator.py` (via `_resolve_brand_color` wrapper)

Deze callers kunnen migreren naar `BrandResolver` zodat er één consistent patroon overblijft.

## Checklist
- [x] `goal_celebration_composer.py` → brand color via `data.brand_primary` (uit `GoalCelebrationData`)
- [x] `lineup_composer.py` → brand color via `lineup_data.brand_primary` (uit `LineupData`)
- [x] `team_poster_generator.py` → brand color via `lineup_data.brand_primary`
- [x] `lineup_builder.py` → `brand_primary`/`brand_secondary` velden + `resolve_brand_colors()` in builder
- [x] `goal_celebration_builder.py` → idem
- [x] Verifieer of `_common.py:resolve_brand_color()` nog callers heeft → ja, `lineup_flyer_generator.py` (out of scope)
- [x] Tests (215/215 video tests pass)
- [x] Verify

## Gewijzigde bestanden
- `src/video/services/lineup_builder.py` — `LineupData` + `brand_primary`/`brand_secondary` velden, builder vult via `BrandResolver`
- `src/video/services/goal_celebration_builder.py` — `GoalCelebrationData` + `brand_primary`/`brand_secondary` velden
- `src/video/services/lineup_composer.py` — leest `lineup_data.brand_primary` i.p.v. `_resolve_brand_color()`
- `src/video/services/goal_celebration_composer.py` — leest `data.brand_primary`
- `src/video/services/team_poster_generator.py` — leest `lineup_data.brand_primary`, `_resolve_brand_color()` functie verwijderd

## Opmerking
`_common.py:resolve_brand_color()` is NIET verwijderd — wordt nog gebruikt door `lineup_flyer_generator.py`. Kan opgeruimd worden als die ook gemigreerd wordt.
