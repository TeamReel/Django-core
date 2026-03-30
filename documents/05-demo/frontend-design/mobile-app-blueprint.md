# Mobile-First App Design — Blueprint

> Last updated: 2026-03-12
> Status: **Active design document** — living reference for all frontend work
> Roadmap: See [02-roadmap/modules/](../../02-roadmap/modules/) for planned mobile work

---

## Analyse: richtlijnen vs huidige staat

### Wat al gebouwd is ✅

| Richtlijn | Status | Implementatie |
|-----------|--------|--------------|
| Bottom navbar met top-level domeinen | ✅ Gebouwd | `MobileBottomNav`: Home \| Season \| **+** \| Match \| Gallery |
| + opent wizard in bottom sheet | ✅ Gebouwd | `MatchWizard` in `BottomSheet`, progressive disclosure |
| Wizard stap 1: Match selectie | ✅ Gebouwd | Actieve match pre-selected, upcoming matches lijst |
| Wizard stap 2: Moment (pre/during/post) | ✅ Gebouwd | Phase tabs: Voor \| Tijdens \| Na |
| Wizard stap 3: Format keuze | ✅ Gebouwd | Content type cards per fase |
| Wizard stap 4: Lineup (indien nodig) | ✅ Gebouwd | `MatchWizardLineupStep` met formatie-keuze |
| Wizard stap 5: Generate | ✅ Gebouwd | `ContentGenerationModal` met templates |
| Wizard UX: header met back/title/close | ✅ Gebouwd | Consistente wizard shell |
| Topbar: Notifications badge | ✅ Gebouwd | Bell icon + unread count badge |
| Topbar: Approvals/Queue badge | ✅ Gebouwd | ListChecks icon + pending count badge |
| Overlays: Quick view modals | ✅ Gebouwd | `NavbarQuickReviewModal`, `NavbarNotificationsModal` |
| Stack navigatie (hiërarchie) | ✅ Gebouwd | `/:org/:club/:team/:season/:competition/:match` routes |
| Season tab → actieve season | ✅ Gebouwd | `activeSeasonSlug` via `getActiveContext()` |
| CSS Modules + `--app-*` tokens | ✅ Gebouwd | 276 modules, 140 primitive + 99 semantic tokens, ~249 utilities |
| Touch targets ≥ 44px | ✅ Gebouwd | `.touch-target` utility, `(hover: none)` media query |
| Consistente spacing/typografie/tokens | ✅ Gebouwd | Full design system (tokens.css → theme.css → utility.css) |
| Skeletons boven spinners | ✅ Gebouwd | Phase A1: 18 bestanden gemigreerd, 5 page-level composites, 0 spinners |
| Zoekfunctie in topbar | ✅ Gebouwd | `SearchBar` in TopNavbar, `CommandPalette` quick switch |

### Wat ontbreekt of verscherpt moet worden 🔴

| Richtlijn | Status | Gap |
|-----------|--------|-----|
| **Profile tab in bottom nav** | ❌ Ontbreekt | Huidige tabs: Home \| Season \| + \| Match \| Gallery. Richtlijn zegt Profile ipv Match |
| Overlays "Bekijk alles" → deep dive pagina | 🟡 Deels | Quick review modal bestaat, maar link naar volledige pagina niet consistent |
| Na generate: success + shortcut | 🟡 Deels | Modal sluit, maar geen duidelijke shortcut naar preview/approvals |
| Preview per wizard-stap | 🟡 Deels | Content cards hebben geen thumbnails, review-stap mist grotere preview |
| Micro-interacties (hover, tap feedback) | 🟡 Deels | `design-system-interactive.css` bestaat, maar niet overal toegepast |
| Empty/loading/error states per context | 🟡 Deels | SmartEmptyState bestaat, maar inconsistent |
| Keuze triggert direct "next" | ✅ Match step doet dit, content step ook, maar niet als patroon gestandaardiseerd |

---

## Aangescherpte richtlijnen

### 1. Navigatie-model

#### Mobile (< 640px)

```
┌─────────────────────────────────────────┐
│              TopBar (compact)           │
│  [☰]  [SearchBar]  [🔔 2] [📋 3] [👤] │
├─────────────────────────────────────────┤
│                                         │
│           Page Content                  │
│           (scrollable)                  │
│                                         │
├─────────────────────────────────────────┤
│  Bottom Nav (fixed)                     │
│  [🏠 Home] [📅 Season] [➕] [⚔️ Match] [🎬 Gallery] │
└─────────────────────────────────────────┘
```

**Bottom nav tabs (huidige implementatie — behouden):**

