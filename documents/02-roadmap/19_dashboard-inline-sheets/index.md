# Roadmap #19 — Dashboard Inline Sheets

> **Status:** 🚧 In progress (Fase D0 klaar)
> **Start:** 2026-03-14
> **Scope:** `demo/src/` — dashboard, NavigationSheet, inline content/media

---

## Doel

Alle match-acties vanaf het dashboard als inline sheets (iOS-style stacked panels) — gebruiker hoeft het dashboard niet te verlaten voor standaard match-day workflows.

**Kernprincipe:** Dashboard = command center. Elke quick action opent een sheet, niet een page navigation.

---

## Huidige staat (pre-roadmap)

### Wat werkt ✅
- **ActiveMatchCard** — toont dichtstbijzijnde match, opent MatchSheet
- **MatchSheet** — iOS-style sheet met wedstrijdoverzicht + quick actions
- **LineupSheet** — inline opstelling bewerken vanuit dashboard (lazy-loaded)
- **NavigationSheet `onBack`** — `‹ Vorige` back-arrow voor child sheets (iOS-patroon)
- **Media knop verwijderd** — er is geen match-level media tab; content = media

### Wat mist ❌
- **Content tab inline** — "Content" knop navigeert nog naar match detail pagina
- **Dashboard card interacties** — andere cards (ContentBreakdown, ContentOverview, etc.) linken weg ipv inline sheets
- **Sheet refresh** — na lineup save updated de ActiveMatchCard badge niet live

### Dashboard cards (huidige staat)
| Card | Inline? | Actie bij klik |
|------|---------|----------------|
| ActiveMatchCard | ✅ Sheet | MatchSheet → LineupSheet inline |
| SquadReadinessCard | ❌ | Navigeert naar directory |
| AIQueueCard | ❌ | Navigeert naar AI Studio |
| CreditsTrendCard | ❌ | Navigeert naar credits |
| ContentBreakdownCard | ❌ | Geen interactie / navigatie |
| ContentOverviewCard | ❌ | Navigeert naar content |
| SmartActionsCard | ❌ | Navigeert naar diverse pagina's |
| MemberContentProgressCard | ❌ | Navigeert naar members |
| AssetsOverviewCard | ❌ | Navigeert naar assets |

---

## Fases

| Fase | Titel | Status | Geschatte omvang |
|------|-------|--------|------------------|
| **D0** | Lineup Sheet + Back navigatie | ✅ Klaar | ~200 regels |
| **D1** | Content Sheet (read-only) | 📋 Gepland | ~150 regels |
| **D2** | Content Sheet (generatie) | 📋 Gepland | ~250 regels |
| **D3** | Sheet refresh & badges | 📋 Gepland | ~50 regels |
| **D4** | Dashboard card sheets | 📋 Gepland | Analyse nodig |

---

### Fase D0 — Lineup Sheet + Back navigatie ✅

**Wat is gedaan:**
- `useLineupSheet.ts` (144 regels) — standalone hook: squad fetch + lineup load/save
- `LineupSheet.tsx` (55 regels) — lazy-loaded MatchLineupTab in NavigationSheet
- `NavigationSheet` `onBack` prop — `‹ Vorige` back-arrow voor child sheets
- ActiveMatchCard: Opstelling knop opent LineupSheet inline
- Media knop verwijderd uit MatchSheet (geen match-level media tab)

**Commits:** `22f24f0b`, `75b9402c`, `1aa758f0`

---

### Fase D1 — Content Sheet (read-only preview) 📋

**Doel:** Content tab tonen in een sheet met preview van gegenereerde items. Nog geen generatie — alleen bekijken wat er is.

**Wat te bouwen:**
1. `useContentSheet.ts` — standalone hook (~150 regels):
   - Fetch match media items (`/media/items/?activity={matchId}`)
   - Fetch content items (`/content-items/?activity={matchId}`)
   - Groeperen per subtype (pre_match, during_match, post_match)
   - Getter functions: `getLatestMediaForSubtype()`, `getContentItemForSubtype()`
   - Preview state management
2. `ContentSheet.tsx` — NavigationSheet wrapper (~60 regels):
   - Lazy-load MatchContentTab (of een vereenvoudigde read-only versie)
   - `onBack` → terug naar MatchSheet
   - Thumbnail grid per fase (pre/during/post)
3. Wire in `ActiveMatchCard`:
   - Content knop → `setContentSheetOpen(true)`

**Dependencies:**
- `CONTENT_TYPES` registry (statisch, geen API)
- `MatchMediaItem` type + `getAssetUrl` helper
- `ContentItem` type (status tracking)

