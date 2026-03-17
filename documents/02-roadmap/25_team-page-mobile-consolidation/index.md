# Roadmap #25 — Team Page Mobile Consolidation

> **Status:** ✅ Afgerond
> **Start:** 2026-03-17
> **Scope:** `demo/src/pages/identity/`, `demo/src/components/`

## Doel

De team detail pagina terugbrengen van 6 tabs naar 3 tabs zodat op mobiel alle tabs zichtbaar zijn zonder scrollen, de gebruiker minder context-switches hoeft te maken, en de Overview tab als single-scroll dashboard fungeert met expandable secties.

## Huidige staat

### Wat werkt ✅
- Team detail pagina met 6 tabs: Overview, Hierarchy, Selectie, Media, Identity, Credits
- Overview toont 7 samenvattingscards met doorlinks naar de andere tabs
- Elke tab heeft zijn eigen unieke content
- MobileTabBar met inline horizontale scroll
- Alle cards zijn responsive en mobile-first

### Wat ontbreekt / niet klopt ❌
- **6 tabs passen niet op mobiel** — slechts 3-4 zichtbaar, rest vereist horizontal scroll → discovery-probleem
- **Hoge navigatie-overhead** — gebruiker moet constant tab-switchen voor gerelateerde info (bijv. wedstrijden bekijken → Hierarchy tab, terug → Overview tab)
- **Hierarchy tab dupliceert Overview** — seizoenen en wedstrijden staan op beide plekken, Hierarchy voegt alleen drill-down toe
- **Media tab dupliceert Overview** — aggregated progress staat al in Overview, Media tab voegt alleen per-speler detail toe
- **Identity + Credits zijn admin-only** — 90% van gebruikers (spelers, ouders) gebruiken deze nooit
- **Geen expandable pattern** — er is geen gedeelde DisclosureSection component; elke accordion is inline geïmplementeerd

## Design beslissingen

| Vraag | Besluit |
|-------|--------|
| Hoeveel tabs? | **3 tabs**: Overview, Selectie, Beheer — altijd allemaal zichtbaar op 375px |
| Waar gaat Hierarchy heen? | **Geabsorbeerd in Overview** — SeasonsCard wordt expandable tree (klik seizoen → toont competities → wedstrijden inline) |
| Waar gaat Media heen? | **Geabsorbeerd in Overview** — MediaAssetsCard wordt expandable (klik "Per speler" → toont per-player breakdown inline) |
| Waar gaan Identity + Credits heen? | **Samengevoegd in "Beheer" tab** — subtab toggle (Assets / Kits / Credits). Alleen zichtbaar voor non-players. |
| Herbruikbaar accordion component? | **Ja** — Nieuwe `DisclosureSection` component als gedeelde primitive voor alle expand/collapse patterns |
| Expandable state management? | `Set<string>` pattern (bestaand in MediaReadinessCard) — consistent met codebase |
| Player view? | Players zien 2 tabs: Overview + Selectie (Beheer verborgen) |
| Lazy loading? | Expandable secties laden data pas bij eerste expand (avoid upfront API calls) |
| Card ordering in Overview? | Hero → Wedstrijden (aankomend + recent) → Selectie preview → Seizoenen (expandable) → Media (expandable) → Brand assets → Team details |

## Fasering

### H0 — DisclosureSection primitive
> **Effort:** ½ dag | **Impact:** Herbruikbaar component voor alle expandable secties + toekomstige accordions

Nieuwe gedeelde component die het `Set<string>` toggle-pattern uit MediaReadinessCard abstraheert.

**To do:**
- [ ] Maak `demo/src/components/ui/DisclosureSection.tsx` met props: `id`, `title`, `badge?`, `headerAction?`, `defaultOpen?`, `children`
- [ ] Maak `demo/src/components/ui/DisclosureSection.module.css` met tokens, focus-visible, reduced-motion
- [ ] Barrel export via `demo/src/components/ui/index.ts`
- [ ] Voeg `aria-expanded`, `aria-controls`, `id` toe voor a11y
- [ ] Animatie: `max-height` transition met `prefers-reduced-motion: reduce` fallback
- [ ] Schrijf storybook-achtige test: collapsed, expanded, keyboard toggle

