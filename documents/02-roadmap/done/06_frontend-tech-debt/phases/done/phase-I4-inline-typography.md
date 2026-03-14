# I4 — Inline Typography → Tokens

**Status:** ✅ Done
**Geschatte effort:** 1.5 uur
**Scope:** 229 `fontSize` + 114 `fontWeight` in inline styles → tokens

---

## Doel

Hardcoded `fontSize` en `fontWeight` waarden in inline TSX styles vervangen door design tokens. Dit zorgt voor consistente typografie en laat fluid typography (H2 clamp()-tokens) ook doorwerken in inline styles.

---

## Font-size mapping

| Inline waarde | Token |
|---------------|-------|
| `11`, `12` | `'var(--text-xs)'` |
| `13`, `14` | `'var(--text-sm)'` |
| `15`, `16` | `'var(--text-base)'` |
| `18`, `20` | `'var(--text-lg)'` |
| `22`, `24` | `'var(--text-xl)'` |
| `28+` | Behouden (hero/display — boven token scale) |

## Font-weight mapping

| Inline waarde | Token |
|---------------|-------|
| `400` | `'var(--font-normal)'` |
| `500` | `'var(--font-medium)'` |
| `600` | `'var(--font-semibold)'` |
| `700` | `'var(--font-bold)'` |
| `800`, `900` | Behouden (ultra-bold, zeldzaam) |

---

## Technische aanpak

```tsx
// Voor: hardcoded
style={{ fontSize: 14, fontWeight: 600 }}

// Na: token strings
style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}

// Ideaal: CSS module (waar een class al bestaat)
className={styles.label}  // .label { font: var(--type-sm); font-weight: var(--font-semibold); }
```

---

## Verificatie

- [ ] Alle font-sizes in token range → token string
- [ ] Alle font-weights in token range → token string
- [ ] `npx vite build` slaagt
- [ ] TypeScript: geen type errors
- [ ] Fluid typography schaalt correct door naar inline styles
