# Roadmap #27 — Engagement Features (Premium App)

> **Status:** ✅ Afgerond
> **Start:** 2026-03-18
> **Scope:** `demo/src/pages/activities/match-detail/`, `demo/src/components/dashboard/`, `demo/src/components/ContentShareSheet/`, `demo/src/hooks/`, `demo/src/utils/`

## Doel

Vier high-ROI engagement features toevoegen aan de premium app die het dagelijks gebruik verhogen, content-output maximaliseren en het delen van content frictionless maken. Samen maken deze features de app "sticky": coaches en content-beheerders komen vaker terug, genereren meer content, en delen het actiever.

## Huidige staat

### Wat werkt ✅
- **Content generatie** per individueel subtype via `MatchContentTab` → `handleGenerate()` → `ContentGenerationModal`
- **ReadinessRing** SVG component bestaat al (`ReadinessRing.tsx`) — gebruikt op ActiveMatchCard (size 48), MatchesCard (size 32), UpcomingMatchesCard (size 32), NextMatchHero (size 72, inline variant)
- **ShareButton** component bestaat al — native `navigator.share()` op mobile, clipboard fallback op desktop, optionele QR-code modal. Gebruikt op 6+ pagina's (MyTeamHub, MatchDetail, TeamPage, ClubPage, SeasonPage, OrganisationPage)
- **Content sharing** via `navigator.share({ files })` bestaat al in `MatchContentComponents.tsx` — kan daadwerkelijke bestanden delen (niet alleen URL's)
- **Match readiness berekening** in ActiveMatchCard: telt enabled CONTENT_TYPES vs `contentDoneSubtypes`, exclusief disabled items en goals zonder score

### Wat ontbreekt / niet klopt ❌
- **Geen batch-generatie**: gebruiker moet per subtype individueel klikken (5-7 klikken voor volledige match) → friction, onvolledig gebruik
- **Readiness ring** alleen op dashboard-kaarten, **niet** op match detail page header — daar mis je visuele voortgang tijdens het genereren
- **Geen streak-concept**: geen motivatie om elke wedstrijd content compleet te maken → inconsistent gebruik
- **Share = alleen URL's**: ShareButton deelt pagina-links, niet de gegenereerde content zelf (beelden/video's). Content-delen zit verspreid met inline `navigator.share({ files })` code, geen uniforme flow

## Design beslissingen

| Vraag | Besluit |
|-------|--------|
| Batch generatie: synchroon of async? | **Sequentieel async** — één voor één in de queue plaatsen via bestaande `handleGenerate()` flow. Progress-indicator toont "2 van 5 bezig…". Niet parallel om API niet te overbelasten. |
| Batch: alle subtypes of selecteerbaar? | **Alle enabled subtypes** van de huidige fase (pre/during/post_match). Optioneel: preset per team in toekomst (H1). Eerste versie = "alles wat kan". |
| Readiness ring op match detail: waar? | **Match detail page header** naast de score/teams — consistent met ActiveMatchCard design. Zelfde `ReadinessRing` component, size 56. |
| Streak: welke content telt? | **Minimale set:** flyer + lineup + eindstand. Als die 3 er zijn voor een wedstrijd = "complete". Aanpasbaar later. |
| Streak: hoe berekenen? | **Client-side** — loop door matches chronologisch, tel achtereenvolgende matches met complete base-content. Geen backend nodig in eerste fase. |
| Share sheet: bottom sheet of native API? | **Bottom sheet component** (`ContentShareSheet`) met platform-knoppen: WhatsApp, Instagram Story, Download, Kopieer Link. Op mobile devices met Web Share API: native share als fallback. |
| Share sheet: URL of bestanden? | **Bestanden** waar mogelijk via `navigator.share({ files })`. Fallback: download-link. URL-sharing als secundaire optie. |

## Fasering

### H0 — "Genereer Alles" knop
> **Effort:** 2–3 dagen | **Impact:** Elimineert 5-7 klikken per wedstrijd → hogere content-output, betere readiness scores

**Context:**
- `MatchContentTab.tsx` heeft `handleGenerate(subtype, label)` per subtype
- `CONTENT_TYPES` in `constants.ts` definieert alle subtypes met `enabled` flag
- `resolveTemplate(subtype)` zoekt best passend template
- Content generatie gaat via `openContentModal(template, label)` → API call

**To do:**
- [ ] **Batch generate functie** in `MatchContentTab.tsx`:
  - `handleGenerateAll()` — itereert alle enabled subtypes die nog niet `done` zijn
  - Sequentieel: roept `resolveTemplate()` + `openContentModal()` aan per subtype
  - Skip subtypes die al gegenereerd zijn (check `contentDoneSubtypes`)
  - Skip `goal` subtype als er geen score is