**Done criteria:**
- [ ] Component rendert collapsed/expanded state correct
- [ ] Keyboard navigatie (Enter/Space) werkt
- [ ] `aria-expanded` reflecteert state
- [ ] Smooth animatie met reduced-motion respect
- [ ] Geen extra API calls bij mount (children lazy-mount)

---

### H1 — Expandable SeasonsCard (Hierarchy → Overview)
> **Effort:** 1 dag | **Impact:** Hierarchy tab volledig overbodig — seizoenen drillable inline in Overview

De huidige `SeasonsCard` (flat tabel) wordt een expandable tree die de volledige Hierarchy-functionaliteit inline toont.

**To do:**
- [ ] Refactor `SeasonsCard` → elk seizoen-rij wraps in `DisclosureSection`
- [ ] Bij expand: toon competities als sub-rijen (naam + wedstrijd-count)
- [ ] Bij expand competitie: toon wedstrijd-rijen (datum, tijd, titel, clickable → match detail)
- [ ] Voeg zoekbalk toe bovenaan de card (port van `TeamHierarchyTab` search)
- [ ] Hergebruik `teamMatchesByPeriodId` data (al beschikbaar via `useTeamTabData`)
- [ ] Lazy-load: `teamMatchesByPeriodId` pas fetchen bij eerste seizoen-expand
- [ ] "Bekijk seizoen →" en "Bekijk competitie →" links behouden voor navigatie naar detail pages
- [ ] Pas overview card-volgorde aan: wedstrijden boven leden

**Done criteria:**
- [ ] Seizoen → Competitie → Wedstrijd drill-down werkt inline
- [ ] Zoeken filtert seizoenen/competities zoals voorheen
- [ ] Klik op wedstrijd navigeert naar match detail (bestaande `handleMatchClick`)
- [ ] Geen extra API calls tot eerste expand
- [ ] Performance: geen merkbare lag bij expand

---

### H2 — Expandable MediaAssetsCard (Media → Overview)
> **Effort:** ½ dag | **Impact:** Media tab overbodig — per-speler matrix inline in Overview

De `MediaAssetsCard` toont nu alleen aggregated stats. Na expand toont het de per-speler breakdown.

**To do:**
- [ ] Voeg `DisclosureSection` toe aan `MediaAssetsCard` met "Per speler" toggle
- [ ] Bij expand: render per-player cards (port van `TeamMediaTab` player-cards)
- [ ] Voeg zoekbalk toe (port van `TeamMediaTab` search)
- [ ] Hergebruik `fullMembers` data (al beschikbaar via `useTeamTabData`)
- [ ] Collapsed state: huidige slot-progress bars (ongewijzigd)
- [ ] Expanded state: zoekbare lijst met player avatar + naam + per-slot status

**Done criteria:**
- [ ] Aggregated progress bars zichtbaar in collapsed state
- [ ] Per-speler breakdown zichtbaar na expand
- [ ] Zoeken filtert spelers op naam
- [ ] Data hergebruikt bestaande hooks (geen nieuwe API calls)

---

### H3 — Beheer tab (merge Identity + Credits)
> **Effort:** ½ dag | **Impact:** 2 admin-tabs samengevoegd tot 1, ruimte vrijgemaakt in tab bar

Nieuwe "Beheer" tab die Identity (Assets + Kits) en Credits combineert via een subtab-toggle.

**To do:**
- [ ] Maak `demo/src/pages/identity/TeamBeheerTab.tsx` met 3 subtabs: Assets, Kits, Credits
- [ ] Port `IdentitySubtab` toggle-logica + `TeamCreditsTab` import
- [ ] Subtab state: lokale state (niet URL) — `assets | kits | credits`
- [ ] Verberg "Beheer" tab volledig voor players (`isPlayer`)
- [ ] Update `sidebarPanelBWorkEntities.ts`: vervang Identity + Credits door single "Beheer" entry

**Done criteria:**
- [ ] Assets / Kits / Credits bereikbaar via subtab toggle binnen Beheer
- [ ] Player-view ziet Beheer tab niet
- [ ] Sidebar toont 1 entry i.p.v. 2
- [ ] Bestaande functionaliteit (upload, transacties) ongewijzigd

