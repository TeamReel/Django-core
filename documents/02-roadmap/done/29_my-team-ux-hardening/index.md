# Roadmap #29 — My Team UX Hardening

> **Status:** 🚧 In uitvoering
> **Start:** 2026-03-18
> **Scope:** `demo/src/pages/identity/detail/`, `demo/src/components/Governance/`, `demo/src/pages/identity/TeamOrganisationDetailPage.tsx`

## Doel

Nederlandse vertalingen doorvoeren in Credits/Governance UI, empty-state tabs verrijken met iconen, en technische schuld in hooks oplossen (AbortController, page-unificatie).

## Huidige staat

### Wat werkt ✅
- Credits balance + transactions tab werkt functioneel
- GovernanceSummaryCard toont policy data correct
- Wedstrijden/Media empty-state tabs bestaan (roadmap #28)
- Duplicate credits fetch opgelost (roadmap #28)

### Wat ontbreekt / niet klopt ❌
- 20+ Engelse strings in TeamCreditsTab en GovernanceSummaryCard (moet NL zijn)
- Datum-formatting in credits timeline gebruikt `en-US` locale i.p.v. `nl-NL`
- Empty-state tabs (Wedstrijden/Media) zijn kale tekst zonder icoon/illustratie
- `useTeamCreditsData` mist AbortController → stale state bij snelle tab-switches
- `TeamOrganisationDetailPage` en `MyTeamHubPage` zijn twee aparte componenten voor hetzelfde team → duplicatie

## Design beslissingen

| Vraag | Besluit |
|-------|--------|
| i18n library nodig? | Nee — hardcoded NL strings, consistent met rest van de app |
| Empty-state iconen: Lucide of custom SVG? | Lucide — al beschikbaar, gebruikt door `SmartEmptyState` |
| Page-unificatie scope? | Alleen analyse + plan in H2 — implementatie is apart roadmap |
| GovernanceSummaryCard NL of tweetalig? | NL — admin-only component, doelgroep is NL |

## Fasering

### H0 — Nederlandse vertalingen Credits Tab
> **Effort:** 30 min | **Impact:** Consistent NL-talige UI voor credits/governance

**To do:**
- [ ] `TeamCreditsTab.tsx` — Vertaal alle Engels naar NL:
  - "Refresh" → "Vernieuwen"
  - "Loading balance…" → "Balans laden…"
  - "Your Credits Balance" → "Jouw tegoed"
  - "credits" → "credits" (blijft, is universeel)
  - "Charged to your account" → "Afgeschreven van jouw account"
  - "{Team} Credits Balance" → "{Team} tegoed"
  - "Last updated" → "Laatst bijgewerkt"
  - "Transaction Timeline" → "Transactie-overzicht"
  - "Loading transactions…" → "Transacties laden…"
  - "No transactions recorded yet." → "Nog geen transacties."
  - "Showing 10 of {n} transactions" → "10 van {n} transacties"
  - "Recent Activity" → "Recente activiteit"
  - "No recent activity." → "Geen recente activiteit."
  - "No transactions found for this team." → "Geen transacties gevonden voor dit team."
  - "➕ Total Added" → "➕ Totaal bijgeschreven"
  - "➖ Total Used" → "➖ Totaal gebruikt"
  - "{n} transactions loaded" → "{n} transacties geladen"
  - "Team Transactions" → "Team transacties"
  - "Showing {n} most recent entries" → "{n} meest recente transacties"
  - Table headers: "Time" → "Tijd", "Type" → "Type", "Amount" → "Bedrag", "Notes" → "Notities", "User" → "Gebruiker"
- [ ] Date formatting `en-US` → `nl-NL` locale in timeline
- [ ] `GovernanceSummaryCard.tsx` — Vertaal alle Engels naar NL:
  - "Governance (Org policies)" → "Governance (organisatiebeleid)"
  - "Balance policy applies to…" → "Balansbeleid geldt voor teamtegoed en wedstrijdtransacties."
  - "Org governance" → "Organisatie governance"
  - "Preferences" → "Voorkeuren"
  - "Routing logs" → "Routeringslogboek"
  - "Loading balance policy…" → "Balansbeleid laden…"
  - "No explicit balance policy found…" → "Geen expliciet balansbeleid gevonden. De backend valt terug op een veilige standaard."
  - "Balance policy" → "Balansbeleid"
  - "Project override" → "Project-override"
  - "Organisation default" → "Organisatie-standaard"
  - "Platform default" → "Platform-standaard"
  - "Mode: Postpaid (can go negative)" → "Modus: Postpaid (kan negatief worden)"
  - "Mode: Prepaid (no negative balance)" → "Modus: Prepaid (geen negatief saldo)"
  - "Warn threshold" → "Waarschuwingsdrempel"
  - error fallback "Failed to load governance policy" → "Kan governance-beleid niet laden"

**Done criteria:**
- [ ] Geen Engelse tekst meer zichtbaar in Credits balance/transactions views
- [ ] GovernanceSummaryCard volledig NL
- [ ] Datum in timeline toont NL-formaat (bijv. "18 mrt" i.p.v. "Mar 18")
- [ ] Build & tsc pass

### H1 — Empty-state tabs met iconen
> **Effort:** 15 min | **Impact:** Visueel aantrekkelijkere lege tabs

**To do:**
- [ ] `TeamOrganisationDetailPage.tsx` — Voeg Lucide iconen toe aan empty states:
  - Wedstrijden: `Calendar` icoon
  - Media: `Layers` icoon
- [ ] Optioneel: overweeg `SmartEmptyState` component hergebruiken als het past

**Done criteria:**
- [ ] Wedstrijden empty state toont kalender-icoon boven tekst
- [ ] Media empty state toont media-icoon boven tekst
- [ ] Iconen volgen design-token kleuren (geen hardcoded hex)
- [ ] Build & tsc pass

### H2 — AbortController in useTeamCreditsData
> **Effort:** 20 min | **Impact:** Voorkomt stale state bij snelle tab-switches

**To do:**
- [ ] `useTeamCreditsData.ts` — Voeg AbortController toe aan:
  - `fetchBalance()` — cancel in-flight request bij unmount/re-run
  - `fetchUserBalance()` — idem
  - `fetchTransactionsList()` — idem
- [ ] Cleanup-return in useEffect die AbortController.abort() aanroept

**Done criteria:**
- [ ] Snelle tab-switches produceren geen stale state updates
- [ ] Geen "setState on unmounted component" console warnings
- [ ] Build & tsc pass

### H3 — Page-unificatie analyse (geen code)
> **Effort:** 15 min | **Impact:** Voorbereiding op toekomstige refactor

**To do:**
- [x] Analyseer overlap tussen `TeamOrganisationDetailPage` en `MyTeamHubPage`
- [x] Documenteer welke props/hooks gedeeld worden en welke uniek zijn
- [x] Schrijf een korte plan-paragraaf in dit document met de aanbevolen unificatie-aanpak

**Analyse:**

| Aspect | `TeamOrganisationDetailPage` (279 regels) | `MyTeamHubPage` (512 regels) |
|--------|-------------------------------------------|------------------------------|
| Route | `/:org/:club/:team` (geen seizoen) | `/:org/:club/:team/:seasonId` |
| Data hooks | `useTeamDetailData` + `useTeamTabData` | `useTeamDetailData` + `useTeamTabData` + `useSeasonDetailPageData` |
| Tabs | Overview, Wedstrijden*, Media*, Selectie, Beheer | Overview, Wedstrijden, Media, Selectie, Beheer, Club |
| Header | `TeamPageHeader` | Custom header met SeasonSwitcher |
| Season data | Geen — all tabs show team-level data | Seizoensgebonden wedstrijden, leden, content |
| RBAC | `isPlayer` → 2-tabs, admin → 5-tabs | `isSupporter/isPlayer/isAdmin` → 2/4/6 tabs |
| Shared components | `TeamOverviewTab`, `TeamBeheerTab`, `MobileTabBar` | `TeamOverviewTab`, `TeamBeheerTab`, `MobileTabBar` + Season* tabs |

*Wedstrijden/Media op TeamOrgPage zijn empty states (toegevoegd in #28/#29).

**Gedeelde hooks:** Beide pages gebruiken `useTeamDetailData()` en `useTeamTabData()` identiek. De header-logica (breadcrumbs, team-switcher, overflow menu) is grotendeels hetzelfde.

**Unieke elementen MyTeamHubPage:** SeasonProvider/SeasonContext, SeasonSwitcher, ContentStreakWidget, alle Season*Tab componenten, seizoensgebonden modals.

**Aanbevolen aanpak:**
De unificatie verdient een **apart roadmap (#30+)** omdat:
1. `TeamOrganisationDetailPage` is in feite een "season-less fallback" van `MyTeamHubPage`
2. De unificatie vereist: SeasonProvider optioneel maken, conditional season tabs, en de routing in `TeamDetailPage.tsx` (`TeamSeasonRedirect`) vereenvoudigen
3. Geschatte effort: 2-4 uur voor refactor + testing
4. Risico: de routing-logica in `TeamDetailPage.tsx` is complex (slug resolution, season redirect); fout hier breekt alle team-navigatie

**Advies:** Wacht tot er een concrete feature is die beide pages raakt, dan unificeren als onderdeel van die feature.

**Done criteria:**
- [x] Analyse-sectie toegevoegd aan dit roadmap-document
- [x] Duidelijk of de unificatie een apart roadmap verdient of inline kan

## Acceptatiecriteria (geheel)
- [ ] Geen Engelse tekst meer in Credits en Governance UI
- [ ] Empty-state tabs hebben visuele iconen
- [ ] AbortController beschermt tegen stale state
- [ ] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [ ] No new `any` types
- [ ] Unificatie-analyse gedocumenteerd
