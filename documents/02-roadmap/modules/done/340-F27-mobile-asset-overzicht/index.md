# 340-F27 — Mobile Asset Overzicht & iOS Navigatie

| | |
|---|---|
| Code | F27 |
| Status | ✅ DONE |
| Prioriteit | Hoog |
| Geschatte effort | ~6 uur |
| Afhankelijkheid | B70 (assets per role — afgerond) |
| Doelgroep | Club Admin, Team Admin (mobiel) |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie (na B70)

De **MemberSummarySheet** op mobiel toont slechts **3 van de 7+ assets** per lid:
- Fullbody, Intro, Celebration

**Ontbrekend in het overzicht:**
- Close-up (afgeleid van fullbody — status onbekend)
- Actiefoto (apart tabblad in panel, niet in overzicht)
- Then vs Now / Transformatie (nieuw tabblad, niet in overzicht)
- Legacy in Tenue (nieuw in B70, niet in overzicht)

### 1.2 Vastgestelde problemen (Playwright review 23-03-2026)

| # | Probleem | Impact |
|---|----------|--------|
| P1 | Summary Sheet toont 3/7 assets — admin ziet niet welke assets klaar zijn | Geen quick-scan mogelijk |
| P2 | Geen categorie-indeling — alles in één rij van 3 kaarten | Onduidelijk wat bij elkaar hoort |
| P3 | "Bewerken" knop opent altijd Assets tab — geen directe categorie-navigatie | Extra taps nodig |
| P4 | Voortgangsbalk toont "4/5" maar niet *welke* 4 | Geen actionable informatie |
| P5 | Legacy section staat los van asset-overzicht | Niet duidelijk dat dit een asset is |

### 1.3 Gewenste situatie

**Complete asset-scan in één scherm** — de admin opent een lid en ziet direct:
- Welke assets klaar zijn (✓) en welke ontbreken (—)
- Gegroepeerd per categorie met voortgang per groep
- Tap op elke asset → opent direct de juiste bewerkings-tab

---

## 2. Inventaris: Assets per Lid

### 2.1 Tracked assets per roltype

Bron: `ASSET_TYPES_BY_ROLE` in `assetMetadata.ts`

| Roltype | Tracked assets |
|---------|---------------|
| `player` | fullbody, halfbody, closeup, intro, celebration |
| `keeper` | fullbody, halfbody, closeup, intro, celebration |
| `coach` | profile |
| `assistant` | profile |

### 2.2 Extra assets (niet rolgebonden)

| Asset | Type | Status |
|-------|------|--------|
| Actiefoto | image | Eigen tab in MemberDetailPanel |
| Then vs Now | video | Eigen tab (nieuw in B70) |
| Legacy in Tenue | image | In Assets tab (nieuw in B70) |
| Duo Portret | video | Desktop-only (composite) |
| Walking Composite | video | Desktop-only (composite) |

### 2.3 Wat tonen in MemberSummarySheet?

**Beslissing**: Toon alle assets die de admin actief kan beheren op mobiel.

| Categorie | Assets | Aspect ratio | Mobiele tab |
|-----------|--------|-------------|-------------|
| **Foto's** | Fullbody, Close-up | 3:4 | `assets` |
| **Video's** | Intro, Celebration, Then vs Now, Actiefoto | 9:16 | `intro`, `celebration`, `then_vs_now`, `action_photo` |
| **Legacy** | Legacy foto + Legacy in Tenue | 3:4 | `assets` / `then_vs_now` |

*Halfbody wordt automatisch afgeleid → niet als aparte kaart.*
*Duo Portret en Walking Composite → desktop-only (team-composites, niet per lid beheerbaar).*

---

## 3. Design

### 3.1 Informatiearchitectuur (3 lagen)

```
Laag 1: Selectie-tab (teamoverzicht)
  ↓ tap member
Laag 2: MemberSummarySheet (asset-overzicht per lid)
  ↓ tap asset-kaart
Laag 3: MemberDetailPanel (bewerken per categorie)
```

### 3.2 MemberSummarySheet — Nieuw ontwerp

