# I6 — Inline Colors → Tokens

**Status:** ✅ Done
**Geschatte effort:** 1 uur
**Scope:** 111 `color: '#hex'` + 23 `backgroundColor: '#hex'` in inline styles → tokens

---

## Doel

Hardcoded hex kleuren in inline TSX styles vervangen door `var(--color-*)` of `var(--app-*)` semantic tokens. Dit is essentieel voor dark mode: hardcoded kleuren reageren niet op theme changes.

---

## Veelvoorkomende waarden

| Hex | Semantic betekenis | Token |
|-----|-------------------|-------|
| `#fff` / `#ffffff` | Wit op primary buttons | `'var(--color-neutral-50)'` |
| `#666` / `#999` | Muted tekst | `'var(--app-muted-text)'` |
| `#60a5fa` | Blauw accent | `'var(--color-blue-400)'` |
| `#dc2626` / `#c00` | Error/destructive | `'var(--color-red-500)'` |
| `#059669` | Success groen | `'var(--color-green-600)'` |
| `#8b5cf6` | Violet accent | `'var(--color-violet-500)'` |
| `#d97706` | Amber/warning | `'var(--color-amber-500)'` |
| `#6c757d` | Neutral gray | `'var(--color-neutral-400)'` |
| `#fee` | Error background | `'var(--color-red-50)'` |

---

## Aanpak

```tsx
// Voor:
style={{ color: '#dc2626' }}
style={{ backgroundColor: '#fee', color: '#c00' }}

// Na:
style={{ color: 'var(--color-red-500)' }}
style={{ backgroundColor: 'var(--color-red-50)', color: 'var(--color-red-600)' }}
```

---

## Ontbrekende token: `--color-on-primary`

Minstens 5 componenten gebruiken `color: '#fff'` op gevulde knoppen. Dit hoort een semantic token te zijn:
```css
:root { --color-on-primary: var(--color-neutral-50); }
[data-theme="dark"] { --color-on-primary: var(--color-neutral-50); }
```
Toevoegen aan `tokens.css` als onderdeel van deze fase.

---

## Verificatie

- [ ] Alle bekende hex → token mappings vervangen
- [ ] `--color-on-primary` token toegevoegd
- [ ] `npx vite build` slaagt
- [ ] Dark mode: alle inline kleuren reageren op theme switch