**Uitdaging:** MatchContentTab verwacht 14 props waarvan 4 callbacks (generate, preview, delete, restore). In read-only mode kunnen generate/delete/restore no-ops zijn, en preview kan een simpele image overlay zijn.

---

### Fase D2 — Content Sheet (generatie) 📋

**Doel:** Volledige content generatie vanuit de dashboard sheet — "Genereer" knop werkt inline.

**Wat te bouwen:**
1. Uitbreiden `useContentSheet.ts` (+100 regels):
   - Fetch beschikbare templates (`/content-templates/?is_active=true`)
   - Fetch template flags (`/content-template-flags/`)
   - Template resolution per subtype + sport + formatie
   - Delete/restore handlers
2. `ContentGenerationModal` integratie:
   - Modal opent als portal bovenop de sheet (standaard React pattern)
   - Na generatie: refetch content items, update badge in MatchSheet
3. Preview overlay:
   - `SavedAssetPreview` modal voor full-screen image/video preview
   - Stackt bovenop sheet (portal)

**Complexiteit:**
- `useMatchContentMedia` (225 regels) is de referentie-implementatie
- Templates API filtering op sport, org, feature flags
- ContentGenerationModal is een bestaande complexe component (~500 regels)
- Totaal: ~250 nieuwe regels in hook + ~80 regels in sheet component

**Risico's:**
- Modal-op-sheet stacking: z-index/focus-trap conflicten
- ContentGenerationModal is gebouwd voor de match detail pagina — mogelijk refactoring nodig
- Template resolution logica is verspreid over meerdere bestanden

---

### Fase D3 — Sheet refresh & badges 📋

**Doel:** Na een actie in een child sheet updated de parent sheet + ActiveMatchCard badge live.

**Wat te bouwen:**
1. Callback pattern: LineupSheet → `onLineupSaved(count)` → ActiveMatchCard
2. ContentSheet → `onContentGenerated(count)` → ActiveMatchCard
3. ActiveMatchCard badge animatie bij update
4. MatchSheet telt lineup/content badges opnieuw na sheet close

**Geschatte omvang:** ~50 regels aanpassingen verspreid over bestaande files.

---

### Fase D4 — Dashboard card sheets 📋

> **Status:** Analyse nodig — hangt af van welke cards de gebruiker inline wil.

**Mogelijke candidates:**
- **ContentBreakdownCard** → Content breakdown in sheet met filter/sort
- **ContentOverviewCard** → Volledige content inventory inline
- **SmartActionsCard** → Acties openen inline flows ipv navigatie
- **SquadReadinessCard** → Quick squad overview in sheet

**Per card beslissen:**
- Is inline meerwaarde vs. page navigation?
- Hoeveel data fetch / state is nodig?
- Past het in het sheet pattern (max 1-2 API calls)?

---

## Technische notities

### Sheet stacking patroon
```
Dashboard
 └─ ActiveMatchCard (tap)
     └─ MatchSheet (NavigationSheet, root)
         ├─ LineupSheet (NavigationSheet + onBack) ✅
         ├─ ContentSheet (NavigationSheet + onBack) 📋
         └─ [toekomstige sheets]
             └─ Modal (portal, bovenop alles)
```

### Herbruikbare patterns uit D0
- `useLineupSheet` pattern: standalone hook, eigen API calls, geen dependency op page orchestrator
- `LineupSheet` pattern: lazy-load tab component, wrap in NavigationSheet, `onBack` voor parent
- `ActiveMatchCard` pattern: state per sheet, close parent → open child

### NavigationSheet capabilities
- `isOpen` / `onClose` — basis open/close
- `onBack` — iOS back arrow (vervangt × knop)
- `title` / `icon` — header
- `footer` — sticky footer (voor save buttons)
- `desktopWidth` — side panel breedte
- Focus trap, scroll lock, escape key, animated close

### Key API endpoints
| Endpoint | Wat | Gebruikt door |
|----------|-----|---------------|
| `/activities/?activity_type=match` | Match ophalen | ActiveMatchCard |
| `/projects/{id}/members/` | Squad ophalen | useLineupSheet |
| `/activities/{id}/` PATCH | Lineup opslaan | useLineupSheet |
| `/media/items/?activity={id}` | Match media items | useContentSheet (D1) |
| `/content-items/?activity={id}` | Content generatie status | useContentSheet (D1) |
| `/content-templates/?is_active=true` | Beschikbare templates | useContentSheet (D2) |
| `/content-template-flags/` | Template feature flags | useContentSheet (D2) |
