# Q082 — Extract resolve_match_brand_assets()

| | |
|---|---|
| Status | � DONE |
| Bron | Pipeline DONE — 5× herhaald patroon |
| Impact | 🟡 important |
| Effort | ~1.5 uur |

## Wat
Vijf builders/generators herhalen exact hetzelfde 10-regels brand-resolutiepatroon:

1. `Activity.objects.select_related(...)` (identieke related fields)
2. `BrandResolver.for_project(project, organisation)`
3. `resolver.resolve_asset_url(["logo"], skip_team=True)`
4. `resolver.resolve_asset_url(["sponsor_logo"])`
5. `resolver.resolve_asset_url(["stadium_background"])`
6. `resolver.resolve_opponent_logo(activity)`
7. `resolver.resolve_brand_colors(project)`
8. `resolve_match_context(activity)`

Dit staat in: `lineup_builder.py`, `goal_celebration_builder.py`, `match_intro_builder.py`, `match_flyer_generator.py`, `then_vs_now_builder.py`.

**Extract een `resolve_match_brand_assets(activity_id)` functie die een `MatchBrandAssets` dataclass retourneert.**

## Checklist
- [ ] Maak `MatchBrandAssets` dataclass (logo_url, sponsor_url, field_background_url, opponent_logo_url, brand_primary, brand_secondary, match_context, activity, project, organisation, resolver)
- [ ] Maak `resolve_match_brand_assets(activity_id)` in `brand_resolver.py` of apart bestand
- [ ] Refactor `match_intro_builder.py` → gebruik `resolve_match_brand_assets()`
- [ ] Refactor `goal_celebration_builder.py` → gebruik `resolve_match_brand_assets()`
- [ ] Refactor `then_vs_now_builder.py` → gebruik `resolve_match_brand_assets()`
- [ ] Refactor `match_flyer_generator.py` → gebruik `resolve_match_brand_assets()`
- [ ] Refactor `lineup_builder.py` → gebruik `resolve_match_brand_assets()`
- [ ] Tests
- [ ] Verify