- [ ] **"Genereer Alles" FAB/button** — prominent bovenaan `MatchContentTab`:
  - Label: "Genereer alles" met `Sparkles` icon
  - Disabled state als alles al gegenereerd is
  - Badge met count: "5 items" (hoeveel er worden gegenereerd)
- [ ] **Batch progress UI**:
  - Progress bar of stepper: "Flyer genereren… (1 van 5)"
  - Elke voltooide stap toont ✓
  - Annuleer-knop om de queue te stoppen
  - Eindmelding: "5 van 5 klaar!" met confetti-micro-animatie (optioneel)
- [ ] **Error handling**:
  - Als één subtype faalt → toon fout, ga door met de rest
  - Na afloop: samenvatting van successen en fouten
- [ ] **Toegankelijkheid**:
  - `aria-live="polite"` region voor progress updates
  - Button: duidelijk `aria-label` met count
  - Focus management: na completion terug naar de content lijst
- [ ] **CSS**: `MatchContentTab.module.css` uitbreiden met `.generateAllBar`, `.progressStepper` op design tokens

**Done criteria:**
- [ ] Eén klik genereert alle openstaande content voor een wedstrijd
- [ ] Progress wordt live bijgewerkt
- [ ] Already-done subtypes worden overgeslagen
- [ ] Error in één subtype stopt niet de rest
- [ ] Knop is disabled als alles al klaar is
- [ ] Werkt op mobile (375px) en desktop
- [ ] Geen TypeScript errors

---

### H1 — Match Readiness Ring op detail pagina
> **Effort:** 1 dag | **Impact:** Real-time visuele feedback tijdens content-generatie op de match pagina zelf

**Context:**
- `ReadinessRing` component bestaat al met props: `percent`, `size`, `strokeWidth`, `showLabel`
- Kleuring: rood < 30%, amber 30–70%, groen > 70%
- Readiness berekening bestaat al in `ActiveMatchCard.tsx` (telt enabled subtypes vs done)
- `ReadinessRing` wordt al gebruikt op: ActiveMatchCard (48px), MatchesCard (32px), UpcomingMatchesCard (32px), NextMatchHero (72px inline)
- **Niet** aanwezig op: match detail page header

**To do:**
- [ ] **Readiness berekening extraheren** naar shared utility:
  - `calculateMatchReadiness(contentDoneSubtypes, match)` → `{ percent, done, total }`
  - Hergebruik dezelfde logica uit ActiveMatchCard (excludedFromReadiness set, etc.)
  - Export vanuit `demo/src/utils/matchReadiness.ts` (nieuw bestand)
- [ ] **ReadinessRing toevoegen aan match detail header**:
  - `MatchDetailPage.tsx` of `MatchDetailHeader` — ring naast de score/teams
  - Size: 56px met label
  - Real-time update: als content wordt gegenereerd (via `contentDoneSubtypes` refetch)
- [ ] **Refactor bestaande readiness berekeningen**:
  - ActiveMatchCard → gebruik `calculateMatchReadiness()` utility
  - MatchesCard → idem
  - UpcomingMatchesCard → idem
  - NextMatchHero → idem (vervang inline variant door geïmporteerde `ReadinessRing`)
- [ ] **Animatie bij percentage-wijziging**:
  - CSS transition op `stroke-dashoffset` (al aanwezig via `readinessRingProgress` class)
  - Verifieer dat `prefers-reduced-motion` check werkt
- [ ] **Toegankelijkheid**: `aria-label` updaten naar "Wedstrijd gereedheid: X% (Y van Z items)"

**Done criteria:**
- [ ] ReadinessRing zichtbaar op match detail page header
- [ ] Berekening is consistent op alle plekken (één utility)
- [ ] Ring animeert smooth bij percentage-change
- [ ] Werkt op mobile en desktop
- [ ] NextMatchHero gebruikt gedeelde `ReadinessRing` component (geen inline duplicate)
- [ ] Geen TypeScript errors

---

### H2 — Content Streak
> **Effort:** 2–3 dagen | **Impact:** Gamification-motivatie — coaches willen hun streak niet breken → consistent content-gebruik

**Context:**
- Geen bestaande streak-logica in de codebase
- Matches beschikbaar via `useClosestMatch` en wedstrijden-data in seizoen
- Dashboard heeft `DashboardPage.tsx` met widgets: ActiveMatchCard, NextStepCard, MatchesCard, etc.
- MyTeamHub heeft Overview tab met team stats
- Gamification-analyse in `documents/05-demo/plans/mobile-ux-gamification-analyse.md` beschrijft streak-concept (sectie 4.3)

