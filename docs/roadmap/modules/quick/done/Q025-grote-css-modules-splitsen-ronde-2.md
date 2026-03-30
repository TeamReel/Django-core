# Q025 — Grote CSS modules opsplitsen (ronde 2)

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟢 nice-to-have |
| Effort | ~3 uur |

## Wat
4 CSS Module bestanden waren boven de 600 regels. Gesplit voor betere onderhoudbaarheid.

## Bestanden
| Bestand | Was | Nu |
|---------|-----|-----|
| MediaReadinessCard.module.css | 607 | 189 (+ 2 modules) |
| GalleryMatchTimeline.module.css | 641 | 37 (+ 3 modules) |
| ApprovalsPage.module.css | 633 | 469 (al onder threshold) |
| MatchWizardV2.module.css | 631 | 545 (al onder threshold) |

## Checklist
- [x] Analyseer welke class-groepen logisch te splitsen zijn
- [x] Split MediaReadinessCard.module.css → 3 bestanden
- [x] Split GalleryMatchTimeline.module.css → 4 bestanden
- [x] ApprovalsPage/MatchWizardV2 al onder 600 regels
- [x] Update TSX imports
- [x] Tests (vite build) ✓
