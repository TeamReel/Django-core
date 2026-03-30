# I3 — Inline Border-Radius → Tokens

**Status:** ✅ Done
**Geschatte effort:** 1 uur
**Scope:** 134 hardcoded `borderRadius` in inline styles → CSS tokens

---

## Doel

De **directe oorzaak** van visuele inconsistenties (vierkante vs ronde hoeken op dezelfde pagina) oplossen. Alle hardcoded `borderRadius` waarden in TSX inline styles standaardiseren naar het token-scale.

---

## Probleem

```tsx
// Bestand A: borderRadius: 6  (geen token — off-scale)
// Bestand B: borderRadius: 8  (= --radius-md)
// Bestand C: borderRadius: 10 (geen token — off-scale)
// Bestand D: borderRadius: 12 (= --radius-lg)
// Bestand E: borderRadius: 999 (= --radius-full)
// Resultaat: 5 verschillende hoeken op dezelfde pagina
```

---

## Token mapping

| Inline waarde | Token | Actie |
|---------------|-------|-------|
| `2`, `3` | `var(--radius-sm)` (4px) | Round up |
| `4` | `var(--radius-sm)` | Exact match |
| `6` | `var(--radius-md)` (8px) | Round up |
| `8` | `var(--radius-md)` | Exact match |
| `10` | `var(--radius-lg)` (12px) | Round up |
| `12` | `var(--radius-lg)` | Exact match |
| `16` | `var(--radius-lg)` | Round down (zeldzaam) |
| `999`, `1000`, `9999` | `'var(--radius-full)'` | Pill |
| `'50%'` | `'50%'` | Behouden (circle via percentage) |

---

## Technische uitdaging

Inline styles in React kunnen **geen CSS custom properties** direct gebruiken als number:
```tsx
// ❌ Dit werkt niet:
style={{ borderRadius: var(--radius-md) }}

// ✅ Dit werkt:
style={{ borderRadius: 'var(--radius-md)' }}  // string

// ✅ Of beter: verplaats naar CSS module
className={styles.card}  // .card { border-radius: var(--radius-md); }
```

**Strategie:** Waar mogelijk inline `borderRadius` verplaatsen naar bestaande CSS module classes. Waar geen CSS module bestaat: string `'var(--radius-*)'` gebruiken.

---

## Top bestanden

| Bestand | Count | Waarden |
|---------|-------|---------|
| `Skeleton.tsx` | 14 | 2, 6, 8, 12 |
| `ClubHierarchyTab.tsx` | 5 | 8, 10, 999 |
| `addMemberModalStyles.ts` | 5 | 6, 8, 12 |
| `memberBatchAction.styles.ts` | 4 | 3, 8, 12 |
| `batchTypes.ts` | 4 | 6, 8, 16, 50% |
| `BatchProgressStep.tsx` | 2 | 2, 8 |
| `TileGrid.tsx` | 1 | 12 |

---

## Verificatie

- [ ] Alle hardcoded borderRadius gemapped of naar CSS module
- [ ] Off-scale waarden (6, 10, 16) genormaliseerd naar dichtstbijzijnde token
- [ ] `npx vite build` slaagt
- [ ] TypeScript: geen type errors
- [ ] Visueel: consistente hoeken op dashboard + detail pagina's
