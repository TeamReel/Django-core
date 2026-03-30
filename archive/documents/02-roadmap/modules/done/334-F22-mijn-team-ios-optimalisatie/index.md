# 334-F22 — Mijn Team: iOS-stijl Optimalisatie (Mobiel)

| | |
|---|---|
| Code | F22 |
| Status | ✅ DONE — Ronde 2 geïmplementeerd |
| Prioriteit | Hoog |
| Geschatte effort | ~14 uur |
| Afhankelijkheden | F21 (done) — huidige 4-tab structuur |
| Doelgroep | **Team Admins** (primair), Players (secundair) |

---

## Context

De MyTeamHubPage (gebouwd in F21) werkt functioneel maar voelt als een desktop-pagina op mobiel. De 4 tabs zijn correct, maar de content binnen elke tab mist de iOS-native feel die gebruikers verwachten op hun telefoon.

### Ronde 1 (done): iOS Grouped Sections
- ListSection component gebouwd (iOS Settings-stijl)
- 4 tabs: Overview, Wedstrijden, Media, Selectie — alle met grouped sections
- Asset-status helpers, score badges, SegmentedControl
- Volledig responsive

### Ronde 2 (nu): In-page Sheets + Volledig Beheer
Na Ronde 1 navigeert alles nog **weg** van de hub. Tap op een wedstrijd → hele pagina weg. Tap op een lid → hele pagina weg. Dit breekt de iOS-feel en is inconsistent met Homepage (cards → sheets) en Profiel (rows → sheets).

**Problemen:**
1. **Navigeert weg**: match tap, member tap, "Bekijk wedstrijd" → verlaat de hub
2. **Admin-tabs onbereikbaar op mobiel**: Beheer/Club tabs zijn `desktopOnly`, admin Overview-rijen werken niet
3. **Club-level data niet beheerbaar**: clublogo, club assets, brand profiel niet vanuit de hub

**Gewenste staat:**
- `NavigationSheet`-patroon (zoals Homepage + Profiel) — tap opent sheet, niet nieuwe pagina
- Mobiel: full-screen slide-up | Desktop: side-panel van rechts (560px)
- Alle team- en club-data beheerbaar vanuit de hub
- Admin-tabs ook op mobiel bereikbaar
- iOS-consistente UX door hele app heen

---

## Analyse: Huidige MyTeamHubPage (mobiel)

### Wat werkt

- 4-tab structuur zonder overflow (F21)
- SeasonSwitcher in header (dropdown als 2+ seizoenen)
- RBAC-gated tabs (Supporter: 2, Player: 4, Admin: 4 + inline Instellingen)
- MobileTabBar met horizontale scrollable pills
- Back-navigatie naar club

### Wat niet werkt / beter kan

| Probleem | Impact |
|----------|--------|
| Overview = data-dump | Geen visuele hierarchie, moeilijk scannen |
| 4 stat-boxen bovenaan | Desktop-stijl, geen iOS feel |
| Club assets checklist | Lijstje met vinkjes — niet tappable, geen visuele feedback |
| Member cards op mobile | Inklapbare kaarten per lid — niet overzichtelijk bij 18+ spelers |
| Media tab | Content generation interface — complex, niet visueel |
| Instellingen = ingeklapt | Admin moet eerst klikken om beheer te zien |
| Wedstrijden = expandable cards | Elke match is een accordion — veel tappen |
| Geen asset-overzicht | Geen visueel overzicht van club/team/member assets |

### Asset-hierarchie in het datamodel

```
Club (BrandProfile)
+-- Logo, watermark, sponsor, club_background
+-- Kits: thuis, uit, derde, keeper, coach, training
|
+-- Team (BrandProfile)
|   +-- Logo, sponsor (evt. eigen)
|   +-- Kits: thuis, uit, derde, keeper (team-specifiek)
|
+-- Seizoen (Period)
    +-- Competities (child periods)
    +-- Wedstrijden (Activities)
    |   +-- Content: video's, graphics per wedstrijd
    |
    +-- Selectie (Participations)
        +-- Per lid (metadata.teamreel_assets):
            +-- profile (portretfoto)
            +-- fullbody, closeup, intro, celebration
            +-- legacy_photo: home/away/third
            +-- action_photo: home_dribbling, home_celebration, away_*
```

**Key insight:** Assets leven op 3 niveaus (club, team, member-per-seizoen). Een admin moet al deze niveaus overzichtelijk kunnen beheren.

