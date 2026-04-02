# H6 — MemberDetailPanel Role Tabs + Variants

| | |
|---|---|
| Fase | H6 |
| Effort | ~4 uur |
| Laag | Frontend |
| Afhankelijkheid | H5 |

## Doel

MemberDetailPanel uitbreiden met role-tabs en per-kit variant grid. Gebruiker kan per rol de assets bekijken en beheren.

## Scope

### `MemberDetailPanel.tsx` — Role tabs

```
┌─────────────────────────────────────────┐
│ Jan de Vries            [×]             │
│                                         │
│ [Speler] [Keeper]     ← role tabs       │
│                                         │
│ ┌─ Home ──────────────────────────────┐ │
│ │ Fullbody  Halfbody  Closeup         │ │
│ │ [img]     [img]     [img]           │ │
│ │                                     │ │
│ │ Intro                               │ │
│ │ [default] [arms_crossed] [thumbs_up]│ │
│ │                                     │ │
│ │ Celebration                         │ │
│ │ [default] [thumbs_up]              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─ Away ──────────────────────────────┐ │
│ │ Fullbody  Halfbody  Closeup         │ │
│ │ [img]     [img]     [img]           │ │
│ │                                     │ │
│ │ Intro                               │ │
│ │ [default]                           │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Role tab logica

- Tabs tonen alleen als lid meerdere rollen heeft
- Enkele rol: geen tabs, direct content
- Default: primaire rol geselecteerd
- Tab badge: completeness % per rol

### `MemberAssetsTab.tsx` — Per-kit sectie

Per kit een sectie met:
1. **Image slots**: fullbody, halfbody, closeup (elk max 1 per kit, variant=default)
2. **Video variants**: intro, celebration met meerdere varianten als thumbnails
3. **Upload button**: asset type + kit + variant + role meesturen

### Variant grid

- Video varianten als horizontale thumbnail-rij per asset type
- Hover: variant naam als tooltip
- Click: open in asset viewer
- `+` knop: nieuwe variant uploaden
- Empty state: "Nog geen intro video voor home tenue"

### Upload flow

```typescript
// Bij upload:
const payload = {
  membership_id: member.id,
  asset_type: "intro",
  kit_type: "home",
  variant_id: "arms_crossed",
  role: selectedRole,  // Van de actieve tab
};
```

## Checklist

- [ ] Role tabs in MemberDetailPanel (conditioneel bij multi-role)
- [ ] Tab badge met completeness %
- [ ] Per-kit secties met image slots + video variants
- [ ] Variant grid (horizontale thumbnails)
- [ ] Upload stuurt role + variant mee
- [ ] Empty states per kit/type
- [ ] WCAG: focus management bij tab switch, keyboard navigatie
- [ ] Touch targets ≥ 44×44px
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npx vite build` succesvol