**To do:**
- [ ] **`useContentStreak` hook** (nieuw: `demo/src/hooks/useContentStreak.ts`):
  - Input: array van matches met hun `contentDoneSubtypes`
  - Logica: loop matches chronologisch (nieuwste eerst)
  - "Complete" definitie: flyer + lineup + end_score (of match_summary) aanwezig
  - Tel achtereenvolgende complete matches → `currentStreak`
  - Trek ook `longestStreak` en `nextMatchComplete` (boolean) eruit
  - Return: `{ currentStreak, longestStreak, nextMatchComplete, isAtRisk }`
  - `isAtRisk`: volgende wedstrijd is binnen 48u en nog niet complete → streak dreigt te breken
- [ ] **`ContentStreakWidget` component** (nieuw: `demo/src/components/dashboard/ContentStreakWidget.tsx`):
  - Compact widget voor dashboard en team hub
  - Toont: 🔥 icoon (Flame van Lucide) + streak getal + "wedstrijden op rij"
  - Kleur: goud bij streak ≥ 3, rood-oranje pulse bij `isAtRisk`
  - Milestone badges: 3🔥, 5🔥, 10🔥 met subtiele animatie
  - Als streak = 0: motiverende tekst "Start je streak! Genereer alle content voor de volgende wedstrijd."
- [ ] **Dashboard integratie** (`DashboardPage.tsx`):
  - `ContentStreakWidget` toevoegen tussen ActiveMatchCard en NextStepCard
  - Conditionally render: alleen tonen als er ≥2 gespeelde wedstrijden zijn in het seizoen
- [ ] **Team Hub integratie** (`MyTeamHubPage.tsx`):
  - Streak indicator in de Overview tab, onder de team hero
  - Compactere variant dan dashboard
- [ ] **"Streak at risk" nudge**:
  - Als `isAtRisk`: AccentCard / banner op dashboard: "⚠️ Je streak van X dreigt te breken! Genereer content voor [wedstrijd]."
  - CTA-link naar de match content tab
- [ ] **CSS**: `ContentStreakWidget.module.css` op design tokens, `@keyframes` voor pulse en milestone animatie
- [ ] **Toegankelijkheid**:
  - Widget: `role="status"`, `aria-live="polite"`
  - Streak getal: `aria-label="Content streak: X wedstrijden op rij"`
  - Animaties respecteren `prefers-reduced-motion`

**Done criteria:**
- [ ] Streak wordt correct berekend uit match-data
- [ ] Widget toont op dashboard en team hub
- [ ] "At risk" waarschuwing verschijnt wanneer streak dreigt te breken
- [ ] Milestone visueel onderscheid bij 3, 5, 10
- [ ] Streak = 0 toont motiverende tekst
- [ ] Werkt op mobile (375px) en desktop
- [ ] Geen TypeScript errors, geen `any` types

---

### H3 — Content Share Sheet
> **Effort:** 2–3 dagen | **Impact:** Frictionless delen → meer bereik voor de club, hogere perceived value van de app

**Context:**
- `ShareButton.tsx` deelt alleen URL's (pagina-links) — niet de content zelf
- `MatchContentComponents.tsx` heeft inline `navigator.share({ files })` code voor file-sharing
- `ContentLibraryPage.tsx` en `StudioCards.tsx` hebben ook inline `handleShare` functies
- Content items hebben `file_url` (S3 URL) en soms `thumbnail_url`
- Web Share API level 2 (`navigator.share({ files })`) wordt ondersteund op iOS Safari 15+ en Android Chrome 93+

**To do:**
- [ ] **`ContentShareSheet` component** (nieuw: `demo/src/components/ContentShareSheet/`):
  - Bottom sheet (slide-up modal) met deel-opties
  - Props: `isOpen`, `onClose`, `contentUrl` (S3 file URL), `contentTitle`, `contentType` (image/video), `pageUrl` (share URL fallback)
  - **Opties:**
    1. **WhatsApp** — `https://wa.me/?text={title}+{url}` deeplink (of native share op mobile)
    2. **Instagram Story** — download + instructie-overlay ("Open Instagram → Voeg toe aan Story")
    3. **Download** — directe download van het bestand via `fetch` + `blob` + `a.download`
    4. **Kopieer Link** — kopieert pagina-URL naar clipboard + toast
    5. **Meer…** — native `navigator.share({ files })` als beschikbaar
  - Slide-up animatie, backdrop blur, drag-to-dismiss
