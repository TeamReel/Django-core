# G1 — Guardrails (Stylelint)

**Status:** ✅ Done
**Werkelijke effort:** 25 min
**Bestanden:**
- `demo/.stylelintrc.json` (nieuw)
- `demo/stylelint-plugin-8pt-grid.cjs` (nieuw — custom plugin)
- `demo/package.json` (devDependencies + lint:css script)

---

## Doel

Stylelint regels opzetten die twee dingen afdwingen:
1. **Geen off-grid px-waarden** voor spatial properties (padding, margin, gap, etc.)
2. **Geen hardcoded hex-kleuren** in component CSS — altijd via tokens

Regressie-preventie na T1-P1 + K1.

## Aanpak

### 1. Installeer stylelint

```bash
pnpm add -D stylelint stylelint-config-standard
```

### 2. Custom regel of plugin

Gebruik `stylelint-declaration-strict-value` of een custom regex-based approach:

```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "declaration-property-value-allowed-list": {
      "/^(padding|margin|gap|border-radius|width|height|min-width|min-height|max-width|max-height|top|right|bottom|left|inset)/": [
        "/^(0|var\\(--|calc\\(|auto|inherit|initial|unset|100%|fit-content)/",
        "/^-?\\d*(0|4|8)px/",
        "/^-?\\d+rem/",
        "/^\\d+%/",
        "/^\\d+vh/",
        "/^\\d+vw/"
      ]
    }
  }
}
```

Dit is een benadering — in de praktijk is een custom plugin beter:

### 3. Alternatief: custom stylelint plugin

Maak een simpele plugin die px-waarden checkt voor spatial properties:

```js
// stylelint-plugin-8pt-grid.js
const spatialProps = [
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap',
  'border-radius', 'border-top-left-radius', /* ... */
  'width', 'min-width', 'max-width',
  'height', 'min-height', 'max-height',
  'top', 'right', 'bottom', 'left',
  'inset'
];

// Check: elke px-waarde moet deelbaar zijn door 4
// Uitzonderingen: 1px (borders), 2px (micro-details met comment)
```

### 4. NPM script

```json
{
  "scripts": {
    "lint:css": "stylelint 'demo/src/**/*.css' 'demo/src/**/*.module.css'"
  }
}
```

### 5. Pre-commit hook (optioneel)

Voeg toe aan lint-staged of husky.

### 6. Kleur-regel: geen hardcoded hex

```json
{
  "rules": {
    "color-no-hex": true
  }
}
```

Of custom regel die hex-waarden in `color`, `background-color`, `border-color` blokkeert en `var(--color-*)` of `var(--app-*)` vereist.

## Uitzonderingen configuratie

| Waarde | Reden | Hoe |
|--------|-------|-----|
| `1px` | Borders, dividers | Auto-allow |
| `2px` | Micro-details | `/* stylelint-disable-next-line */` met comment |
| `font-size` | Typography schaal | Exclude property |
| `line-height` | Typography | Exclude property |
| `letter-spacing` | Typography | Exclude property |
| `box-shadow` | Elevation tokens | Exclude property |
| `transform` | Animatie | Exclude property |
| `white` / `transparent` | CSS keywords | Auto-allow |
| `currentColor` | Inherit pattern | Auto-allow |
| `rgba()` met token | Opacity varianten | Auto-allow |

## Verificatie

- [ ] `pnpm lint:css` draait zonder errors na alle eerdere fases
- [ ] Bewust off-grid waarde toevoegen → lint error
- [ ] Uitzonderingen werken correct (1px borders, font-sizes)
- [ ] CI pipeline configuratie (later)
