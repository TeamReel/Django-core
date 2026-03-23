# H1 — Close-up, Then vs Now & Actiefoto kaarten

| | |
|---|---|
| Fase | H1 |
| Status | TODO |
| Effort | ~2 uur |
| Bestanden | `MemberSummarySheet.tsx`, evt. `assetMetadata.ts` |
| Afhankelijkheid | H0 (sectie-structuur moet staan) |

---

## Doel

De 3 nieuwe asset-kaarten (Close-up, Then vs Now, Actiefoto) correct aansluiten op de bestaande data-laag en thumbnail-ophaling. Plus edge cases afhandelen.

---

## Close-up kaart

### Data-ophaling
```typescript
thumbnail: getFirstAssetUrl(assets, role, 'images', 'closeup')
```

### Bijzonderheden
- Close-up wordt **automatisch gecropd** uit de fullbody (via `cropCloseupFromFullbody`)
- Als er geen fullbody is → close-up is ook leeg
- Als er wél een fullbody is maar close-up crop nog niet gerund → status = `missing`
- De kaart opent `editTab: 'assets'` — dezelfde tab als Fullbody

### Edge case: afgeleid asset
Close-up heeft geen "Maak" actie — het wordt automatisch gegenereerd. De kaart toont:
- ✓ met thumbnail als close-up bestaat
- Klokje icon als fullbody bestaat maar close-up nog niet gecropd
- — als geen fullbody (dan is close-up ook niet mogelijk)

---

## Then vs Now kaart

### Data-ophaling
```typescript
thumbnail: getFirstAssetUrl(assets, role, 'videos', 'then_vs_now')
```

### Bijzonderheden
- Vereist **legacy foto** + **fullbody** om te kunnen genereren
- De `MemberThenVsNowTab` toont 7 varianten (split_screen, morph, zoom_reveal, etc.)
- De kaart opent `editTab: 'then_vs_now'`
- Status:
  - `done` als minstens 1 variant gegeneerd is
  - `missing` als nog geen enkele variant bestaat
  - Toon "Needs legacy foto" hint als er geen legacy foto is

### Visuele hint bij ontbrekende vereisten
Als de legacy foto ontbreekt, toon een subtiele hint onder de kaart:
```tsx
{!legacyPhotoUrl && (
  <span className={s.assetCardHint}>Voeg legacy foto toe</span>
)}
```

---

## Actiefoto kaart

### Data-ophaling
```typescript
thumbnail: getFirstAssetUrl(assets, role, 'images', 'action_photo')
```

### Bijzonderheden
- Actiefoto is een zelfstandig asset type (niet afgeleid)
- De `MemberActionPhotoTab` handelt upload en bewerking af
- De kaart opent `editTab: 'action_photo'`
- Standaard status: `done` of `missing`

---

## Legacy in Tenue — GEEN aparte kaart

Legacy in Tenue (fullbody met historische look) is een **variant binnen de Assets tab**, niet een apart asset type. Dit wordt **niet** als aparte kaart getoond in het overzicht. De bestaande Legacy sectie (met de thumbnail van de historische foto) dekt dit af.

---

## Icons per kaart

| Asset | Icon (als geen thumbnail) | Import |
|-------|--------------------------|--------|
| Fullbody | `<Image size={16} />` | lucide-react |
| Close-up | `<Crop size={16} />` | lucide-react (nieuw) |
| Intro | `<Video size={16} />` | lucide-react |
| Celebration | `<Sparkles size={16} />` | lucide-react |
| Then vs Now | `<ArrowLeftRight size={16} />` | lucide-react (nieuw) |
| Actiefoto | `<Camera size={16} />` | lucide-react (nieuw) |

**Nieuwe imports nodig**: `Crop`, `ArrowLeftRight`, `Camera` uit lucide-react.

---

## Labels (Nederlands)

| Asset type | Label in grid | Aria-label (done) | Aria-label (missing) |
|-----------|--------------|-------------------|---------------------|
| `fullbody` | Fullbody | "Fullbody bewerken" | "Fullbody genereren" |
| `closeup` | Close-up | "Close-up bewerken" | "Close-up genereren" |
| `intro` | Intro | "Intro bewerken" | "Intro genereren" |
| `celebration` | Celebration | "Celebration bewerken" | "Celebration genereren" |
| `then_vs_now` | Then vs Now | "Then vs Now bewerken" | "Then vs Now genereren" |
| `action_photo` | Actiefoto | "Actiefoto bewerken" | "Actiefoto genereren" |

---

## Voortgangsbalk bijwerken

De bestaande `getMemberRoleStatuses()` telt alleen de `ASSET_TYPES_BY_ROLE` types (fullbody, halfbody, closeup, intro, celebration). Dit dekt niet Then vs Now en Actiefoto.

**Optie A**: Voortgangsbalk laten op de bestaande `getMemberRoleStatuses()` — dan telt de balk 5 tracked assets per rol.

**Optie B**: Een nieuwe `getSummaryProgress()` schrijven die de 6 zichtbare assets telt.

**Aanbeveling**: **Optie A** — de section headers tonen al per-categorie counters (`2/2`, `1/4`). De voortgangsbalk toont de backend-tracked voortgang per rol. Twee complementaire weergaven, geen verwarring.

---

## Checklist

- [ ] Close-up kaart met correcte data-ophaling en "afgeleid" status
- [ ] Then vs Now kaart met legacy-vereiste hint
- [ ] Actiefoto kaart met correcte editTab mapping
- [ ] Nieuwe lucide icons importeren: `Crop`, `ArrowLeftRight`, `Camera`
- [ ] Labels en aria-labels correct voor alle 6 kaarten
- [ ] Edge cases: geen fullbody → close-up disabled, geen legacy → then vs now hint
- [ ] Voortgangsbalk behouden op bestaande `getMemberRoleStatuses()`
- [ ] TypeScript clean
- [ ] Visuele check in browser (375px viewport)
