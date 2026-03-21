# 334-F22 — Mijn Team: iOS-stijl Optimalisatie (Mobiel)

| | |
|---|---|
| Code | F22 |
| Status | READY |
| Prioriteit | Hoog |
| Geschatte effort | ~12 uur |
| Afhankelijkheden | F21 (done) — huidige 4-tab structuur |
| Doelgroep | **Team Admins** (primair), Players (secundair) |

---

## Context

De MyTeamHubPage (gebouwd in F21) werkt functioneel maar voelt als een desktop-pagina op mobiel. De 4 tabs zijn correct, maar de content binnen elke tab mist de iOS-native feel die gebruikers verwachten op hun telefoon.

**Huidige staat:**
- 4 tabs: Overview, Wedstrijden, Media, Selectie
- Beheer (admin) ingeklapt als "Instellingen" in Overview
- Werkt responsive maar is geen native mobiele ervaring
- Geen visuele hierarchie of grouped sections

**Gewenste staat:**
- iOS Settings / Apple Sports-achtige UI met grouped sections
- Team admin als primaire persona — snel beheren, niet alleen bekijken
- Een plek voor alles van je team — zonder heen en weer te navigeren
- Premium uitstraling: clean, consistent, visueel rustig
- Duidelijk onderscheid met Home (= overzichten, voortgang, quick actions)

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

- [ ] Overview tab toont iOS-style grouped sections: wedstrijd hero, seizoen stats, asset-status, beheer links
- [ ] Asset-status visueel weergegeven op 3 niveaus (club/team/member completeness) met Lucide icons
- [ ] Beheer-sectie altijd zichtbaar (niet ingeklapt), navigeert naar bestaande pagina's
- [ ] Wedstrijden tab toont "Komend" sectie + matches grouped per maand met score badges
- [ ] Selectie tab toont leden grouped als Keepers/Spelers/Staf met avatar + asset-status stip
- [ ] Geen rugnummers of rol-badges in selectielijst
- [ ] Media tab heeft segmented control: per wedstrijd (thumbnails) en per seizoen (asset-matrix)
- [ ] Asset-matrix toont leden x asset-types met check/leeg indicatoren
- [ ] `ListSection` component is herbruikbaar voor andere pagina's
- [ ] Geen overlap met Home page qua content/functie
- [ ] Content Streak widget verwijderd van deze pagina
- [ ] Alle touch targets >= 44x44px
- [ ] `:focus-visible` op alle interactieve elementen
- [ ] `@media (prefers-reduced-motion: reduce)` op animaties
- [ ] Design tokens only, geen hardcoded waarden
- [ ] Alleen Lucide icons, geen emoji's
- [ ] TypeScript strict, geen `any`
- [ ] `npx tsc --noEmit` + `npx vite build` slagen

---

## Fasering

| Fase | Wat | Effort | Prio | Spec |
|------|-----|--------|------|------|
| **H0** | `ListSection` component + Overview tab redesign + asset-status helpers | ~3.5 uur | Must | `phases/todo/H0_listsection-en-overview.md` |
| **H1** | Wedstrijden tab iOS-list + score badges + "Komend" sectie | ~2.5 uur | Must | `phases/todo/H1_wedstrijden-tab.md` |
| **H2** | Selectie tab Keepers/Spelers/Staf + avatar + asset-status stip | ~3 uur | Must | `phases/todo/H2_selectie-tab.md` |
| **H3** | Media tab segmented control + wedstrijd-view + asset-matrix + polish | ~3 uur | Should | `phases/todo/H3_media-tab-en-asset-matrix.md` |
