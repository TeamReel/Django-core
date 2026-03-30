# H8 — Selectie & Summary per Rol

| | |
|---|---|
| Fase | H8 |
| Effort | ~2 uur |
| Laag | Frontend |
| Afhankelijkheid | H5 |

## Doel

Selectie-overzicht en summary sheets tonen asset-completeness per rol.

## Scope

### `HubSelectieTab.tsx` — Asset status dots per rol

**Huidige situatie**: Eén set dots per member (5 tracked slots).
**Nieuw**: Dots per rol, of gecombineerde completeness.

```
┌─────────────────────────────────────────┐
│ Naam          Speler    Keeper    Score  │
│ Jan de Vries  ●●●○○    ●●○○○    60%    │
│ Piet Jansen   ●●●●●    —        100%   │
│ Lisa Bakker   ●●●●○    ●●●○○    70%    │
└─────────────────────────────────────────┘
```

- Multi-role leden: aparte kolom per rol
- Single-role leden: één kolom
- Totaal score: gemiddelde over alle rollen

### `MemberSummarySheet.tsx` — Slot grid per rol

**Huidige situatie**: Flat grid van 5 slots.
**Nieuw**: Grouped per rol met sub-slots.

```
Speler:
  ✅ Fullbody (home)    ✅ Closeup (home)    ✅ Intro (home, 3 variants)
  ❌ Fullbody (away)    ❌ Closeup (away)    ❌ Intro (away)

Keeper:
  ✅ Fullbody (gk)      ❌ Closeup (gk)      ❌ Intro (gk)
```

### `getMemberAssetStatus()` — Per rol

Al gerefactord in H5. Hier wordt het geïntegreerd in de UI componenten.

## Checklist

- [ ] HubSelectieTab toont status per rol
- [ ] Kolom per rol bij multi-role leden
- [ ] Totaal score als gewogen gemiddelde
- [ ] MemberSummarySheet grouped per rol
- [ ] Variant count bij video types
- [ ] Responsive: cards op mobiel, tabel op desktop
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npx vite build` succesvol
