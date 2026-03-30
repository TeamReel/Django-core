# TeamReel Mobile UX & Gamification Analyse

> **Datum:** 27 februari 2026
> **Status:** Analyse & Aanbevelingen
> **Auteur:** AI-analyse op basis van codebase audit
>
> ⚠️ **Deels stale:** Sectie 2 (Huidige staat) is achterhaald — skeletons zijn toegevoegd (18 componenten), grote bestanden zijn opgesplitst (<500 regels), safe-area-inset is geïmplementeerd. Gamification-aanbevelingen (sectie 4+) blijven geldig.

---

## Inhoudsopgave

1. [Wat is TeamReel?](#1-wat-is-teamreel)
2. [Huidige staat — Mobile UX Analyse](#2-huidige-staat--mobile-ux-analyse)
3. [Huidige gamification elementen](#3-huidige-gamification-elementen)
4. [Gamification aanbevelingen](#4-gamification-aanbevelingen)
5. [UX best practices aanbevelingen](#5-ux-best-practices-aanbevelingen)
6. [Prioriteit roadmap](#6-prioriteit-roadmap)
7. [Vervolgstappen](#7-vervolgstappen)
8. [Open vragen](#8-open-vragen)

---

## 1. Wat is TeamReel?

**Doel:** TeamReel is een SaaS-platform voor amateurvoetbalclubs dat AI-gegenereerde visuele content maakt — flyers, lineups, walk-on video's, anthem video's, doelpunt-celebraties, highlights, transformaties, duo-portretten. Het doel: clubs op amateurniveau geven wat profclubs hebben (professionele matchday content voor social media), volledig geautomatiseerd.

**Hiërarchie:** Federatie → Club → Team → Seizoen → Competitie → Wedstrijd → Content

### Gebruikersrollen

| Rol | Wat ze doen |
|-----|------------|
| **Superadmin** | Platform-breed beheer, alle federaties/clubs |
| **Land Admin** | Federatie-niveau beheer |
| **Org Admin** | Club-niveau beheer, content goedkeuring |
| **Coach** | Team beheer, content aanmaken, lineups |
| **Speler** | Eigen profiel bekijken, lineup zien, beperkte navigatie |

### Kernfunctionaliteit

| Feature | Beschrijving |
|---------|-------------|
| **Content Generatie** | AI-generatie van 25+ content-types via templates (flyer, lineup, walk-on, anthem, goal, score, highlights, transformatie, duo-portret, etc.) |
| **Match Management** | Wedstrijden aanmaken, lineup-editor met formatie-picker, scoreboard |
| **Gallery / Content Library** | Overzicht van alle gegenereerde content, gefilterd op fase (pre/during/post-match, season, member) |
| **Media Library** | Upload en beheer van bronbestanden (foto's, logo's, assets) |
| **Approval Queue** | Workflow voor content goedkeuring (needs review → approved/rejected) |
| **Credits / Wallet** | Betaalmodel op basis van credits per generatie |
| **Directory** | Beheer van federaties, clubs, teams, seizoenen, competities, leden |
| **Notificaties** | In-app + e-mail notificaties voor events |
| **Activity Feed** | Overzicht van komende en afgelopen wedstrijden |

---

## 2. Huidige staat — Mobile UX Analyse

### Wat goed is

| Aspect | Implementatie |
|--------|--------------|
| **Bottom navigation** | 5 context-aware tabs (Home, Team, Match, Content, More) — role-aware |
| **MobileFilterSheet** | Bottom-sheet patroon voor filters (gallery, matches) |
| **Instagram-grid** | 3-kolommen square thumbnail grid voor gallery |
| **Touch targets** | 44px minimum hoogte, 16px font op inputs (voorkomt iOS zoom) |
| **Role-aware hiding** | Spelers zien geen admin-content, sidebar/tabs gefilterd |
| **Sidebar auto-close** | Sidebar sluit automatisch bij navigatie op mobiel |
| **Responsive CSS** | Consistent breakpoint op `< 640px`, utility classes (`.hide-mobile`, `.show-mobile-only`) |
| **Content creation modal** | Full-screen modal met content-type tiles |
| **MobileTabBar** | Dropdown-stijl tab-selectie voor pagina's met veel tabs |
| **Modals full-screen** | Alle modals schalen naar 100vw × 100vh op mobiel |

### Wat ontbreekt / zwak is

| Probleem | Impact | Prioriteit |
|----------|--------|-----------|
| **Geen onboarding flow** | Nieuwe gebruiker ziet "Select Organisation" — geen begeleiding | 🔴 Hoog |
| **Geen loading skeletons** | "Loading..." tekst voelt traag, geen visuele feedback | 🔴 Hoog |
| **Geen pull-to-refresh** | Voelt niet als native app, gebruiker herlaadt hele pagina | 🟡 Midden |
| **Geen swipe-gestures** | Sidebar sluit alleen via tap, geen swipe-to-close of swipe-between-tabs | 🟡 Midden |
| **Geen haptic/visuele feedback** | Content genereren geeft geen "success" animatie | 🟡 Midden |
| **Geen offline indicator** | Bij slechte verbinding (veld/kleedkamer) geen feedback | 🔴 Hoog |
| **Geen safe-area-inset** | Notch-telefoons (iPhone) knippen content af | 🔴 Hoog |
| **Grote component-bestanden** | MatchDetail (3300 regels), ContentGenerationModal (4800 regels) — performance impact | 🟡 Midden |
| **Geen landscape modus** | Gallery/lineup niet geoptimaliseerd voor landscape | 🟢 Laag |
| **Accessibility zwak** | Geen ARIA-roles, focus-trap, screen-reader support | 🟡 Midden |
| **ActivityFeed items niet klikbaar** | Je ziet wedstrijden maar kunt er niet naartoe navigeren | 🔴 Hoog |
| **Geen "time-relative" labels** | "14 feb 2025" vs "Over 2 dagen" — minder scanbaar | 🟡 Midden |
| **Geen page-transition animaties** | Harde pagina-wisselingen, geen slide/fade | 🟢 Laag |
| **Geen long-press acties** | Gallery items hebben geen contextmenu via long-press | 🟡 Midden |

---

## 3. Huidige gamification elementen

| Element | Status | Beschrijving |
|---------|--------|-------------|
| **Credits / Wallet** | ✅ Actief | Saldo in navbar, low-balance waarschuwing, transactiehistorie |
| **Notificaties** | ✅ Actief | In-app notifications met read/unread, badge count |
| **Recents** | ✅ Actief | Laatste bezochte items als pills op dashboard |
| **Favorites** | ⚠️ Basis | Favoriet-pagina bestaat maar geen hart-knop overal zichtbaar |
| **Content completion matrix** | ✅ Actief | Op match-pagina: checklist welke content-types al gemaakt zijn |
| **Queue status badges** | ✅ Actief | Badge counts voor AI-queue items in sidebar |

### Wat volledig ontbreekt

- Badges / achievements
- Streaks
- Leaderboards
- Progress bars / readiness scores
- Challenges / milestones
- Punten-systeem
- Social sharing integratie
- Team-rankings
- Weekly digest / engagement e-mails

---

## 4. Gamification aanbevelingen

### 4.1 Match Readiness Score — 🔴 Hoog

Elke wedstrijd krijgt een **readiness percentage** (0-100%) gebaseerd op hoeveel content-types aangemaakt zijn.

```
Wedstrijd: Ajax O19 vs Feyenoord O19
━━━━━━━━━━━━━━━━━━━━ 72% Match Ready

✅ Match Flyer        ✅ Lineup Video
✅ Walk-on Video      ⬜ Anthem Video
✅ Goal Celebration   ✅ Final Score
⬜ Highlights Reel
```

- Toon als **circulaire progress ring** op de match-kaart (zowel in matches-lijst als match-detail)
- Push-notificatie: _"Je wedstrijd van morgen is nog maar 40% klaar — maak nu een lineup!"_
- Kleur-codering: rood (< 30%), oranje (30-70%), groen (> 70%)
- **Waarom:** Drijft content-creatie aan, maakt het een "checklist-game"

### 4.2 Team Content Streak — 🔴 Hoog

Aantal opeenvolgende wedstrijden waarvoor alle basis-content (flyer + lineup + final score) is aangemaakt.

```
🔥 8 wedstrijden streak!
Maak content voor de volgende om je streak te behouden.
```

- Toon op dashboard en team-pagina als vuur-icoon met teller
- Streak-icoon naast teamnaam in sidebar
- Visuele waarschuwing wanneer streak dreigt te breken (24u voor wedstrijd)
- **Waarom:** Streaks zijn de sterkste gamification-mechaniek (Duolingo, Snapchat). Coaches gaan niet willen dat hun streak breekt.

### 4.3 Club Leaderboard — 🟡 Midden

Ranking van teams binnen een club op basis van content-activiteit.

```
🏆 Content Ranking — Ajax
1. Ajax O19      ████████████ 96% (12 wedstrijden)
2. Ajax O17      ████████░░░  78% (10 wedstrijden)
3. Ajax O15      █████░░░░░░  52% (8 wedstrijden)
4. Ajax Vrouwen  ████░░░░░░░  40% (6 wedstrijden)
```

- Zichtbaar voor club-admins en coaches
- Weekelijkse digest-notificatie: _"Je team staat op plek 2 deze maand"_
- Vergelijking per seizoen (niet all-time) zodat elk seizoen een frisse start is
- **Waarom:** Competitie tussen teams stimuleert adoptie. Coaches willen niet onderaan staan.

### 4.4 Achievement Badges — 🟡 Midden

| Badge | Voorwaarde | Icoon |
|-------|-----------|-------|
| **First Content** | Eerste content-item gegenereerd | 🌟 |
| **Match Ready** | 100% content voor een wedstrijd | 🏟️ |
| **Streak Starter** | 3 wedstrijden streak | 🔥 |
| **Streak Master** | 10 wedstrijden streak | 🔥🔥 |
| **Social Sharer** | 5x content gedeeld naar social | 📱 |
| **Early Bird** | Content klaar 24u voor wedstrijd | ⏰ |
| **Season Complete** | Alle wedstrijden van een seizoen > 80% | 🏆 |
| **Photo Pro** | Alle spelerfoto's geüpload | 📸 |
| **Full Squad** | Volledige selectie met assets | 👥 |
| **Content Machine** | 50 content-items gegenereerd | ⚙️ |

- Toon op profiel-pagina als badge-grid
- Unlock-animatie (confetti / bounce) wanneer je een badge verdient
- Badge-count naast gebruikersnaam in sidebar

### 4.5 Speler Engagement — "My Wall" — 🟡 Midden

Spelers (de meest beperkte rol) krijgen een persoonlijke **content wall** met al hun gegenereerde content.

```
📱 Mijn Content
[Walk-on Video]  [Lineup Graphic]  [Duo Portret]
[Transformation] [Short Intro]     [Goal Moment]

Deel je content → [Instagram] [TikTok] [WhatsApp]
```

- Spelers kunnen hun eigen content direct delen naar social media
- Push-notificatie: _"Er is een nieuwe walk-on video voor jou gemaakt!"_
- Instagram-story format export (9:16 aspect ratio)
- **Waarom:** Spelers zijn de viral-loop. Als zij hun content delen, zien andere clubs het.

### 4.6 Weekly Digest — 🟢 Laag

Automatische e-mail/push elke maandag:

- Content aangemaakt deze week (met thumbnails)
- Streak status
- Upcoming wedstrijden die nog geen content hebben
- Team ranking als die veranderd is
- "Badge van de week" — meest actieve team
- **Waarom:** Re-engagement mechanisme voor gebruikers die de app niet dagelijks openen

---

## 5. UX best practices aanbevelingen

### 5.1 Onboarding Wizard — 🔴 Hoog

Eerste keer dat een gebruiker inlogt → 4-stappen wizard:

1. **Welkom** — Korte uitleg wat TeamReel is (3 seconden animatie)
2. **Team kiezen** — Selecteer je federatie → club → team (visueel met logo's)
3. **Eerste actie** — "Maak je eerste content" → direct naar match met de hoogste urgentie
4. **Push toestemming** — Vraag permission voor push-notificaties

**Technisch:** `localStorage` flag `onboarding_completed`, check in `DashboardPage`.

### 5.2 Smart Empty States — 🔴 Hoog

Elk leeg scherm moet een **actie** bevatten, niet alleen tekst:

| Pagina | Nu | Beter |
|--------|-----|-------|
| Gallery (geen match) | "Selecteer een wedstrijd" tekst | Grote kaart met volgende wedstrijd + "Content maken" CTA |
| Dashboard (geen org) | "Select an Organisation" | Federatie-kiezer met logo's |
| Match content (leeg) | Grijze grid | Visuele preview van wat je kunt maken + "Start" knop per type |
| Lineup (leeg) | Leeg veld | Pre-filled met spelers van vorige wedstrijd + "Bevestig" knop |
| Gallery (items, geen match) | Grid met items | Toon banner bovenaan: "Wedstrijd X is over 2 dagen — maak content" |

### 5.3 Optimistic UI + Micro-animaties — 🟡 Midden

- **Content genereren:** Toon direct een placeholder-kaart met shimmer-loading (niet wachten op API response)
- **Favoriet toevoegen:** Hart-icoon animeert (bounce + kleurverandering) direct bij tap
- **Match active maken:** Haptic feedback (`navigator.vibrate`) + badge-animatie
- **Content download:** Progress-ring om de download-knop
- **Navigatie:** Page-transition animaties (slide-in vanuit rechts voor drill-down, slide-out voor terug)
- **Tabwissel:** Fade of slide animatie tussen tabs

### 5.4 Bottom Sheet Patroon Uitbreiden — 🟡 Midden

`MobileFilterSheet` werkt goed — gebruik hetzelfde patroon voor:

- **Share sheet** (Instagram / TikTok / WhatsApp / Download)
- **Formation picker** op lineup-pagina
- **Quick actions** op gallery-item (lang-drukken → share/download/delete)
- **Member picker** bij content generatie
- **Notificatie-acties** (mark as read, navigate, dismiss)

### 5.5 Smart Notifications — 🟡 Midden

| Trigger | Notificatie | Actie |
|---------|------------|-------|
| Wedstrijd morgen, < 50% content | "Morgen speelt [team]! Content nog niet compleet" | → Match content tab |
| Content goedgekeurd | "Jouw match flyer is goedgekeurd ✅" | → Gallery item |
| Speler foto geüpload | "Nieuwe foto beschikbaar — genereer content" | → Content modal |
| Streak dreigt te breken | "Je streak van 8 wedstrijden loopt af!" | → Volgende match |
| Badge verdiend | "🏆 Achievement: Match Ready!" | → Profiel badges |
| Team ranking veranderd | "Je team is gestegen naar plek 2!" | → Leaderboard |

### 5.6 One-Tap Content Generation — 🔴 Hoog

Op de match-pagina, een enkele **"Generate All"** knop die alle standaard content-types in één keer aanmaakt:

```
[⚡ Alles genereren]  — Flyer + Lineup + Walk-on + Final Score
```

- Scheelt 4 afzonderlijke klikken door de content-modal
- Toon batch-progress: "2 van 4 klaar..."
- Configurable preset per team (welke types in "alles" zitten)
- **Waarom:** 80/20 — de meeste coaches willen gewoon "alles" voor elke wedstrijd

### 5.7 Offline-first Patterns — 🟡 Midden

- **Cache laatste data** via service worker (wedstrijden, lineup, gallery thumbnails)
- **Offline indicator banner** bovenaan wanneer geen verbinding
- **Queue actions** wanneer offline, sync wanneer weer online
- **Waarom:** Coaches staan vaak in het sportpark met slecht netwerk

### 5.8 Performance Quick Wins — 🔴 Hoog

| Maatregel | Impact |
|-----------|--------|
| Split `MatchDetailPage` (3300 regels) in tab-componenten | Snellere initial render |
| Split `ContentGenerationModal` (4800 regels) in stap-componenten | Minder geheugengebruik |
| Lazy-load gallery thumbnails met `IntersectionObserver` | Minder data op mobiel |
| Virtualize gallery grid (`react-window`) bij > 50 items | Smooth scroll |
| Code-split routes met `React.lazy()` | Kleinere initial bundle |
| Safe-area-insets toevoegen (`env(safe-area-inset-*)`) | iPhone notch support |

---

## 6. Prioriteit roadmap

### Fase 1 — Quick Wins (1-2 sprints)

| Item | Type | Moeite |
|------|------|--------|
| Safe-area-insets voor notch-telefoons | CSS | Klein |
| Loading skeletons (shimmer) voor gallery, matches, dashboard | Component | Midden |
| ActivityFeed items klikbaar maken (link naar match) | Fix | Klein |
| Time-relative labels ("over 2 dagen") | Utility | Klein |
| Onboarding wizard (4 stappen) | Feature | Midden |

### Fase 2 — Gamification Core (2-3 sprints)

| Item | Type | Moeite |
|------|------|--------|
| Match Readiness Score (progress ring op match-kaart) | Feature | Midden |
| Content Streak (dashboard widget + team pagina) | Feature | Midden |
| "Generate All" knop op match-pagina | Feature | Midden |
| Smart empty states met context-aware CTAs | UX | Midden |

### Fase 3 — Social Loop (2-3 sprints)

| Item | Type | Moeite |
|------|------|--------|
| Speler "My Wall" pagina | Feature | Groot |
| Share sheet (Instagram/TikTok/WhatsApp) | Feature | Midden |
| Push-notificatie integratie | Infra | Groot |
| Speler-notificatie bij content over hen | Feature | Klein |

### Fase 4 — Competition (2 sprints)

| Item | Type | Moeite |
|------|------|--------|
| Club Leaderboard | Feature | Midden |
| Achievement badges (10 badges) | Feature | Midden |
| Badge unlock animaties | UX | Klein |
| Weekly digest e-mail | Feature | Midden |

### Fase 5 — Polish (doorlopend)

| Item | Type | Moeite |
|------|------|--------|
| Micro-animaties (page transitions, favorite bounce) | UX | Midden |
| Offline-first (service worker, cache) | Infra | Groot |
| Component refactor (split grote bestanden) | Tech debt | Groot |
| Accessibility (ARIA, focus-trap, keyboard nav) | UX | Groot |
| Long-press context menu op gallery items | UX | Klein |

---

## 7. Vervolgstappen

### Direct (deze sprint)

- [ ] **Besluit nemen** over Fase 1 scope — welke quick wins eerst?
- [ ] **Safe-area-insets** toevoegen aan CSS (30 min werk, grote impact op iPhone)
- [ ] **ActivityFeed klikbaar** maken (1-2 uur, hoge UX waarde)
- [ ] **Onboarding flow** specificeren: welke 4 stappen exact? Welke data opslaan?

### Kort termijn (volgende sprint)

- [ ] **Match Readiness Score** data-model ontwerpen — waar wordt de score berekend? Frontend-only of backend aggregatie?
- [ ] **Streak logica** ontwerpen — wat telt als "basis content"? Configureerbaar per club?
- [ ] **"Generate All" preset** definiëren — welke types per default? Per team configureerbaar?
- [ ] **Design mockups** maken voor readiness ring, streak widget, leaderboard

### Middellang termijn

- [ ] **Backend API endpoints** voor gamification data (readiness, streak, leaderboard)
- [ ] **Speler "My Wall"** specificeren — welke content zichtbaar? Privacy-overwegingen?
- [ ] **Share-integratie** onderzoeken — Web Share API vs. deep links vs. clipboard
- [ ] **Push-notificaties** infra kiezen — Firebase Cloud Messaging? OneSignal?

---

## 8. Open vragen — Beantwoord

### Product / Strategie

**1. Wie is de primaire gebruiker op mobiel?**
> **Antwoord:** De coach / team-beheerder die content maakt. Doordeweeks wordt meer op desktop gewerkt (beheer, uploads, settings). Maar matchday content (goal updates, lineup video's, score updates) wordt **op mobiel** gemaakt — live tijdens de wedstrijd.
>
> **Implicatie:** Mobiele UX moet geoptimaliseerd zijn voor snelheid en één-hand-bediening. Grote knoppen, minimal taps, vooraf ingevulde data. De "Generate All" en readiness-score features zijn daarom extra belangrijk.

**2. Moet de app een PWA worden?**
> **Antwoord:** Nee, het blijft een webapplicatie.
>
> **Implicatie:** Geen service worker / offline-first. Focus op responsive mobile web. Push-notificaties lopen via e-mail + in-app, niet via browser push.

**3. Wat is de monetization-impact van gamification?**
> **Antwoord:** Het model is credits-based. Verschillende credit-packages (bijv. starter/pro/premium), en per content-type betaal je credits afhankelijk van de kosten (video duurder dan image). Gamification is gratis — het drijft credits-verbruik aan.
>
> **Implicatie:** Streaks en readiness-scores stimuleren meer content-generatie → meer credits-verbruik → meer revenue. Gamification is een retention-driver, niet een revenue-feature. Zie ook **B36 (Payment Gateway Adapters)** in de roadmap voor Stripe/PayPal integratie.

**4. Hoe belangrijk is de speler-ervaring?**
> **Antwoord:** Spelers zijn vooral "assets" in de content (hun foto's, data). Het hoeft niet per speler bijgehouden te worden. Focus op team/club-niveau.
>
> **Implicatie:** "My Wall" voor spelers is low priority. Gamification (streaks, leaderboard, badges) moet op **team/club-niveau** zitten, niet per individuele speler. De speler-rol in de app kan minimaal blijven.

**5. Moeten we Instagram/TikTok API-integratie bouwen?**
> **Antwoord:** Ja, komt later. Zie geplande modules.
>
> **Relevante planned modules:**
> - **B54 (Social Media Publishing)** — Direct publishing naar Instagram, TikTok, X, Facebook, YouTube. OAuth-flow, platform-adapters, scheduling integratie.
> - **B59 (Multi-Format Export)** — Platform-specifieke export formats (Stories 9:16, Feed 1:1, Reels, etc.). Smart cropping, batch export.
> - **B50 (Scheduled Publishing)** — Inplannen op optimale tijden.
>
> **Conclusie:** De share-functionaliteit voor nu = Web Share API / clipboard. De echte integratie komt via B54.

### Technisch

**6. Readiness Score: client-side of server-side?**
> **Antwoord:** We hebben al een server via Railway — wat is het verschil?
>
> **Uitleg:** Client-side = de frontend berekent de score door de content-items te tellen die je al hebt. Voordeel: snel te bouwen, geen API-wijziging. Nadeel: kan niet in push-notificaties of weekly digests gebruikt worden.
>
> Server-side = een Django endpoint `/api/v1/matches/{id}/readiness/` berekent de score. Voordeel: herbruikbaar voor notificaties, digests, leaderboards.
>
> **Aanbeveling:** Start client-side (snelst te bouwen), migreer later naar server-side wanneer B56 (Match Calendar) en notificatie-triggers nodig zijn.

**7. Streak data: waar opslaan?**
> **Antwoord:** Ja, misschien een extra module in planned.
>
> **Voorstel nieuwe module:** `B60 – Gamification Engine` (Phase 14/15):
> - `TeamStreak` model: team FK, current_streak, longest_streak, last_match_date
> - `MatchReadiness` model: match FK, score (0-100), content_types_completed (JSON)
> - `ClubLeaderboard` aggregatie: per seizoen, auto-update bij content-creatie
> - `Achievement` model: badge definitions + user/team unlock tracking
> - API: `/api/v1/gamification/streaks/`, `/api/v1/gamification/leaderboard/`, `/api/v1/gamification/achievements/`
> - Integraties: B39 (activities), B34 (generation), B17 (notifications), B11 (credits)

**8. Performance budget / Lighthouse targets?**
> **Antwoord:** Is dat best practice? Moet dan extra module komen in planned.
>
> **Ja, het is best practice.** Google's Core Web Vitals zijn de standaard:
> - **LCP** (Largest Contentful Paint): < 2.5s
> - **FID** (First Input Delay): < 100ms
> - **CLS** (Cumulative Layout Shift): < 0.1
> - **TTI** (Time to Interactive): < 3.8s op 4G
>
> **Relevante planned module:** **P05 (Stack & Dependency Validation)** raakt hier deels aan. Maar een dedicated **F16 – Performance Monitoring & Budgets** module zou beter zijn:
> - Lighthouse CI in pipeline
> - Bundle size budget (< 250KB gzipped)
> - Performance dashboard in staging
> - Mobile-specific targets (Moto G4 / Galaxy A-serie)

**9. Component refactor nu of later?**
> **Antwoord:** Ja, refactoren is beter.
>
> **Plan:**
> - `MatchDetailPage.tsx` (3300 regels) → split in `MatchOverviewTab`, `MatchContentTab`, `MatchLineupTab`, `MatchTransactionsTab`
> - `ContentGenerationModal.tsx` (4800 regels) → split in `GenerationTypeStep`, `GenerationTemplateStep`, `GenerationMembersStep`, `GenerationConfirmStep`, `GenerationLoadingStep`
> - Doe dit **vóór** gamification-features implementeren (dezelfde bestanden worden geraakt)

**10. Welke analytics hebben we?**
> **Antwoord:** Kijk in planned — is dat al iets?
>
> **Ja! B49 (Feature Usage Analytics)** staat al gepland:
> - `AnalyticsEvent` model met event_name, properties, user/org/project context
> - Event categories: page views, features, funnels, engagement
> - Aggregatie-modellen: DailyFeatureUsage, FunnelConversion, UserEngagement
> - Privacy-compliant met opt-out support
>
> **B49 zou vóór gamification moeten komen** — anders bouwen we features zonder te weten of ze werken. Verplaats B49 naar eerdere fase.

### Design

**11. Design system uitbreiding nodig?**
> **Antwoord:** Ja, denk het wel.
>
> **Relevante planned modules:**
> - **F08 (Data Visualization Components)** — Charts, metric cards, dashboard layouts (recharts/Chart.js). Perfect voor readiness rings, streak grafieken, leaderboard bars.
> - **F15 (Frontend Form Components)** — Geavanceerde form patterns.
>
> **Nieuwe componenten nodig voor gamification:**
> - `ProgressRing` — circulaire readiness score (SVG based)
> - `StreakBadge` — vuur-icoon met teller
> - `LeaderboardRow` — ranking bar met team-info + progress
> - `AchievementCard` — badge unlock met animatie
> - `ConfettiOverlay` — celebration animatie bij badge-unlock
>
> Deze zouden in het bestaande design system pakket (`@django-core/design-system`) passen.

**12. Donkere modus?**
> **Antwoord:** Moet wel werken in dark mode.
>
> **Impact:** Alle gamification-componenten moeten CSS variables gebruiken (`var(--app-text)`, `var(--app-surface)`, etc.) — hetzelfde patroon als de rest van de app. Geen hardcoded kleuren. De progress rings, streak flames, en badges moeten in beide themes getest worden.

**13. Animatie-library?**
> **Antwoord:** Best practice toepassen.
>
> **Bestaande basis:** Het design system (F05) gebruikt al CSS transitions (250ms fade) met `prefers-reduced-motion` respect. Dit is de juiste foundation.
>
> **Aanbeveling per use case:**
>
> | Use case | Technologie | Waarom |
> |----------|------------|--------|
> | Page transitions | CSS `@view-transition` of Framer Motion `AnimatePresence` | Natief, geen extra bundle |
> | Micro-interacties (favorite, tap) | CSS `@keyframes` + `transition` | Simpel, performant, al in codebase |
> | Badge unlock / confetti | **Lottie** (via `lottie-web`, ~50KB) | Complexe animaties, designer-friendly |
> | Progress ring animatie | SVG `stroke-dashoffset` + CSS transition | Lightweight, geen library nodig |
> | Skeleton loading | CSS `@keyframes shimmer` | Al best practice, geen dependency |
>
> **Conclusie:** Geen grote library toevoegen. CSS transitions + SVG voor 90% van de cases. Lottie alleen voor confetti/badge-unlock (laad dit lazy). Respecteer altijd `prefers-reduced-motion`.

---

## 9. Samenvatting besluiten

| Besluit | Keuze |
|---------|-------|
| Primaire mobiele gebruiker | Coach / team-beheerder op matchday |
| PWA | Nee — responsive webapplicatie |
| Monetization | Credits-based, gamification drijft verbruik |
| Speler-ervaring | Minimaal — focus op team/club-niveau |
| Social integratie | Nu: Web Share API. Later: B54 + B59 |
| Readiness score | Start client-side, later server-side |
| Streak opslag | Nieuwe module B60 (Gamification Engine) |
| Performance budget | Lighthouse CI — nieuwe module F16 |
| Component refactor | Ja, vóór gamification |
| Analytics | B49 eerder in roadmap plaatsen |
| Design system | Uitbreiden met ProgressRing, StreakBadge, etc. |
| Dark mode | Verplicht — CSS variables |
| Animaties | CSS transitions + SVG + Lottie (lazy) |

## 10. Nieuwe geplande modules (voorstel)

### B60 – Gamification Engine (Phase 14)

| Aspect | Beschrijving |
|--------|-------------|
| **Doel** | Team/club-level gamification: streaks, readiness scores, achievements, leaderboards |
| **Modellen** | `TeamStreak`, `MatchReadiness`, `Achievement`, `AchievementUnlock`, `ClubLeaderboard` |
| **API** | `/api/v1/gamification/streaks/`, `/leaderboard/`, `/achievements/`, `/readiness/` |
| **Integraties** | B39 (activities), B34 (generation), B17 (notifications), B11 (credits), B49 (analytics) |
| **Scope** | Backend + frontend componenten |

### F16 – Performance Monitoring & Budgets (Phase 14)

| Aspect | Beschrijving |
|--------|-------------|
| **Doel** | Lighthouse CI, bundle size budgets, Core Web Vitals monitoring |
| **Targets** | LCP < 2.5s, FID < 100ms, CLS < 0.1, TTI < 3.8s, bundle < 250KB gzip |
| **Tooling** | Lighthouse CI in GitHub Actions, performance dashboard |
| **Integraties** | P05 (dependency validation), F10 (operations dashboard) |
| **Scope** | CI/CD + dashboard |

---

*Dit document is een levend document. Updates worden bijgehouden in de commit-history.*
