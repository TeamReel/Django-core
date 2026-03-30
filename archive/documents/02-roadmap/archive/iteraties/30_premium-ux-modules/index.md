# Roadmap #30 — Premium WebApp (Frontend)

> **Status:** ✅ Afgerond
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

### H1.1 — Skeleton Loading States ✅

**Scope:** `demo/src/components/ui/Skeleton/`, alle pages

**To do:**
- [x] `Skeleton` primitieve component: `<Skeleton width height variant="text|rect|circle" />`
- [x] `SkeletonCard`, `SkeletonList`, `SkeletonTable` composites
- [x] Toepassen op: Dashboard hero, wedstrijden lijst, content pipeline, stat cards
- [x] Toepassen op: My Team overzicht, media grid, leden lijst
- [x] Toepassen op: Studio galerij, approval queue
- [x] Shimmer animatie via CSS `@keyframes` (geen JS overhead)

**Done criteria:**
- [x] Elke pagina toont shimmer skeleton bij eerste load
- [x] Geen layout shift (CLS) bij data laden
- [x] tsc + vite build slagen

### H1.2 — Page Transitions ✅

**Scope:** `demo/src/`, router configuratie

**To do:**
- [x] View Transitions API integreren: `document.startViewTransition()` bij route changes
- [x] Fallback CSS fade (opacity 0→1, 150ms) voor browsers zonder VT support
- [x] Shared element transitions voor navigatie tussen lijst → detail (optioneel)
- [x] `prefers-reduced-motion: reduce` respecteren

**Done criteria:**
- [x] Pagina-wissels hebben vloeiende fade/slide transitie
- [x] Geen visuele regressie
- [x] tsc + vite build slagen

### H1.3 — Toast/Feedback Systeem + Undo ✅

**Scope:** `demo/src/components/ui/Toast/`, `demo/src/providers/`

**To do:**
- [x] `ToastProvider` + `useToast()` hook bouwen
- [x] Varianten: success, error, warning, info
- [x] Auto-dismiss na 4s, handmatig sluiten met X
- [x] Stack max 3 toasts, FIFO
- [x] **Undo-variant**: "Content afgekeurd — Ongedaan maken" met 5s timer
- [x] Integreren bij: content approve/reject, profiel save, share, delete
- [x] Toegankelijk: `role="alert"`, `aria-live="polite"`
- [x] Animatie: slide-in van rechtsonder (mobile: boven bottom nav)

**Done criteria:**
- [x] Minstens 5 user-acties tonen een toast
- [x] Undo-toast werkt voor destructieve acties (afkeuren, verwijderen)
- [x] Screenreader-compatibel
- [x] tsc + vite build slagen

---

## H2 — Guided Experience
> **Effort:** 4 dagen | **Impact:** Nieuwe gebruikers converteren beter

Eerste indruk perfectioneren: onboarding, lege pagina's vullen, navigatie versnellen.

### H2.1 — Onboarding Wizard ✅

**Scope:** `demo/src/pages/onboarding/`

**To do:**
- [x] 3-stap wizard: "Welkom" → "Upload club logo" → "Plan eerste wedstrijd"
- [x] Stap 1: Welkom + TeamReel value prop + avatar-bevestiging
- [x] Stap 2: Club logo uploaden (of "Later")
- [x] Stap 3: Eerste wedstrijd plannen (of "Later")
- [x] Progress indicator (dots/stap-balk)
- [x] `localStorage` flag: `teamreel:onboarding:completed`
- [x] Skip/overslaan op elke stap
- [x] Na voltooiing: redirect dashboard + welkom-toast

**Done criteria:**
- [x] Nieuwe gebruiker ziet wizard bij eerste login
- [x] Volledig doorlopen of overslaan mogelijk
- [x] Na voltooiing verschijnt wizard niet meer
- [x] tsc + vite build slagen

### H2.2 — Contextual Empty States ✅

**Scope:** `demo/src/components/EmptyState/`, alle tab panels

