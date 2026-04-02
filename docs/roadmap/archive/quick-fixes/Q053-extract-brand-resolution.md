# Q053 — Extract Brand Resolution naar shared module

| | |
|---|---|
| Status | � DOING |
| Bron | Code Review — media pipeline |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
Brand-resolutie logica (BrandProfile ophalen → BrandAsset resolven → presigned URL genereren) is 3× gekopieerd in `lineup_builder.py`, `goal_celebration_builder.py` en `match_flyer_generator.py`. Elke kopie is ~80 regels met subtiele variaties. Bij een bugfix of nieuwe asset_type moet je alle 3 aanpassen.

**Extract naar `src/video/services/brand_resolver.py`** met:
- `resolve_brand_profiles(project)` → prioritized list
- `resolve_brand_asset_url(profiles, asset_types, skip_team)` → presigned URL
- `resolve_opponent_logo(activity)` → presigned URL

## Checklist
- [ ] Create `src/video/services/brand_resolver.py`
- [ ] Extract gemeenschappelijke logica uit alle 3 builders
- [ ] Replace kopieën in lineup_builder, goal_celebration_builder, match_flyer_generator
- [ ] Include `_get_presigned_url` (ook 3× gekopieerd)
- [ ] Tests
- [ ] Verify: `pytest tests/video/ -v --no-cov`
