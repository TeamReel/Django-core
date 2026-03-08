# T1 — Token & Typography Foundation

**Status:** Todo
**Geschatte effort:** 15 min
**Bestanden:** `demo/src/styles/tokens.css`, `packages/design-system/src/tokens/radius.css.ts`

---

## Doel

De font-size tokens en radius tokens op grid brengen zodat alle downstream references automatisch meeveranderen.

## Huidige staat

### Font-size tokens (tokens.css)

| Token | Huidig | Voorstel | Change |
|-------|--------|----------|--------|
| `--text-2xs` | 10px (0.625rem) | **10px** — behouden | - (caption, micro-badges) |
| `--text-xs` | 11px (0.6875rem) | **12px** (0.75rem) | +1px |
| `--text-md` | 13px (0.8125rem) | **verwijder** → gebruik `--text-sm` of `--text-base` | cleanup |
| `--text-base` | 14px (0.875rem) | **14px** — behouden | - (web standaard) |
| `--text-xl` | 18px (1.125rem) | **18px** — behouden | - (typografisch) |

### Rationaal: typography bewust off-grid

Font-sizes volgen een **typografische schaal**, niet de spacing grid. De 8pt grid geldt strikt voor spatial properties (padding, margin, gap, sizes). Het is standaard practice om font-sizes op een eigen schaal te houden (10, 12, 14, 16, 18, 20, 24, 32).

**Conclusie:** We passen alleen `--text-xs` aan (11px → 12px) en verwijderen `--text-md` (13px is te dicht bij 12 en 14). De rest blijft.

### Radius tokens (design-system)

| Token | Huidig | Voorstel | Change |
|-------|--------|----------|--------|
| `radius.sm` | 2px | **4px** | +2px |

## Veranderingen

### 1. tokens.css — `--text-xs` aanpassen

```css
/* Was */
--text-xs:  0.6875rem;  /* 11px */

/* Wordt */
--text-xs:  0.75rem;    /* 12px */
```

### 2. tokens.css — `--text-md` depreceren

```css
/* Was */
--text-md:  0.8125rem;  /* 13px */

/* Wordt */
/* --text-md: DEPRECATED — gebruik --text-sm (12px) of --text-base (14px) */
```

Zoek alle `--text-md` usages en vervang door `--text-sm` of `--text-base`.

### 3. radius.css.ts — `sm` aanpassen

```ts
// Was
sm: '2px'

// Wordt
sm: '4px'
```

## Impact check

Na deze wijzigingen:
- Alles wat `var(--text-xs)` gebruikt gaat van 11px → 12px
- Alles wat `var(--text-md)` gebruikt moet handmatig gemigreerd worden
- Alles wat `radius.sm` token gebruikt gaat van 2px → 4px

## Verificatie

- [ ] `tsc --noEmit` — geen TypeScript errors
- [ ] Visueel check: badges, labels, meta-text (11→12px diff)
- [ ] Grep `--text-md` — alle usages vervangen
- [ ] Grep `radius.*sm` in design-system — check visueel effect
