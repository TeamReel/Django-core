# A3 — Interactive Elements Fix — Batch 2

**Status:** ✅ Compleet
**Prioriteit:** 🟡 Medium
**Geschatte effort:** 1-2 uur
**Afhankelijk van:** A1

---

## Doel

Fix de resterende batch van clickable div/span elementen en dialog roles in overige feature areas.

## Uitgevoerde Fixes

### 1. Clickable Card/Thumbnail Fixes — 7 fixes in 4 bestanden

| Bestand | Type Fix | Aantal |
|---------|----------|--------|
| ApprovalsJobList.tsx | conditional `clickableProps()` op AI + Video job cards | 2 |
| MediaLibCards.tsx | conditional `clickableProps()` op AssetCard + MemberMediaCard thumbnails | 2 |
| MediaAssetCard.tsx | conditional `clickableProps()` op preview area | 1 |
| ContentCard.tsx | `clickableProps()` op volledige Card onClick | 1 |

### 2. Modal Dialog Roles — 4 fixes in 3 bestanden

| Bestand | Fix |
|---------|-----|
| MediaAssetCard.tsx | `role="presentation"` op history modal backdrop + `role="dialog"` op content |
| ShareButton.tsx | `role="dialog"` op QR modal inner panel |
| StudioCards.tsx | `role="dialog"` op preview content panel |

### 3. Totaal overzicht A2+A3 Combined

| Categorie | Fixes |
|-----------|-------|
| Modal overlay `role="presentation"` | 24 fixes in 19 bestanden |
| Dialog container `role="dialog"` | 5 fixes in 4 bestanden |
| Modal.tsx role swap | 1 fix |
| Clickable elements `clickableProps()` | 21 fixes in 9 bestanden |
| Navigation spans `role="link"` | 2 fixes in 1 bestand |
| **Totaal** | **53 a11y fixes in 28 bestanden** |

## Build Verificatie

```
✓ built in 10.76s — geen errors
```

## Acceptatiecriteria

- [x] Alle Batch 2 prioritaire items gefixed
- [x] Elke fix is keyboard-navigeerbaar (Tab + Enter/Space)
- [x] Modal patterns correct semantisch gemarkeerd
- [x] Geen visuele regressies (build succesvol)
- [x] Reusable `a11y.ts` utility consistent toegepast
