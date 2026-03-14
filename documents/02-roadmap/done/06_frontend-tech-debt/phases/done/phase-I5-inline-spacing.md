# I5 — Inline Spacing → Tokens

**Status:** ✅ Done
**Geschatte effort:** 1.5 uur
**Scope:** 166 `padding/margin` + 81 `gap` in inline styles → `var(--space-*)`

---

## Doel

Hardcoded pixel spacing in inline TSX styles vervangen door `var(--space-*)` tokens. Dit zorgt voor consistente spacing op het 4px grid.

---

## Token mapping

| Inline waarde (px) | Token |
|---------------------|-------|
| `2` | `'var(--space-0)'` (2px) |
| `4` | `'var(--space-1)'` (4px) |
| `8` | `'var(--space-2)'` (8px) |
| `12` | `'var(--space-3)'` (12px) |
| `16` | `'var(--space-4)'` (16px) |
| `20` | `'var(--space-5)'` (20px) |
| `24` | `'var(--space-6)'` (24px) |
| `32` | `'var(--space-8)'` (32px) |
| `48` | `'var(--space-12)'` (48px) |
| `64` | `'var(--space-16)'` (64px) |

---

## Formaten in TSX

```tsx
// Simpel nummer → string
style={{ padding: 16 }}        →  style={{ padding: 'var(--space-4)' }}
style={{ gap: 12 }}            →  style={{ gap: 'var(--space-3)' }}

// String met px → token
style={{ margin: '16px' }}     →  style={{ margin: 'var(--space-4)' }}
style={{ padding: '8px 16px' }} → style={{ padding: 'var(--space-2) var(--space-4)' }}

// Off-grid waarden (bijv. 10px, 14px, 18px) → dichtstbijzijnd token
style={{ padding: 10 }}        →  style={{ padding: 'var(--space-3)' }} // 12px
```

---

## Uitzonderingen

- **Negatieve waarden**: Behouden (geen negative space tokens)
- **`calc()` expressies**: Behouden
- **`env()` safe-area**: Behouden
- **Dynamische waarden** (`${variable}px`): Behouden
- **Hele kleine waarden** (1px, 2px in borders): Deels behouden

---

## Verificatie

- [ ] Alle on-grid spacing → token strings
- [ ] Off-grid waarden genormaliseerd naar dichtstbijzijnde token
- [ ] `npx vite build` slaagt
- [ ] TypeScript: geen type errors
- [ ] 8pt grid: layout ziet er consistent uit
