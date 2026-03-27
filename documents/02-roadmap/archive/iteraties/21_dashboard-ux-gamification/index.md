# Roadmap #21 — Dashboard UX Polish & Gamification

> **Status:** ✅ Afgerond
> **Start:** 2026-03-16
> **Scope:** `demo/src/pages/DashboardPage.tsx`, `demo/src/components/dashboard/`
> **Bron:** UX review dashboard, gebruikersfeedback

---

## Doel

Dashboard verbeteren met quick wins en premium gamification-elementen:
1. **Snel wedstrijden toevoegen** via + knop bij komende wedstrijden
2. **Ruis verwijderen** — KNVB/competitie labels die niets toevoegen weg
3. **Content pipeline** — visueel overzicht van processing → review → klaar
4. **Gamification** — seizoensvoortgang, streaks, "volgende stap" suggestie

**Kernprincipe:** Overzichtelijk en intuïtief. Geen feature-bloat, alleen elementen die actie stimuleren.

---

## Huidige staat

### Wat werkt ✅
- ActiveMatchCard met MatchSheet, ReadinessRing
- UpcomingMatchesCard met 5 wedstrijden + readiness %
- SmartActionsCard met inline events (geen navigatie)
- Match-day mode met countdown + accent styling
- Content progress card met Tabs
- Status strip (squad, credits, AI queue)

### Wat ontbreekt / niet klopt ❌

| Probleem | Impact |
|----------|--------|
| **Geen + knop bij komende wedstrijden** | Snel wedstrijd toevoegen is te veel stappen |
| **"KNVB" / period.name als label** | Ruis — voegt niets toe voor de gebruiker |
| **Geen content pipeline overzicht** | Onduidelijk wat er in de queue staat |
| **Geen seizoensvoortgang** | Geen gevoel van progressie over het seizoen |
| **Geen "volgende stap" suggestie** | Gebruiker mist guidance over wat nu belangrijk is |

---

## Fasering

### H0 — Quick UX Fixes
> **Effort:** 1-2 uur

- [ ] + Add Match knop in UpcomingMatchesCard header (Plus icon, opent quick-create event)
- [ ] Period/competition naam verbergen in MatchOverview sheet (verwijder "KNVB"-achtige labels)
- [ ] Commit als `feat(dashboard): add match button + remove competition labels`

### H1 — Content Pipeline Status
> **Effort:** 2-3 uur

- [ ] ContentPipelineCard component: horizontale status stappen
- [ ] Stappen: In wacht → In productie → Klaar voor review → Gepubliceerd
- [ ] Klikbaar: elk stap navigeert naar juiste Approvals tab
- [ ] Pulse-animatie op "Klaar voor review" als er items wachten
- [ ] Plaatsing: tussen UpcomingMatchesCard en summaryGrid
- [ ] Commit als `feat(dashboard): content pipeline status indicator`

### H2 — Season Progress & Gamification
> **Effort:** 3-4 uur

- [ ] SeasonProgressCard: seizoensvoortgang met progress bar
- [ ] Statistieken: wedstrijden gespeeld, videos gemaakt, opstellingen
- [ ] NextStepCard: AI-gestuurde "volgende stap" suggestie
- [ ] Context-aware: weet welke wedstrijd eraan komt en wat er mist
- [ ] Verdwijnt als alles klaar is → "Alles staat klaar! 🎉"
- [ ] Plaatsing: NextStepCard na header, SeasonProgress na ContentProgress
- [ ] Commit als `feat(dashboard): season progress + next step cards`

---

## Acceptatiecriteria

- [ ] + knop bij komende wedstrijden triggert match-aanmaak flow
- [ ] Geen "KNVB" of competitienaam zichtbaar in compact views
- [ ] Pipeline indicator toont real-time status van content
- [ ] Seizoensvoortgang toont % van seizoen + content stats
- [ ] "Volgende stap" toont context-aware suggestie
- [ ] TypeScript compileert zonder fouten
- [ ] Alle nieuwe componenten: CSS tokens, focus-visible, reduced-motion
- [ ] Mobile-first layout, geen horizontal overflow
