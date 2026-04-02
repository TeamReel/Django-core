# Q063 â€” BrandResolver in ThenVsNowProcessor

| | |
|---|---|
| Status | ï¿½ DONE |
| Bron | Pipeline analyse â€” inline brand resolution |
| Impact | ðŸŸ¡ important |
| Effort | ~1 uur |

## Wat
`ThenVsNowProcessor._gather_data()` bevat ~40 regels inline brand resolution met eigen `_resolve_brand_asset_url()` static method. Dit doet hetzelfde als `BrandResolver.resolve_asset_url()`.

Daarnaast staat `_common.py:resolve_brand_color()` als nÃ³g een derde variant van kleurresolutie â€” dat kan ook via `BrandResolver.resolve_brand_colors()`.

**Vervang inline brand resolution door `BrandResolver`.**

## Checklist
- [x] Vervang `_resolve_brand_asset_url` door `BrandResolver`
- [x] Vervang inline kleurresolutie door `BrandResolver.resolve_brand_colors()`
- [x] Check of `_common.py:resolve_brand_color()` daarna nog callers heeft â€” zo niet, verwijderen
- [x] Tests
- [x] Verify