**To do:**
- [x] `EmptyState` component: illustratie + titel + beschrijving + CTA button
- [x] Illustraties per context: leden (silhouetten), wedstrijden (kalender), media (camera), seizoenen (klok)
- [x] CTA buttons: "Voeg eerste speler toe →", "Plan een wedstrijd →", "Upload media →"
- [x] Toepassen op: My Team tabs, Dashboard leeg-state, Studio leeg-state
- [x] Search leeg-state: recente zoekopdrachten + suggesties

**Done criteria:**
- [x] Alle lege tabs/secties tonen illustratie + CTA
- [x] CTAs navigeren naar juiste create-flow
- [x] tsc + vite build slagen

### H2.3 — Favorieten & Recents ✅

**Scope:** `demo/src/hooks/useSidebarRecents.ts`, `demo/src/components/Sidebar/`

**Huidige staat:** Sidebar toont "Recents" en "Manage Favorites" maar ze zijn leeg/niet-functioneel.

**To do:**
- [x] `useRecents()` hook: bijhouden laatst bezochte pagina's in localStorage
- [x] Recent items tonen in sidebar (max 5, met icoon + label)
- [x] `useFavorites()` hook: pin/unpin pagina's
- [x] Favorite items bovenaan sidebar met ster-icoon
- [x] "Pin deze pagina" actie in page header of context menu
- [x] Persistentie via localStorage (later optioneel backend sync)

**Done criteria:**
- [x] Sidebar toont 5 meest recente pagina's
- [x] Gebruiker kan pagina's pinnen als favoriet
- [x] Favorieten overleven page refresh
- [x] tsc + vite build slagen

### H2.4 — Smart Search ✅

**Scope:** `demo/src/components/SearchBar.tsx`, `demo/src/hooks/useSearch.ts`

**Huidige staat:** Zoeken werkt maar toont kale resultaten, geen recente items, geen filters.

**To do:**
- [x] Recente zoekopdrachten opslaan (localStorage, max 10)
- [x] Recente zoekopdrachten tonen bij lege search input
- [ ] Filter-chips: type-filter (Wedstrijden, Teams, Leden, Content)
- [x] Keyboard navigatie: pijltjes door resultaten, Enter om te selecteren
- [x] "Geen resultaten" state met suggesties

**Done criteria:**
- [x] Lege search toont recente zoekopdrachten
- [ ] Filter-chips filteren live
- [x] Keyboard navigatie werkt volledig
- [x] tsc + vite build slagen

---

## H3 — Visual Polish
> **Effort:** 3 dagen | **Impact:** Premium gevoel in elke interactie

Micro-interacties, data weergave, en power-user features.

### H3.1 — Micro-animaties ✅

**Scope:** `demo/src/styles/`, alle interactieve elementen

**To do:**
- [x] Button press: subtle `scale(0.97)` op `:active`
- [x] Card hover: `translateY(-2px)` + shadow elevation op desktop
- [x] Tab switch: underline slide-animatie
- [x] Toggle switch: smooth knob transition
- [x] Progress bars: animated fill bij mount
- [x] Badge count: scale bounce bij waarde-wijziging
- [x] `prefers-reduced-motion: reduce` respecteren overal
- [x] 60fps: alleen `transform` en `opacity` animeren

**Done criteria:**
- [x] Alle interactieve elementen hebben hover/active/focus feedback
- [x] Reduced motion gerespecteerd
- [x] Lighthouse performance ≥ 90
- [x] tsc + vite build slagen

### H3.2 — Data Visualisatie ✅

**Scope:** `demo/src/components/Charts/`, Dashboard

**To do:**
- [x] Lichtgewicht chart library: `recharts` of custom SVG (geen D3)
- [x] Content pipeline: donut chart i.p.v. nummers (0/2/64)
- [x] Media gereedheid: animated progress rings
- [x] Wedstrijden: mini sparkline van recent verloop
- [ ] Dashboard "Content voortgang": stacked bar per type
- [x] Responsive: charts schalen op mobile/desktop
- [ ] *Later:* Koppeling aan B65 aggregatie-endpoints wanneer beschikbaar

