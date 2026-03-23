# H6 — MemberDetailPanel Role Tabs

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~4 uur |
| Laag | Frontend |
| Afhankelijkheid | H5 |

## Doel

MemberDetailPanel uitbreiden met role-tabs en variant-display zodat assets per rol en per variant bekeken worden.

## Implementatie

### 1. Role selector

**Bestand**: `demo/src/pages/periods/MemberDetailPanel.tsx`

- Horizontale role pills bovenaan panel
- Toont alle rollen van het lid (uit `functional_roles`)
- Default: primaire rol geselecteerd
- Switch → toont assets voor die rol

### 2. MemberAssetsTab per rol + variant display

**Bestand**: `demo/src/pages/periods/MemberAssetsTab.tsx`

- Ontvangt `selectedRole` prop
- Per asset type: toon alle varianten als grid
  - Intro → grid van thumbnails: "Default", "Armen over elkaar", "Duim omhoog"
  - Closeup → enkele foto per kit (alleen "default")
- Per-kit sectie:
  - **keeper**: goalkeeper kit
  - **player**: home / away / third
- Upload/generate knoppen per variant slot

### 3. Variant labels

```typescript
const VARIANT_LABELS: Record<string, string> = {
  default: "Standaard",
  arms_crossed: "Armen over elkaar",
  thumbs_up: "Duim omhoog",
  hands_on_head: "Handen op hoofd",
  // ... uitbreidbaar
};
```

### 4. Empty states

- Rol zonder assets: "Nog geen assets voor [rol]"
- Variant slot leeg: ghost card met + icoon

### CSS

- `.roleSelector` — horizontal pills (re-use HubSelectieTab\.roleBadge styling)
- `.variantGrid` — CSS grid voor variant thumbnails
- `.variantCard` / `.variantCardEmpty` — thumbnail + label
- Touch target ≥ 44×44px
- Mobile: 2 kolommen, scrollable

## Acceptatiecriteria

- [ ] Role pills tonen alle rollen
- [ ] Switch rol → assets updaten
- [ ] Variant grid voor video types (intro, celebration)
- [ ] Enkele asset voor image types (closeup, fullbody)
- [ ] Upload/generate per variant slot
- [ ] Empty state per variant
- [ ] Responsive mobile layout
- [ ] Keyboard navigeerbaar
