# H8 — Selectie & Summary per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~2 uur |
| Laag | Frontend |
| Afhankelijkheid | H5 |

## Doel

HubSelectieTab en MemberSummarySheet updaten zodat asset-status per rol getoond wordt.

## Implementatie

### 1. HubSelectieTab asset dots per rol

**Bestand**: `demo/src/pages/identity/HubSelectieTab.tsx`

- Asset dots per rol (gekleurde stip naast rolbadge)
- Hover tooltip: "Keeper: 3/5 | Speler: 2/5"
- Kleurcodering: groen (100%), oranje (>50%), rood (<50%)

### 2. MemberSummarySheet per rol

**Bestand**: `demo/src/pages/identity/MemberSummarySheet.tsx`

- Sectie per rol met asset slots
- "Assets als Keeper" → closeup ✅, kit ✅, intro (2 varianten) ✅
- "Assets als Speler" → closeup ✅, kit (home) ✅, intro (1 variant) ⚠️
- Variant count bij video types: "3 intro varianten"

### CSS

- `.rolAssetSection` — collapsible per rol
- `.variantCount` — badge met variant aantal
- `.assetDots` — dots naast rolbadge

## Acceptatiecriteria

- [ ] Asset status per rol in selectie lijst
- [ ] MemberSummarySheet gegroepeerd per rol
- [ ] Variant aantallen getoond bij video types
- [ ] Responsive