**Done criteria:**
- [x] Minstens 3 visualisaties op dashboard (op basis van bestaande API data)
- [x] Charts toegankelijk (aria-labels, sr-beschrijvingen)
- [x] Onder 10KB extra bundle size
- [x] tsc + vite build slagen

### H3.3 — Keyboard Shortcuts ✅

**Scope:** `demo/src/hooks/useKeyboardShortcuts.ts`, `demo/src/components/ShortcutGuide/`

**Huidige staat:** ⌘K quick switcher werkt op desktop, maar er zijn geen andere shortcuts.

**To do:**
- [x] Shortcut registry: `useKeyboardShortcuts()` hook met globale handler
- [x] Shortcuts: `N` = nieuw item, `S` of `/` = zoeken, `?` = cheatsheet, `Esc` = sluiten
- [x] Shortcut cheatsheet modal (trigger met `?` of help-icoon)
- [ ] Visuele hints in tooltips: "Zoeken (⌘K)" → "Zoeken (⌘K of /)"
- [x] Uitschakelen wanneer input/textarea focus heeft

**Done criteria:**
- [x] Minstens 5 globale keyboard shortcuts
- [x] Cheatsheet modal zichtbaar via `?`
- [x] Geen conflicten met browser-shortcuts
- [x] tsc + vite build slagen

---

## H4 — Advanced Frontend
> **Effort:** 4 dagen | **Impact:** Power-user features, geen backend nodig

Features die de app robuuster en krachtiger maken, puur client-side.

### H4.1 — Offline Mode & Caching ✅

**Scope:** `demo/public/sw.js`, `demo/src/hooks/useOffline.ts`

**To do:**
- [x] Service Worker cache: app shell (precache) + API (stale-while-revalidate)
- [x] `useOnlineStatus()` verbeteren: banner "Je bent offline — data kan verouderd zijn"
- [x] Cache prioriteiten: dashboard, team info, wedstrijden, thumbnails
- [ ] IndexedDB voor grotere datasets
- [ ] Sync queue: offline acties opslaan, bij reconnect uitvoeren
- [x] Cache invalidatie bij versie-update

**Done criteria:**
- [x] App shell laadt offline
- [x] Eerder geladen data offline beschikbaar
- [x] Online/offline banner zichtbaar
- [x] tsc + vite build slagen

### H4.2 — Multi-team Overview ✅

**Scope:** `demo/src/pages/multi-team/`

**Huidige staat:** Coaches met meerdere teams moeten per team navigeren — geen overzicht.

**To do:**
- [x] Multi-team dashboard: kaarten per team met key metrics (wedstrijd, leden, content)
- [ ] Team-switcher dropdown in top navbar (naast huidige org-switcher)
- [ ] Cross-team kalender: alle wedstrijden van alle teams in één view
- [ ] Notificatie bundeling: "3 teams hebben wedstrijden dit weekend"

**Done criteria:**
- [x] Coach met 3+ teams kan alles overzien in één pagina
- [ ] Team-switcher werkt vanuit elke pagina
- [x] tsc + vite build slagen

### H4.3 — Drag & Drop ✅

**Scope:** `demo/src/components/`, lineup editor, content ordening

**To do:**
- [x] Lightweight DnD library: `@dnd-kit/core` (tree-shakeable, accessible)
- [ ] Lineup editor: spelers slepen naar posities op veldvisualisatie
- [ ] Content volgorde: drag om "Voor de wedstrijd" items te herschikken
- [x] Sorteerbare lijsten: leden volgorde, favoriet volgorde
- [x] Touch support: long-press om drag te starten op mobile
- [x] Keyboard DnD: space om te pakken, pijltjes om te verplaatsen

**Done criteria:**
- [ ] Lineup posities aanpasbaar via drag
- [ ] Content items herschikbaar
- [x] Touch + keyboard support
- [x] tsc + vite build slagen

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