| Tab | Icoon | Route | Logica |
|-----|-------|-------|--------|
| Home | `Home` | `/dashboard` | Dashboard, recents, favorites |
| Season | `CalendarDays` | `/{org}/{club}/{team}/{season}` | Actieve season (auto-resolved) |
| **+** | `Plus` (raised) | — | Opent MatchWizard bottom sheet |
| Match | `Swords` | `/matches/{slug}` | Actieve/eerstvolgende match |
| Gallery | `Clapperboard` | `/studio` | AI Studio / content gallery |

> **Besluit**: Match-tab biedt meer dagelijkse waarde dan Profile. Profile is bereikbaar via TopBar avatar (1 tap). Match is de kern van de app — snelle toegang is essentieel.

**Stack navigatie (depth):**

```
Home → Club → Team → Season → Competition → Match → Content
```

Elke "dieper" level pusht op de stack. Back-button (hardware + UI) popt terug. Breadcrumbs op desktop voor context.

#### Desktop (≥ 1024px)

- **Sidebar** (Panel A icon strip + Panel B context): altijd zichtbaar
- **TopNavbar**: mega-menu dropdowns, search, create CTA, badges
- **MobileBottomNav**: verborgen

#### Tablet (640px – 1023px)

- **Sidebar Panel A**: collapsed (72px icon-only)
- **Sidebar Panel B**: verborgen
- **TopNavbar**: compact variant
- **MobileBottomNav**: verborgen

---

### 2. TopBar — badges & overlays

**Twee badge-iconen (rechts, altijd zichtbaar — ook mobile):**

| Icoon | Badge | Overlay (quick view) | Full page |
|-------|-------|---------------------|-----------|
| `ListChecks` (Queue) | Pending review count | `NavbarQuickReviewModal` — approve/reject met swipe | `/approvals` |
| `Bell` (Notifications) | Unread count | `NavbarNotificationsModal` — laatste 10 items | `/notifications` |

**Overlay UX-regels:**
- Max 5-10 items zichtbaar
- Geen filters, geen search — dat is voor de full page
- Altijd een "Bekijk alles →" link onderaan → navigeert naar full page
- Badge count updatet **direct** na actie (optimistic UI)
- Overlay sluit automatisch na laatste actie als lijst leeg wordt

---

### 3. Create flow (+) — MatchWizard

**Progressive disclosure — 5 stappen:**

```
Stap 1: Match selectie
  ↓ (tap op match → auto-next)
Stap 2: Moment — Pre | Tijdens | Na
  ↓ (tap op content type → auto-next)
Stap 3: Format keuze (cards met thumbnail + beschrijving)
  ↓ (tap → auto-next, of → lineup stap indien nodig)
Stap 4: Lineup (alleen als content type dit vereist)
  ↓ (bevestig → genereer)
Stap 5: Review + Generate
  ↓
Success: feedback toast + shortcuts
```

**Wizard shell patronen:**
- Full-height bottom sheet (niet centered modal)
- Header: `← Back` | Stap titel | `× Close`
- Per stap: content vervangen (geen scroll door alle stappen)
- Keuze = next: tap op een match-card navigeert direct naar stap 2
- Empty state per stap: "Geen wedstrijden gevonden" etc.
- Loading state: skeleton cards (niet spinner)
- Error state: retry button met descriptieve melding

**Na generatie (verbetering nodig):**
- Toast: "Content gegenereerd! 🎉"
- Twee knoppen in toast of success-scherm:
  - "Bekijk preview" → navigeer naar content detail
  - "Naar queue" → navigeer naar `/approvals`
- Wizard sluit automatisch

---

### 4. Previews & thumbnails

| Context | Preview type |
|---------|-------------|
| Wizard stap 3 (format) | Thumbnail op content-card (48×48 of 64×64) |
| Wizard stap 5 (review) | Grotere preview (video still of flyer mockup) |
| Gallery grid | Square thumbnails (aspect-ratio: 1) |
| Content detail | Full-size preview met play button |
| Queue/approvals | Thumbnail + metadata card |

**Thumbnail requirements:**
- Gegenereerd server-side via `generate_media_thumbnails` Celery task
- Placeholder skeleton tot thumbnail beschikbaar
- Lazy loading voor below-fold content
- WebP format met fallback naar JPEG

---

### 5. State management per component

Elk scherm moet **4 states** afhandelen:

```tsx
// Pattern: elke data-driven component
{isLoading && <SkeletonCards count={3} />}
{error && <ErrorState message={error} onRetry={refetch} />}
{!isLoading && !error && data.length === 0 && <EmptyState />}
{!isLoading && !error && data.length > 0 && <ContentList data={data} />}
```

| State | UI | Feedback |
|-------|-----|---------|
| **Loading** | Skeleton cards (vormtaal matcht content) | Geen tekst nodig |
| **Empty** | Illustratie + tekst + CTA | "Nog geen content. Maak je eerste match-flyer →" |
| **Error** | Icoon + melding + retry | "Kon data niet laden. Probeer opnieuw" |
| **Success** | Content | — |

