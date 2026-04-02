# H4 — Beheer tab + polish

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | H1, H2, H3 |

## Doel

De Beheer tab geeft club admins toegang tot club instellingen, credits en branding configuratie. Header overflow menu wordt functioneel. Alle lopende UX/polish issues worden gefixed.

## Context

**Credits op club niveau:**
- `CreditsBalance` (org-niveau) — `GET /api/v1/credits/?organisation_id={orgId}`
- `ProjectCreditsBalance` (per team) — `GET /api/v1/credits/projects/{teamId}/`
- Club Hub toont het org-niveau saldo + overzicht per team

**Hergebruik:**
- `CreditsPage` (`demo/src/pages/config/CreditsPage.tsx`) — check of herbruikbare secties beschikbaar zijn
- Beheer-accordion patroon: zelfde als `MyTeamHubPage` Beheer tab (F24)

## Taken

### 1. Beheer tab inhoud

Sub-component: `demo/src/pages/identity/ClubBeheerTab.tsx` (< 300 regels)

Accordion-secties (zelfde patroon als Beheer tab op Team Hub):

**Sectie 1: Club instellingen**
- [ ] Club naam bewerken
- [ ] Club beschrijving bewerken
- [ ] Club sport instellen (FK naar Sport)
- [ ] Opslaan via `PATCH /projects/{clubId}/`
- [ ] Inline validatie + Toast bij succes

**Sectie 2: Teams beheren**
- [ ] Lijst van alle teams (compact — naam + "Ga naar team →" link)
- [ ] "Team toevoegen" knop (als beschikbaar in API)
- [ ] Verwijzing naar Teams tab voor volledig overzicht

**Sectie 3: Credits**
- [ ] Org-niveau saldo: `GET /api/v1/credits/?organisation_id={orgId}` → `current_balance`
- [ ] Overzicht per team: lijst van team-namen + `ProjectCreditsBalance.current_balance`
- [ ] "Credits bijkopen →" link naar `CreditsPage` van de org
- [ ] Read-only voor viewers; zichtbaar voor alle rollen (transparantie)

**Sectie 4: Branding preview**
- [ ] Compact overzicht van ingekochte branding configuratie
- [ ] Link naar volledige Assets tab voor upload/wijzigen

### 2. Header overflow menu functioneel

- [ ] **"Bewerken"**: opent club instellingen sheet of scrollt naar Beheer tab sectie 1
- [ ] **"Bekijken"**: navigeert naar publiek club profiel (als dat bestaat)
- [ ] **"Delen"**: kopieert club URL naar clipboard + Toast "Link gekopieerd"

### 3. Active context voor club hub

Wanneer de club hub geopend is:
- [ ] `setActiveContext('club', clubId)` bij mount (zodat bottom nav consistentie heeft)
- [ ] Bottom nav "Mijn Club" link (als die bestaat) navigeert naar Club Hub

### 4. Sub-component extractie

| Nieuw bestand | Inhoud | Max regels |
|--------------|--------|-----------|
| `ClubBeheerTab.tsx` | Beheer tab accordions | 300 |
| `ClubCreditsSection.tsx` | Credits overzicht (org + per team) | 100 |

### 5. Styling + polish
- [ ] Beheer-accordion: zelfde visuele stijl als Team Hub beheer tab
- [ ] Credits sectie: `var(--app-success)` voor positief saldo, `var(--app-warning)` bij laag saldo
- [ ] Alle `var(--app-*)` semantische tokens — geen primitives
- [ ] `navigateToTab()` helper voor alle interne links

## Verificatie

- [ ] Beheer tab: club instellingen bewerkbaar + opslaan werkt
- [ ] Credits sectie: org-saldo + per-team overzicht zichtbaar
- [ ] Header "Bewerken" → club instellingen
- [ ] Header "Delen" → clipboard + Toast
- [ ] Active context: `setActiveContext('club', ...)` bij mount
- [ ] `npx tsc --noEmit` clean