- [ ] **`ContentShareSheet.module.css`**:
  - Bottom sheet styling op design tokens
  - Grid van deel-opties met iconen
  - Responsive: bottom sheet op mobile, centered modal op desktop
  - `@starting-style` / transition voor slide-up
- [ ] **Integratie in bestaande flows**:
  - `MatchContentComponents.tsx` → vervang inline `handleShare` door `ContentShareSheet`
  - `ContentLibraryPage.tsx` → `ContentCard` share actie opent sheet
  - `StudioCards.tsx` → share actie opent sheet
  - `GalleryMatchTimelineContent.tsx` → match share actie
- [ ] **File download utility** (nieuw: `demo/src/utils/downloadFile.ts`):
  - `downloadFile(url, filename)` — fetch → blob → object URL → trigger download
  - Handles CORS via proxy als nodig
  - Progress callback voor grote bestanden
- [ ] **Toegankelijkheid**:
  - Sheet: `role="dialog"`, `aria-modal="true"`, `aria-label="Deel content"`
  - Focus trap binnen sheet
  - Escape sluit sheet
  - Alle opties keyboard-navigeerbaar
  - Elke optie: duidelijk `aria-label`
- [ ] **Analytics-ready**:
  - Data attributen voor toekomstig tracking: `data-share-platform`, `data-content-type`
  - Callback prop `onShareComplete(platform)` voor parent components

**Done criteria:**
- [ ] Bottom sheet opent met deel-opties bij share-actie op content
- [ ] WhatsApp deeplink werkt op mobile
- [ ] Download functie werkt voor images en video's
- [ ] Kopieer link + toast feedback
- [ ] Native share met bestanden werkt op ondersteunde devices
- [ ] Sheet is volledig accessible (focus trap, keyboard, screen reader)
- [ ] Geïntegreerd in MatchContentComponents, ContentLibrary, StudioCards
- [ ] Responsive: bottom sheet mobile, modal desktop
- [ ] Geen TypeScript errors

---

### H4 — Polish, testen & optimalisatie
> **Effort:** 1–2 dagen | **Impact:** Productie-klaar, consistent, geen regressies

**To do:**
- [ ] **Cross-feature integratie**:
  - "Genereer Alles" voltooiing → ReadinessRing animate naar 100% → streak update
  - Share sheet beschikbaar direct na generatie ("Deel je content!" CTA)
  - Streak widget linkt naar match met "Genereer Alles" als actie
- [ ] **Performance**:
  - `useContentStreak` memo-izen (alleen herberekenen bij match-data change)
  - Lazy load `ContentShareSheet` (React.lazy)
  - ReadinessRing: geen re-renders bij ongewijzigd percentage
- [ ] **E2E test scenarios** (Playwright):
  - Genereer Alles flow: klik → progress → completion
  - ReadinessRing update na generatie
  - Streak widget toont correcte waarde
  - Share sheet opent en sluit correct
  - Mobile responsive checks (375px)
- [ ] **Unit tests**:
  - `calculateMatchReadiness()` — edge cases (0 items, all done, goals logic)
  - `useContentStreak` — 0, 1, 5 streak, at-risk scenario
  - `downloadFile()` — success, error handling
- [ ] **Build verificatie**: `npx tsc --noEmit` + `npx vite build`
- [ ] **Bundle impact**: vergelijk bundle size voor en na

**Done criteria:**
- [ ] Alle 4 features werken samen zonder conflicten
- [ ] E2E tests passeren
- [ ] Unit tests voor nieuwe utilities en hooks
- [ ] Build passes clean
- [ ] Bundle size groei < 15KB (gzipped)
- [ ] Geen nieuwe `any` types

## Acceptatiecriteria (geheel)

- [ ] **Genereer Alles**: één klik genereert alle openstaande match-content
- [ ] **Readiness Ring**: zichtbaar op match detail header, consistent met dashboard
- [ ] **Content Streak**: widget op dashboard en team hub, at-risk waarschuwing
- [ ] **Share Sheet**: bottom sheet met WhatsApp, Instagram, Download, Kopieer, native share
- [ ] Alle features werken op mobile (375px) en desktop (1024px+)
- [ ] Alle interactive elementen accessible (keyboard + screen reader)
- [ ] Geen nieuwe `any` types
- [ ] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [ ] Readiness berekening is één gedeelde utility (geen duplicatie)
- [ ] Content streak berekening is client-side, geen extra API calls
- [ ] Share sheet vervangt alle inline `navigator.share` code → één consistent patroon
