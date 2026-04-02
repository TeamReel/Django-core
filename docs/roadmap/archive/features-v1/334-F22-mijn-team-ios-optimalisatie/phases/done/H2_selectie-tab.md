# H2 — Selectie tab Keepers/Spelers/Staf

> **Effort:** ~3 uur | **Impact:** Selectie tab omgebouwd naar grouped iOS-lijst met asset-status per lid

## To do

### Groepering

- [ ] Leden groeperen op rol:
  - "KEEPERS" — participations met keeper-rol
  - "SPELERS" — participations met speler-rol
  - "STAF" — participations met coach/assistent-rol
  - "NIET IN SELECTIE" — organisatie-leden niet in dit team+seizoen
- [ ] Elke groep als `ListSection` (hergebruik uit H0)
- [ ] Lege groepen verbergen (bijv. geen keepers = geen sectie)

### Lid-row

- [ ] Elke lid-row toont:
  - Avatar thumbnail (ronde afbeelding, fallback naar initialen)
  - Naam
  - Asset-status stip (8px rond element, rechts naast naam):
    - `--color-success` — alle 5 assets gevuld
    - `--color-warning` — 1-4 van 5 gevuld
    - `--color-danger` — geen assets
  - `ChevronRight` (navigeerbaar)
- [ ] Geen rugnummers, geen rol-badges
- [ ] Staf-leden: geen asset-status stip (andere workflow)
- [ ] Gebruik `getMemberAssetStatus()` helper uit H0

### "Niet in selectie" sectie

- [ ] Toont alle organisatie-leden die niet aan dit team+seizoen deelnemen
- [ ] Zoekbalk bovenaan de sectie (als > 10 leden)
- [ ] Per lid: avatar + naam + Plus icon (`Plus` uit lucide-react)
- [ ] Tap op Plus -> toevoegen aan selectie (bestaande add-participation flow)
- [ ] Alleen zichtbaar voor admins

### Navigatie en acties

- [ ] Tap op lid -> `navigate()` naar `MemberDetailPage` (bestaand)
- [ ] Back-button context via `useSetBackNavigation()`
- [ ] Admin: swipe-to-action of long-press context menu:
  - "Bewerken" -> MemberDetailPage
  - "Uit selectie" -> verwijder participation (met bevestiging)

## Done criteria

- [ ] Leden correct grouped als Keepers / Spelers / Staf
- [ ] Asset-status stip toont juiste kleur per lid (complete/partial/empty)
- [ ] Staf-leden hebben geen asset-stip
- [ ] "Niet in selectie" toont org-leden buiten dit seizoen, met zoekbalk
- [ ] Admin kan leden toevoegen via Plus icon
- [ ] Tap op lid navigeert naar MemberDetailPage, back-button werkt
- [ ] Geen rugnummers of rol-badges zichtbaar
- [ ] Touch targets >= 44x44px, `:focus-visible`
- [ ] `npx tsc --noEmit` + `npx vite build` slagen
