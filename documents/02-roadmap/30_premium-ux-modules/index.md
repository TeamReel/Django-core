# Roadmap #30 — Premium WebApp (Frontend)

> **Status:** � In uitvoering
> **Start:** 18 maart 2026
> **Scope:** `demo/src/**` (puur frontend)

## Doel
Verhef TeamReel van "functioneel" naar "premium webapp" door 19 frontend verbeteringen in 5 fases te implementeren. Backend features zijn uitgesplitst naar aparte spec-kitty modules (B61–B65).

## Overzicht per fase

| Fase | Titel | Effort | Features |
|------|-------|--------|----------|
| **H0** | Foundation & Branding | 3 dagen | Branding, NL lokalisatie, Navbar UX (theme + search) |
| **H1** | Perceived Performance | 3 dagen | Skeletons, Page transitions, Toast systeem + Undo |
| **H2** | Guided Experience | 4 dagen | Onboarding wizard, Empty states, Favorieten & Recents, Smart Search |
| **H3** | Visual Polish | 3 dagen | Micro-animaties, Data visualisatie, Keyboard shortcuts |
| **H4** | Advanced Frontend | 4 dagen | Offline mode, Multi-team overview, Drag & Drop |

**Totaal:** ~17 dagen | **Backend:** ❌ Geen — puur frontend

### Backend modules (apart via spec-kitty)

De volgende features vereisen Django backend werk en zijn uitgesplitst naar zelfstandige modules in `documents/02-roadmap/modules/planned/`:

| Module | Titel | Frontend integratie |
|--------|-------|---------------------|
| [302-B61](../modules/planned/302-B61-content-comments-and-reactions.md) | Content Comments & Reactions | `CommentThread` + `ReactionBar` components |
| [303-B62](../modules/planned/303-B62-activity-feed.md) | Activity Feed | `ActivityFeed` timeline component |
| [304-B63](../modules/planned/304-B63-push-notifications-and-pwa.md) | Push Notifications & PWA | Service Worker + `usePushNotifications()` hook |
| [305-B64](../modules/planned/305-B64-realtime-updates.md) | Real-time Updates | `useRealtimeUpdates()` hook + EventSource |
| [306-B65](../modules/planned/306-B65-content-analytics-dashboard.md) | Content Analytics Dashboard | Analytics pagina + charts |

Wanneer een backend module klaar is, wordt de frontend integratie als follow-up fase aan deze roadmap toegevoegd.

---

## H0 — Foundation & Branding
> **Effort:** 3 dagen | **Impact:** Direct zichtbaar voor elke gebruiker

Alles wat de app er "af" laat uitzien zonder functionele verandering. Puur visueel en taal.

### H0.1 — Branding & NL Lokalisatie

**Scope:** `demo/src/pages/auth/`, `demo/src/components/`, bottom navbar, sidebar, notifications, search, queue

**Wat ontbreekt:**
- Login page toont "Django Core-App Demo" i.p.v. TeamReel branding
- Bottom nav is Engels: "Home", "My Team", "Studio", "Profile"
- Profile labels Engels: "Edit Profile", "Change Password", "Credits & Wallet"
- Notifications in Engels: "You have been added to project…"
- Sidebar labels Engels: "Dashboard", "Recents", "Manage Favorites"
- Search labels Engels: "Competitions", "Matches", "View All →"
- Queue mix: "In Progress" (EN) naast "Te Reviewen" (NL)

**To do:**
- [x] Login page herbranden: TeamReel logo, titel "Welkom bij TeamReel", hero illustratie
- [x] Register page herbranden op dezelfde manier
- [x] Bottom nav vertalen: My Team→Mijn Team, Profile→Profiel (Home en Studio blijven universeel)
- [x] Profile page labels vertalen naar NL
- [x] Sidebar labels vertalen: Recents→Recent, Manage Favorites→Favorieten beheren
- [ ] Notification teksten vertalen (frontend templates)
- [x] Search category labels vertalen: Competitions→Competities, Matches→Wedstrijden, View All→Bekijk alles
- [x] Queue "In Progress" → "In behandeling"

**Done criteria:**
- [x] Geen Engels meer zichtbaar in de standaard NL-flow
- [x] Login/register pagina's gebrand als TeamReel
- [x] tsc + vite build slagen

