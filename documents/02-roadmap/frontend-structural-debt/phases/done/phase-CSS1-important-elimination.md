# CSS1 — `!important` Elimination

**Status:** ✅ Done
**Effort:** 3 uur
**Scope:** 269 → 0 `!important` (100% elimination in 20 files)

---

## Doel

`!important` is een cascade override die onderhoud bemoeilijkt. Met de cascade layers uit de design-system-adoption roadmap zijn de meeste `!important` niet meer nodig.

## Distributie

| Bestand | Count | Strategie |
|---------|-------|-----------|
| `styles/layouts.css` | 92 | Layer specificity fixes |
| `styles/responsive.css` | 62 | Media query restructuring |
| `styles/base.css` | 48 | Layer ordering |
| `SettingsPage.module.css` | 18 | Component scoping |
| `SeasonMediaTab.module.css` | 13 | Component scoping |
| `BatchGenerationModal.module.css` | 9 | Component scoping |
| Overige 14 files | 27 | Case-by-case |

## Strategie

1. **Layer conflicts** (202 in global CSS): Herorden `@layer` declarations zodat specificity klopt
2. **Component overrides** (67 in modules): Verhoog selector specificity in plaats van `!important`
3. **Responsive overrides**: Zorg dat media queries in juiste layer zitten

## Verificatie

- [x] 0 `!important` in codebase
- [x] Visuele regressie check op key pages
- [x] `npx vite build` slaagt
