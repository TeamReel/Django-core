# UI Review Report — Team Detail Page

> **Date:** 2026-03-17
> **Page:** `/knvb/asc/helden-6` (Team Organisatie Detail)
> **Reviewer:** Playwright automated + manual audit
> **Scope:** Layout, dark/light theme, mobile/desktop, user flows, icon consistency, webapp coherence

---

## Omgeving

| Setting | Waarde |
|---------|--------|
| URL | `https://demo.teamreel.app/knvb/asc/helden-6` |
| Viewports | 375×812 (mobile), 1280×720 (desktop) |
| Themes | Light mode, Dark mode |
| Account | `koeman@eredivisie.demo` |
| Commit | `926f1cb1` |

---

## 1. Structuur & Layout

### Desktop (1280×720)

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| Sidebar Panel A (iconen) | OK | Collapsed, icon-only nav |
| Sidebar Panel B (Team tabs) | OK | Shows "TEAM" header met Overview / Selectie / Beheer — met Lucide iconen |
| Header breadcrumb | OK | "< ASC'62" + TeamReel logo + "Helden 6" dropdown |
| Page header | OK | ASC'62 > Helden 6 > Team + actie-knoppen |
| Hero card | OK | Naam, org, stats (Leden, Seizoenen, Content, Assets) |
| Two-column content | OK | Club assets (links) + Media assets (rechts), Seizoenen + Aankomend, etc. |
| Scrolling | OK | Main content scrollt in container |

### Mobiel (375×812)

| Onderdeel | Status | Opmerking |
|-----------|--------|-----------|
| MobileTabBar (top) | OK | 3 tabs: Overview, Selectie, Beheer — visueel duidelijk actieve tab |
| Bottom navbar | OK | Home, My Team (actief), Create (+), Studio, Profile |
| Content stacking | OK | Single-column layout, correct responsive |
| Touch targets | OK | Tabs, knoppen, member cards > 44px |
| Header compactness | OK | "< ASC'62" + zoek/approvals/notifications |

### Bevindingen layout

| # | Ernst | Bevinding |
|---|-------|-----------|
| L1 | Low | **Sidebar bleed op mobiel**: ~5px donkere strip rechts zichtbaar (collapsed sidebar lekt door) |
| L2 | Info | **Club assets card is vrij leeg**: Veel lege cirkels (geen assets geüpload), daardoor groot wit vlak op desktop |

---

## 2. Dark Mode / Light Mode

### Light Mode

| Element | Status | Opmerking |
|---------|--------|-----------|
| Achtergrond | OK | Wit/lichtgrijs, goed contrast |
| Kaarten | OK | Witte cards met subtiele border |
| Tekst | OK | Donkere tekst, leesbaar |
| Role badges | OK | Blauw (TEAM EDITOR), grijs (Speler) |
| Progress bars | OK | Paars/blauw, goed zichtbaar |
| Tab actieve staat | OK | Blauwe fill voor actieve tab |
| Hero card | OK | Lichtgrijs achtergrond |

### Dark Mode

| Element | Status | Opmerking |
|---------|--------|-----------|
| Achtergrond | OK | Navy/donkerblauw, consistent |
| Kaarten | OK | Donkergrijze cards met subtiele borders |
| Tekst | OK | Lichte tekst, goed contrast |
| Media progress bars | OK | Kleuren consistent met light mode |
| Hero card | OK | Iets lichter dan achtergrond, goed onderscheid |
| Bottom navbar | OK | Donker met juiste icoonkleuren |

### Bevindingen theme

| # | Ernst | Bevinding |
|---|-------|-----------|
| T1 | Low | **Share-knop achtergrond**: In dark mode heeft de "Deel deze pagina" knop een lichtere achtergrond die visueel opvalt t.o.v. de andere actieknoppen (edit, meer). Licht inconsistent. |
| T2 | Info | **Beheer asset cards**: Donkere (navy) achtergrond in zowel light als dark mode — dit is bewust design voor upload-preview area, maar in light mode is het contrast met de witte pagina vrij groot. Overweeg subtielere tint in light mode. |

---

## 3. Logische Indeling (Information Architecture)

### Tab-structuur (3 tabs — Roadmap #25)

| Tab | Inhoud | Oordeel |
|-----|--------|---------|
| **Overview** | Hero stats, Club assets, Media assets, Per speler (expandable), Seizoenen (expandable), Aankomend, Recente wedstrijden, Leden, Team details | Goed — geeft compleet overzicht zonder te veel clicks. Logische prioritering van informatie. |
| **Selectie** | Zoek, rolfilters, 28 leden alfabetisch met avatar, badges, media completion | Goed — duidelijke focus op teamsamenstelling |
| **Beheer** | Assets/Kits/Credits subtabs, AI generatie, upload cards | Goed — alle management-acties bij elkaar |

### Bevindingen IA