### H0.2 — Navbar UX: Theme Toggle + Inline Search

**Scope:** `demo/src/components/TopNavbar.tsx`, `TopNavbarMobile.tsx`, `SearchBar.tsx`

**Huidige staat:**
- **Theme toggle**: Alleen op Profile page (3 stappen diep). `useTheme()` context bestaat maar wordt niet in navbar gebruikt.
- **Mobile search**: `MobileSearchOverlay` neemt fullscreen in (`position: fixed; inset: 0`) — voelt als pagina-navigatie.

**Design beslissingen:**

| Vraag | Besluit |
|-------|--------|
| Theme toggle waar? | Top navbar rechts — moon/sun icon button, naast notifications |
| Theme toggle mobile? | Ja, in de icon-row (Search, **Theme**, Approvals, Notifications) |
| Search inline hoe? | `MobileSearchOverlay` → half-height overlay (max 60vh) + backdrop blur |
| Desktop search? | Al inline met dropdown — geen wijziging nodig |

**To do:**
- [x] `ThemeToggleButton` component: moon/sun icoon, tooltip, accessible label
- [x] Toevoegen aan TopNavbar mobile + desktop icon row
- [x] `MobileSearchOverlay` CSS: `inset: 0` → `top: 0; left: 0; right: 0; max-height: 60vh`
- [x] `backdrop-filter: blur(4px)` op semi-transparante achtergrond
- [x] Tap buiten zoekgebied sluit overlay
- [x] Escape sluit search overlay
- [ ] Smooth animatie voor theme toggle icon transitie

**Done criteria:**
- [x] Theme toggle zichtbaar in top navbar op mobile én desktop
- [x] Theme cyclet light → dark → system met visuele feedback
- [x] Mobile search is een half-overlay, niet fullscreen
- [ ] Backdrop blur achter search overlay
- [ ] tsc + vite build slagen

---

## H1 — Perceived Performance
> **Effort:** 3 dagen | **Impact:** App voelt 2× zo snel

Skeleton loading, page transitions en feedback systeem. De app wordt niet sneller, maar *voelt* premium.

### H1.1 — Skeleton Loading States

**Scope:** `demo/src/components/ui/Skeleton/`, alle pages

**To do:**
- [ ] `Skeleton` primitieve component: `<Skeleton width height variant="text|rect|circle" />`
- [ ] `SkeletonCard`, `SkeletonList`, `SkeletonTable` composites
- [ ] Toepassen op: Dashboard hero, wedstrijden lijst, content pipeline, stat cards
- [ ] Toepassen op: My Team overzicht, media grid, leden lijst
- [ ] Toepassen op: Studio galerij, approval queue
- [ ] Shimmer animatie via CSS `@keyframes` (geen JS overhead)

**Done criteria:**
- [ ] Elke pagina toont shimmer skeleton bij eerste load
- [ ] Geen layout shift (CLS) bij data laden
- [ ] tsc + vite build slagen

### H1.2 — Page Transitions

**Scope:** `demo/src/`, router configuratie

**To do:**
- [ ] View Transitions API integreren: `document.startViewTransition()` bij route changes
- [ ] Fallback CSS fade (opacity 0→1, 150ms) voor browsers zonder VT support
- [ ] Shared element transitions voor navigatie tussen lijst → detail (optioneel)
- [ ] `prefers-reduced-motion: reduce` respecteren

**Done criteria:**
- [ ] Pagina-wissels hebben vloeiende fade/slide transitie
- [ ] Geen visuele regressie
- [ ] tsc + vite build slagen

### H1.3 — Toast/Feedback Systeem + Undo

**Scope:** `demo/src/components/ui/Toast/`, `demo/src/providers/`

**To do:**
- [ ] `ToastProvider` + `useToast()` hook bouwen
- [ ] Varianten: success, error, warning, info
- [ ] Auto-dismiss na 4s, handmatig sluiten met X
- [ ] Stack max 3 toasts, FIFO
- [ ] **Undo-variant**: "Content afgekeurd — Ongedaan maken" met 5s timer
- [ ] Integreren bij: content approve/reject, profiel save, share, delete
- [ ] Toegankelijk: `role="alert"`, `aria-live="polite"`
- [ ] Animatie: slide-in van rechtsonder (mobile: boven bottom nav)

