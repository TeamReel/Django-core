# H3 — Selectie In-Page Editing

| | |
|---|---|
| Status | TODO |
| Effort | ~6 uur |
| Blokkeerd door | — |

## Doel

Selectie-leden zijn inline bewerkbaar vanuit de hub. Tappen op een lid opent de `MemberDetailPanel` als overlay — niet als navigatie naar een andere pagina. Admins kunnen assets en data per lid beheren zonder de Team Hub te verlaten.

## Context

**Nu:**
- Overview: Selectie accordion toont leden als buttons met naam + chevron
- Tappen → `setSelectedMember(m)` → opent `MemberSummarySheet` (read-only)
- `MemberSummarySheet`: avatar, naam, asset status, "Bekijk profiel" knop
- "Bekijk profiel" → `navigate()` naar `MemberDetailPage` (verlaat hub)
- Selectie tab (`HubSelectieTab`): toont leden-lijst, tappen navigeert ook weg

**Na H3:**
- Tappen op lid → opent `MemberDetailPanel` als full-width overlay/panel
- `MemberDetailPanel` heeft tabs: Assets, Intro, Celebration, Actiefoto
- Admin kan direct assets uploaden, intro tekst aanpassen, etc.
- Sluiten → terug op de hub, data refreshed

## Bestaande componenten

| Component | Pad | Functie |
|-----------|-----|---------|
| `MemberSummarySheet` | `demo/src/pages/periods/MemberSummarySheet.tsx` | Read-only lid-overzicht (avatar, naam, status) |
| `MemberDetailPanel` | `demo/src/pages/periods/MemberDetailPanel.tsx` | Full edit panel met tabs (Assets, Intro, Celebration, Actiefoto) |
| `MemberAssetMatrix` | `demo/src/pages/identity/MemberAssetMatrix.tsx` | Overzicht van alle leden-assets |
| `mergeAssetsIntoMetadata` | MemberDetailPanel | Save helper voor asset data |
| `HubSelectieTab` | `demo/src/pages/identity/HubSelectieTab.tsx` | Selectie tab component |
| `SquadMember` type | `demo/src/pages/periods/squadTabTypes.ts` | Lid-type met user, assets, metadata |

## Taken

### 1. MemberDetailPanel als overlay integreren
- [ ] In `MyTeamHubPage.tsx`: state `editingMember: SquadMember | null`
- [ ] Tappen op lid in Selectie accordion → `setEditingMember(member)` (i.p.v. `setSelectedMember`)
- [ ] Render `MemberDetailPanel` als overlay/sliding panel wanneer `editingMember` is set
- [ ] Panel opent van rechts (consistent met iOS pattern)
- [ ] Sluit-knop → `setEditingMember(null)`

### 2. MemberSummarySheet aanpassen
- [ ] Vervang "Bekijk profiel" knop door "Bewerken" knop
- [ ] "Bewerken" → `setEditingMember(member)` + sluit summary sheet
- [ ] Of: verwijder MemberSummarySheet als tussenstap — directe opening van MemberDetailPanel
- [ ] **Aanbeveling:** Tap op lid → MemberSummarySheet (quick view) → "Bewerken" knop → MemberDetailPanel. Twee taps voor edit, één voor view.

### 3. HubSelectieTab integreren
- [ ] Selectie tab items: ook tappable naar MemberDetailPanel overlay
- [ ] Consistent gedrag: overal dezelfde flow (summary → edit of direct edit)

### 4. Data refresh na edit
- [ ] `MemberDetailPanel` `onSave` callback → refresh leden-data
- [ ] `mergeAssetsIntoMetadata()` → PATCH naar member endpoint
- [ ] Na save: accordion asset counts updaten (Ledenfoto's `n/m`)
- [ ] Na save: `MemberAssetMatrix` (indien zichtbaar) refresht

### 5. Overlay styling & a11y
- [ ] Panel: full-width op mobile, max 480px op desktop, sliding van rechts
- [ ] Backdrop overlay (semi-transparant) achter panel
- [ ] Focus trap: tab binnen panel, Escape sluit
- [ ] `aria-modal="true"`, `role="dialog"`
- [ ] `prefers-reduced-motion`: geen slide-animatie, directe visibility toggle
- [ ] Touch targets ≥ 44×44px op alle tabs en knoppen

### 6. Back-navigatie beschermen
- [ ] Browser back button sluit panel (niet de hub)
- [ ] History state management: `pushState` bij panel open, `popState` bij sluiten
- [ ] Voorkom dubbelklik-opening

## Acceptatiecriteria

- [ ] Tap op lid in Selectie accordion → opent MemberSummarySheet (quick view)
- [ ] "Bewerken" in summary → opent MemberDetailPanel als overlay
- [ ] Admin kan assets/intro/celebration/actiefoto bewerken in het panel
- [ ] Save → panel sluit, data refreshed in accordion en Selectie tab
- [ ] Sluiten (X of Escape of back) → terug op hub, geen navigatie
- [ ] Selectie tab leden: zelfde edit-flow als overview leden
- [ ] Ledenfoto's count in Team Assets accordion refresht na asset wijziging
- [ ] TypeScript 0 errors, build success
- [ ] Focus trap + aria-modal op het panel