---

### H4 — Tab consolidation + cleanup
> **Effort:** ½ dag | **Impact:** Definitieve 3-tab structuur actief, oude tabs verwijderd

Wire alles samen: verwijder overtollige tabs, update routing, cleanup dode code.

**To do:**
- [ ] Update `TeamOrganisationDetailPage.tsx` MobileTabBar: `[Overview, Selectie, Beheer]` (players: `[Overview, Selectie]`)
- [ ] Verwijder `activeTabFromUrl` cases voor `hierarchy`, `media`, `identity`, `credits` — redirect naar `overview` of `beheer`
- [ ] Tab normalization: `hierarchy|seasons|competitions|matches` → `overview`, `identity|assets|kits|credits|balance|transactions` → `beheer`
- [ ] Update `sidebarPanelBWorkEntities.ts` → 3 entries (Overview, Selectie, Beheer)
- [ ] Verwijder `TeamHierarchyTab.tsx` import + component (functionaliteit verplaatst naar Overview)
- [ ] Verwijder `TeamMediaTab.tsx` import + component (functionaliteit verplaatst naar Overview)
- [ ] Verwijder `IdentitySubtab.tsx` import (functionaliteit verplaatst naar Beheer)
- [ ] Verwijder losse `TeamCreditsTab` import uit page (verplaatst naar Beheer)
- [ ] Verwijder `TeamHierarchyTab.module.css` (styles geïntegreerd of niet meer nodig)
- [ ] Run `npx tsc --noEmit` — 0 errors
- [ ] Run `npx vite build` — succesvol

**Done criteria:**
- [ ] Tab bar toont exact 3 tabs (non-player) of 2 tabs (player)
- [ ] Alle oude tab-URLs redirecten correct
- [ ] Geen dode imports of ongebruikte componenten
- [ ] TypeScript clean, build succesvol
- [ ] Sidebar consistent met tabs

---

### H5 — Polish + a11y audit
> **Effort:** ½ dag | **Impact:** Afgewerkte mobile UX, toegankelijk, performant

Finetuning, edge cases, en accessibility check.

**To do:**
- [ ] Playwright test: navigate team page op 375px, verifieer alle 3 tabs zichtbaar
- [ ] Playwright test: expand seizoen → competitie → wedstrijd → klik navigeert correct
- [ ] Playwright test: expand media → per-speler zoeken werkt
- [ ] Playwright test: Beheer subtabs (assets/kits/credits) werken
- [ ] Check `focus-visible` op alle expandable headers
- [ ] Check `aria-expanded` + `aria-controls` op alle DisclosureSections
- [ ] Check `prefers-reduced-motion` skips animaties
- [ ] Check touch targets ≥ 44px op alle interactive elements
- [ ] Dark mode: verify expandable secties correct renderen
- [ ] Bundle size check: verify verwijderde tabs reduceren chunk size

**Done criteria:**
- [ ] Alle Playwright tests slagen
- [ ] WCAG 2.1 AA compliant (focus, aria, reduced-motion, touch targets)
- [ ] Dark mode correct
- [ ] Bundle size niet vergroot (idealiter verkleind door removed tabs)

## Acceptatiecriteria (geheel)

- [ ] Team page heeft 3 tabs: Overview, Selectie, Beheer (2 voor players)
- [ ] Alle tabs zichtbaar zonder horizontale scroll op 375px viewport
- [ ] Hierarchy-functionaliteit volledig inline in Overview (expandable seizoenen → competities → wedstrijden)
- [ ] Media per-speler functionaliteit inline in Overview (expandable sectie)
- [ ] Identity + Credits samengevoegd in Beheer tab met subtab toggle
- [ ] Nieuwe `DisclosureSection` component: herbruikbaar, a11y-compliant, animated
- [ ] Oude tab-URLs (`?tab=hierarchy`, `?tab=media`, `?tab=identity`, `?tab=credits`) redirecten correct
- [ ] Geen navigatie-overhead: gebruiker kan alle relevante info zien via scrollen + expanderen, zonder tab-switch
- [ ] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [ ] No new `any` types
- [ ] All interactive elements accessible (focus-visible, aria, touch targets ≥ 44px)
