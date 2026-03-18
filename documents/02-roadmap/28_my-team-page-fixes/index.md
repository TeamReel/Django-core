# Roadmap #28 — My Team Page Fixes

> **Status:** 🚧 In uitvoering
> **Start:** 2026-03-18
> **Scope:** `demo/src/pages/identity/`, `demo/src/components/KitsTab/`

## Doel
Fix 5 bugs gevonden tijdens de iOS-review van de My Team pagina: breadcrumb lekt tab-params, misleidende foutmeldingen, rauwe API-URLs, en inconsistente tab-structuur tussen teams met/zonder seizoenen.

## Huidige staat
### Wat werkt ✅
- Bottom nav → My Team navigeert correct
- Tab switching werkt (Overview / Selectie / Beheer)
- Tab styling is consistent (active = filled, inactive = outline)
- Empty states tonen nette berichten met CTAs
- Mobile layout ziet er goed uit op 375×812

### Wat ontbreekt / niet klopt ❌
- **P1**: Breadcrumb "< SV Zwolle" navigeert naar `/knvb/sv-zwolle?tab=beheer` i.p.v. `/knvb/sv-zwolle`
- **P2a**: Kits-tab zegt *"Create a brand profile on the Identity tab"* — maar die tab heet "Beheer" op team-level of "Club" op hub-level
- **P2b**: Credits-tab toont rauwe API URL: `GET https://api.teamreel.app/api/v1/credits/projects/424/ failed`
- **P2c**: 403 errors (backend fix nog niet deployed op Railway — apart op te lossen via redeploy)
- **P3**: Teams MET seizoenen → MyTeamHubPage (6 tabs). Teams ZONDER seizoenen → TeamOrganisationDetailPage (3 tabs). Verschillende UX.

## Design beslissingen
| Vraag | Besluit |
|-------|--------|
| P1: Hoe fix je breadcrumb? | Strip `location.search` uit `backToClubHref` — parent page mag geen child tab-param erven |
| P2a: Welke tab-naam tonen? | Context-afhankelijk: "Beheer" als team-context, "Identity" als club-context → maar op team-level bestaat "Identity" niet, dus wijzig naar "het Beheer-tabblad" |
| P2b: Hoe API URLs verbergen? | Catch de error en toon user-friendly message i.p.v. `e.message` (dat de fetch URL bevat) |
| P2c: 403 backend fix? | Aparte actie: Railway backend redeploy. Niet in scope van dit document. |
| P3: Hoe tab-inconsistentie oplossen? | Fase H1 — onderzoek of TeamOrganisationDetailPage ook Wedstrijden + Media tabs kan tonen met lege states |

## Fasering

### H0 — Quick Fixes (P1 + P2a + P2b)
> **Effort:** ~30 min | **Impact:** Elimineert misleidende navigatie en blootgestelde API URLs

**To do:**

#### P1 — Breadcrumb lekt tab-parameter
- [ ] `demo/src/pages/identity/useTeamDetailData.ts` regel 316: verwijder `${location.search || ''}` uit `backToClubHref`
  ```ts
  // Was:
  return `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}${location.search || ''}`;
  // Wordt:
  return `/${encodeURIComponent(orgKeyForRoutes)}/${encodeURIComponent(clubKeyForRoutes)}`;
  ```
- [ ] Verwijder `location.search` uit de dependency array van deze `useMemo`
- [ ] Controleer of `federationClubsHref` hetzelfde probleem heeft (regel 319) — die bouwt ook op `location.search`

#### P2a — Kits-tab verwijst naar verkeerde tab-naam
- [ ] `demo/src/components/KitsTab/KitsTab.tsx` regel 192: wijzig melding
  ```
  // Was:
  "No brand profile found. Create a brand profile on the Identity tab first to manage kits."
  // Wordt:
  "Geen brand profile gevonden. Maak eerst een brand profile aan via het Beheer-tabblad (Assets)."
  ```
- [ ] `demo/src/pages/identity/ClubKitsTab.tsx` regel 103: wijzig melding voor club-context
  ```
  // Was:
  "No brand profile found for this club. Create a brand profile on the Identity tab first to manage kits."
  // Wordt:
  "Geen brand profile gevonden voor deze club. Maak eerst een brand profile aan via het Identity-tabblad."
  ```

#### P2b — Credits-tab toont rauwe API URL
- [ ] `demo/src/pages/identity/detail/useTeamCreditsData.ts` regel ~168: vervang error message
  ```ts
  // Was:
  setBalanceError(e instanceof Error ? e.message : 'Failed to load team credits balance');
  // Wordt:
  setBalanceError('Kan team-credits niet laden. Probeer het later opnieuw.');
  ```
  (De `e.message` van fetch-errors bevat de volledige URL — die mag niet naar de gebruiker.)
- [ ] Idem voor `fetchUserBalance` (~regel 185) en `fetchTransactionsList` (~regel 199)

**Done criteria:**
- [ ] "< SV Zwolle" navigeert naar `/knvb/sv-zwolle` (zonder `?tab=...`)
- [ ] Kits empty-state toont Nederlandse tekst met juiste tab-referentie
- [ ] Credits error toont user-friendly melding zonder API URL
- [ ] Geen TypeScript errors (`npx tsc --noEmit`)
- [ ] Build slaagt (`npx vite build`)

---

### H1 — Tab-consistentie (P3)
> **Effort:** ~2 uur | **Impact:** Uniforme teamervaring ongeacht seizoensdata

**Context:**
De routing in `TeamDetailPage.tsx` (regels 113–173) check of een team seizoenen heeft:
- **Met seizoenen** → redirect naar `MyTeamHubPage` (6 tabs: Overview, Wedstrijden, Media, Selectie, Beheer, Club)
- **Zonder seizoenen** → render `TeamOrganisationDetailPage` (3 tabs: Overview, Selectie, Beheer)

Dit betekent dat een nieuw team (zonder seizoenen) een compleet andere UX krijgt dan een bestaand team.

**To do:**
- [ ] Onderzoek: kunnen we `TeamOrganisationDetailPage` uitbreiden met Wedstrijden + Media tabs die lege states tonen?
- [ ] Of alternatief: altijd `MyTeamHubPage` renderen, ook zonder seizoenen — met graceful fallback voor ontbrekende seizoensdata
- [ ] Implementeer gekozen aanpak
- [ ] Test beide scenario's: team met seizoenen + team zonder seizoenen

**Done criteria:**
- [ ] Teams met en zonder seizoenen tonen dezelfde tab-set
- [ ] Lege tabs tonen nette empty state ("Nog geen wedstrijden" etc.)
- [ ] Geen regressie op bestaande team-pagina's met data
- [ ] Build + TypeScript check clean

## Acceptatiecriteria (geheel)
- [ ] P1: Breadcrumb navigatie lekt geen tab-params meer
- [ ] P2a: Kits-tab toont correcte tab-referentie in Nederlandse tekst
- [ ] P2b: Geen rauwe API URLs zichtbaar voor gebruikers
- [ ] P3: Consistente tab-structuur ongeacht seizoensdata
- [ ] Build passes (`npx tsc --noEmit` + `npx vite build`)
- [ ] No new `any` types
- [ ] Visueel geverifieerd op 375×812 via Playwright
