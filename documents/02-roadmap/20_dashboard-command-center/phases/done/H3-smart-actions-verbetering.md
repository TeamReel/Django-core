# H3 — Smart Actions Verbetering

> **Status:** ✅ Voltooid
> **Geschatte effort:** 3-4 uur
> **Geschatte omvang:** ~200 regels gewijzigd, ~120 regels nieuw

## Doel

SmartActionsCard opent alles **inline** in plaats van navigeren. Elke actie triggert een bestaand pattern: `CreateWizard` event, `MatchSheet` event, of een nieuwe inline **upload sheet**.

## Probleem

SmartActionsCard (217 LOC) berekent slim welke acties het meest urgent zijn:
- **Missing member content** → "Profielfoto genereren", "Tenue foto genereren", etc.
- **Upload** → "Foto's uploaden"
- **Lineup** → (niet aanwezig, maar gewenst)

Maar **alle acties navigeren weg** via `useNavigate()`:
- Content acties → navigate naar season media tab
- Upload → navigate naar /medialib

Dit breekt het command center patroon (H0-H2). Na H3: alles inline.

## Actie conversies

### 1. Content generatie acties → CreateWizard event

**Nu:** `navigate('/teams/{slug}/seasons/{id}?tab=media')`
**Straks:** `teamreel:open-quick-create` event → CreateWizard opent met content flow

```tsx
const handleContentAction = useCallback((actionKey: string) => {
  window.dispatchEvent(new CustomEvent('teamreel:open-quick-create', {
    detail: { flow: 'content' },
  }));
}, []);
```

**Bestaand pattern:** Exact hetzelfde als ActiveMatchCard phase items (commit `28bc7155`). MobileBottomNav luistert naar dit event en opent de CreateWizard.

**Acties die dit pattern gebruiken:**
- "Profielfoto genereren" (`profile_photo`)
- "Tenue foto genereren" (`in_tenue`)
- "Close-up genereren" (`closeup`)
- "Intro video genereren" (`short_intro`)

> **Toekomst:** Wanneer CreateWizard content subtypes ondersteunt als prefill, kunnen we `detail.subtype` meegeven zodat het direct naar dat type springt.

### 2. Upload actie → Inline upload sheet (NIEUW)

**Nu:** `navigate('/medialib')`
**Straks:** Opent een `NavigationSheet` met simpele file-upload functionaliteit

**Besluit:** Inline upload sheet bouwen — consistent met iOS patroon, geen context-verlies.

#### UploadSheet component

```tsx
// demo/src/components/dashboard/UploadSheet.tsx

import { NavigationSheet } from '../ui/NavigationSheet';
import { FileUpload } from '@django-core/design-system';

interface UploadSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadSheet: React.FC<UploadSheetProps> = ({ isOpen, onClose }) => {
  return (
    <NavigationSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Foto's uploaden"
      icon={<Upload size={18} />}
    >
      <FileUpload
        accept="image/*,video/*"
        multiple
        maxFiles={10}
        onFilesSelected={handleUpload}
        label="Sleep bestanden hierheen of klik om te selecteren"
      />
      {/* Upload progress list */}
      {/* Success state: thumbnail grid van uploaded items */}
    </NavigationSheet>
  );
};
```

**Design system:** Gebruikt `FileUpload` component uit `@django-core/design-system` — drag & drop + click to select. Geen custom file input.

**Upload flow:**
1. User selecteert bestanden via FileUpload
2. Per bestand: POST naar `/files/assets/` (FileAsset) → POST naar `/media/items/` (MediaItem)
3. Progress bar per bestand
4. Succes: thumbnail grid van uploaded items
5. "Klaar" knop → sluit sheet

**Scope:** Dit is een **simpele upload sheet** — geen cropping, geen tags, geen bulk editing. Die functionaliteit blijft op de volledige medialib pagina.

### 3. Lineup actie → MatchSheet event (NIEUW)

Nieuwe smart action: "Lineup invullen" (als active match geen lineup heeft).

```tsx
const handleLineupAction = useCallback(() => {
  // Open the active match's MatchSheet → then auto-open LineupSheet
  window.dispatchEvent(new CustomEvent('teamreel:open-match-sheet', {
    detail: { matchId: activeMatch.id, autoOpenLineup: true },
  }));
}, [activeMatch]);
```

**Nieuw event:** `teamreel:open-match-sheet` — ActiveMatchCard (of UpcomingMatchesCard) luistert naar dit event en opent zijn sheet. Optional `autoOpenLineup: true` om direct de LineupSheet te openen.

