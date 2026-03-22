# 338-F26 — Team Hub Interactie: Assets, Credits, CRUD

| | |
|---|---|
| Code | F26 |
| Status | 📐 READY |
| Prioriteit | Hoog |
| Geschatte effort | ~24 uur |
| Afhankelijkheden | F24 (done) — Team Hub V2 met iOS-accordions, CompetitionGrid, SeasonProvider |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie na F24

F24 leverde een complete Team Hub V2 op met iOS-style accordions, seizoen-switcher, competitie-grid en tabstructuur. Visueel werkt het goed, maar de interactie-laag ontbreekt grotendeels:

| # | Probleem | Impact |
|---|---------|--------|
| 1 | **Assets niet klikbaar** — Tenue, Sponsor, Logo, Kits tonen alleen status-iconen | Admin kan assets niet bekijken, bewerken of verwijderen vanuit de overview |
| 2 | **Beheer toont alleen ✅** — Geen context wat de checkmarks betekenen | Admin ziet geen credits/saldo, onduidelijk wat "ingesteld" betekent |
| 3 | **Geen + knop bij Wedstrijden** — Wedstrijd aanmaken vereist navigatie naar andere pagina | Onnodig veel klikken voor een kernactie |
| 4 | **Selectie niet bewerkbaar** — Leden-items navigeren weg van de hub | iOS-patroon verbroken; admin verliest context bij bewerken |

### 1.2 Gewenste situatie

| # | Gewenst | UX-patroon |
|---|---------|-----------|
| 1 | Asset-items tappable → open detail/edit sheet | iOS list → sheet overlay |
| 2 | Beheer toont credits saldo + wallet info | Informationele kaart met live data |
| 3 | FAB "+" knop op Wedstrijden accordion → create modal | Floating action button → modal |
| 4 | Leden inline bewerkbaar via MemberDetailPanel overlay | Sheet/panel overlay, geen navigatie |

### 1.3 Bestaande componenten om te hergebruiken

| Component | Locatie | Hergebruik |
|-----------|---------|-----------|
| `AssetsTab` | `demo/src/pages/periods/AssetsTab.tsx` | Drag-drop upload UI voor assets |
| `SeasonAssetsSettingsTab` | `demo/src/pages/periods/SeasonAssetsSettingsTab.tsx` | Wraps AssetsTab, kent brand kits |
| `creditsApi` | `demo/src/api/credits.ts` | `getMyBalance()`, `getProjectBalance()` |
| `MemberDetailPanel` | `demo/src/pages/periods/MemberDetailPanel.tsx` | Full inline lid-editor (Assets, Intro, Celebration, Actiefoto tabs) |
| `MemberSummarySheet` | `demo/src/pages/periods/MemberSummarySheet.tsx` | Read-only lid-summary |
| `HubWedstrijdenTab` | `demo/src/pages/identity/HubWedstrijdenTab.tsx` | Heeft al FAB + create modal logica |
| `batchBrandKits` | `demo/src/api/` | `{ home, away, third, goalkeeper }` kit URLs |
| `brandLogoUrl`, `brandSponsorUrl` | Brand API | Ophalen logo/sponsor assets |

---

## 2. Fasering

| Fase | Titel | Effort | Afhankelijkheid |
|------|-------|--------|-----------------|
| H0 | Asset Management vanuit Overview | ~8 uur | — |
| H1 | Credits & Team Instellingen | ~4 uur | — |
| H2 | Wedstrijden CRUD | ~6 uur | — |
| H3 | Selectie In-Page Editing | ~6 uur | — |

Fases zijn onafhankelijk en kunnen in willekeurige volgorde worden gebouwd.

---

## 3. Acceptatiecriteria

- [ ] Asset-items in Team Assets en Club Assets accordions zijn tappable en openen detail/edit
- [ ] Admin kan asset uploaden, vervangen en verwijderen vanuit overview
- [ ] Beheer-sectie toont credits saldo en wallet-informatie (live API data)
- [ ] Wedstrijden accordion heeft + knop die create-modal opent
- [ ] Bestaande wedstrijden zijn bewerkbaar via tappable items
- [ ] Selectie-leden zijn inline bewerkbaar via MemberDetailPanel overlay
- [ ] Geen navigatie weg van de hub voor standaard CRUD-acties
- [ ] WCAG 2.1 AA: alle interactieve items hebben focus-visible, 44×44px touch targets
- [ ] TypeScript 0 errors, Vite build success
