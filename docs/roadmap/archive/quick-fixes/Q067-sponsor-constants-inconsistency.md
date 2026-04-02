# Q067 — Sponsor constants inconsistentie fixen

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review — pipeline analyse Q063-Q065 |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
`_common.py` definieert sponsor constanten (SPONSOR_W=220, SPONSOR_PAD=16, SPONSOR_MARGIN=36, SPONSOR_BOX_H=120) maar `lineup_flyer_generator.py` gebruikt **afwijkende waarden** (PAD=15, MARGIN=20, BOX_H=100). Dit zorgt ervoor dat de sponsor in de flyer er anders uitziet dan in de video.

Daarnaast staan watermark constanten (WATERMARK_PATH, WATERMARK_OPACITY=0.25, WATERMARK_MARGIN=30) identiek in zowel `lineup_flyer_generator.py` als `lineup_composer.py`.

## Checklist
- [x] Bepaal correcte sponsor sizing (→ _common.py waarden: MARGIN=36, PAD=16, BOX_H=120)
- [x] Centraliseer in `_common.py`, vervang in beide files
- [x] Verplaats watermark constanten naar `_common.py`
- [x] Tests (197 passed)
- [x] Verify
