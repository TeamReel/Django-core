# H6 — Selectie Asset Summary per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~2 uur |
| Laag | Frontend |
| Afhankelijkheid | H3, H4 |

## Doel

De asset-status dots in HubSelectieTab en de MemberSummarySheet updaten zodat ze per rol tonen.

## Implementatie

### 1. HubSelectieTab asset dots

**Bestand**: `demo/src/pages/identity/HubSelectieTab.tsx`

Huidige situatie: foto-count badge (H11) toont totaal aantal assets.

Nieuwe situatie:
- Asset dots per rol tonen (bv. groene/oranje/rode stip per rol)
- Hover tooltip: "Keeper: 3/5 assets | Speler: 2/5 assets"
- Visueel: kleine gekleurde dots naast rolbadges

### 2. MemberSummarySheet per rol

**Bestand**: `demo/src/pages/identity/MemberSummarySheet.tsx`

Huidige situatie: toont flat asset slot grid.

Nieuwe situatie:
- Sectie per rol met asset slots
- "Assets als Keeper" → closeup ✅, kit ✅, intro ❌
- "Assets als Speler" → closeup ✅, kit (home) ✅, kit (away) ❌, intro ❌
- Collapsed/expanded per rol

### 3. Asset completeness berekening

Gebruik `getMemberAssetStatus(membership, role)` uit H3:
- Toon percentage of ratio (3/5)
- Kleurcodering: groen (100%), oranje (>50%), rood (<50%)

### CSS

- `.rolAssetSection` — collapsible section in summary sheet
- `.rolAssetHeader` — rol label + completeness badge
- `.assetDots` — kleine dots naast rolbadge in selectie lijst
- Mobile: stack verticaal

## Acceptatiecriteria

- [ ] HubSelectieTab toont asset status per rol
- [ ] MemberSummarySheet toont slots gegroepeerd per rol
- [ ] Kleurcodering op completeness
- [ ] Collapsible secties per rol
- [ ] Responsive
- [ ] Geen N+1 reads (batch via getMemberAllRoles)