```
┌─────────────────────────────────────────────┐
│  Selectie                             [×]   │
├─────────────────────────────────────────────┤
│       [◀]    3 / 18 · 12 met foto    [▶]   │
│                                             │
│              [  Avatar  ]                   │
│            Brian Stokvis                    │
│              ASC Helden 6                   │
│                                             │
│  ── Foto's ────────────────────── 2/2 ──   │
│  ┌──────────┐  ┌──────────┐                │
│  │          │  │          │                │
│  │ Fullbody │  │ Close-up │                │
│  │    ✓     │  │    ✓     │                │
│  └──────────┘  └──────────┘                │
│                                             │
│  ── Video's ───────────────────── 1/4 ──   │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐  │
│  │       │ │       │ │       │ │       │  │
│  │ Intro │ │Celeb. │ │ TvsN  │ │Actie- │  │
│  │   ✓   │ │   —   │ │   —   │ │ foto  │  │
│  └───────┘ └───────┘ └───────┘ └───────┘  │
│                                             │
│  ── Legacy ───────────────────────────── ─  │
│  ┌────┐  Historische foto beschikbaar       │
│  │    │  Klaar voor transformatie-video      │
│  └────┘                                     │
│                                             │
│  ▊▊▊▊▊▊▊▊▊░░░░░░░  3/6                    │
│                                             │
│  [ ✏ Bewerken ]  [ Bekijk profiel → ]       │
└─────────────────────────────────────────────┘
```

### 3.3 Grid specificaties

| Categorie | Kolommen | Aspect ratio | Card min-height |
|-----------|----------|-------------|----------------|
| Foto's | `repeat(2, 1fr)` | 3:4 | 120px |
| Video's | `repeat(4, 1fr)` | 9:16 | 100px |
| Legacy | Horizontale row (thumbnail + tekst) | — | — |

### 3.4 Asset card states

| State | Border | Achtergrond | Badge |
|-------|--------|-------------|-------|
| `done` | `var(--app-success)` solid | Thumbnail preview | ✓ icon |
| `missing` | `var(--app-border)` dashed | Placeholder icon | "Maak" tekst |
| `processing` | `var(--color-amber-500)` solid | Thumbnail + spinner | Processing badge |

### 3.5 Navigatie-flow

```
Actie                          Resultaat
─────────────────────────────  ──────────────────────────
Tap member in Selectie         → Open MemberSummarySheet
Tap asset-kaart in Sheet       → Sluit Sheet, open MemberDetailPanel op juiste tab
Tap ✕ op MemberSummarySheet    → Sluit naar Selectie-tab
Tap ✕ op MemberDetailPanel     → Terug naar MemberSummarySheet (bestaand: panelSourceMemberRef)
Tap ◀/▶ in Sheet               → Wissel naar vorig/volgend lid
```

---

## 4. Technisch ontwerp

### 4.1 Bestanden die wijzigen

| Bestand | Type wijziging |
|---------|---------------|
| `demo/src/pages/identity/MemberSummarySheet.tsx` | Refactor `getAssetPreviews()`, nieuwe sectie-rendering |
| `demo/src/pages/identity/MemberSummarySheet.module.css` | Nieuwe grid-secties, section headers |
| `demo/src/utils/assetMetadata.ts` | Eventueel: `SUMMARY_ASSETS` constant toevoegen |

### 4.2 Refactor: `getAssetPreviews()` → `getAssetSections()`

**Huidige code** (3 hardcoded assets):
```typescript
function getAssetPreviews(assets, role): AssetPreview[] {
  return [
    { type: 'fullbody', label: 'Fullbody', editTab: 'assets', ... },
    { type: 'intro',    label: 'Intro',    editTab: 'intro', ... },
    { type: 'celebration', label: 'Celebration', editTab: 'celebration', ... },
  ];
}
```

**Nieuw** (gegroepeerd per categorie):
```typescript
interface AssetSection {
  id: string;
  label: string;
  assets: AssetPreview[];
  filled: number;
  total: number;
}

function getAssetSections(assets, role): AssetSection[] {
  return [
    {
      id: 'photos',
      label: "Foto's",
      assets: [
        { type: 'fullbody', label: 'Fullbody', editTab: 'assets', aspectRatio: '3/4' },
        { type: 'closeup',  label: 'Close-up', editTab: 'assets', aspectRatio: '3/4' },
      ],
      filled: ...,
      total: 2,
    },
    {
      id: 'videos',
      label: "Video's",
      assets: [
        { type: 'intro',       label: 'Intro',       editTab: 'intro',       aspectRatio: '9/16' },
        { type: 'celebration', label: 'Celebration',  editTab: 'celebration', aspectRatio: '9/16' },
        { type: 'then_vs_now', label: 'Then vs Now',  editTab: 'then_vs_now', aspectRatio: '9/16' },
        { type: 'action_photo', label: 'Actiefoto',   editTab: 'action_photo', aspectRatio: '9/16' },
      ],
      filled: ...,
      total: 4,
    },
  ];
}
```

