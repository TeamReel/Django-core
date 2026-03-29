# Q025 — Grote CSS modules opsplitsen (ronde 2)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟢 nice-to-have |
| Effort | ~3 uur |

## Wat
4 CSS Module bestanden zijn boven de 600 regels. Dit maakt onderhoud lastig en vertraagt style-review.

## Bestanden
| Bestand | Regels |
|---------|--------|
| `GalleryMatchTimeline.module.css` | 641 |
| `ApprovalsPage.module.css` | 633 |
| `MatchWizardV2.module.css` | 631 |
| `MediaReadinessCard.module.css` | 607 |

## Checklist
- [ ] Analyseer welke class-groepen logisch te splitsen zijn
- [ ] Split in kleinere CSS modules (~150 regels per bestand)
- [ ] Update TSX imports
- [ ] Tests (vite build)
- [ ] Verify