### Rollen in selectie

Het datamodel kent geen voetbal-posities. Wel:
- **Keeper** vs **Speler** (participation role)
- **Coach / Assistent** (staf-rollen)
- **Admin** vs **Player** vs **Supporter** (access roles)

---

## Afbakening: Home (Dashboard) vs Mijn Team (Beheer)

| | Home | Mijn Team |
|---|---|---|
| **Vraag** | "Wat is de status / wat moet ik nu doen?" | "Ik wil iets beheren aan mijn team" |
| **Scope** | Cross-team, organisatie-breed | Een specifiek team + seizoen |
| **Focus** | Overzichten, voortgang, quick actions | Beheer: selectie, media, assets, wedstrijden |
| **Wedstrijden** | Voortgang + next match (alle teams) | Volledige kalender + CRUD (aanmaken, bewerken) |
| **Leden** | Readiness-status (wie mist foto's) | Volledige selectie: toevoegen, rollen, assets per lid |
| **Content** | Pipeline voortgang (hoeveel verwerkt/pending) | Mediabeheer per wedstrijd of seizoen |
| **Assets** | — | Club assets, team assets, member assets beheren |
| **Tone** | Status dashboard / command center | Beheer-werkbank / team cockpit |

---

## Design Principes

1. **iOS Grouped Sections** — Rounded containers met section headers, zoals iOS Settings
2. **Premium & Clean** — Consistent spacing, subtiele dividers, geen visuele ruis
3. **Team Admin First** — Beheer prominent, niet verstopt achter inklappers
4. **Asset-aware** — Visueel tonen wat compleet is en wat mist
5. **Scanning > Reading** — Grote touch targets, status indicators, chevrons
6. **Minimal Taps** — Belangrijkste info direct zichtbaar, geen extra klikken
7. **Lucide Icons** — Consistent met codebase (`lucide-react`), geen emoji's

---

## Beslissingen (Fine-Tuned)

### Ronde 1

| Keuze | Besluit |
|-------|---------|
| Hero-sectie Overview | Volgende wedstrijd card + seizoen stats eronder |
| Content Streak widget | Verwijderd — hoort bij Home (voortgang), niet beheer |
| Beheer-opties | Altijd zichtbare iOS grouped section — geen inklappers |
| Asset-status sectie | Tappable rows met badge als iets mist, navigeert naar beheer |
| Asset-indicator per lid | Kleur-stip (3 niveaus: compleet / deels / leeg) |
| Info per lid | Avatar + naam + asset-status stip |
| Media groepering | Toggle: per wedstrijd of per seizoen |
| Media "per seizoen" view | Asset-matrix (leden x asset-types) — admin ziet wie wat mist |
| Wedstrijden groepering | "Komend" apart, rest per maand |
| Tab-structuur | 4 tabs behouden (bewezen in F21) |
| Navigatie instellingen | Naar bestaande detail-pagina's — back-button terug |
| Rugnummers | Niet tonen — niet relevant voor beheer |
| Rol-badges | Niet tonen — te veel visuele ruis |
| Scope | Alle viewports — ListSection werkt op mobiel en desktop, geen twee code-paden |
| Player/Supporter view | Alles behalve Beheer-sectie — Assets read-only is nuttig voor spelers |
| "Niet in selectie" pool | Alle organisatie-leden die niet in dit team+seizoen zitten (met zoekbalk) |
| "Komend" sectie | Max 3 wedstrijden — houdt het compact, rest valt in maand-groepen |
| Asset-matrix mobiel | Responsive: mini-dots (5 stippen) naast naam op mobiel, volle matrix op desktop |

### Ronde 2

| Keuze | Besluit | Reden |
|-------|---------|-------|
| Sheet-component | `NavigationSheet` (niet `BottomSheet`) | Consistent met Homepage + Profiel; mobiel=full-screen slide-up, desktop=side-panel |
| Match tap | Opens `MatchSummarySheet` met preview + "Ga naar wedstrijd" knop | Quick preview zonder hub te verlaten, optie voor volledige pagina |
| Member tap | Opens `MemberSummarySheet` met profiel + assets + acties | Zelfde patroon als match; admin kan direct assets zien/beheren |
| "Bekijk wedstrijd" (Overview) | Opent `MatchSummarySheet` | Consistent met Wedstrijden-tab gedrag |
| Admin-tabs mobiel | `desktopOnly` weghalen, tabs tonen op alle viewports | Tab-bar scrollt al horizontaal; alle admin-functionaliteit bereikbaar |
| Club-level data op Mijn Team | Read-only sectie in Overview: status clublogo, assets, brand profiel + "Beheer bij club >" link | Snel status checken zonder context te verliezen; bewerken op Club-pagina |
| Club-pagina iOS-stijl | `HubClubTab` herstructureren met ListSection grouped sections | Consistent met team-hub; zelfde premium iOS-feel |
| Member sheet | Read-only preview (naam, avatar, rol, assets) — geen edit-acties | Bewerken op MemberDetailPage; sheet is quick preview |
| Bottom nav label | "Mijn Club" voor club-admins, "Mijn Team" voor team-admins/spelers | Past bij de hiërarchie; club-admin ziet zichzelf op club-niveau |
| `onBack` stacking | Sheets kunnen child-sheets openen (iOS drill-down via `onBack` prop) | Dieper navigeren zonder pagina te verlaten |
| Lazy loading | Sheet-content via `React.lazy` + `Suspense` | Performance: sheet JSX pas laden bij openen |
| Browser back = sheet sluiten | `NavigationSheet` krijgt `history.pushState` — back-button sluit sheet | Huidige staat: geen enkele sheet doet dit. Essentieel voor iOS-native feel op web |
| Haptic feedback | `haptic.light()` bij sheet open, `haptic.medium()` bij swipe-dismiss | Consistent met MobileBottomNav (light) en MobileFilterSheet (medium bij swipe) |
| Swipe-to-dismiss | NavigationSheet krijgt touch-drag support op mobiel (100px drempel) | Consistent met MobileFilterSheet patroon; iOS standaard gesture |
| Tab-switch sluit sheet | Open sheet sluit direct bij tab-wissel | Voorkomt visuele verwarring (sheet van ene tab bij andere tab actief) |
| Member sheet header | < > nav bar in body, niet in NavigationSheet header | NavigationSheet header ondersteunt alleen title + close/back. MemberDetailPanel bouwt ook eigen nav-header |
| Member crossfade | 150ms opacity transition bij < > navigatie | Vloeiende wissel i.p.v. harde knip |
| Assets in sheet | Zichtbaar voor alle rollen (read-only) | Speler/supporter ziet wat er is, admin ziet wat mist |
| "Bekijk profiel" actie | Sluit sheet + opent MemberDetailPanel (bestaand slide-in panel) | Hergebruik bestaande infra; niet naar losse pagina navigeren |
| HubClubTab sub-tabs | Sub-tab structuur behouden, elk restylen met ListSection | Te veel content voor één scrollpagina; sub-tabs logisch |
| Club-admin definitie | `useUserRole()` hook: `isOrgAdmin` = true (membership ≥ editor op club-level project) | Bestaande hook, geen nieuwe infra nodig |
| MobileTabBar scroll-indicator | Gradient-fade aan rechterrand als tabs buiten beeld vallen | Visuele hint dat er meer tabs zijn bij 6 tabs op smal scherm |

---

## Tab 1: Overview

**Gegroepeerde secties, scanbaar, actie-gericht.**

```
+-----------------------------+
|  [Shield] ASC Helden 6      |  <-- Team header met crest
|  Seizoen 2025-2026          |
|  [Seizoen wisselen v]       |
+-----------------------------+
|                             |
|  +- VOLGENDE WEDSTRIJD ----+|  <-- Hero card
|  | [Calendar] Za 22 mrt     ||
|  | ASC Helden 6 vs RKC 3   ||
|  | [MapPin] Sportpark Zuid  ||
|  | Opstelling         [>]  ||
|  +-------------------------+|
|                             |
|  +- SEIZOEN ---------------+|  <-- Stats (tappable rows)
|  | [Calendar] Wedstrijden    12 / 22  [>] |
|  | [Users] Selectie         18        [>] |
|  | [Film] Content            47       [>] |
|  +-------------------------+|
|                             |
|  +- ASSETS ----------------+|  <-- Tappable, badge als iets mist
|  | [Image] Club assets       [CheckCircle] [>] |
|  | [Image] Team assets       [AlertCircle] [>] |
|  | [Users] Ledenfotos       14/18         [>] |
|  +-------------------------+|
|                             |
|  +- BEHEER ----------------+|  <-- Admin-only, altijd zichtbaar
|  | [Settings] Team instellingen      [>] |
|  | [Palette] Brand profiel           [>] |
|  | [Trophy] Competities              [>] |
|  | [Image] Kits & Tenues             [>] |
|  | [Upload] Assets uploaden          [>] |
|  +-------------------------+|
|                             |
+-----------------------------+
```

**Iconen (Lucide):** `Shield`, `Calendar`, `MapPin`, `Users`, `Film`, `Image`, `Settings`, `Palette`, `Trophy`, `Upload`, `CheckCircle`, `AlertCircle`, `ChevronRight`

**Gedrag:**
- Seizoen stats rows tappen navigeert naar de betreffende tab
- Asset rows tonen `CheckCircle` (compleet, `--text-success`) of `AlertCircle` (mist iets, `--text-warning`)
- Beheer rows navigeren naar bestaande detail-pagina's
- Geen Content Streak widget — dat hoort op Home

**RBAC per rol:**
- **Admin**: alle 4 secties (Wedstrijd, Seizoen, Assets, Beheer)
- **Player**: Wedstrijd + Seizoen + Assets (read-only) — geen Beheer-sectie
- **Supporter**: Wedstrijd + Seizoen + Assets (read-only) — geen Beheer-sectie

---

## Tab 2: Wedstrijden

**iOS grouped list, "Komend" apart, rest per maand.**

```
+- KOMEND (max 3) -----------+
| [Calendar] Za 22 mrt        |
|   ASC Helden 6 - FCZ 4  [>]|
| [Calendar] Za 29 mrt        |
|   BVC 2 - ASC Helden 6  [>]|
+----------------------------+

+- MAART 2026 ---------------+
| Za 15  ASC 6 - NEC 3    2-1|
| Za 8   RKC 3 - ASC 6    0-3|
+----------------------------+

+- FEBRUARI 2026 ------------+
| Za 22  ASC 6 - DVS 4    1-1|
| ...                         |
+----------------------------+

           [+ Wedstrijd]        <-- FAB (admin)
```

**Gedrag:**
- "Komend" sectie: max 3 eerstvolgende wedstrijden, nog geen score
- Gespeelde wedstrijden: score badge rechts, in clubkleuren
- Tap op row -> MatchDetailPage (bestaand), back-button terug
- Admin: floating action button (+) voor nieuwe wedstrijd
- Geen expandable accordions — clean lijst, details op detail-pagina

---

## Tab 3: Selectie

**iOS-lijst, grouped als Keepers / Spelers / Staf. Avatar + naam + asset-status.**

```
+- KEEPERS ------------------+
| [avatar] Jan de Vries   [o][>]|  <-- o = status stip
| [avatar] Piet Bakker   [o][>]|
+----------------------------+

+- SPELERS ------------------+
| [avatar] Kees Jansen   [o][>]|
| [avatar] Tom de Boer   [o][>]|
| [avatar] Mo El Amrani  [o][>]|
| ...                         |
+----------------------------+

+- STAF --------------------+
| [avatar] Henk Visser    [>]|  <-- Geen asset-stip voor staf
| [avatar] Dirk Smit      [>]|
+----------------------------+

+- NIET IN SELECTIE ---------+  <-- Alle org-leden niet in team+seizoen
| [Zoek lid...]               |  <-- Zoekbalk (bij veel leden)
| [avatar] Lisa van Dijk  [+] |  <-- Plus icon = toevoegen
| [avatar] Sem Mertens    [+] |
+-----------------------------+
```

**Asset-status stip** (klein rond element, 8px):
- `--color-success` — alle 5 asset-slots gevuld (profile, fullbody, closeup, intro, celebration)
- `--color-warning` — 1-4 van 5 gevuld
- `--color-danger` — geen assets

**Gedrag:**
- Tap op lid -> MemberDetailPage (bestaand), back-button terug
- Staf-leden: geen asset-stip (andere workflow)
- "Niet in selectie": alle organisatie-leden die niet in dit team+seizoen zitten, met zoekbalk bij veel leden
- Admin: swipe-to-action of context menu (bewerken, verwijderen uit selectie)
- Geen rugnummers, geen rol-badges — clean en premium

---

## Tab 4: Media

**Toggle tussen per wedstrijd en per seizoen (asset-matrix).**

### View: Per wedstrijd (default)

```
[Per wedstrijd v] [Per seizoen]    <-- Segmented control

+- ASC 6 vs RKC 3 | 8 mrt ---+
| [thumb][thumb][thumb][thumb] |  <-- Visuele thumbnails
| 5 items | 3 video            |
| Genereer meer           [>] |  <-- Admin actie
+-----------------------------+

+- BVC 2 vs ASC 6 | 1 mrt ---+
| [thumb][thumb][thumb]        |
| 3 items | 1 video            |
+-----------------------------+
```

### View: Per seizoen (asset-matrix)

```
+- ASSET OVERZICHT -----------+
|              prof  full  clo  intr  cele |
| Jan de Vries   [v]  [v]  [v]  [v]  [v]  |  <-- Alles compleet
| Piet Bakker    [v]  [v]  [ ]  [ ]  [ ]  |  <-- Deels
| Mo El Amrani   [ ]  [ ]  [ ]  [ ]  [ ]  |  <-- Leeg
| ...                                       |
+------------------------------------------+
```

`[v]` = `Check` icon (--text-success), `[ ]` = leeg (--text-tertiary)

**Responsive asset-matrix:**
- **Desktop (>=768px)**: volle matrix met kolom-headers (prof, full, clo, intr, cele)
- **Mobiel (<768px)**: compacte weergave — naam + 5 mini-dots naast elkaar (gevuld/leeg)

**Gedrag:**
- Segmented control toggle (niet pills, premium feel)
- Per wedstrijd: thumbnails in horizontale scroll, tap = fullscreen viewer
- Per seizoen: asset-matrix als overzichtstabel — admin ziet direct wie wat mist
- Tap op member-naam in matrix -> MemberDetailPage
- Admin: "Genereer meer" link per wedstrijd-sectie

---

## Technische Aanpak

### Nieuw component: `ListSection`

Herbruikbaar iOS-style grouped section component:

```tsx
<ListSection title="SEIZOEN">
  <ListSection.Row
    icon={Calendar}
    label="Wedstrijden"
    value="12 / 22"
    onTap={...}
  />
  <ListSection.Row
    icon={Users}
    label="Selectie"
    value="18"
    onTap={...}
  />
</ListSection>
```

- Rounded corners (`--radius-lg`)
- Section header: uppercase, `--text-xs`, `--text-tertiary`
- Dividers tussen rows (`1px solid var(--border-default)`)
- `ChevronRight` op tappable rows
- Optionele `icon` prop (Lucide component)
- Optionele `status` prop voor `CheckCircle` / `AlertCircle` indicators
- Premium spacing: consistent `--space-*` tokens

### Asset-status helper

```tsx
type AssetStatus = 'complete' | 'partial' | 'empty';

function getMemberAssetStatus(participation: Participation): {
  status: AssetStatus;
  filled: number;
  total: number;  // 5 tracked: profile, fullbody, closeup, intro, celebration
}
```

### Bestaande code hergebruiken

| Hook / Component | Hergebruik |
|---|---|
| `useTeamDetailData()` | Team/org/branding info |
| `useSeasonDetailPageData()` | Seizoen + 5 sub-hooks |
| `useBrandAssets()` | Club + team asset status |
| `memberHasAsset()` | Per-lid asset check (bestaat al) |
| `MobileTabBar` | Tab navigatie (geen wijziging) |
| `useSetBackNavigation()` | Back button context |
| `useAppSelection()` | Context resolution |
| `SeasonSwitcher` | Seizoen wisselen in header |
| `AppIcon` | Lucide icon wrapper (bestaat al) |

### Geen backend wijzigingen nodig

Alle data is al beschikbaar via bestaande endpoints. Dit is puur frontend.

---

## Acceptatiecriteria

### Ronde 1 (done)
- [x] Overview tab toont iOS-style grouped sections: wedstrijd hero, seizoen stats, asset-status, beheer links
- [x] Asset-status visueel weergegeven op 3 niveaus (club/team/member completeness) met Lucide icons
- [x] Beheer-sectie altijd zichtbaar (niet ingeklapt), navigeert naar bestaande pagina's
- [x] Wedstrijden tab toont "Komend" sectie + matches grouped per maand met score badges
- [x] Selectie tab toont leden grouped als Keepers/Spelers/Staf met avatar + asset-status stip
- [x] Media tab heeft segmented control: per wedstrijd (thumbnails) en per seizoen (asset-matrix)
- [x] `ListSection` component is herbruikbaar voor andere pagina's

### Ronde 2
- [ ] Tap op wedstrijd opent `MatchSummarySheet` (NavigationSheet) met preview — navigeert niet weg
- [ ] Tap op lid opent `MemberSummarySheet` (NavigationSheet) met profiel + assets — navigeert niet weg
- [ ] "Bekijk wedstrijd" in Overview opent MatchSummarySheet
- [ ] Sheets gebruiken `NavigationSheet` — mobiel: full-screen slide-up, desktop: side-panel
- [ ] Sheet bevat "Ga naar [detail]" knop voor volledige pagina (opt-in navigatie)
- [ ] Admin-tabs (Beheer, Club) bereikbaar op mobiel — `desktopOnly` verwijderd
- [ ] Admin Overview-rijen werken op mobiel (navigeren naar nu-zichtbare tabs)
- [ ] Club-level data **read-only** in hub: status clublogo, assets, brand profiel + "Beheer bij club" link
- [ ] Member sheet toont read-only preview: naam, avatar, rol, asset-status (geen edit-acties)
- [ ] Club-pagina (`HubClubTab`) herstructureerd met ListSection — zelfde iOS-look als team-hub
- [ ] Bottom navbar toont "Mijn Club" voor club-admins, "Mijn Team" voor team-admins/spelers
- [ ] Match sheet toont score, teams, datum, locatie, status
- [ ] Sheet-content lazy-loaded via `React.lazy` + `Suspense`
- [ ] Consistent met Homepage (cards → sheets) en Profiel (rows → sheets) patterns
- [ ] Browser back-button sluit open sheet (history state management in NavigationSheet)
- [ ] Haptic feedback bij sheet open (light) en swipe-dismiss (medium)
- [ ] Swipe-to-dismiss op mobiel (≤640px, 100px drag drempel)
- [ ] Tab-switch sluit eventueel open sheet direct
- [ ] Member sheet < > navigatie met crossfade transition (150ms)
- [ ] Member sheet assets zichtbaar voor alle rollen (read-only)
- [ ] "Bekijk profiel" opent MemberDetailPanel (bestaand slide-in), niet page-navigatie
- [ ] MobileTabBar toont scroll-indicator (gradient fade) bij 6 tabs op mobiel
- [ ] Club-pagina behoudt sub-tab structuur, elke sub-tab met ListSection

### Beide rondes
- [ ] Alle touch targets >= 44x44px
- [ ] `:focus-visible` op alle interactieve elementen
- [ ] `@media (prefers-reduced-motion: reduce)` op animaties
- [ ] Design tokens only, geen hardcoded waarden
- [ ] Alleen Lucide icons, geen emoji's
- [ ] TypeScript strict, geen `any`
- [ ] `npx tsc --noEmit` + `npx vite build` slagen

---

## Fasering

### Ronde 1 — iOS Grouped Sections (done)

| Fase | Wat | Effort | Status | Spec |
|------|-----|--------|--------|------|
| **H0** | `ListSection` component + Overview tab redesign + asset-status helpers | ~3.5 uur | done | `phases/done/H0_listsection-en-overview.md` |
| **H1** | Wedstrijden tab iOS-list + score badges + "Komend" sectie | ~2.5 uur | done | `phases/done/H1_wedstrijden-tab.md` |
| **H2** | Selectie tab Keepers/Spelers/Staf + avatar + asset-status stip | ~3 uur | done | `phases/done/H2_selectie-tab.md` |
| **H3** | Media tab segmented control + wedstrijd-view + asset-matrix + polish | ~3 uur | done | `phases/done/H3_media-tab-en-asset-matrix.md` |

### Ronde 2 — In-page Sheets + Volledig Beheer (todo)

| Fase | Wat | Effort | Prio | Spec |
|------|-----|--------|------|------|
| **H4** | `MatchSummarySheet` + NavigationSheet infra-upgrade (history, haptics, swipe) | ~3 uur | Must | `phases/todo/H4_match-summary-sheet.md` |
| **H5** | `MemberSummarySheet` — lid-preview in NavigationSheet (read-only, crossfade) | ~3 uur | Must | `phases/todo/H5_member-summary-sheet.md` |
| **H6** | Integratie: alle tabs gebruiken sheets i.p.v. navigatie + edge cases | ~2 uur | Must | `phases/todo/H6_sheet-integratie-tabs.md` |
| **H7** | Admin-tabs op mobiel + club read-only + Club-pagina iOS-stijl + dynamic nav | ~5 uur | Must | `phases/todo/H7_admin-tabs-en-club-beheer.md` |
