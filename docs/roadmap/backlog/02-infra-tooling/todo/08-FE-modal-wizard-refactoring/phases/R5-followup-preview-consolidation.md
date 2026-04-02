# R5 — Follow-up & Preview Modals Consolideren

| | |
|---|---|
| Status | 📋 TODO |
| Impact | 🟡 important |
| Effort | ~6 uur |
| Risico | Middel — 2 UI contexten (approvals page + navbar) |

## Wat

Consolideer dubbele follow-up modals en dubbele preview modals naar gedeelde componenten.

## Probleem 1: Follow-up modals (3 → 1)

### Huidige situatie

| Modal | Locatie | Gebruikt door | API call |
|-------|---------|---------------|----------|
| `PhotoCompositeFollowUpModal` | `pages/FollowUpModals.tsx` | `ApprovalsModals.tsx` | `generativeApi.generate()` |
| `NavbarPhotoCompositeFollowUpModal` | `components/NavbarPhotoCompositeFollowUpModal.tsx` | `NavbarModals.tsx` / `TopNavbar.tsx` | `api.post('/generative/assets/generate/')` (raw) |
| `VideoFollowUpModal` | `pages/FollowUpModals.tsx` | `ApprovalsModals.tsx` | `generativeApi.generate()` |

**Duplicatie**: `PhotoCompositeFollowUpModal` en `NavbarPhotoCompositeFollowUpModal` doen hetzelfde — genereer een photo_composite_video. Verschil: navbar-variant mist background URL support en gebruikt raw API i.p.v. `generativeApi`.

### Doel

1 `FollowUpModal` component die:
- Beide use cases ondersteunt (photo composite + video)
- `generativeApi` gebruikt (niet raw API)
- Background URL support heeft
- Werkt als kind van zowel `ApprovalsModals` als `NavbarModals`

## Probleem 2: Preview modals (4 → 2)

### Huidige situatie

| Modal | Locatie | Gebruikt door |
|-------|---------|---------------|
| `ContentPreviewModal` (v1) | `pages/activities/MatchDetailModals.tsx` | `MatchDetailPage.tsx` |
| `ContentPreviewModal` (v2) | `pages/activities/match-detail/MatchModals.tsx` | `MatchSheetFlow.tsx`, `ContentSheet.tsx` |
| `SavedAssetPreviewModal` (v1) | `pages/activities/MatchDetailModals.tsx` | `MatchDetailPage.tsx` |
| `SavedAssetPreviewModal` (v2) | `pages/activities/match-detail/MatchModals.tsx` | `MatchSheetFlow.tsx`, `ContentSheet.tsx` |

**Duplicatie**: v1 en v2 zijn bijna identiek. Verschil: v1 gebruikt `isOpen` prop, v2 neemt item direct.

### Doel

**Opmerking**: Als R1 de dubbele MatchModals al oplost, hoeft hier alleen de follow-up consolidatie.

## Aanpak

### Follow-up
1. Maak `FollowUpModal.tsx` in `demo/src/components/`
2. Props: `type: 'photo_composite' | 'video'`, `asset`, `onClose`, `backgroundUrl?`
3. Migreer `ApprovalsModals.tsx` → importeert nieuwe `FollowUpModal`
4. Migreer `NavbarModals.tsx` → importeert nieuwe `FollowUpModal`
5. Verwijder `FollowUpModals.tsx` en `NavbarPhotoCompositeFollowUpModal.tsx`

### Preview (als niet al in R1 opgelost)
1. Kies `match-detail/MatchModals.tsx` als bron (moderner)
2. Migreer `MatchDetailPage.tsx` imports
3. Verwijder `MatchDetailModals.tsx`

## Checklist

- [ ] Nieuwe `FollowUpModal` component met type prop
- [ ] Migreer approvals page follow-up flow
- [ ] Migreer navbar follow-up flow
- [ ] Verwijder `FollowUpModals.tsx`
- [ ] Verwijder `NavbarPhotoCompositeFollowUpModal.tsx`
- [ ] Verifieer preview modals (mogelijk al opgelost in R1)
- [ ] `npx tsc --noEmit` slaagt
- [ ] `npx vite build` slaagt
- [ ] Test: approval → follow-up aanbod verschijnt
- [ ] Test: navbar → photo composite follow-up werkt
- [ ] Test: content preview in match detail + dashboard flow