| # | Ernst | Bevinding |
|---|-------|-----------|
| IA1 | Medium | **Hero card herhaalt team naam**: De hero card toont "Helden 6" en "ASC'62 · KNVB", maar de page header erboven toont ook al "ASC'62 > Helden 6 > Team". Dubbele informatie. |
| IA2 | Low | **"Leden" count in hero = 2116**: Dit getal lijkt te hoog voor een team van 28 spelers. Vermoedelijk toont dit organisatie-leden i.p.v. teamleden. Verwarrend in context van een team-pagina. |
| IA3 | Info | **Wedstrijd namen zijn UUIDs**: "Wedstrijd 433f0836", "Wedstrijd 7f190578" — geen leesbare namen (thuis vs uit). Op de match detail page staat wél "ASC'62 vs SVI". |

---

## 4. Consistentie met Rest van Webapp

### Vergeleken met Club Detail (`/knvb/asc`)

| Aspect | Club page | Team page | Consistent? |
|--------|-----------|-----------|-------------|
| Header layout | KNVB > ASC'62 > Club + actie-knoppen | ASC'62 > Helden 6 > Team + actie-knoppen | Ja |
| Hero card | Naam, org, locatie, stats | Naam, org, stats | Ja |
| Two-column layout | Teams + Seizoenen, Leden + Club details | Club assets + Media assets, Seizoenen + Aankomend | Ja |
| Panel B sidebar | 14+ tabs (Overview t/m Settings) | 3 tabs (Overview, Selectie, Beheer) | Ja (bewust) |
| Action buttons | Actief, Bewerken, Delen, Meer | Actief, Bewerken, Delen, Meer | Ja |
| Section headers | "Teams", "Alle teams →" | "Club assets", "Beheer →" | Ja |

