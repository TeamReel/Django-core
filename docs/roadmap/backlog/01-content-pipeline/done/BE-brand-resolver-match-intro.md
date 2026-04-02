# Q062 — BrandResolver in MatchIntroProcessor

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Pipeline analyse — inline brand resolution |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
`MatchIntroProcessor._gather_match_data()` bevat ~55 regels inline brand resolution: eigen `_resolve_asset_url()` en `_get_presigned_url()` methoden die exact doen wat `BrandResolver` al kan. Dezelfde patronen als Q053 (lineup_builder) maar dan in de match intro processor.

**Vervang inline brand resolution door `BrandResolver`.**

## Bevat ook
- Vervang inline match context extractie (~35 regels) door `resolve_match_context()` — zelfde venue-filtering logica als Q055

## Checklist
- [x] Vervang `_resolve_asset_url` + `_get_presigned_url` door `BrandResolver`
- [x] Vervang inline match context door `resolve_match_context()`
- [x] Verwijder dode helper methods
- [x] Tests
- [x] Verify