**Done criteria:**
- [ ] Minstens 5 user-acties tonen een toast
- [ ] Undo-toast werkt voor destructieve acties (afkeuren, verwijderen)
- [ ] Screenreader-compatibel
- [ ] tsc + vite build slagen

---

## H2 — Guided Experience
> **Effort:** 4 dagen | **Impact:** Nieuwe gebruikers converteren beter

Eerste indruk perfectioneren: onboarding, lege pagina's vullen, navigatie versnellen.

### H2.1 — Onboarding Wizard

**Scope:** `demo/src/pages/onboarding/`

**To do:**
- [ ] 3-stap wizard: "Welkom" → "Upload club logo" → "Plan eerste wedstrijd"
- [ ] Stap 1: Welkom + TeamReel value prop + avatar-bevestiging
- [ ] Stap 2: Club logo uploaden (of "Later")
- [ ] Stap 3: Eerste wedstrijd plannen (of "Later")
- [ ] Progress indicator (dots/stap-balk)
- [ ] `localStorage` flag: `teamreel:onboarding:completed`
- [ ] Skip/overslaan op elke stap
- [ ] Na voltooiing: redirect dashboard + welkom-toast

**Done criteria:**
- [ ] Nieuwe gebruiker ziet wizard bij eerste login
- [ ] Volledig doorlopen of overslaan mogelijk
- [ ] Na voltooiing verschijnt wizard niet meer
- [ ] tsc + vite build slagen

### H2.2 — Contextual Empty States

**Scope:** `demo/src/components/EmptyState/`, alle tab panels

**To do:**
- [ ] `EmptyState` component: illustratie + titel + beschrijving + CTA button
- [ ] Illustraties per context: leden (silhouetten), wedstrijden (kalender), media (camera), seizoenen (klok)
- [ ] CTA buttons: "Voeg eerste speler toe →", "Plan een wedstrijd →", "Upload media →"
- [ ] Toepassen op: My Team tabs, Dashboard leeg-state, Studio leeg-state
- [ ] Search leeg-state: recente zoekopdrachten + suggesties

**Done criteria:**
- [ ] Alle lege tabs/secties tonen illustratie + CTA
- [ ] CTAs navigeren naar juiste create-flow
- [ ] tsc + vite build slagen

### H2.3 — Favorieten & Recents

**Scope:** `demo/src/hooks/useSidebarRecents.ts`, `demo/src/components/Sidebar/`

**Huidige staat:** Sidebar toont "Recents" en "Manage Favorites" maar ze zijn leeg/niet-functioneel.

**To do:**
- [ ] `useRecents()` hook: bijhouden laatst bezochte pagina's in localStorage
- [ ] Recent items tonen in sidebar (max 5, met icoon + label)
- [ ] `useFavorites()` hook: pin/unpin pagina's
- [ ] Favorite items bovenaan sidebar met ster-icoon
- [ ] "Pin deze pagina" actie in page header of context menu
- [ ] Persistentie via localStorage (later optioneel backend sync)

**Done criteria:**
- [ ] Sidebar toont 5 meest recente pagina's
- [ ] Gebruiker kan pagina's pinnen als favoriet
- [ ] Favorieten overleven page refresh
- [ ] tsc + vite build slagen

### H2.4 — Smart Search

**Scope:** `demo/src/components/SearchBar.tsx`, `demo/src/hooks/useSearch.ts`

**Huidige staat:** Zoeken werkt maar toont kale resultaten, geen recente items, geen filters.

**To do:**
- [ ] Recente zoekopdrachten opslaan (localStorage, max 10)
- [ ] Recente zoekopdrachten tonen bij lege search input
- [ ] Filter-chips: type-filter (Wedstrijden, Teams, Leden, Content)
- [ ] Keyboard navigatie: pijltjes door resultaten, Enter om te selecteren
- [ ] "Geen resultaten" state met suggesties

**Done criteria:**
- [ ] Lege search toont recente zoekopdrachten
- [ ] Filter-chips filteren live
- [ ] Keyboard navigatie werkt volledig
- [ ] tsc + vite build slagen

---