**Conclusie**: Team page is goed consistent met de Club page qua layout-patronen, typografie en card-stijlen. De 3-tab consolidatie (Roadmap #25) maakt de team page overzichtelijker dan de club page met 14 tabs.

---

## 5. User Flows

### Flow: Expandable secties

| Flow | Resultaat | Opmerking |
|------|-----------|-----------|
| Seizoenen → 2025/2026 expanderen | OK | Toont "Bekijk seizoen →" + 2 competities met match-count |
| Per speler expanderen | OK | Zoekbalk + 28 leden met individuele media slots |
| Per speler → lid aanklikken | OK | Toont alle media types met ✓/— status |
| Wedstrijd rij → match detail | OK | Navigeert naar match detail met hero, content overzicht |

### Flow: Tab navigatie

| Flow | Resultaat | Opmerking |
|------|-----------|-----------|
| Overview → Selectie (mobiel tab) | OK | Content switcht, tab highlight update |
| Selectie → Beheer (mobiel tab) | OK | Subtabs (Assets/Kits/Credits) verschijnen |
| Overview → Selectie (desktop sidebar) | OK | Panel B link werkt correct |
| URL parameter sync | OK | `?tab=members`, `?tab=beheer` correct |

### Flow: Selectie interactie

| Flow | Resultaat | Opmerking |
|------|-----------|-----------|
| Zoeken op naam | Niet getest | Tekstinvoer zichtbaar |
| Rolfilter chips | Zichtbaar | Alles, Coach, Goalkeeper, Speler |
| Lid aanklikken → expand | OK | Media matrix + "Bewerken" / "Bekijk profiel" knoppen |

### Flow: Beheer interactie

| Flow | Resultaat | Opmerking |
|------|-----------|-----------|
| Assets/Kits/Credits subtab switch | Zichtbaar | Correct `role="tablist"` + `aria-selected` (a11y fix) |
| AI Asset Genereren knop | Zichtbaar | Groen met 🎨 emoji |
| Upload cards | Zichtbaar | Logo + Sponsor met upload/genereer/bewerk acties |

---

## 6. Emoji / Icon Consistentie

### KRITIEK: Emoji-gebruik i.p.v. Lucide icons

De codebase maakt extensief gebruik van Unicode emoji waar Lucide iconen verwacht worden. Dit is een **app-breed probleem**, niet specifiek voor de team page.

#### Op de Team Detail Page zelf

| Locatie | Emoji | Zou moeten zijn |
|---------|-------|-----------------|
| Zoekbalk (`SearchBar.tsx:134`) | 🔍 | `<Search />` (lucide-react) |
| "AI Asset Genereren" knop (`AssetsTabShared.tsx:70`) | 🎨 | `<Palette />` of `<Sparkles />` |
| "Keeper" filter pill (`AssetsTabShared.tsx:82`) | 🧤 | Thematisch icoon of geen |
| Media slot status (`MemberCard.tsx:149`) | ✓ / — | `<Check />` / `<Minus />` |
| Genereer button (`AssetSubComponents.tsx:156`) | 🎨 | `<Sparkles />` |

#### Op gerelateerde pagina's (match detail, content)

| Locatie | Emoji | Aantal |
|---------|-------|--------|
| `MatchOverviewTab.tsx` | 🏠 ⚽ ✅ ⬜ 🟢 | 8+ instances |
| `contentGenConstants.ts` | 📣 🎬 📋 🎥 ⚽ 📊 🔄 ⚡ 📷 🎨 🏆 | 13 icons |
| `MemberEditSheet.tsx` | ⚽ 📋 🧤 📣 | 4 role badges |
| `MemberBatchActionModal.tsx` | ⚡ ✅ 🔐 👥 🗑️ ⚠️ | 6+ instances |
| Diversen (ActivityFeed, ContentCard, etc.) | Diverse | 15+ instances |

**Totaal: ~80+ emoji-instances** verspreid over ~25 bestanden.

### Impact

| Impact | Beschrijving |
|--------|-------------|
| **Visuele inconsistentie** | Emoji renderen per platform anders (Windows vs Mac vs iOS). Lucide icons zijn pixel-perfect consistent. |
| **Toegankelijkheid** | Emoji hebben geen inherente `aria-label` — screenreaders lezen ze letterlijk voor ("pile of poo" etc.) |
| **Professional appearance** | Emoji geven een casual/prototype-uitstraling. Lucide icons zijn professioneler. |
| **Dark mode** | Emoji kleuren passen zich niet aan het thema aan. Lucide icons erven `currentColor`. |

### Aanbeveling

Maak een **Roadmap: Emoji → Lucide Icon Migration**:
1. **Quick wins** (team page): `SearchBar.tsx`, `AssetsTabShared.tsx`, `MemberCard.tsx`
2. **Match page**: `MatchOverviewTab.tsx` — vervang status emoji door Lucide `Check`, `Square`, `Circle`
3. **Content types**: `contentGenConstants.ts` — vervang door thematische Lucide icons
4. **Batch modals**: `MemberBatchActionModal.tsx` — vervang door Lucide icons

---

## 7. A11y Status (post Roadmap #25 fixes)

| Fix | Status | Locatie |
|-----|--------|---------|
| `aria-labelledby` op DisclosureSection | Geïmplementeerd | `DisclosureSection.tsx` |
| `role="tablist"` + `aria-selected` op Beheer subtabs | Geïmplementeerd | `TeamBeheerTab.tsx` |
| `aria-controls` op competitie headers | Geïmplementeerd | `TeamOverviewCards.tsx` |
| MobileTabBar `role="tablist"` | Te verifiëren | - |
| Focus-visible op interactieve elementen | Niet getest | - |
| `prefers-reduced-motion` | Niet getest | - |

---

## 8. Console Errors & Network

| Type | Resultaat |
|------|-----------|
| Console errors | 1 error: `generation-requests/?project=387&page_size=1` → server responded with error (403/404). Niet blokkerend. |
| Network failures | Geen 4xx/5xx op hoofdpagina |
| Polling | Zware polling: `jobs/counts`, `user-notifications`, `balance/me` elke ~10s. 7 requests per cycle × 8 cycles = 56 requests in 80s. **Overweeg WebSocket of langere interval.** |

---

## 9. Samenvatting Bevindingen

### Per ernst

| Ernst | # | Items |
|-------|---|-------|
| High | 0 | — |
| Medium | 2 | IA2 (misleidende leden-count), Emoji-gebruik (app-breed) |
| Low | 3 | L1 (sidebar bleed mobiel), T1 (share-knop dark mode), IA1 (dubbele naam) |
| Info | 3 | L2 (lege club assets), T2 (asset card contrast), IA3 (UUID wedstrijdnamen) |

### Wat goed werkt

- 3-tab consolidatie (Overview/Selectie/Beheer) is een duidelijke verbetering
- Desktop sidebar Panel B toont de 3 tabs correct met iconen
- Mobiel MobileTabBar werkt goed met tab switching
- Dark mode/light mode transities zijn schoon
- Hero card stats, Club assets, Media assets layout is overzichtelijk
- Per speler expandable met zoekfunctie is krachtig
- Seizoenen → Competities drill-down werkt logisch
- Member card expand met media matrix is informatief
- Consistente layout-patronen met Club detail page
- A11y verbeteringen (aria-labelledby, tablist, aria-controls) correct geïmplementeerd

### Aanbevolen vervolgacties

| # | Prioriteit | Actie |
|---|-----------|-------|
| 1 | P1 | **Emoji → Lucide icon migratie** voor team page componenten (SearchBar, AssetsTab, MemberCard) |
| 2 | P2 | **Fix sidebar bleed** op mobiel (5px donkere strip rechts) |
| 3 | P2 | **Corrigeer "Leden" stat** in hero card — toon teamleden (28) i.p.v. organisatie-leden (2116) |
| 4 | P3 | **Share-knop styling** in dark mode normaliseren |
| 5 | P3 | **Wedstrijdnamen verbeteren** — toon "ASC'62 vs SVI" i.p.v. "Wedstrijd 433f0836" |
| 6 | P3 | **Polling frequentie** terugbrengen of WebSocket overwegen |

---

*Report gegenereerd via Playwright MCP browser testing op `demo.teamreel.app`*
