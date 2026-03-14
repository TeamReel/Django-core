# A3 — Motion Token Adoption

**Status:** ✅ Done
**Geschatte effort:** 45 min
**Scope:** 234 hardcoded `transition`/`animation` → tokens (79 bestanden)

---

## Doel

Alle hardcoded durations en easing functies vervangen door motion tokens. Dit maakt animaties consistent en respecteert `prefers-reduced-motion` centraal.

---

## Beschikbare tokens

### Duration
| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--duration-fast` | 100ms | Micro-interacties: hover, focus, toggle |
| `--duration-normal` | 200ms | Standaard: fade, slide, collapse |
| `--duration-slow` | 300ms | Complexer: modal open, drawer slide |
| `--duration-slower` | 500ms | Elaborate: page transitions, skeleton fade |

### Easing
| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standaard (Material ease) |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Element verlaat viewport |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Element komt in beeld |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Element beweegt binnen viewport |

---

## Mapping regels

### Duration mapping

| Hardcoded | → Token | Rationale |
|-----------|---------|-----------|
| `0.1s`, `100ms`, `0.12s`, `0.15s` | `var(--duration-fast)` | Micro-interactie |
| `0.2s`, `200ms`, `0.18s`, `0.25s` | `var(--duration-normal)` | Standaard |
| `0.3s`, `300ms`, `0.35s` | `var(--duration-slow)` | Complex |
| `0.4s`, `0.5s`, `400ms`, `500ms` | `var(--duration-slower)` | Elaborate |

### Easing mapping

| Hardcoded | → Token |
|-----------|---------|
| `ease` | `var(--ease-default)` |
| `ease-in-out` | `var(--ease-in-out)` |
| `ease-in` | `var(--ease-in)` |
| `ease-out` | `var(--ease-out)` |
| `cubic-bezier(0.4, 0, 0.2, 1)` | `var(--ease-default)` |

### Uitzonderingen (NIET vervangen)

- `transition: none` / `animation: none` — bewuste disables
- `@keyframes` durations/easing — zijn per definitie custom
- `transition-delay` — behouden als hardcoded (geen token nodig)
- `animation-duration` in complexe multi-step animaties — case-by-case
- `linear` easing — behouden (progress bars, spinners)

---

## Aanpak

### Stap 1: Compound `transition` shorthand splitsen

Veel waarden zijn: `transition: color 0.2s ease, background-color 0.2s ease`

Script vervangt:
- `0.2s` → `var(--duration-normal)`
- `ease` → `var(--ease-default)`

Resultaat: `transition: color var(--duration-normal) var(--ease-default), background-color var(--duration-normal) var(--ease-default)`

### Stap 2: Standalone properties

```css
/* Voor */
transition-duration: 0.3s;
transition-timing-function: ease-in-out;

/* Na */
transition-duration: var(--duration-slow);
transition-timing-function: var(--ease-in-out);
```

### Stap 3: Toevoegen `prefers-reduced-motion` globale override

In `base.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Bonus: Opacity tokens aanmaken

Veel transitions gaan samen met opacity. Voeg toe aan `tokens.css`:

```css
:root {
  --opacity-disabled: 0.5;
  --opacity-hover: 0.8;
  --opacity-overlay: 0.6;
  --opacity-muted: 0.7;
}
```

---

## Verificatie

- [ ] Alle `transition` waarden gebruiken duration + ease tokens
- [ ] `prefers-reduced-motion` schakelt alle animaties uit
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Visuele check: hover effects, modal opens, tab switches
- [ ] Performance: geen reflow door nieuwe transition waarden