## H3 — Visual Polish
> **Effort:** 3 dagen | **Impact:** Premium gevoel in elke interactie

Micro-interacties, data weergave, en power-user features.

### H3.1 — Micro-animaties

**Scope:** `demo/src/styles/`, alle interactieve elementen

**To do:**
- [ ] Button press: subtle `scale(0.97)` op `:active`
- [ ] Card hover: `translateY(-2px)` + shadow elevation op desktop
- [ ] Tab switch: underline slide-animatie
- [ ] Toggle switch: smooth knob transition
- [ ] Progress bars: animated fill bij mount
- [ ] Badge count: scale bounce bij waarde-wijziging
- [ ] `prefers-reduced-motion: reduce` respecteren overal
- [ ] 60fps: alleen `transform` en `opacity` animeren

**Done criteria:**
- [ ] Alle interactieve elementen hebben hover/active/focus feedback
- [ ] Reduced motion gerespecteerd
- [ ] Lighthouse performance ≥ 90
- [ ] tsc + vite build slagen

### H3.2 — Data Visualisatie

**Scope:** `demo/src/components/Charts/`, Dashboard

**To do:**
- [ ] Lichtgewicht chart library: `recharts` of custom SVG (geen D3)
- [ ] Content pipeline: donut chart i.p.v. nummers (0/2/64)
- [ ] Media gereedheid: animated progress rings
- [ ] Wedstrijden: mini sparkline van recent verloop
- [ ] Dashboard "Content voortgang": stacked bar per type
- [ ] Responsive: charts schalen op mobile/desktop
- [ ] *Later:* Koppeling aan B65 aggregatie-endpoints wanneer beschikbaar

**Done criteria:**
- [ ] Minstens 3 visualisaties op dashboard (op basis van bestaande API data)
- [ ] Charts toegankelijk (aria-labels, sr-beschrijvingen)
- [ ] Onder 10KB extra bundle size
- [ ] tsc + vite build slagen

### H3.3 — Keyboard Shortcuts

**Scope:** `demo/src/hooks/useKeyboardShortcuts.ts`, `demo/src/components/ShortcutGuide/`

**Huidige staat:** ⌘K quick switcher werkt op desktop, maar er zijn geen andere shortcuts.

**To do:**
- [ ] Shortcut registry: `useKeyboardShortcuts()` hook met globale handler
- [ ] Shortcuts: `N` = nieuw item, `S` of `/` = zoeken, `?` = cheatsheet, `Esc` = sluiten
- [ ] Shortcut cheatsheet modal (trigger met `?` of help-icoon)
- [ ] Visuele hints in tooltips: "Zoeken (⌘K)" → "Zoeken (⌘K of /)"
- [ ] Uitschakelen wanneer input/textarea focus heeft

**Done criteria:**
- [ ] Minstens 5 globale keyboard shortcuts
- [ ] Cheatsheet modal zichtbaar via `?`
- [ ] Geen conflicten met browser-shortcuts
- [ ] tsc + vite build slagen

---

## H4 — Advanced Frontend
> **Effort:** 4 dagen | **Impact:** Power-user features, geen backend nodig

Features die de app robuuster en krachtiger maken, puur client-side.

### H4.1 — Offline Mode & Caching

**Scope:** `demo/public/sw.js`, `demo/src/hooks/useOffline.ts`

**To do:**
- [ ] Service Worker cache: app shell (precache) + API (stale-while-revalidate)
- [ ] `useOnlineStatus()` verbeteren: banner "Je bent offline — data kan verouderd zijn"
- [ ] Cache prioriteiten: dashboard, team info, wedstrijden, thumbnails
- [ ] IndexedDB voor grotere datasets
- [ ] Sync queue: offline acties opslaan, bij reconnect uitvoeren
- [ ] Cache invalidatie bij versie-update

**Done criteria:**
- [ ] App shell laadt offline
- [ ] Eerder geladen data offline beschikbaar
- [ ] Online/offline banner zichtbaar
- [ ] tsc + vite build slagen

### H4.2 — Multi-team Overview

**Scope:** `demo/src/pages/multi-team/`

**Huidige staat:** Coaches met meerdere teams moeten per team navigeren — geen overzicht.

