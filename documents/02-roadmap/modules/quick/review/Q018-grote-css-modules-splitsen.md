# Q018 — Grote CSS modules opsplitsen

| | |
|---|---|
| Status | � REVIEW |
| Bron | Code Review / Codebase Audit |
| Impact | 🟢 nice-to-have |
| Effort | ~3 uur |

## Wat
Meerdere CSS modules overschrijden de ~150 regels richtlijn flink. Dit maakt het lastig om stijlen te onderhouden en vergroot de kans op dead CSS.

## Bestanden (top 10, excl. tokens/utility die ok zijn)
| Bestand | Regels |
|---------|--------|
| `ActivitySidebar.module.css` | 789 |
| `AIStudioPage.module.css` | 761 |
| `TopNavbar.module.css` | 661 |
| `GalleryMatch.module.css` | 641 |
| `MatchWizardV2.module.css` | 635 |
| `ApprovalsPage.module.css` | 633 |
| `MediaCollectionSheet.module.css` | 617 |
| `ProjectSeasonHub.module.css` | 607 |
| `SeasonMatch.module.css` | 591 |
| `ApprovalsModals.module.css` | 549 |

## Checklist
- [ ] Splits top-5 CSS modules mee bij component-extractie
- [ ] Verwijder dead CSS classes
- [ ] Alle gesplitste modules < 200 regels
- [ ] Verify visueel
