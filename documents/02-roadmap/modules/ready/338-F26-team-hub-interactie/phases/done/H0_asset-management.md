# H0 — Asset Management vanuit Overview

| | |
|---|---|
| Status | DONE |
| Effort | ~8 uur |
| Blokkeerd door | — |

## Doel

Team Assets en Club Assets accordion-items worden tappable. Tappen opent een detail/edit sheet waar de admin het asset kan bekijken, uploaden, vervangen of verwijderen — zonder de hub te verlaten.

## Context

**Nu:**
- Team Assets toont 3 rijen: Tenue (✅/⚠️), Sponsor (✅/⚠️), Ledenfoto's (n/m)
- Club Assets toont 3 rijen: Logo (✅/⚠️), Sponsor (✅/⚠️), Kits (✅/⚠️)
- Alle rijen zijn `<div>` — niet klikbaar, geen interactie

**Na H0:**
- Alle rijen worden `<button>` met chevron-right → openen een `AssetDetailSheet`
- Sheet toont preview + upload/replace/delete acties
- Na wijziging → accordion-status refresht automatisch

## Bestaande componenten

| Component | Pad | Hergebruik |
|-----------|-----|-----------|
| `AssetsTab` | `demo/src/pages/periods/AssetsTab.tsx` | Drag-drop upload UI |
| `SeasonAssetsSettingsTab` | `demo/src/pages/periods/SeasonAssetsSettingsTab.tsx` | Weet welke brand kits er zijn |
| `batchBrandKits` | Brand API | `{ home, away, third, goalkeeper }` URLs |
| `getTeamAssetStatus` | `demo/src/utils/assetStatus.ts` | Status check voor tenue |
| `getClubAssetStatus` | `demo/src/utils/assetStatus.ts` | Status check voor club assets |
| `brandLogoUrl`, `brandSponsorUrl` | Brand API | Logo/sponsor ophalen |

## Taken

### 1. Nieuwe component: `AssetDetailSheet`
- [ ] Maak `demo/src/pages/identity/AssetDetailSheet.tsx` + `.module.css`
- [ ] Props: `assetType: 'tenue' | 'sponsor' | 'logo' | 'kits' | 'member-photos'`, `isOpen`, `onClose`, `brandData`, `onUpdate`
- [ ] Sheet toont:
  - Preview van het huidige asset (afbeelding of placeholder)
  - "Uploaden" / "Vervangen" knop → file picker of drag-drop zone (hergebruik `AssetsTab` patronen)
  - "Verwijderen" knop (met confirm dialog) — alleen als asset bestaat
- [ ] Na succesvolle upload → `onUpdate()` callback → parent refresht data

### 2. Team Assets accordion items tappable
- [ ] Verander `<div className={s.accordionItem}>` naar `<button>` voor Tenue, Sponsor, Ledenfoto's
- [ ] Voeg `ChevronRight` icoon toe (consistent met Selectie accordion)
- [ ] `onClick` → `setActiveAssetSheet({ type, scope: 'team' })`
- [ ] Tenue → opent sheet met brand kits (home/away/third/goalkeeper)
- [ ] Sponsor → opent sheet met sponsor logo upload
- [ ] Ledenfoto's → opent sheet met `MemberAssetMatrix` overzicht

### 3. Club Assets accordion items tappable (admin only)
- [ ] Zelfde patroon als Team Assets
- [ ] Logo → opent sheet met club logo upload/preview
- [ ] Sponsor → opent sheet met club sponsor upload
- [ ] Kits → opent sheet met tenue-editor per kit type

### 4. Data flow
- [ ] `AssetDetailSheet` ontvangt brand data van `SeasonProvider` context
- [ ] Upload maakt gebruik van bestaande brand asset API endpoints
- [ ] Na upload → invalidate relevante queries → accordion status refresht
- [ ] Error handling: toast bij upload failure

### 5. Styling & a11y
- [ ] Sheet: sliding panel van rechts (consistent met `MemberSummarySheet`)
- [ ] Touch targets ≥ 44×44px op alle knoppen
- [ ] Focus trap in open sheet
- [ ] `aria-label` op upload/delete knoppen
- [ ] `prefers-reduced-motion` op sheet-animatie

## Acceptatiecriteria

- [ ] Admin tapt op "Tenue" → sheet opent met kit preview en upload optie
- [ ] Admin tapt op "Sponsor" → sheet opent met sponsor logo en upload optie
- [ ] Admin uploadt nieuw asset → preview update, accordion status refresht
- [ ] Admin verwijdert asset → confirm dialog → status wordt ⚠️
- [ ] Club asset items werken hetzelfde (Logo, Sponsor, Kits)
- [ ] Ledenfoto's opent MemberAssetMatrix overzicht in sheet
- [ ] TypeScript 0 errors, build success
- [ ] focus-visible op alle interactieve elementen