**Alternatief (eenvoudiger):** SmartActionsCard importeert `useMatchSheet` en opent direct een LineupSheet. Maar dit dupliceert state management. Het event pattern is cleaner.

## SmartActionsCard refactored

```tsx
// Vereenvoudigde actie handler:
const handleAction = useCallback((action: SmartAction) => {
  switch (action.mode.type) {
    case 'create-wizard':
      window.dispatchEvent(new CustomEvent('teamreel:open-quick-create', {
        detail: { flow: 'content' },
      }));
      break;
    case 'upload':
      setUploadSheetOpen(true);
      break;
    case 'match-sheet':
      window.dispatchEvent(new CustomEvent('teamreel:open-match-sheet', {
        detail: { matchId: action.mode.matchId, autoOpenLineup: action.mode.autoOpenLineup },
      }));
      break;
  }
}, []);
```

**ActionMode type update:**
```tsx
type ActionMode =
  | { type: 'create-wizard'; flow: 'content'; subtype?: string }
  | { type: 'upload' }
  | { type: 'match-sheet'; matchId: string; autoOpenLineup?: boolean };
```

Alle `navigate` references verwijderd. `useNavigate` import kan weg.

## Nieuwe smart action: Lineup

**Conditie:** Active match heeft `lineupCount === 0`
**Label:** "Lineup invullen"
**Subtitle:** "{matchTitle}"
**Icon:** Shirt
**Prioriteit:** Hoog (wedstrijd zonder lineup = urgent)
**Mode:** `{ type: 'match-sheet', matchId, autoOpenLineup: true }`

## Event listeners

### ActiveMatchCard luistert naar `teamreel:open-match-sheet`

```tsx
// In ActiveMatchCard (of useMatchSheet hook):
useEffect(() => {
  const handler = (e: CustomEvent) => {
    if (e.detail.matchId === match?.id) {
      openSheet();
      if (e.detail.autoOpenLineup) {
        // Small delay to let sheet animate, then open lineup
        setTimeout(() => openLineupSheet(), 300);
      }
    }
  };
  window.addEventListener('teamreel:open-match-sheet', handler);
  return () => window.removeEventListener('teamreel:open-match-sheet', handler);
}, [match?.id]);
```

## Design system alignment

| Component | Bron | Gebruik |
|-----------|------|---------|
| `FileUpload` | `@django-core/design-system` | Upload sheet — drag & drop + click |
| `Progress` | `@django-core/design-system` | Upload progress per bestand |
| `NavigationSheet` | `demo/src/components/ui` | Upload sheet wrapper |
| Custom events | DOM CustomEvent | `open-quick-create`, `open-match-sheet` |

## Bestanden

| Bestand | Actie |
|---------|-------|
| `demo/src/components/dashboard/SmartActionsCard.tsx` | Refactor: remove navigate, add event dispatchers + upload sheet state |
| `demo/src/components/dashboard/UploadSheet.tsx` | **Nieuw** — inline upload sheet met FileUpload |
| `demo/src/components/dashboard/UploadSheet.module.css` | **Nieuw** — upload progress + success styling |
| `demo/src/components/dashboard/ActiveMatchCard.tsx` | Listen for `teamreel:open-match-sheet` event |
| `demo/src/components/dashboard/useMatchSheet.ts` | Add event listener for external sheet triggers |

## Afhankelijkheden

- **H1 moet eerst:** SmartActionsCard navigate uitgeschakeld (stub)
- **H2 moet eerst:** useMatchSheet hook + MatchSheet component herbruikbaar
- **Bestaande API:** `POST /files/assets/` voor FileAsset upload, `POST /media/items/` voor MediaItem creatie
- **FileUpload component:** Moet `accept`, `multiple`, `maxFiles`, `onFilesSelected` ondersteunen

## Acceptatiecriteria

- [ ] Content generatie acties dispatchen `teamreel:open-quick-create` event → CreateWizard opent
- [ ] Upload actie opent inline UploadSheet met FileUpload component
- [ ] UploadSheet toont upload progress + success thumbnails
- [ ] Nieuwe "Lineup invullen" actie triggert `teamreel:open-match-sheet` event
- [ ] ActiveMatchCard reageert op `teamreel:open-match-sheet` event
- [ ] `useNavigate` volledig verwijderd uit SmartActionsCard
- [ ] **0 navigatie** — alle acties zijn inline (event, sheet, of wizard)
- [ ] FileUpload uit design system — geen custom file input
- [ ] TypeScript clean, Vite build succesvol
- [ ] Dark mode correct
