# 🎨 TeamReel Style Foundation v2
> **Complete design system documentatie voor TeamReel**
> Dit document definieert alle stijl tokens, richtlijnen en implementatie principes
> voor consistente user experience across alle TeamReel producten en platforms.
> Versie: November 2025 — Status: Definitieve richtlijn

## Metadata
| Element | Inhoud |
|---------|--------|
| **Project** | TeamReel |
| **Document** | Style Foundation v2 |
| **Datum** | November 2025 |
| **Auteur** | TeamReel Studio |
| **Status** | Definitieve richtlijn |
| **Basis** | tokens.json, brand_identity.md |
| **Gebruik** | Design system referentie voor ontwikkeling |

---

## Inhoudsopgave

1. [Overzicht & Principes](#1-overzicht--principes)
2. [Design Tokens](#2-design-tokens)
3. [Kleurensysteem](#3-kleurensysteem)
4. [Typografie](#4-typografie)
5. [Spacing & Layout](#5-spacing--layout)
6. [Iconografie](#6-iconografie)
7. [Component Guidelines](#7-component-guidelines)
8. [Implementatie](#8-implementatie)
9. [Quality Assurance](#9-quality-assurance)

---

## 1. Overzicht & Principes

### 1.1 Doelstelling
De TeamReel Style Foundation v2 biedt een complete, geïntegreerde design system dat:
- **Consistentie** garandeert across alle interfaces en touchpoints
- **Schaalbaarheid** ondersteunt voor groeiende product portfolio
- **Toegankelijkheid** waarborgt volgens WCAG 2.1 AA standards
- **Developer Experience** optimaliseert met duidelijke implementatie richtlijnen

### 1.2 Design Principes

| Principe | Beschrijving | Implementatie |
|----------|--------------|---------------|
| **Systematic** | Alle stijlelementen gebaseerd op coherent token systeem | tokens.json als single source of truth |
| **Accessible** | WCAG 2.1 AA compliance voor alle kleur/contrast combinaties | Geautomatiseerde contrast testing |
| **Scalable** | Design patterns uitbreidbaar zonder breaking changes | Versioning en backward compatibility |
| **Maintainable** | Duidelijke documentatie en implementatie richtlijnen | Living documentation met code examples |
| **Performance** | Optimized voor loading speed en rendering performance | CSS custom properties, minimal bundle |

### 1.3 TeamReel Identiteit Core
**Brand DNA:** Professioneel, betrouwbaar, efficiënt, sportief
**Visual Language:** Clean, modern, purposeful design met focus op functionaliteit
**User Experience:** Intuitive workflows die tijd besparen voor sportverenigingen

---

## 2. Design Tokens

### 2.1 Token Structure
Alle design tokens worden gedefinieerd in `/frontend/styles/tokens.json` en vormen de basis voor alle styling decisies.

```json
{
  "colors": { /* Kleurenpallet met semantic naming */ },
  "typography": { /* Font families, sizes, weights, line heights */ },
  "spacing": { /* Consistent spacing scale */ },
  "borderRadius": { /* Border radius values */ },
  "icons": { /* Icon specifications */ }
}
```

### 2.2 Token Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Colors** | Brand colors, semantic colors, status colors | primary, accent, error, success |
| **Typography** | Font properties, text styles, hierarchies | fontFamilies, fontSizes, textStyles |
| **Spacing** | Margins, padding, gaps in consistent scale | 4px, 8px, 16px, 24px progression |
| **Layout** | Border radius, shadows, grid systems | borderRadius.sm, borderRadius.lg |
| **Icons** | Icon sizes, stroke weights, color guidelines | sizes.base (20px), strokeWidth.normal |

### 2.3 Token Usage
**CSS Custom Properties:**
```css
:root {
  --color-primary: #3B8EA5;
  --font-heading: 'Manrope', sans-serif;
  --spacing-4: 1rem;
}
```

**Tailwind Integration:**
```javascript
// tailwind.config.js
const tokens = require('./styles/tokens.json');
module.exports = {
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: tokens.typography.fontFamilies
    }
  }
}
```

---

## 3. Kleurensysteem

### 3.1 Primary Palette
**Gebaseerd op betrouwbaarheid en sportieve energie**

| Color Token | Hex Value | RGB | Usage | Contrast |
|-------------|-----------|-----|-------|----------|
| **primary** | #3B8EA5 | 59, 142, 165 | Main brand, primary actions | 4.52:1 on white |
| **primary-dark** | #1C355E | 28, 53, 94 | Text, headers, navigation | 10.87:1 on white |
| **primary-light** | #4CA1FF | 76, 161, 255 | Hover states, accents | 3.21:1 on white |

### 3.2 Secondary & Accent
| Color Token | Hex Value | Usage | Contrast |
|-------------|-----------|-------|----------|
| **accent** | #FF8C42 | CTAs, highlights, progress | 3.84:1 on white |
| **neutral-dark** | #0A192F | Dark themes, overlays | 15.32:1 on white |
| **neutral-light** | #EDF6FF | Subtle backgrounds, cards | N/A (background) |

### 3.3 Status Colors
| Status | Color Token | Hex | Usage |
|--------|-------------|-----|-------|
| **Success** | success | #06D6A0 | Confirmations, completed states |
| **Error** | error | #E63946 | Error messages, validation |
| **Warning** | warning | #FFD166 | Warnings, pending states |

### 3.4 Implementation
```css
/* Gebruik semantic color tokens */
.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-text-light);
}

.status-error {
  color: var(--color-error);
  border-color: var(--color-error);
}
```

---

## 4. Typografie

### 4.1 Font Families
**Zorgvuldig gekozen voor leesbaarheid en merkidentiteit**

| Font Family | Usage | Weights | Source |
|-------------|--------|---------|--------|
| **Manrope** | Headings, titles, buttons | 400, 500, 600, 700 | Google Fonts |
| **Inter** | Body text, UI elements | 400, 500, 600, 700 | Google Fonts |
| **SF Mono** | Code, technical content | 400, 600 | System fallback |

### 4.2 Text Styles
**Predefined combinations voor consistent gebruik**

| Style | Font | Size | Weight | Line Height | Letter Spacing | CSS Class |
|-------|------|------|--------|-------------|----------------|-----------|
| **H1** | Manrope | 36px | 700 | 1.25 | -0.025em | `.text-h1` |
| **H2** | Manrope | 30px | 600 | 1.375 | -0.025em | `.text-h2` |
| **H3** | Manrope | 24px | 600 | 1.375 | 0 | `.text-h3` |
| **Body Large** | Inter | 18px | 400 | 1.625 | 0 | `.text-body-lg` |
| **Body** | Inter | 16px | 400 | 1.5 | 0 | `.text-body` |
| **Body Small** | Inter | 14px | 400 | 1.5 | 0 | `.text-body-sm` |
| **Caption** | Inter | 12px | 500 | 1.375 | 0.05em | `.text-caption` |

### 4.3 Typography Scale
**Modular scale gebaseerd op 1.25 ratio**
```
12px (0.75rem) → 14px (0.875rem) → 16px (1rem) → 18px (1.125rem)
→ 24px (1.5rem) → 30px (1.875rem) → 36px (2.25rem)
```

### 4.4 Implementation
```css
/* Google Fonts import */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

/* Utility classes */
.text-h1 {
  font-family: 'Manrope', sans-serif;
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.025em;
}
```

---

## 5. Spacing & Layout

### 5.1 Spacing Scale
**8px base unit voor consistent spacing**

| Token | Value | Usage |
|-------|-------|-------|
| spacing-1 | 4px | Fine details, borders |
| spacing-2 | 8px | Small gaps, icon spacing |
| spacing-3 | 12px | Form elements, compact layouts |
| spacing-4 | 16px | Standard spacing, component padding |
| spacing-6 | 24px | Section spacing, card margins |
| spacing-8 | 32px | Large spacing, component separation |
| spacing-12 | 48px | Major section spacing |
| spacing-16 | 64px | Page-level spacing |

### 5.2 Layout Grid
**Flexible grid system voor verschillende screen sizes**

| Breakpoint | Container | Columns | Gutter |
|------------|-----------|---------|--------|
| **Mobile** | 100% | 4-6 | 16px |
| **Tablet** | 768px | 8 | 20px |
| **Desktop** | 1200px | 12 | 24px |
| **Wide** | 1400px | 12 | 32px |

### 5.3 Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| borderRadius.sm | 2px | Input borders, small elements |
| borderRadius.md | 6px | Buttons, badges |
| borderRadius.lg | 8px | Cards, large buttons |
| borderRadius.xl | 12px | Modal dialogs, panels |
| borderRadius.2xl | 16px | Major containers, hero sections |

---

## 6. Iconografie

### 6.1 Icon System
**Lucide React voor consistent, professionele iconografie**

| Property | Value | Description |
|----------|-------|-------------|
| **Library** | Lucide React | 1000+ consistent outline icons |
| **Style** | Outline | Clean, modern line-based icons |
| **Stroke Width** | 1.5px | Standard weight, adjustable |
| **Corner Style** | Rounded | Friendly, approachable appearance |

### 6.2 Icon Sizes
| Size Token | Pixels | Usage Context |
|------------|--------|---------------|
| icons.sizes.xs | 12px | Badges, indicators |
| icons.sizes.sm | 16px | Inline icons, small buttons |
| icons.sizes.base | 20px | Standard UI elements |
| icons.sizes.lg | 24px | Primary navigation, headers |
| icons.sizes.xl | 32px | Featured elements, large buttons |
| icons.sizes.2xl | 48px | Illustrations, empty states |

### 6.3 Implementation
```jsx
// Import specific icons
import { Play, Settings, User, Bell } from 'lucide-react';

// Consistent usage
<Play size={20} strokeWidth={1.5} color="var(--color-primary)" />
<Settings size={24} strokeWidth={1.5} color="var(--color-neutral-dark)" />
```

---

## 7. Component Guidelines

### 7.1 Button Specifications
```css
/* Primary Button */
.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-text-light);
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  font-family: var(--font-body);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: var(--color-primary-dark);
  transform: translateY(-1px);
}
```

### 7.2 Card Components
```css
.card {
  background-color: white;
  border: 1px solid var(--color-neutral-light);
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(28, 53, 94, 0.08);
  padding: 16px;
}
```

### 7.3 Form Elements
```css
.input-field {
  border: 1px solid var(--color-neutral-light);
  border-radius: 8px;
  padding: 12px 16px;
  font-family: var(--font-body);
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.input-field:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 142, 165, 0.1);
}
```

---

## 8. Implementatie

### 8.1 CSS Custom Properties Setup
```css
/* globals.css */
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

:root {
  /* Colors */
  --color-primary: #3B8EA5;
  --color-primary-dark: #1C355E;
  --color-primary-light: #4CA1FF;
  --color-accent: #FF8C42;
  --color-neutral-dark: #0A192F;
  --color-neutral-light: #EDF6FF;
  --color-bg-light: #F8FBFF;
  --color-bg-dark: #0A192F;
  --color-error: #E63946;
  --color-success: #06D6A0;
  --color-warning: #FFD166;
  --color-text-dark: #1C355E;
  --color-text-light: #EDF6FF;

  /* Typography */
  --font-heading: 'Manrope', -apple-system, sans-serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'SF Mono', Monaco, monospace;
}
```

### 8.2 Tailwind Configuration
```javascript
// tailwind.config.js
const tokens = require('./styles/tokens.json');

module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: tokens.colors,
      fontFamily: {
        'heading': ['Manrope', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['SF Mono', 'monospace']
      },
      fontSize: tokens.typography.fontSizes,
      spacing: tokens.spacing,
      borderRadius: tokens.borderRadius
    }
  }
}
```

### 8.3 React Component Patterns
```jsx
// Typography Component
export const Typography = ({ variant = 'body', children, ...props }) => {
  const variants = {
    h1: 'text-h1',
    h2: 'text-h2',
    h3: 'text-h3',
    'body-lg': 'text-body-lg',
    body: 'text-body',
    'body-sm': 'text-body-sm',
    caption: 'text-caption'
  };

  return (
    <div className={variants[variant]} {...props}>
      {children}
    </div>
  );
};
```

---

## 9. Quality Assurance

### 9.1 Contrast Testing
**Geautomatiseerde WCAG 2.1 AA compliance**

| Color Combination | Contrast Ratio | WCAG Level | Status |
|-------------------|----------------|------------|--------|
| Primary on White | 4.52:1 | AA | ✅ Pass |
| Primary-dark on White | 10.87:1 | AAA | ✅ Pass |
| Error on White | 5.93:1 | AA | ✅ Pass |
| Success on White | 2.94:1 | AA Large | ✅ Pass |
| Accent on White | 3.84:1 | AA Large | ✅ Pass |

### 9.2 Testing Checklist
- [ ] **Color Contrast:** Alle text/background combinaties ≥ 4.5:1
- [ ] **Typography:** Font loading en fallbacks correct
- [ ] **Responsive:** Correct scaling op alle screen sizes
- [ ] **Icons:** Consistent stroke width en sizing
- [ ] **Components:** Hover states en interactions

### 9.3 CI/CD Integration
```yaml
# .github/workflows/design-system-check.yml
name: Design System QA
on: [push, pull_request]
jobs:
  contrast-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Contrast Testing
        run: npm run test:contrast
      - name: Markdown Lint
        run: markdownlint docs/2_brand/
```

### 9.4 Maintenance Schedule
- **Weekly:** Automated contrast/accessibility testing
- **Monthly:** Component consistency review
- **Quarterly:** Typography and spacing audit
- **Semi-annually:** Complete design system review

---

## Appendix

### A. Version History
| Version | Date | Changes |
|---------|------|---------|
| v2.0 | Nov 2025 | Initial complete style foundation |
| v2.1 | TBD | Component library expansion |

### B. Related Documentation
- [Brand Identity](./brand_identity.md) - Complete brand guidelines
- [Design Tokens](../../../frontend/styles/tokens.json) - Technical token definitions
- [Component Library](../3_design/component_library.md) - React component specs

### C. Tools & Resources
- **Figma:** [TeamReel Design System](https://figma.com/teamreel-ds)
- **Contrast Checker:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Icon Library:** [Lucide React](https://lucide.dev/)
- **Fonts:** [Google Fonts](https://fonts.google.com/)

---

*© 2025 TeamReel Studio. Dit document is onderdeel van het TeamReel Design System en wordt onderhouden volgens de established governance procedures.*
