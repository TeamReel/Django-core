# Q069 — Header upload-download round-trip elimineren

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review — pipeline analyse Q063-Q065 |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
`goal_celebration_composer.py` en `lineup_composer.py` gebruiken `generate_header_image()` die:
1. Header rendert als PIL Image
2. Uploadt naar S3
3. Retourneert presigned URL
4. Composer downloadt de URL weer als bestand

Dit is een onnodige upload+download round-trip. De flyer generators gebruiken `render_header_pil()` direct — dat is sneller en efficiënter.

## Checklist
- [x] `goal_celebration_composer.py` → `render_header_pil()` i.p.v. `generate_header_image()`
- [x] `lineup_composer.py` → `render_header_pil()` i.p.v. `generate_header_image()`
- [x] Sla header op als lokaal temp bestand i.p.v. S3 round-trip
- [x] Tests
- [x] Verify
