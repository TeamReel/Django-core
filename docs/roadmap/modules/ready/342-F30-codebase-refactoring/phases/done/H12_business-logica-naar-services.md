# H12 — Business logica uit views naar services

> **Effort:** ~4 uur | **Impact:** Testbaarheid, herbruikbaarheid, scheiding van concerns

## Context

Twee view-bestanden bevatten zware business logica die in een services layer hoort:

1. **branding/views.py** — ~200 LOC color extraction in `generate_tokens`:
   - Image downloading via `requests.get()`
   - Pillow image processing (`_extract_dominant_colors`)
   - Color ranking algorithm (`_rank_colors`)
   - `DesignToken.objects.update_or_create` in een loop

2. **content_generation/views.py** — ~270 LOC approval workflow:
   - `approve` actie (~90 LOC): status validatie, ContentApproval aanmaken, notificatie, WebSocket
   - `reject` actie (~90 LOC): zelfde patroon
   - `request_revision` actie (~90 LOC): zelfde patroon

Dit maakt unit testing moeilijk — je moet hele HTTP requests simuleren om business logica te testen.

## To do

### Branding services
- [ ] Maak `src/branding/services/color_extraction.py`:
  - `extract_colors_from_image(image_url: str) → list[dict]` — download + Pillow + ranking
  - `create_design_tokens(profile: BrandProfile, colors: list) → list[DesignToken]` — DB persist
- [ ] `BrandProfileViewSet.generate_tokens` wordt thin wrapper die service aanroept
- [ ] Verplaats `_extract_dominant_colors()`, `_rank_colors()`, `_download_asset_image()` naar service

### Content Generation services
- [ ] Maak `src/content_generation/services/approval.py`:
  - `approve_content(item: ContentItem, user: User, feedback: str = "") → ContentApproval`
  - `reject_content(item: ContentItem, user: User, feedback: str) → ContentApproval`
  - `request_revision(item: ContentItem, user: User, feedback: str) → ContentApproval`
  - Elke functie: status validatie + approval aanmaken + item status update + notificatie + WebSocket
- [ ] ViewSet acties worden thin wrappers (request parsing → service call → response)
- [ ] Gedeelde validatie logica 1× schrijven in service

### Bestanden
- `src/branding/services/color_extraction.py` (NIEUW)
- `src/branding/views.py` — slanker maken
- `src/content_generation/services/__init__.py` (NIEUW)
- `src/content_generation/services/approval.py` (NIEUW)
- `src/content_generation/views.py` — slanker maken

## Done criteria

- [ ] `branding/views.py` < 500 LOC (was 699)
- [ ] `content_generation/views.py` < 500 LOC (was 685)
- [ ] Color extraction testbaar als unit (zonder HTTP request)
- [ ] Approval workflow testbaar als unit (zonder DRF client)
- [ ] Alle bestaande tests slagen