### 4.3 JSX structuur (nieuw)

```tsx
{sections.map((section) => (
  <div key={section.id} className={s.assetSection}>
    <div className={s.sectionHeader}>
      <span className={s.sectionLabel}>{section.label}</span>
      <span className={s.sectionCount}>{section.filled}/{section.total}</span>
    </div>
    <div className={s[`grid_${section.id}`]}>
      {section.assets.map((asset) => (
        <button key={asset.type} className={s.assetCard} data-status={...} onClick={...}>
          <div className={s.assetCardPreview} style={{ aspectRatio: asset.aspectRatio }}>
            {/* thumbnail of placeholder */}
          </div>
          <span className={s.assetCardLabel}>{asset.label}</span>
        </button>
      ))}
    </div>
  </div>
))}
```

### 4.4 CSS structuur (nieuw)

```css
.assetSection {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

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

/* Foto's: 2 kolommen, 3:4 */
.grid_photos {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

/* Video's: 4 kolommen, 9:16 */
.grid_videos {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
}
```

### 4.5 Bestaande helpers hergebruiken

| Helper | Locatie | Gebruik |
|--------|---------|---------|
| `getFirstAssetUrl()` | `MemberSummarySheet.tsx` | Thumbnail ophalen per asset type |
| `iterVariants()` | `assetMetadata.ts` | Check of asset data bestaat |
| `getMemberRoleStatuses()` | `assetStatus.ts` | Voortgang per rol |
| `getAssetRoles()` | `assetMetadata.ts` | Primaire rol bepalen |
| `getLegacyPhotoUrl()` | `MemberSummarySheet.tsx` | Legacy foto URL |

---

## 5. Fasering

| Fase | Titel | Geschatte effort | Bestanden |
|------|-------|-----------------|-----------|
| H0 | Asset-grid uitbreiden naar secties | ~3 uur | `MemberSummarySheet.tsx`, `.module.css` |
| H1 | Close-up, Then vs Now, Actiefoto kaarten | ~2 uur | `MemberSummarySheet.tsx`, evt. `assetMetadata.ts` |
| H2 | Verify & Polish | ~1 uur | Playwright tests, responsive check |

---

## 6. Acceptatiecriteria

- [ ] MemberSummarySheet toont **alle 6 beheerbare assets** (Fullbody, Close-up, Intro, Celebration, Then vs Now, Actiefoto)
- [ ] Assets gegroepeerd in **2 secties** (Foto's, Video's) met section headers en teller
- [ ] **Tap op asset-kaart** → opent MemberDetailPanel op de juiste tab
- [ ] **Legacy sectie** blijft behouden voor leden met historische foto
- [ ] **Voortgangsbalk** reflecteert het totaal van alle getoonde assets
- [ ] **Responsive**: Werkt op 375px, 390px, 428px viewports
- [ ] **Toegankelijkheid**: Touch targets ≥44px, focus-visible, aria-labels
- [ ] **Back-navigatie**: Panel ✕ → terug naar SummarySheet (bestaande flow behouden)
- [ ] Geen TypeScript errors (`npx tsc --noEmit`)
- [ ] Vite build slaagt (`npx vite build`)

---

## 7. Relatie met B70

Deze feature bouwt voort op B70 (assets per role) maar is een **apart UX-verbetertraject**:
- B70 = datamodel + backend + frontend tabs (afgerond)
- F27 = mobiel overzicht + navigatie-optimalisatie (nieuw)

De bestaande B70-componenten (`MemberDetailPanel`, `MemberAssetsTab`, etc.) blijven ongewijzigd — alleen de **MemberSummarySheet** wordt uitgebreid om een completer overzicht te bieden.