**Skeletons boven spinners**: skeletons geven visuele stabiliteit (geen layout shift). Gebruik spinners alleen voor inline acties (knop-loading).

---

### 6. Zoekfunctie

| Viewport | Zoek UI |
|----------|---------|
| Desktop | `SearchBar` in TopNavbar (always visible, expands on focus) |
| Mobile | Compact search in TopNavbar (icoon → expands) |
| Gallery page | Dedicated search field bovenaan pagina |
| Command Palette | `Cmd+K` quick switch (desktop) |

**Zoek is NIET in de bottom nav** — het is een topbar-functie. Gallery is de enige pagina met een dedicated zoekbalk bovenaan.

---

### 7. Styling beslisboom (versterkt)

```
Nieuwe styling nodig?
  │
  ├─ Layout (flex, grid, gap, margin, padding)?
  │   └─ Utility class (.flex-row, .gap-8, .p-16)
  │
  ├─ Dynamische waarde (JS state, API, user input)?
  │   └─ Inline style (style={{ width: `${x}%` }})
  │
  ├─ Standaard tekst (size, weight, color)?
  │   └─ Utility class (.fs-14, .fw-600, .text-muted)
  │
  ├─ Component-specifiek visueel (borders, shadows, hover)?
  │   └─ CSS Module met design tokens
  │
  └─ Gedeeld visueel patroon (knoppen, cards, badges)?
      └─ UI Primitive uit components/ui/
```

**Harde regels:**
- ❌ Geen `!important` (tenzij third-party override)
- ❌ Geen hardcoded kleuren (altijd `var(--token)`)
- ❌ Geen bestanden > 500 regels
- ❌ Geen inline styles voor statische waarden
- ✅ Elk component krijgt een `.module.css`
- ✅ Base = mobile, breakpoints voegen complexity toe
- ✅ Elke interactieve element ≥ 44px touch target

---

### 8. Premium feel — hoe te bereiken

| Aspect | Implementatie |
|--------|--------------|
| **Spacing** | Altijd tokens (4px grid). Nooit "een beetje ruimte" met willekeurige px. |
| **Typografie** | 9 vaste sizes. Gebruik labels consequent (fs-12 voor meta, fs-14 voor body, fs-20 voor titels). |
| **Kleur** | Semantic tokens voor alles. Status kleuren: green=success, amber=warning, red=error, blue=info. |
| **Animaties** | 100-300ms met ease-out. Geen animaties > 500ms. `prefers-reduced-motion` respecteren. |
| **Transitions** | Fade in/out voor content, slide voor panels/sheets, scale voor modals. |
| **Feedback** | Haptic op mobile (via `useHapticFeedback`). Optimistic UI voor snelle response. |
| **Layout** | Geen layout shifts. Skeletons matchen content afmetingen. Images met expliciete aspect-ratio. |
| **Focus** | Zichtbare focus ring (`:focus-visible`). Keyboard navigatie werkt overal. |
| **Scroll** | Smooth scroll. Pull-to-refresh op lijstpagina's. Momentum scrolling. |

---

## Implementatie-prioriteiten

### Fase A — Foundation (quick wins, high impact)

| # | Taak | Impact | Effort |
|---|------|--------|--------|
| A1 | Skeleton loading states standaardiseren | Hoog — premium feel | Klein |
| A2 | Empty states consistent maken | Hoog — onboarding UX | Klein |
| A3 | Post-generate success flow (toast + shortcuts) | Hoog — user flow | Klein |
| A4 | Overlay "Bekijk alles" links consistent | Medium — navigation flow | Klein |

### Fase B — Wizard polish

| # | Taak | Impact | Effort |
|---|------|--------|--------|
| B1 | Thumbnails in wizard format-stap | Hoog — visuele beslissing | Medium |
| B2 | Review-stap met grotere preview | Hoog — prevent "generate spijt" | Medium |
| B3 | Error/retry states per wizard-stap | Medium — reliability feel | Klein |

### Fase C — Page-level refinement

| # | Taak | Impact | Effort |
|---|------|--------|--------|
| C1 | Gallery page: dedicated zoekbalk bovenaan | Medium — discovery | Klein |
| C2 | Season page: actieve competitie/match highlights | Hoog — dagelijks gebruik | Medium |
| C3 | Match detail: content preview grid | Hoog — match-dag workflow | Medium |
| C4 | Dashboard: activity feed + quick actions | Hoog — daily engagement | Groot |

### Fase D — Advanced interactions

| # | Taak | Impact | Effort |
|---|------|--------|--------|
| D1 | Swipe-to-approve in queue overlay | Medium — efficiency | Medium |
| D2 | Pull-to-refresh op meer pagina's | Low — polish | Klein |
| D3 | Haptic feedback op meer interacties | Low — premium feel | Klein |
| D4 | Transition animations tussen pagina's | Low — polish | Medium |
