# Q005 — Navigatie optimalisatie: "Mijn Team" tab

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Flow review — botNav → SeasonDetailPage |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Huidige situatie (was)

Wanneer de gebruiker op "Mijn Club" / "Mijn Team" tikt in de bottom nav, doorloopt de app
meerdere stappen die voor merkbare latency zorgen:

```
Tap → useAppSelection (async: 2-3 API calls tegelijk)
       ↓  Initial state = alle null → "Mijn Team" toont /directory of teamPath zonder seizoen
     compute() klaar → setAppSelection met my* values gevuld
       ↓
     Correcte seasonPath beschikbaar
```

**Knelpunten:**
1. `useAppSelection` initialiseert altijd met alle `null` waarden. Tot `compute()` klaar is,
   heeft `MobileBottomNav` geen `mySeasonSlugOrId` en valt terug op 3-segment URL (zonder season).
2. Race condition: `mySeason = mySeasonSlugOrId || seasonSlugOrId`. Als de user op een
   **ander** team's pagina browst en `mySeasonSlugOrId` nog null is, pakt hij de URL's
   seasonSlugOrId — die hoort bij het andere team. Klikken op "Mijn Team" bouwt dan een
   4-segment URL met de verkeerde season slug: SeasonProvider vindt hem niet → error.
3. ⚠️ De originele Q005-analyse stelde voor om `useContextSwitcher()` te gebruiken als
   vervanging. Dit klopt niet: `useContextSwitcher` weet alleen `organisation + project`
   (2 niveaus), terwijl TeamReel een 4-laagse hiërarchie (org/club/team/season) heeft.

## Oplossing (geïmplementeerd)

### Fix 1 — Lazy `useState` initialisatie in `useAppSelection`

`useState` krijgt een lazy initializer die **synchronisch** `APP_LAST_CTX_KEY` uit
localStorage leest en direct de volledige `my*` waarden vult:

```tsx
const [appSelection, setAppSelection] = useState<AppSelection>(() => {
  const raw = localStorage.getItem(APP_LAST_CTX_KEY);
  const parsed = raw ? JSON.parse(raw) : null;
  if (parsed?.orgSlug) {
    return {
      ...allNulls,
      orgSlug: parsed.orgSlug,
      myOrgSlug: parsed.orgSlug,
      myClubSlugOrId: parsed.clubSlugOrId ?? null,
      myTeamSlugOrId: parsed.teamSlugOrId ?? null,
      mySeasonSlugOrId: parsed.seasonSlugOrId ?? null,
    };
  }
  return allNulls;
});
```

**Effect:** Bij elke mount zijn `my*` waarden instant beschikbaar (synchroon, geen network).
`compute()` draait daarna nog steeds en schrijft de gecorrigeerde/gevalideerde waarden terug.

### Fix 2 — Race condition fix in `MobileBottomNav`

`mySeason` gebruikt de URL-season alleen als fallback wanneer gegarandeerd is dat de URL
ook echt van het eigen team is:

```tsx
const urlSeasonIsMine = !!myTeamSlugOrId && teamSlugOrId === myTeamSlugOrId;
const mySeason = mySeasonSlugOrId || (urlSeasonIsMine ? seasonSlugOrId : null);
```

**Effect:** Geen broken 4-segment URL meer wanneer user een ander team's pagina bezoekt.

## Resultaat

| Scenario | Vóór | Na |
|----------|------|----|
| Cold start (dashboard) | 3-segment URL, SeasonProvider doet redirect | 4-segment URL vanuit localStorage: instant |
| Koud (ander team's pagina) | 4-segment URL met verkeerde season → error | 3-segment URL (veilig) → SeasonProvider resolveert |
| Warm (zelfde team) | Instant (URL params gevuld) | Instant (localStorage + URL) |
| Eerste sessie ooit | 3-segment, SeasonProvider resolveert | Zelfde — geen localStorage beschikbaar |

## Commits
- `c8a56e04` — plan aangemaakt
- `[next commit]` — fixes geïmplementeerd


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