**To do:**
- [ ] Multi-team dashboard: kaarten per team met key metrics (wedstrijd, leden, content)
- [ ] Team-switcher dropdown in top navbar (naast huidige org-switcher)
- [ ] Cross-team kalender: alle wedstrijden van alle teams in één view
- [ ] Notificatie bundeling: "3 teams hebben wedstrijden dit weekend"

**Done criteria:**
- [ ] Coach met 3+ teams kan alles overzien in één pagina
- [ ] Team-switcher werkt vanuit elke pagina
- [ ] tsc + vite build slagen

### H4.3 — Drag & Drop

**Scope:** `demo/src/components/`, lineup editor, content ordening

**To do:**
- [ ] Lightweight DnD library: `@dnd-kit/core` (tree-shakeable, accessible)
- [ ] Lineup editor: spelers slepen naar posities op veldvisualisatie
- [ ] Content volgorde: drag om "Voor de wedstrijd" items te herschikken
- [ ] Sorteerbare lijsten: leden volgorde, favoriet volgorde
- [ ] Touch support: long-press om drag te starten op mobile
- [ ] Keyboard DnD: space om te pakken, pijltjes om te verplaatsen

**Done criteria:**
- [ ] Lineup posities aanpasbaar via drag
- [ ] Content items herschikbaar
- [ ] Touch + keyboard support
- [ ] tsc + vite build slagen

---

## Feature → Fase mapping (volledige checklist)

Alle 24 features: 19 in deze roadmap, 5 als backend module.

| # | Feature | Locatie | Type |
|---|---------|---------|------|
| — | **Theme toggle in mobile navbar** | H0.2 | Frontend |
| — | **Inline search overlay** | H0.2 | Frontend |
| 1 | Onboarding Wizard | H2.1 | Frontend |
| 2 | Skeleton Loading States | H1.1 | Frontend |
| 3 | Volledige NL Lokalisatie | H0.1 | Frontend |
| 4 | Branded Login/Register | H0.1 | Frontend |
| 5 | Page Transitions | H1.2 | Frontend |
| 6 | Toast Feedback + Undo | H1.3 | Frontend |
| 7 | Activity Feed / Timeline | **B62** | Backend module |
| 8 | Real-time Updates | **B64** | Backend module |
| 9 | Data Visualisatie | H3.2 | Frontend |
| 10 | PWA Install Prompt | **B63** | Backend module |
| 11 | Push Notifications | **B63** | Backend module |
| 12 | Offline Mode | H4.1 | Frontend |
| 13 | Favorieten & Recents | H2.3 | Frontend |
| 14 | Contextual Empty States | H2.2 | Frontend |
| 15 | Micro-animaties | H3.1 | Frontend |
| 16 | Keyboard Shortcuts | H3.3 | Frontend |
| 17 | Drag & Drop | H4.3 | Frontend |
| 18 | Analytics Dashboard | **B65** | Backend module |
| 19 | Commentaar/Reactions | **B61** | Backend module |
| 20 | Multi-team Overview | H4.2 | Frontend |
| 21 | Undo voor destructieve acties | H1.3 | Frontend |
| 22 | Smart Search | H2.4 | Frontend |

**✅ 24/24 features gedekt** (19 frontend + 5 backend modules)

---

## Sprint planning

```
Sprint 1 (week 1):     H0  — Branding + Navbar UX             3 dagen
Sprint 2 (week 1-2):   H1  — Skeletons + Transitions + Toasts 3 dagen
Sprint 3 (week 2-3):   H2  — Onboarding + Empty + Search      4 dagen
Sprint 4 (week 3-4):   H3  — Animaties + Charts + Shortcuts   3 dagen
Sprint 5 (week 4-5):   H4  — Offline + Multi-team + DnD       4 dagen
```

**Totaal: ~17 dagen puur frontend**

Backend modules (B61–B65) worden parallel via spec-kitty ontwikkeld en geïntegreerd zodra de API's klaar zijn.

## Acceptatiecriteria (geheel)
- [ ] Alle 19 frontend features geïmplementeerd en werkend
- [ ] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [ ] No new `any` types
- [ ] Alle interactieve elementen accessible (WCAG 2.1 AA)
- [ ] `prefers-reduced-motion` gerespecteerd bij alle animaties
- [ ] Lighthouse performance ≥ 90
