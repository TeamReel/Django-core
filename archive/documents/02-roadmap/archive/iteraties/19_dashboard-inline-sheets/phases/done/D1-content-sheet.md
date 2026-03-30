# D1 — Content Sheet (volledig)

> **Status:** ✅ Klaar
> **Datum:** 2026-03-14
> **Omvang:** 449 regels nieuw (useContentSheet 249 + ContentSheet 156 + ActiveMatchCard +44)

## Doel

Volledige content tab inline vanuit het dashboard — preview van gegenereerde items + generatie starten + full-screen preview. Gebruiker hoeft het dashboard niet te verlaten voor de complete match content workflow.

## Huidige staat

De "Content" knop in de MatchSheet navigeert naar de match detail pagina (`?tab=content`). `MatchContentTab` verwacht 14 props waarvan 4 callbacks die zwaar leunen op de match detail page orchestrator (`useMatchContentMedia`, 225 regels).

## Taken

### 1. `useContentSheet.ts` — Standalone hook (~250 regels)

Onafhankelijk van de match detail orchestrator, vergelijkbaar met `useLineupSheet`:

```typescript
interface ContentSheetState {
  // Data
  matchMedia: MatchMediaItem[];
  contentItems: ContentItem[];
  availableTemplates: Record<string, ContentTemplate[]>;

  // Loading
  matchMediaLoading: boolean;
  templatesLoading: boolean;

  // Getters
  getLatestMediaForSubtype: (subtype: string) => MatchMediaItem | null;
  getMediaHistoryForSubtype: (subtype: string) => MatchMediaItem[];
  getContentItemForSubtype: (subtype: string) => ContentItem | null;

  // Actions
  openContentModal: (template?: ContentTemplate, label?: string) => void;
  setSavedAssetPreview: (preview: SavedAssetPreview) => void;
  handleDeleteMediaItem: (item: MatchMediaItem) => void;
  handleRestoreMediaItem: (item: MatchMediaItem) => void;

  // Modal state
  contentModalOpen: boolean;
  contentModalTemplate: ContentTemplate | null;
  contentModalLabel: string;
  closeContentModal: () => void;
  savedAssetPreview: SavedAssetPreview | null;
  closeSavedAssetPreview: () => void;
}
```

**API calls:**
1. `/media/items/?activity={matchId}` — match media items
2. `/generative/requests/?activity={matchId}` — content item status
3. `/content-templates/?is_active=true` — beschikbare templates
4. `/content-template-flags/` (optioneel) — feature flags per template

**Logica uit `useMatchContentMedia` te hergebruiken:**
- Subtype groupering + normalisatie
- Template resolution per subtype (sport, formatie, flags)
- Media item delete/restore via API

### 2. `ContentSheet.tsx` — NavigationSheet wrapper (~80 regels)

```
ContentSheet
├─ NavigationSheet (title="Content", onBack → MatchSheet)
├─ Suspense (lazy-load MatchContentTab)
├─ ContentGenerationModal (portal, boven sheet)
└─ SavedAssetPreviewModal (portal, boven sheet)
```

- Lazy-load `MatchContentTab` via `React.lazy()`
- Pass alle `useContentSheet` state als props (1:1 mapping)
- `onBack` prop doorgifte → terug naar MatchSheet
- Modals renderen als portals (buiten NavigationSheet DOM)

### 3. ActiveMatchCard integratie

- `contentSheetOpen` state toevoegen
- Content knop: close MatchSheet → open ContentSheet
- ContentSheet `onBack`: close ContentSheet → open MatchSheet

### 4. Portal stacking voor modals

**Uitdaging:** ContentGenerationModal en SavedAssetPreview moeten bovenop de NavigationSheet renderen zonder focus-trap conflicten.

**Oplossing:**
- Modals renderen via React Portal (`createPortal` naar `document.body`)
- NavigationSheet focus trap pauzeert wanneer een modal open is
- z-index: NavigationSheet (1000) < Modal (1100)

## Dependencies

| Component | Locatie | Status |
|-----------|---------|--------|
| `MatchContentTab` | `pages/activities/match-detail/` | ✅ Bestaand (74 regels) |
| `ContentRow` + `getSyntheticTemplate` | `MatchContentComponents.tsx` | ✅ Bestaand (267 regels) |
| `CONTENT_TYPES` | `ContentGenerationModal/constants` | ✅ Bestaand (statisch) |
| `ContentGenerationModal` | `pages/identity/ContentGenerationModal/` | ✅ Bestaand (~500 regels) |
| `MatchMediaItem` type | `components/MediaAssetCard` | ✅ Bestaand |
| `getAssetUrl` | `hooks/useBrandProfile` | ✅ Bestaand |

## Risico's

| Risico | Mitigatie |
|--------|----------|
| Modal-op-sheet z-index conflicten | React Portal + z-index layering |
| Focus trap conflicten (sheet + modal) | Pauzeer NavigationSheet trap wanneer modal open |
| ContentGenerationModal verwacht match detail page context | Minimal context doorgifte via props |
| Template resolution complexity | Kopieer logica uit `useMatchContentMedia`, refactor later naar shared util |

## Acceptatiecriteria

- [x] Content sheet opent vanuit MatchSheet "Content" knop
- [x] ‹ Vorige keert terug naar MatchSheet
- [x] Content items gegroepeerd per fase (pre/during/post)
- [x] Thumbnail preview van gegenereerde items
- [x] "Genereer" knop opent ContentGenerationModal als portal
- [x] Na generatie: content items refreshen in sheet
- [x] Full-screen preview overlay werkt voor images en video's
- [x] Delete/restore van media items werkt
- [x] TypeScript clean, Vite build succesvol
- [x] Geen regressions op match detail pagina

## Gewijzigde bestanden

| Bestand | Wijziging |
|---------|----------|
| `demo/src/components/dashboard/useContentSheet.ts` | **Nieuw** — standalone content hook (249 regels) |
| `demo/src/components/dashboard/ContentSheet.tsx` | **Nieuw** — NavigationSheet wrapper met portals (156 regels) |
| `demo/src/components/dashboard/ActiveMatchCard.tsx` | ContentSheet import, `contentSheetOpen` state, Content knop wiring |

## Commits

| Hash | Beschrijving |
|------|-------------|
| `098525b5` | feat(dashboard): D1 — Content Sheet inline from dashboard |

## Verificatie

- TypeScript: ✅ `tsc --noEmit` clean
- Build: ✅ `vite build` in 11.19s
- Railway: ✅ pushed to main
