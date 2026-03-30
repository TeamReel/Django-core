# 338-F26 — Team Hub Interactie: Assets, Credits, CRUD

| | |
|---|---|
| Code | F26 |
| Status | ✅ DONE |
| Prioriteit | Hoog |
| Geschatte effort | ~40 uur |
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
| H4 | Accordion UX & Beheer In-Page | ~3 uur | H0–H3 |
| H5 | Asset Display Fixes | ~4 uur | H0 |
| H6 | Overview → Wedstrijden Integratie | ~8 uur | H2 |
| H7 | Selectie Ledenbeheer | ~6 uur | H3 |
| H8 | Member Detail In-Page Fix | ~3 uur | H3 |
| H9 | Overview Restructure | ~4 uur | H6 |
| H10 | Breadcrumb Cleanup | ~2 uur | — |
| **H11** | **Photo Count Display** | ~2 uur | — |
| **H12** | **Asset Processing Wizard** | ~4 uur | — |
| **H13** | **Multi-Role Tonen & Toewijzen** | ~4 uur | — |

H0–H10 afgerond. H11–H13 nieuwe iteratie.

> **Note**: Assets-per-role (keeper krijgt eigen closeup, speler eigen closeup) vereist backend schema wijziging → zie **B70-assets-per-role** module.

---

## 3. Acceptatiecriteria

### H0–H3 (afgerond)
- [x] Asset-items in Team Assets en Club Assets accordions zijn tappable en openen detail/edit
- [x] Admin kan asset uploaden, vervangen en verwijderen vanuit overview
- [x] Beheer-sectie toont credits saldo en wallet-informatie (live API data)
- [x] Wedstrijden accordion heeft + knop die create-modal opent
- [x] Bestaande wedstrijden zijn bewerkbaar via tappable items
- [x] Selectie-leden zijn inline bewerkbaar via MemberDetailPanel overlay

### H4–H8 (nieuw)
- [ ] Wedstrijden en Selectie standaard dichtgeklapt in Overview
- [ ] "Team instellingen" toont credits/balance in-page (niet navigeren naar andere tab)
- [ ] Tenue, Sponsor, Club Logo, Club Kits tonen correcte assets (data flow fix)
- [ ] Overview vereenvoudigd: alleen actief seizoen + actieve competitie
- [ ] Season/Competition management geïntegreerd in Wedstrijden tab
- [ ] Leden toevoegen/verwijderen uit selectie mogelijk
- [ ] Season-level member management (lid van team maar niet van seizoen)
- [ ] Member bewerken blijft in-page als iOS-style slide-in panel
- [ ] Geen navigatie weg van de hub voor standaard CRUD-acties
- [ ] WCAG 2.1 AA: alle interactieve items hebben focus-visible, 44×44px touch targets
- [ ] TypeScript 0 errors, Vite build success

### H11–H13 (nieuwe iteratie)
- [x] **H11**: Counter toont "X / 28 met foto" (aantal leden met processed closeup)
- [x] **H12**: Klik op Logo/Tenue/Sponsor in Overview → asset processing wizard
- [x] **H12**: Na upload: "Verwerk met AI" knop → processing → preview → goedkeuren
- [x] **H13**: Multi-role tonen in Selectie UI (keeper + speler badges)
- [x] **H13**: Role picker is multi-select met checkboxes
- [x] **H13**: API unassign endpoint voor rol verwijderen
