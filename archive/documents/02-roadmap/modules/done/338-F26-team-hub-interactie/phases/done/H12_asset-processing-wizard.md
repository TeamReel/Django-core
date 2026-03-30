# H12 — Asset Processing Wizard vanuit Overview

| | |
|---|---|
| Status | ✅ DONE |
| Effort | ~4 uur |
| Afhankelijkheid | — |

## Context

De app heeft al een `AssetGenerationModal` voor AI-processing van assets. Deze moet gekoppeld worden aan de Overview pagina, zodat je op Logo/Tenue/Sponsor kunt klikken en direct de upload → process wizard krijgt.

## Bestaande componenten

| Component | Locatie | Functie |
|-----------|---------|---------|
| `AssetGenerationModal` | `demo/src/components/AssetGenerationModal/` | 3-stap wizard: template → configure → results |
| `useAssetGeneration` | `demo/src/hooks/useAssetGeneration.ts` | Hook voor modal state |
| `ContentFlow` | `demo/src/components/CreateWizard/flows/ContentFlow.tsx` | AI content creation flow |

## Doel

Vanuit Team Hub Overview:
1. Klik op "Logo" → Upload modal óf "Genereer met AI" optie
2. Na upload: automatisch processing starten
3. Preview tonen → Goedkeuren/Afwijzen
4. Goedgekeurde versie opslaan als `processed`

## Implementatie

### 1. AssetDetailSheet uitbreiden

**Bestand**: `demo/src/pages/identity/AssetDetailSheet.tsx`

```tsx
// Add processing trigger
const [showProcessingWizard, setShowProcessingWizard] = useState(false);

// In sheet content:
{rawUrl && !processedUrl && (
  <Button
    variant="primary"
    onClick={() => setShowProcessingWizard(true)}
  >
    <Sparkles size={16} /> Verwerk met AI
  </Button>
)}

{showProcessingWizard && (
  <AssetGenerationModal
    isOpen={showProcessingWizard}
    onClose={() => setShowProcessingWizard(false)}
    assetType={assetType}
    sourceUrl={rawUrl}
    onComplete={(processedUrl) => {
      // Update brand profile with processed URL
      handleSaveProcessed(processedUrl);
    }}
  />
)}
```

### 2. Flow voor elk asset type

| Asset | Bron | Processing |
|-------|------|-----------|
| Logo | Upload PNG/SVG | Background removal, resize, optimize |
| Sponsor | Upload PNG | Background removal, resize |
| Tenue | Upload foto | Detect kit, segment, create variants |
| Kits | Generated from tenue | — |

### 3. API calls

```tsx
// Start processing
POST /api/v1/generative/assets/generate/
{
  "source_url": "...",
  "asset_type": "logo",
  "template": "logo-cleanup",
  "project_id": "..."
}

// Response: 202 + task_id
// Poll /api/v1/tasks/{task_id}/status/
// On complete: get processed URL, save to brand profile
```

### 4. UX Flow

```
[Upload knop] → [Drag-drop modal] → [Preview raw]
    → [Verwerk met AI] → [Processing spinner]
    → [Preview processed] → [Goedkeuren/Opnieuw]
    → [Opslaan]
```

## Acceptatiecriteria

- [ ] Klik op Logo in Overview → upload/process wizard opent
- [ ] Klik op Sponsor in Overview → upload/process wizard opent
- [ ] Klik op Tenue in Overview → upload/process wizard opent
- [ ] Na upload: "Verwerk met AI" knop zichtbaar
- [ ] Processing toont spinner + status
- [ ] Processed resultaat preview met Goedkeuren/Afwijzen
- [ ] Goedgekeurde versie opgeslagen in brand profile
- [ ] WCAG: focus management in modal, escape to close
