# Q066 — ThenVsNow header centraliseren

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review — pipeline analyse Q063-Q065 |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
`then_vs_now_composer.py` bouwt een eigen header (~60 regels in `_render_header()`) terwijl `header_generator.py:render_header_pil()` al een `title_text` parameter accepteert. Alle andere generators/composers gebruiken `render_header_pil()` al.

Dit betekent dat styling updates aan de header (font, spacing, kleuren) niet doorwerken naar ThenVsNow video's.

## Checklist
- [x] Vervang `_render_header()` in `then_vs_now_composer.py` door `render_header_pil(title_text="THEN VS NOW")`
- [x] Verwijder custom `_render_header()` functie (~60 regels)
- [ ] Verifieer visueel dat header er hetzelfde uitziet
- [x] Tests (197 passed)
- [x] Verify
