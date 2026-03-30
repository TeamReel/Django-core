# Phase E2 -- Context Pre-fill + Smart Defaults

**Track:** E (Entry)
**Status:** Todo
**Effort:** Medium (2 sessies)
**Vereist:** E1 afgerond

---

## Doel

Maak de CreateWizard context-aware: als de gebruiker op een team-pagina staat, pre-fill automatisch organisatie + club + team. Laat alle opties zien, maar toon pre-fill als hint zodat de gebruiker met minder klikken kan aanmaken.

## Principes

- **Toon alles, pre-fill als hint** -- verberg nooit opties, maar maak de meest logische keuze evident
- **Context = suggestie, geen lock-in** -- gebruiker kan altijd wijzigen
- **Progressieve specificiteit** -- hoe dieper in de hierarchie, hoe meer pre-fill

## Context-bronnen

| Bron | Wat het oplevert | Hoe |
|------|-----------------|-----|
| URL params (useParams) | `orgSlug`, `clubId`, `teamId`, `periodId`, `activityId` | React Router params |
| SeasonProvider | Actief seizoen + competitie | Bestaande context |
| useAppSelection hook | Laatst geselecteerde org/club/team | LocalStorage-backed |
| Custom event payload | `activityId` vanuit SmartEmptyState | `teamreel:open-quick-create` detail |

## Pre-fill matrix

| Pagina | Pre-fills | Keuze-stap hint |
|--------|----------|----------------|
| Dashboard (root) | Geen | "Kies wat je wilt aanmaken" |
| Organisatie-pagina | org | "Aanmaken voor [Org naam]" |
| Club-pagina | org + club | "Aanmaken voor [Club naam]" |
| Team-pagina | org + club + team | "Aanmaken voor [Team naam]" |
| Seizoen-pagina | org + club + team + period | "Aanmaken in [Seizoen naam]" |
| Match-detail | org + club + team + period + activity | "Content voor [Tegenstander]" |

## Taken

### 1. useCreateContext hook
- [ ] `hooks/useCreateContext.ts` -- combineert alle context-bronnen tot 1 prefill-object
- [ ] Prioriteit: URL params > SeasonProvider > useAppSelection > fallback null
- [ ] Return type: `CreatePrefill` (org, club, team, period, activity -- allemaal optional)

### 2. Pre-fill doorgeven aan CreateWizard
- [ ] MobileBottomNav roept `useCreateContext()` aan
- [ ] Geeft `prefill` prop door aan `<CreateWizard prefill={...} />`

### 3. Keuze-stap hint tonen
- [ ] ChooseFlowStep toont context-hint boven de opties
- [ ] Hint laat zien welke context automatisch ingevuld wordt
- [ ] Bijv. "Heren 1 -- Eredivisie 2024/25" als badge/chip

### 4. Sub-flow pre-fill
- [ ] Elk sub-flow (match, member, team, seizoen, content) ontvangt prefill
- [ ] Velden die pre-filled zijn: tonen als read-only met "wijzig" optie
- [ ] Cascading selects: auto-selecteren op basis van pretill (geen lege dropdowns)

### 5. Custom event payload uitbreiden
- [ ] `teamreel:open-quick-create` event: voeg `flow` + `prefill` toe aan detail
- [ ] Voorbeeld: SmartEmptyState dispatcht `{ flow: 'content', prefill: { activityId } }`
- [ ] CreateWizard skip keuze-stap als `flow` meegegeven is

### 6. Verificatie
- [ ] Op dashboard: geen pre-fill, alle opties zichtbaar
- [ ] Op team-pagina: team pre-filled, hint "Aanmaken voor [Team]"
- [ ] Op match-detail: direct content flow, volledige pre-fill
- [ ] Wijzig pre-fill: cascading selects resetten correct

## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/hooks/useCreateContext.ts` |
| WIJZIG | `demo/src/components/CreateWizard/CreateWizardProvider.tsx` |
| WIJZIG | `demo/src/components/CreateWizard/steps/ChooseFlowStep.tsx` |
| WIJZIG | `demo/src/components/MobileBottomNav.tsx` |
