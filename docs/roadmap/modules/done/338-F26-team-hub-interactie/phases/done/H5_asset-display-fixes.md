# H5 — Asset Display Fixes

| | |
|---|---|
| Fase | H5 |
| Status | ✅ DONE |
| Effort | ~4 uur |
| Afhankelijkheid | H0 (done) |

## Wat

Asset-items in de Overview accordions (Tenue, Sponsor, Club Logo, Club Kits) tonen geen assets terwijl de data er wél is voor ASC Helden 6. De data flow heeft meerdere problemen.

## Technische analyse

### Probleem 1: `batchBrandKits` is leeg
- **Locatie**: `useSeasonData.ts` line ~271
- `batchBrandKits` wordt opgebouwd via `teamBrand.getAsset('kit_{role}_combined')` met fallback naar `clubBrand.getAsset(...)`
- Als `teamBrand` of `clubBrand` niet correct geladen is (bv. `isTeamRoute` flag), zijn de kits leeg
- **Impact**: Tenue sheet toont lege grid, Kits sheet ook leeg

### Probleem 2: Sponsor toont club-level, niet team-level
- **Locatie**: `AssetDetailSheet.tsx` line ~145
- `sponsorUrl` = `d.brandSponsorUrl` = `clubBrand.getAsset('sponsor_logo_upload')?.url`
- Er is géén team-level sponsor asset fallback
- **Impact**: Als de club geen sponsor heeft maar het team wel, wordt niets getoond

### Probleem 3: Status indicator mismatch
- **Locatie**: `MyTeamHubPage.tsx` line ~269
- `clubAssetStatus` checkt of ZOWEL logo ALS sponsor van de club ingesteld zijn
- "Sponsor" in Team assets gebruikt `clubAssetStatus` i.p.v. team-specifieke check
- **Impact**: Status toont "–" ook al zijn team assets aanwezig

### Probleem 4: Club logo en Club kits tonen niets
- `logoUrl` = `clubBrand.getAsset('logo_upload')?.url` — als clubBrand niet geladen, null
- Kits gebruikt dezelfde `batchBrandKits` als Tenue

## Checklist

- [ ] Debug waarom `batchBrandKits` leeg is voor Helden 6 — check `isTeamRoute`, `teamBrand`, `clubBrand` laden
- [ ] Verifieer dat `useSeasonData` correct `teamBrand` en `clubBrand` ophaalt voor 3-segment hub routes
- [ ] Fix data flow zodat kits correct doorstromen naar `AssetDetailSheet`
- [ ] Fix sponsor: team-level sponsor asset toevoegen als fallback, of correcte bron gebruiken
- [ ] Fix status indicators: per asset-type correct checken (niet alles via `clubAssetStatus`)
- [ ] Fix club logo en club kits: verify `clubBrand` loading
- [ ] Test alle 6 asset sheets met echte data (Tenue, Sponsor, Ledenfoto's, Logo, Club Sponsor, Kits)
- [ ] TypeScript 0 errors, Vite build success
