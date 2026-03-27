# A7 — Line-height & Font-family Cleanup

**Status:** ✅ Done
**Geschatte effort:** 20 min
**Scope:** 112 hardcoded `line-height` + `font-family` → tokens (71 bestanden)
**Dependency:** Na A5 (font-size), want line-height is gekoppeld aan font-size

---

## Doel

Alle hardcoded `line-height` en `font-family` waarden vervangen door tokens. Kleine fase maar belangrijk voor typografie-consistentie.

---

## Deel 1: Line-height tokens

### Beschikbare tokens

| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--leading-tight` | 1.25 | Headings, compact UI |
| `--leading-normal` | 1.5 | Body text, standaard |
| `--leading-relaxed` | 1.75 | Long-form text, accessibility |

### Mapping regels

| Hardcoded | → Token |
|-----------|---------|
| `1`, `1.1`, `1.2`, `1.25` | `var(--leading-tight)` |
| `1.3`, `1.35`, `1.4`, `1.5` | `var(--leading-normal)` |
| `1.6`, `1.7`, `1.75`, `1.8`, `2` | `var(--leading-relaxed)` |
| `normal` | `var(--leading-normal)` |

### Pixel waarden

Sommige files gebruiken `line-height: 20px` etc. Deze zijn afhankelijk van font-size context:
- `line-height: 16px` bij `font-size: 12px` → ratio 1.33 → `var(--leading-normal)`
- `line-height: 24px` bij `font-size: 16px` → ratio 1.5 → `var(--leading-normal)`
- `line-height: 20px` bij `font-size: 14px` → ratio 1.43 → `var(--leading-normal)`

**Aanbeveling:** Px-waarden converteren naar unitless ratio tokens. Dit werkt beter met responsive font-sizes.

### Compound type tokens (alternatief)

De `--type-*` tokens combineren font-size + line-height:
```css
font: var(--type-sm); /* = 0.875rem / 1.5 */
```

Overweeg om na A5 + A7 de meest voorkomende font-size + line-height combos te vervangen door `font: var(--type-*)`.

### Uitzonderingen

- `line-height: 0` (layout collapse trick)
- `line-height: inherit`
- `line-height` in `@keyframes`

---

## Deel 2: Font-family cleanup

### Beschikbare tokens

| Token | Waarde |
|-------|--------|
| `--font-sans` | `-apple-system, BlinkMacSystemFont, 'Segoe UI', ...` |
| `--font-mono` | `source-code-pro, Menlo, Monaco, Consolas, ...` |

### Huidige staat

- `base.css` — `body { font-family: var(--font-sans) }` ✅
- **24 bestanden** bevatten nog hardcoded `font-family` declaraties

### Verwachte patronen

```css
/* Vervangen */
font-family: -apple-system, BlinkMacSystemFont, ...;  → var(--font-sans)
font-family: 'Segoe UI', sans-serif;                  → var(--font-sans)
font-family: monospace;                                → var(--font-mono)
font-family: 'Courier New', monospace;                 → var(--font-mono)
font-family: inherit;                                  → verwijderen (al inherited via body)

/* Behouden */
font-family: var(--font-sans);     → al tokenized
font-family: var(--brand-font);    → brand-specifiek, niet vervangen
```

---

## Aanpak

1. **Script voor line-height** — Map numerieke waarden naar tokens
2. **Manueel voor px line-heights** — Bereken ratio, vervang
3. **Script voor font-family** — Vervang bekende stacks
4. **Manueel review** — font-family: inherit declaraties evalueren

---

## Verificatie

- [ ] Alle `line-height` waarden gebruiken `var(--leading-*)` tokens
- [ ] Alle `font-family` waarden gebruiken `var(--font-sans)` of `var(--font-mono)`
- [ ] Geen visuele veranderingen in teksthoogte
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
