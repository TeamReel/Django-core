# L1 — CSS @layer Refactor (Important Cleanup)

**Status:** ✅ Done
**Geschatte effort:** 2 uur
**Bestanden:**
- `demo/src/styles/base.css` (40+ `!important` declaraties)
- `demo/src/styles/utility.css`
- `demo/src/styles/layouts.css`
- Mogelijk component `.module.css` bestanden

---

## Doel

De 40+ `!important` overrides in `base.css` vervangen door een structurele oplossing: **CSS Cascade Layers** (`@layer`). Dit elimineert specificity wars en maakt de CSS architectuur professioneel.

---

## Probleem

`base.css` bevat regels als:

```css
thead, th {
  background-color: var(--app-table-header-bg) !important;
  color: var(--app-text) !important;
  border-color: var(--app-border) !important;
}

input, select, textarea {
  background-color: var(--app-input-bg) !important;
  color: var(--app-input-text) !important;
  border: 1px solid var(--app-input-border) !important;
}
```

`!important` is nodig omdat component CSS (CSS Modules) dezelfde specificity heeft als de base styles. Dit is een **specificity conflict**, geen design keuze.

---

## Oplossing: `@layer`

CSS `@layer` definieert een expliciete cascade volgorde. Layers later in de lijst "winnen" automatisch, zonder `!important`.

### Layer structuur

```css
/* In index.css of main entry point */
@layer reset, tokens, base, utilities, components, overrides;
```

| Layer | Bevat | Prioriteit |
|-------|-------|------------|
| `reset` | Box-sizing, margin reset | Laagst |
| `tokens` | `:root` variabelen, `[data-theme]` | ↑ |
| `base` | HTML element styles (body, h1, table, input) | ↑ |
| `utilities` | Utility classes (.flex, .gap-4, etc.) | ↑ |
| `components` | CSS Modules (automatisch unlayered = hoogste) | Hoogst |
| `overrides` | Dark mode fixes, edge cases | Alleen als nodig |

### Hoe het werkt

```css
/* base.css — nu ZONDER !important */
@layer base {
  thead, th {
    background-color: var(--app-table-header-bg);
    color: var(--app-text);
    border-color: var(--app-border);
  }

  input, select, textarea {
    background-color: var(--app-input-bg);
    color: var(--app-input-text);
    border: 1px solid var(--app-input-border);
  }
}
```

Component CSS (CSS Modules) is **unlayered** en wint altijd van layered CSS. Dus component styles overschrijven base styles automatisch — exact het gedrag dat we willen.

---

## Aanpak

### Stap 1: Layer order declareren

In het main CSS entry point (waarschijnlijk `index.css` of via Vite config):

```css
@layer reset, tokens, base, utilities;
```

### Stap 2: `base.css` wrappen

```css
@layer base {
  /* Alle bestaande base.css content (excl. @keyframes) */
}
```

### Stap 3: `!important` verwijderen

Nu base in een layer zit, winnen component styles automatisch. Verwijder alle `!important` vlaggen.

**Let op:** Sommige `!important` zijn nodig voor inline styles (React `style={{}}` props). Die moeten behouden blijven.

### Stap 4: `tokens.css` wrappen

```css
@layer tokens {
  :root { /* alle tokens */ }
  [data-theme="dark"] { /* dark overrides */ }
}
```

### Stap 5: `utility.css` wrappen

```css
@layer utilities {
  .flex { display: flex; }
  .gap-4 { gap: var(--space-4); }
  /* etc. */
}
```

### Stap 6: Testen

Elke pagina checken — de visuele output moet identiek zijn. Het enige verschil is dat `!important` weg is.

---

## Risico's

| Risico | Mitigatie |
|--------|----------|
| CSS Modules worden in een layer geplaatst door Vite | Vite 5+ plaatst CSS Modules standaard **buiten** layers — check of dit klopt |
| `@layer` is niet supported in IE11 | IE11 support is niet nodig (React 18 vereist moderne browsers) |
| Inline styles (`style={{}}`) worden niet beïnvloed door layers | Juist — `!important` op base rules die inline styles moeten overriden moeten behouden blijven |
| Import volgorde verandert | Layer order is expliciet — import volgorde maakt niet meer uit |

---

## Browser support

| Browser | Support |
|---------|---------|
| Chrome 99+ | ✅ |
| Firefox 97+ | ✅ |
| Safari 15.4+ | ✅ |
| Edge 99+ | ✅ |
| iOS Safari 15.4+ | ✅ |

**Conclusie:** Volledig veilig voor ons doelpubliek.

---

## Verificatie

- [ ] Alle `!important` in `base.css` verwijderd (behalve inline-style overrides)
- [ ] `@layer` order gedeclareerd in entry point
- [ ] base.css, tokens.css, utility.css in correcte layers
- [ ] Component CSS (Modules) is unlayered → wint altijd
- [ ] Dark mode: alle overrides werken nog
- [ ] Form controls: inputs, selects, textareas gestyled
- [ ] Tables: headers, rows, hover states correct
- [ ] `npx vite build` slaagt
- [ ] `pnpm lint:css` = 0 violations
- [ ] Steekproef op 5+ pagina's: visueel identiek
