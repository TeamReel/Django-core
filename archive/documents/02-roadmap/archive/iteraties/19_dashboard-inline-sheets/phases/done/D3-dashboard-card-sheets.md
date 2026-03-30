# D3 — Dashboard Card Sheets

> **Status:** ✅ Voltooid
> **Geschatte effort:** 6-8 uur
> **Geschatte omvang:** ~500 regels nieuw

## Doel

Dashboard cards die nu weg-navigeren omzetten naar inline sheets. Tap op een card → iOS-style sheet met gedetailleerde weergave + acties. Dashboard als command center zonder context-verlies.

## Card analyse

### ✅ Sheet candidates (bouwen)

| Card | LOC | Wat het toont | Sheet meerwaarde |
|------|----:|--------------|-----------------|
| **ContentOverviewCard** | 404 | Volledige content inventory per subtype | Expandable details, filter, direct preview |
| **MemberContentProgressCard** | 204 | Per-member voortgang (avatar + progress bar) | Tap member → detail, quick generate |
| **AssetsOverviewCard** | 342 | Team + member asset checklist | Missing items direct starten |
| **AIQueueCard** | ~40 | Queue count (actief/wachtend) | Queue items lijst, status, cancel |
| **ContentBreakdownCard** | 133 | Content progress bars per type | Breakdown per subtype, tap → generate |

### ⚠️ Niet als sheet (navigatie houden)

| Card | Reden |
|------|-------|
| **SmartActionsCard** | Acties zijn al knoppen die flows starten — sheet voegt geen waarde toe |
| **SquadReadinessCard** | Te weinig data om te expanderen (1 getal) |
| **CreditsTrendCard** | Simpele balance — credits pagina is beter voor detail |
| **OrgStatsCard** | Geen data om te expanderen (leest alleen context) |

## Taken per card

### 3.1 ContentOverviewSheet

**Huidige card:** Collapsible secties met content items per subtype, progress bars, thumbnail preview.

**Sheet versie:**
- Tap card → open sheet met volledige content inventory
- Groepering per fase (pre-match, during, post-match)
- Thumbnail grid per subtype
- Tap item → SavedAssetPreview overlay
- Filter: alle / pre / during / post

**Hook:** Kan `useContentSheet` (D1) hergebruiken — zelfde data, andere presentatie.

**Geschat:** ~100 regels (sheet + header + filter)

### 3.2 MemberContentProgressSheet

**Huidige card:** Per-member progress bars met avatar + naam.

**Sheet versie:**
- Tap card → open sheet met member lijst
- Per member: avatar, naam, progress bar, ontbrekende items
- Tap member → navigeer naar member detail (niet nóg een sheet)
- Top: summary (X/Y members compleet)

**Hook:** `useMemberProgress.ts` (~80 regels) — fetch members + requests, calculate completion.

**Geschat:** ~120 regels (hook + sheet)

### 3.3 AssetsOverviewSheet

**Huidige card:** Twee secties (team assets + member assets) met checklists en progress.

**Sheet versie:**
- Tap card → open sheet met gedetailleerde asset status
- Team assets: logo, kit, sponsor — met upload/generate actie
- Member assets: per-member grid met ontbrekende slots
- Tap "Genereer ontbrekende" → batch generate flow

**Hook:** Hergebruik bestaande data uit card — geen nieuwe hook nodig als card state wordt gelift.

**Geschat:** ~150 regels (sheet + twee secties)

### 3.4 AIQueueSheet

**Huidige card:** Compact getal (X actief, Y wachtend).

**Sheet versie:**
- Tap card → open sheet met queue items lijst
- Per item: type, status, progress, created time
- Cancel actie per item
- Auto-refresh (polling of React Query refetch)

**Hook:** `useQueueSheet.ts` (~60 regels) — fetch queue items met status.

**Geschat:** ~100 regels (hook + sheet)

### 3.5 ContentBreakdownSheet

**Huidige card:** Progress bars per content type.

**Sheet versie:**
- Tap card → open sheet met breakdown per subtype
- Per subtype: progress bar, count, laatste generatie datum
- Tap subtype → "Genereer" shortcut

**Hook:** Hergebruik card data — geen nieuwe hook.

**Geschat:** ~80 regels (sheet)

## Architectuur

### Pattern per card

```
DashboardCard (bestaand)
  ├─ onClick → setSheetOpen(true)
  └─ CardSheet (nieuw)
      └─ NavigationSheet
          ├─ title + icon
          ├─ Body: expanded card content
          └─ onClose → setSheetOpen(false)
```

Geen `onBack` nodig — dit zijn root sheets, niet child sheets van een parent.

### Shared vs. dedicated hooks

| Sheet | Hook strategie |
|-------|---------------|
| ContentOverviewSheet | Hergebruik `useContentSheet` (D1) |
| MemberProgressSheet | Nieuw: `useMemberProgress` |
| AssetsOverviewSheet | Lift bestaande card state |
| AIQueueSheet | Nieuw: `useQueueSheet` |
| ContentBreakdownSheet | Lift bestaande card state |

## Acceptatiecriteria

- [x] 5 dashboard cards openen als inline sheets
- [x] Sheets sluiten met × (root sheet pattern)
- [x] Content in sheets is uitgebreider dan op de card
- [x] Geen data duplication — hooks delen data waar mogelijk
- [x] SmartActions, SquadReadiness, Credits, OrgStats blijven navigeren
- [x] TypeScript clean, Vite build succesvol
- [x] Mobile + desktop responsive
