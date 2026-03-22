# Q005 — Navigatie optimalisatie: "Mijn Team" tab

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Flow review — botNav → SeasonDetailPage |
| Impact | 🟡 important |
| Effort | ~3-4 uur |

## Huidige situatie

Wanneer de gebruiker op "Mijn Club" / "Mijn Team" tikt in de bottom nav, doorloopt de app
meerdere stappen die voor merkbare latency zorgen:

```
Tap → useAppSelection (async: 3× API calls)
       ↓
     seasonPath = /{org}/{club}/{team}/{season}
       ↓  (mySeason nog null? → 3-segment URL zonder seizoen)
     SeasonDetailPage + SeasonProvider mount
       ↓
     MyTeamHubPage: useTeamDetailData + useSeasonDetailPageData (opnieuw API calls)
       ↓
     UI zichtbaar
```

**Knelpunten:**
1. `useAppSelection` voert bij elke mount meerdere paginated API-calls uit (orgs, clubs,
   teams) met een 120 s TTL-cache. Bij cold-start of cache-miss: 300–800 ms delay vóór
   navigatie.
2. Als `mySeason` nog null is bij tap, bouwt de nav een 3-segment URL zonder seizoen.
   SeasonProvider moet dan alsnog het actieve seizoen opzoeken → extra round-trip.
3. `ContextSwitcher` / `useContextSwitcher` beheert al de actieve context (org/club/team/
   season) application-wide, maar `useAppSelection` doet een parallelle resolutie in plaats
   van de al-aanwezige context te hergebruiken.

## Gewenste situatie

De "Mijn Club/Team" tap voelt instant aan: de URL bevat altijd de volledige 4-segment path,
en SeasonProvider hoeft niets te re-resolven.

## Oplossingsopties

### Optie A — Gebruik ContextSwitcher-context direct in MobileBottomNav ★ aanbevolen
- `MobileBottomNav` leest `context` (uit `useContextSwitcher`) direct voor org/club/team/season.
- `context.activeOrg`, `context.activeClub`, `context.activeTeam`, `context.activeSeason`
  zijn al opgelost door de ContextSwitcherProvider die app-breed aanwezig is.
- `useAppSelection` wordt alleen nog gebruikt als fallback wanneer geen actieve context is.
- **Voordeel:** geen extra API-calls, instant path-build, en de UI-state voor het actieve
  seizoen is al gecached in de provider.
- **Nadeel:** vereist dat ContextSwitcherProvider ook `slug`/`pathKey` exporteert (niet
  alleen `id`). Kleine contractwijziging.

### Optie B — Prefetch seizoen-slug in useAppSelection zodra teamSlug bekend is
- Zodra `myTeamSlugOrId` resolved, fetch alvast het actieve seizoen op de achtergrond.
- Minimalere change, maar lost het fundamentele "dubbele resolutie" probleem niet op.

### Optie C — `/mijn-team` redirect-route
- Voeg een route toe `/mijn-team` die server-side (of client-side) redirect naar de
  volledige 4-segment URL.
- Voordeel: de bottom nav tikt altijd hetzelfde pad, redirect regelt de rest.
- Nadeel: eén extra redirect-stap vóórdat de pagina laadt. Geen echte performance win.

## Aanbevolen aanpak (★ Optie A)

### Checklist

- [ ] **Stap 1 — ContextSwitcherProvider audit**: controleer of `context` slugs/pathKeys
  exporteert (niet alleen numerieke IDs). Zo niet: voeg `activeOrgSlug`, `activeClubSlug`,
  `activeTeamSlug`, `activeSeasonSlug` toe aan de context value.
- [ ] **Stap 2 — MobileBottomNav refactor**: vervang de `useAppSelection`-afhankelijkheid
  voor `seasonPath` door directe read uit ContextSwitcher:
  ```tsx
  const { context } = useContextSwitcher();
  const orgSlug   = context?.activeOrg?.slug   ?? '';
  const clubSlug  = context?.activeClub?.slug  ?? '';
  const teamSlug  = context?.activeTeam?.slug  ?? '';
  const seasonKey = context?.activeSeason?.slug ?? context?.activeSeason?.id ?? '';
  const seasonPath = orgSlug && clubSlug && teamSlug && seasonKey
    ? `/${orgSlug}/${clubSlug}/${teamSlug}/${seasonKey}`
    : teamSlug ? routes.team({ orgId: orgSlug, clubId: clubSlug, projectId: teamSlug })
    : routes.dashboard();
  ```
- [ ] **Stap 3 — Fallback**: als context nog niet geladen is, toon skeleton/placeholder
  in de nav (huidige gedrag via useAppSelection als fallback).
- [ ] **Stap 4 — useAppSelection slim maken**: `useAppSelection` heeft nog nut voor
  andere consumers (breadcrumbs, headings). Voeg memoization toe op basis van context-hash
  om duplicate calls te elimineren.
- [ ] **Stap 5 — SeasonProvider race-condition fix**: als de URL al 4 segmenten bevat,
  skip de "resolve active season" stap in SeasonProvider → directe mount zonder redirect.
- [ ] Tests: verify `seasonPath` bevat altijd 4 segmenten als context volledig is.
- [ ] Verify: tap → MyTeamHubPage zichtbaar < 200 ms op warm cache.

## Risico's
- ContextSwitcherProvider is app-breed — contractwijziging vereist zorgvuldig review.
- Als een gebruiker meerdere teams heeft en schakelt, moet de bottom nav direct updaten.
  Dit werkt al via de context-reactie, maar testen is nodig.

## Meting van succes
- Cold start (geen cache): < 500 ms van tap tot MyTeamHubPage zichtbaar
- Warm cache: < 100 ms (instant feel)
- Geen extra redirect via 3-segment → 4-segment URL meer zichtbaar in browser history
