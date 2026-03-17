# Roadmap #23 — Dashboard Match Status & Past Matches

> **Status:** ✅ Afgerond
> **Start:** 2026-03-17
> **Scope:** `demo/src/components/dashboard/`, `demo/src/hooks/`, `demo/src/pages/DashboardPage.tsx`

---

## Doel

Het dashboard uitbreiden met twee features:
1. **Active match badge** — In de MatchSheet (die opent als je een wedstrijd aanklikt) wordt zichtbaar of die match de "actieve match" is, met een knop om te activeren/deactiveren.
2. **Gespeelde wedstrijden** — Een nieuw kopje op het dashboard toont recente wedstrijden die al gespeeld zijn.

**Waarom:** Coaches willen vanuit het dashboard snel zien welke match actief is (voor content generatie) en ook hun recente resultaten terug kunnen bekijken.

---

## Huidige staat

### Wat werkt ✅
- `UpcomingMatchesCard` toont volgende 5 wedstrijden op dashboard
- Klik op wedstrijd opent `MatchSheetFlow` met overview, lineup, content phases
- "Active match" concept bestaat al in `SeasonMatchesTab` → `MatchCard` (ster-icoon + toggle)
- Backend: `PATCH /auth/active-context/` slaat actieve match op per user
- Frontend utility: `setActiveContext('match', id)` + `getActiveContext()`
- `StatusBadge` component bestaat al in `components/ui/Badge.tsx`
- API: `/activities/?start_time__lte=now` query werkt al (gebruikt in `SeasonProgressCard`)

### Wat ontbreekt ❌
- MatchSheet (MatchOverview) toont **geen** active-status badge
- Geen manier om vanuit dashboard een match als actief te markeren
- Dashboard toont **geen** gespeelde wedstrijden — alleen aankomende
- Geen `usePastMatches` hook (elke consumer moet eigen query schrijven)
- Geen query key voor past matches in `queryKeys.ts`

---

## Design beslissingen

| Vraag | Besluit |
|-------|---------|
| Waar active badge tonen? | In `MatchOverview` header naast bestaande status badge (LIVE/Aankomend/Gespeeld) |
| Hoe activeren? | Toggle-knop met `setActiveContext` — zelfde API als SeasonMatchesTab |
| Past matches limiet? | 5 recente wedstrijden, gesorteerd op datum (nieuwste eerst) |
| Score weergave? | `metadata.score_home` – `metadata.score_away`, fallback naar "Gespeeld" tekst |
| Past matches klikbaar? | Ja, opent dezelfde MatchSheetFlow (incl. active badge) |
| Positie op dashboard? | Direct onder UpcomingMatchesCard, vóór ContentPipelineCard |

---

## Fasering

### H0 — Foundation: Hook + Query Key
> **Effort:** 30 min | **Impact:** Data-laag klaar

**To do:**
- [x] `queryKeys.ts` — `activities.past(filters)` key toevoegen
- [x] `demo/src/hooks/usePastMatches.ts` — TanStack Query hook, fetcht `/activities/?activity_type=match&start_time__lte=now&ordering=-start_time&page_size=5`
- [x] Verificatie: `npx tsc --noEmit`

**Done criteria:**
- [x] Hook retourneert `{ matches: Match[], total: number }`
- [x] Query key bestaat en is type-safe
- [x] Build slaagt

---

### H1 — Active Match Badge in MatchSheet
> **Effort:** 1-2 uur | **Impact:** Kerndoel 1 bereikt

**To do:**
- [x] `MatchSheetFlow.tsx` — Active context state ophalen bij sheet open via `getActiveContext()`
- [x] `MatchSheetFlow.tsx` — Toggle handler: `setActiveContext('match', id)` / `setActiveContext('clear')`
- [x] `MatchOverview.tsx` — Props uitbreiden: `isActiveMatch: boolean` + `onToggleActive: () => void`
- [x] `MatchOverview.tsx` — Active badge renderen in sheet header (ster-icoon + "Actief"/"Activeer" tekst)
- [x] `ActiveMatchCard.module.css` — Styling: `.activeBadge`, `.activeBadgeOn` met tokens
- [x] Accessibility: `aria-label`, `focus-visible`, min 44px touch target, `prefers-reduced-motion`
- [x] Verificatie: `npx tsc --noEmit` + `npx vite build`

**Done criteria:**
- [x] Badge zichtbaar bij klik op wedstrijd in UpcomingMatchesCard
- [x] Groen + "Actief" als actieve match, grijs + "Activeer" als niet actief
- [x] Toggle werkt, persists via setActiveContext API
- [x] Accessible + dark mode tokens

---

### H2 — Past Matches Dashboard Card
> **Effort:** 1-2 uur | **Impact:** Kerndoel 2 bereikt

**To do:**
- [x] `demo/src/components/dashboard/PastMatchesCard.tsx` — Component met `usePastMatches` hook
- [x] `demo/src/components/dashboard/PastMatchesCard.module.css` — Styling (gebaseerd op UpcomingMatchesCard patronen)
- [x] Score weergave in match rows (i.p.v. readiness ring)
- [x] Klik op match opent `MatchSheetFlow` (hergebruik UpcomingMatchesCard patroon)
- [x] Empty state: "Geen gespeelde wedstrijden" met icoon
- [x] Loading state: shimmer lines
- [x] Barrel export in `dashboard/index.ts`
- [x] Accessibility: keyboard nav, focus-visible, aria-labels
- [x] Verificatie: `npx tsc --noEmit` + `npx vite build`

**Done criteria:**
- [x] Card toont max 5 recente gespeelde wedstrijden
- [x] Score zichtbaar indien beschikbaar
- [x] Klik opent MatchSheetFlow met active badge
- [x] Responsive + dark mode

---

### H3 — Dashboard Integratie + Polish
> **Effort:** 30 min | **Impact:** Alles samengebracht

**To do:**
- [x] `DashboardPage.tsx` — PastMatchesCard importeren en renderen onder UpcomingMatchesCard
- [x] Positie: na `UpcomingMatchesCard`, vóór `ContentPipelineCard`
- [x] Visuele check: spacing, volgorde, dark mode
- [x] Finale verificatie: `npx tsc --noEmit` + `npx vite build`

**Done criteria:**
- [x] Dashboard toont zowel aankomende als gespeelde wedstrijden
- [x] Active badge werkt vanuit beide cards
- [x] Build slaagt, geen `any` types, design tokens only
- [x] Mobile layout geen overflow

---

## Acceptatiecriteria (geheel)

- [x] Bij klik op wedstrijd in UpcomingMatchesCard: sheet toont isActive badge
- [x] Badge is groen + "Actief" bij actieve match, grijs + "Activeer" bij inactief
- [x] Klikken op badge togglet actieve status via `setActiveContext` API
- [x] Sectie "Gespeelde wedstrijden" zichtbaar op dashboard met max 5 recente wedstrijden
- [x] Gespeelde wedstrijden tonen score indien beschikbaar
- [x] Klik op gespeelde wedstrijd opent MatchSheetFlow (met isActive badge)
- [x] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [x] Geen nieuwe `any` types
- [x] Design tokens alleen (geen hardcoded kleuren)
- [x] Alle interactieve elementen accessible (focus-visible, min 44px, aria-labels)
- [x] `@media (prefers-reduced-motion: reduce)` op nieuwe transities
- [x] Dark mode correct
