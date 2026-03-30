# H1 — Component opsplitsen

| | |
|---|---|
| Status | TODO |
| Effort | ~1 uur |
| Bestanden | `MemberSummarySheet.tsx` (edit), `memberAssetHelpers.ts` (nieuw), `MemberSummarySheet.module.css` (edit + split) |

## Doel

MemberSummarySheet verkleinen van 643 → <500 regels. Helpers extraheren naar testbaar bestand. CSS opsplitsen.

## Taken

### 1. Helpers extraheren naar `memberAssetHelpers.ts`

Verplaats naar `demo/src/pages/identity/memberAssetHelpers.ts`:

- `memberAvatarUrl(m, role)`
- `getFirstAssetUrl(assets, role, mediaType, assetType)`
- `hasAnyVariant(assets, role, mediaType, assetType)`
- `getLegacyPhotoUrl(assets)`
- `getLegacyFullbodyUrl(assets, role)`
- `getPrimaryRole(m)`
- `buildAssetChecklist(assets, role, avatarUrl)`
- `AssetItem` interface
- `ROLE_LABELS` constant

Het TSX bestand importeert deze en bevat alleen de React component.

### 2. CSS module verkleinen

Splits `MemberSummarySheet.module.css` (416 regels):

| Deel | Bevat | Geschatte grootte |
|------|-------|-------------------|
| `MemberSummarySheet.module.css` | Shell, header, nav, footer | ~120 regels |
| Hergebruik bestaande `AssetAccordion.module.css` etc. | Accordion, strips | Reeds apart |

Alternatief: als de CSS voornamelijk flat selectors zijn die niet logisch splitsen, houd dan 1 bestand maar verklein door ongebruikte stijlen te verwijderen.

### 3. Barrel export bijwerken

Zorg dat `memberAssetHelpers.ts` exports correct zijn voor eventueel hergebruik vanuit andere components.

## Verificatie

- [ ] `MemberSummarySheet.tsx` < 500 regels
- [ ] `npx tsc --noEmit` — geen fouten
- [ ] `npx vite build` — build succesvol
- [ ] Visuele regressietest: Harold's sheet ziet er identiek uit
