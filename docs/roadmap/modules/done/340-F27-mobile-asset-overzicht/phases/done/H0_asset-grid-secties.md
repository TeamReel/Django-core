# H0 — Asset-grid uitbreiden naar secties

| | |
|---|---|
| Fase | H0 |
| Status | TODO |
| Effort | ~3 uur |
| Bestanden | `MemberSummarySheet.tsx`, `MemberSummarySheet.module.css` |

---

## Doel

Refactor de huidige 3-kaarten grid (Fullbody, Intro, Celebration) naar een **sectie-gebaseerd overzicht** met alle 6 beheerbare assets, gegroepeerd per categorie.

---

## Wat er nu is

```typescript
// MemberSummarySheet.tsx — getAssetPreviews()
function getAssetPreviews(assets, role): AssetPreview[] {
  return [
    { type: 'fullbody',    label: 'Fullbody',    editTab: 'assets',       icon: <Image />,    mediaType: 'images' },
    { type: 'intro',       label: 'Intro',       editTab: 'intro',        icon: <Video />,    mediaType: 'videos' },
    { type: 'celebration', label: 'Celebration',  editTab: 'celebration',  icon: <Sparkles />, mediaType: 'videos' },
  ];
}
```

**Enkel 1 grid**: `grid-template-columns: repeat(3, 1fr)` — alles op één rij.

---

## Wat het moet worden

### Nieuw type

```typescript
interface AssetSection {
  id: string;
  label: string;
  gridClass: string;         // CSS class voor de grid (2-col of 4-col)
  assets: AssetPreview[];
  filled: number;
  total: number;
}
```

### Nieuwe functie: `getAssetSections()`

Vervangt `getAssetPreviews()`. Retourneert 2 secties:

**Sectie 1: "Foto's"** (2 kolommen, 3:4 aspect ratio)
| Asset | `mediaType` | `assetType` | `editTab` |
|-------|------------|-------------|-----------|
| Fullbody | `images` | `fullbody` | `assets` |
| Close-up | `images` | `closeup` | `assets` |

**Sectie 2: "Video's"** (4 kolommen, 9:16 aspect ratio)
| Asset | `mediaType` | `assetType` | `editTab` |
|-------|------------|-------------|-----------|
| Intro | `videos` | `intro` | `intro` |
| Celebration | `videos` | `celebration` | `celebration` |
| Then vs Now | `videos` | `then_vs_now` | `then_vs_now` |
| Actiefoto | `images` | `action_photo` | `action_photo` |

> **Note**: Actiefoto staat bij Video's qua layout (het is visuele content die je genereert), ook al is het technisch een image. Dit is een bewuste UX-keuze: de admin denkt in "foto's die ik upload" vs "content die ik genereer/bewerk".

### Thumbnail ophalen

Gebruik de bestaande `getFirstAssetUrl()` functie:
```typescript
thumbnail: getFirstAssetUrl(assets, role, mediaType, assetType)
```

### Filled/total berekenen

Per sectie tellen hoeveel assets een thumbnail hebben:
```typescript
const filled = section.assets.filter(a => a.thumbnail !== null).length;
```

---

## CSS wijzigingen

### Nieuwe classes toevoegen

```css
/* Section container */
.assetSection {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Section header: label links, counter rechts */
.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-1);
}

.sectionLabel {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--app-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sectionCount {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  color: var(--app-text-muted);
  font-variant-numeric: tabular-nums;
}

/* Foto's grid: 2 kolommen */
.gridPhotos {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

/* Video's grid: 4 kolommen */
.gridVideos {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
}
```

### Bestaande `.assetCards` grid verwijderen

De oude `repeat(3, 1fr)` grid class wordt niet meer gebruikt — vervangen door de sectie-grids.

### Asset card aanpassen

De bestaande `.assetCard`, `.assetCardPreview`, `.assetCardImg`, `.assetCardIcon`, `.assetCardLabel`, `.assetCardAction` classes **blijven behouden** — ze worden hergebruikt in beide secties.

Enige aanpassing: de `aspect-ratio` op `.assetCardPreview` wordt dynamisch per sectie:

```css
/* Foto's: 3:4 (portret) */
.gridPhotos .assetCardPreview {
  aspect-ratio: 3 / 4;
}

/* Video's: 9:16 (staand video) */
.gridVideos .assetCardPreview {
  aspect-ratio: 9 / 16;
}
```

### "Auto-note" aanpassen

De huidige tekst "Halfbody en close-up worden automatisch afgeleid van fullbody" verplaatsen naar onder de Foto's sectie (in plaats van onder de hele grid).

---

## JSX structuur

```tsx
{/* Asset sections */}
{sections.map((section) => (
  <div key={section.id} className={s.assetSection}>
    <div className={s.sectionHeader}>
      <span className={s.sectionLabel}>{section.label}</span>
      <span className={s.sectionCount}>{section.filled}/{section.total}</span>
    </div>
    <div className={section.gridClass}>
      {section.assets.map((asset) => (
        <button
          key={asset.type}
          type="button"
          className={s.assetCard}
          data-status={asset.thumbnail ? 'done' : 'missing'}
          onClick={() => onEdit?.(member, asset.editTab)}
          disabled={!onEdit}
          aria-label={`${asset.label} ${asset.thumbnail ? 'bewerken' : 'genereren'}`}
        >
          <div className={s.assetCardPreview}>
            {asset.thumbnail ? (
              <img src={asset.thumbnail} alt={asset.label} className={s.assetCardImg} loading="lazy" />
            ) : (
              <span className={s.assetCardIcon}>{asset.icon}</span>
            )}
          </div>
          <span className={s.assetCardLabel}>{asset.label}</span>
          <span className={s.assetCardAction}>
            {asset.thumbnail ? <Pencil size={12} /> : 'Maak'}
          </span>
        </button>
      ))}
    </div>
    {/* Auto-note alleen onder Foto's */}
    {section.id === 'photos' && (
      <p className={s.autoNote}>
        <Clock size={12} aria-hidden="true" />
        Halfbody wordt automatisch afgeleid van fullbody
      </p>
    )}
  </div>
))}
```

---

## Tap-actie

Elke kaart roept `onEdit(member, editTab)` aan — **dezelfde callback als nu**. Dit:
1. Sluit de MemberSummarySheet (`onClose()`)
2. Opent MemberDetailPanel op de tab die bij die asset hoort
3. Slaat `panelSourceMemberRef` op zodat ✕ terug gaat naar de Sheet

**Geen nieuwe props of state nodig** — de bestaande flow werkt al.

---

## Checklist

- [ ] `AssetSection` interface toevoegen
- [ ] `getAssetSections()` functie schrijven (vervangt `getAssetPreviews()`)
- [ ] Section headers renderen met label + counter
- [ ] Foto's grid: 2 kolommen, Close-up kaart toevoegen
- [ ] Video's grid: 4 kolommen, Then vs Now + Actiefoto kaarten toevoegen
- [ ] Aspect ratios per grid: 3:4 (foto's) en 9:16 (video's)
- [ ] Auto-note verplaatsen naar onder Foto's sectie
- [ ] Legacy sectie behouden (ongewijzigd)
- [ ] Voortgangsbalk bijwerken: totaal = som van alle sectie-assets
- [ ] TypeScript clean: `npx tsc --noEmit`
- [ ] Build clean: `cd demo && npx vite build`
