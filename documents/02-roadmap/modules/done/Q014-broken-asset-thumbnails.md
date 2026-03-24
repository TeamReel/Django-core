# Q014 — Asset thumbnails laden niet (broken images)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | UI Review F27 iteratie 2 — Playwright 24-03-2026 |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat

Alle asset-thumbnails in de MemberSummarySheet tonen **broken image iconen** met alt-tekst (bijv. "Fullbody done", "Close-up done"). De `<img>` tags staan er, maar de afbeeldingen laden niet.

### Observaties
- Network logs tonen geen 404s — API calls zijn allemaal 200
- De thumbnail-URLs komen vermoedelijk van `getFirstAssetUrl()`
- Mogelijk: pre-signed S3 URLs die verlopen zijn, of CORS-issue, of variant-specifieke URLs die niet bestaan
- Op tablet en desktop dezelfde issues — dit is geen layout-probleem

## Diagnose stappen
1. Check `getFirstAssetUrl()` implementatie — welke URL wordt teruggegeven?
2. Open een thumbnail-URL direct in de browser — laadt het?
3. Check S3 bucket CORS configuratie
4. Check of de `iterVariants` / `getAssetRoles` de juiste asset-types teruggeven

## Checklist
- [ ] `getFirstAssetUrl()` debuggen — wat returnt het?
- [ ] Thumbnail URL direct testen in browser
- [ ] S3/CDN CORS headers controleren
- [ ] Fallback image implementeren bij laadfouten (`onError` handler)
- [ ] Verify dat thumbnails laden na fix
