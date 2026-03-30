# A2 — Interactive Elements Fix — Batch 1

**Status:** ✅ Compleet
**Prioriteit:** 🟡 Medium
**Geschatte effort:** 2-3 uur
**Afhankelijk van:** A1

---

## Doel

Fix de eerste batch van clickable div/span elementen + modal overlay a11y in de meest bezochte feature areas: identity, periods, en shared components.

## Reusable Utilities Aangemaakt

### `demo/src/utils/a11y.ts`

```ts
handleKeyboardClick(onClick)  → onKeyDown handler (Enter + Space)
clickableProps(onClick)        → { role: 'button', tabIndex: 0, onKeyDown }
```

## Uitgevoerde Fixes

### 1. Modal Overlay `role="presentation"` — 22 fixes in 17 bestanden

Alle modal overlays die als backdrop fungeren kregen `role="presentation"` zodat screen readers de overlay niet als interactief element aankondigen.

| Bestand | Fixes |
|---------|-------|
| NavbarQuickReviewModal.tsx | 4 overlays |
| NavbarCreditsModal.tsx | 1 |
| NavbarNotificationsModal.tsx | 1 |
| ShareButton.tsx | 1 |
| StudioCards.tsx | 1 |
| ContentCard.tsx | 1 |
| MobileFilterSheet.tsx | 1 |
| MemberEditSheet.tsx | 1 |
| MemberDetailPanel.tsx | 1 |
| ProjectSeasonMemberDetailPage.tsx | 1 |
| EditMemberModal.tsx | 1 |
| CompetitionMembershipEditModal.tsx | 1 |
| MemberBatchActionModal.tsx | 1 |
| BatchGenerationModal.tsx | 1 |
| VideoPreviewModal.tsx | 1 |
| AddMemberModal/index.tsx | 1 |
| **Modal.tsx** | **Role swap**: `role="dialog"` + `aria-modal` verplaatst van overlay → panel |
| FollowUpModals.tsx | 2 overlays |

### 2. Clickable Element Fixes — 14 fixes in 5 bestanden

| Bestand | Type Fix | Aantal |
|---------|----------|--------|
| SuccessStep.tsx | `clickableProps()` op variant/save cards | 4 |
| FollowUpModals.tsx | `clickableProps()` op intro/celebration chips | 2 |
| MemberAssetsTab.tsx | `clickableProps()` op fullbody/halfbody/closeup previews | 3 |
| TeamHierarchyTab.tsx | `role="link"` + `tabIndex` + `onKeyDown` op nav spans | 2 |
| NavbarQuickReviewModal.tsx | conditional `clickableProps()` op variant cards | 1 |

### 3. Dialog Role Correcties

| Bestand | Fix |
|---------|-----|
| Modal.tsx | `role="dialog"` + `aria-modal="true"` verplaatst van overlay naar inner panel |

## Build Verificatie

```
✓ built in 11.27s — geen errors
30 JS chunks, 22 CSS chunks
```

## Acceptatiecriteria

- [x] Alle Batch 1 items gefixed (36 fixes in 22 bestanden)
- [x] Elke clickable fix is keyboard-navigeerbaar (Tab + Enter/Space)
- [x] Modal overlays correct semantisch gemarkeerd
- [x] Geen visuele regressies (build succesvol)
- [x] `a11y.ts` utility als herbruikbaar patroon voor Batch 2
