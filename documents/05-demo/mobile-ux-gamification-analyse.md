# TeamReel Mobile UX & Gamification Analyse

> **Datum:** 27 februari 2026
> **Status:** Analyse & Aanbevelingen
> **Auteur:** AI-analyse op basis van codebase audit

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

## 8. Open vragen

### Product / Strategie

1. **Wie is de primaire gebruiker op mobiel?** De coach die matchday content aanmaakt, of de speler die content bekijkt/deelt? Dit bepaalt de hele mobile-first prioriteit.

2. **Moet de app een PWA worden (installeerbaar)?** Dit unlockt push-notificaties, offline support, en homescreen-icoon. Relatief weinig extra werk.

3. **Wat is de monetization-impact van gamification?** Moeten streaks/badges gratis zijn, of zijn sommige features premium (bijv. leaderboard alleen voor betaalde clubs)?

4. **Hoe belangrijk is de speler-ervaring?** Spelers hebben nu de minste features — maar zijn potentieel de grootste viral-growth driver. Hoeveel willen we investeren in "My Wall"?

5. **Moeten we Instagram/TikTok API-integratie bouwen?** Of is clipboard/Web Share API genoeg? API-integratie is complex maar geeft betere metrics.

### Technisch

6. **Readiness Score: client-side of server-side?** Client-side is sneller te bouwen, server-side is schaalbaarder en kan in notificaties/digests gebruikt worden.

7. **Streak data: waar opslaan?** Nieuw model in backend (`TeamStreak`), of berekend op basis van bestaande content/match data?

8. **Performance budget:** Wat is het target voor Time-to-Interactive op mobiel? Huidige staat niet gemeten — moeten we Lighthouse targets stellen?

9. **Component refactor nu of later?** `MatchDetailPage` (3300 regels) en `ContentGenerationModal` (4800 regels) zijn performance-risico's. Refactoren voor gamification-features (om dezelfde bestanden heen) is efficiënter dan erna.

10. **Welke analytics hebben we?** Kunnen we meten welke features daadwerkelijk gebruikt worden? Zonder analytics bouwen we gamification blind.

### Design

11. **Design system uitbreiding nodig?** Voor badges, progress rings, streak flames, leaderboard — moeten deze nieuwe design-system componenten worden?

12. **Donkere modus:** Werken alle gamification-elementen in zowel light als dark theme?

13. **Animatie-library:** Framer Motion, CSS transitions, of Lottie voor de unlock-animaties?

---

*Dit document is een levend document. Updates worden bijgehouden in de commit-history.*
