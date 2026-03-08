# G1 — Guardrails (Stylelint)

**Status:** Todo
**Geschatte effort:** 20 min
**Bestanden:**
- `.stylelintrc.json` (nieuw)
- `demo/package.json` (dependency toevoegen)

---

## Doel

Een stylelint regel opzetten die voorkomt dat nieuwe off-grid px-waarden worden toegevoegd. Regressie-preventie.

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

## Verificatie

- [ ] `pnpm lint:css` draait zonder errors na alle eerdere fases
- [ ] Bewust off-grid waarde toevoegen → lint error
- [ ] Uitzonderingen werken correct (1px borders, font-sizes)
- [ ] CI pipeline configuratie (later)
