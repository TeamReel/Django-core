# Brand Variant Customization

Create custom brand variants with token overrides.

## Overview

Brand variants allow organizations to override theme tokens while inheriting base theme structure. Perfect for:

- Multi-tenant applications
- White-label products
- Brand-specific customizations

## Creating a Custom Brand

### 1. Define brand variant

```typescript
// src/themes/brands/acme.ts
import type { BrandVariantDefinition } from '@django-core/theme-system';

export const acmeBrand: BrandVariantDefinition = {
  id: 'acme',
  name: 'ACME Corporation',
  overrides: {
    color: {
      action: {
        primary: '#e74c3c',        // ACME red
        primaryHover: '#c0392b',   // Darker red on hover
      },
      text: {
        link: '#e74c3c',
        linkHover: '#c0392b',
      },
    },
  },
};
```

### 2. Register brand in config

```typescript
// src/themes/brands/index.ts
import { defaultBrand } from './default';
import { acmeBrand } from './acme';
import { globexBrand } from './globex';

export const brandConfig: BrandConfig = {
  variants: {
    default: defaultBrand,
    acme: acmeBrand,
    globex: globexBrand,
  },
  default: 'default',
};
```

### 3. Use brand in app

```tsx
import { ThemeProvider } from '@django-core/theme-system';

<ThemeProvider defaultBrand="acme">
  <App />
</ThemeProvider>
```

## Token Overrides

Brand variants can override any theme token:

### Color Overrides

```typescript
export const acmeBrand: BrandVariantDefinition = {
  id: 'acme',
  overrides: {
    color: {
      // Action colors (buttons, links)
      action: {
        primary: '#e74c3c',
        primaryHover: '#c0392b',
        secondary: '#3498db',
        secondaryHover: '#2980b9',
      },

      // Text colors
      text: {
        link: '#e74c3c',
        linkHover: '#c0392b',
      },

      // Border colors
      border: {
        focus: '#e74c3c',
      },
    },
  },
};
```

### Typography Overrides

```typescript
export const acmeBrand: BrandVariantDefinition = {
  id: 'acme',
  overrides: {
    font: {
      family: {
        sans: '"Roboto", system-ui, sans-serif',
        serif: '"Merriweather", Georgia, serif',
      },
    },
  },
};
```

### Spacing Overrides

```typescript
export const compactBrand: BrandVariantDefinition = {
  id: 'compact',
  overrides: {
    spacing: {
      md: '12px', // Tighter spacing
      lg: '20px',
    },
  },
};
```

## Hierarchical Inheritance

Brand variants inherit from base theme:

```typescript
// Base theme (light/dark)
{
  color: {
    action: {
      primary: '#007bff',
      primaryHover: '#0056b3',
    }
  }
}

// ACME brand overrides only primary
{
  color: {
    action: {
      primary: '#e74c3c',        // ✅ Overridden
      primaryHover: '#0056b3',   // ✅ Inherited from base
    }
  }
}
```

Components using `themeVars.color.action.primaryHover` will use the base theme value unless explicitly overridden.

## Runtime Brand Switching

### Dropdown Selector

```tsx
import { useTheme } from '@django-core/theme-system';

export function BrandSelector() {
  const { brand, setTheme } = useTheme();

  return (
    <select
      value={brand}
      onChange={(e) => setTheme({ brand: e.target.value })}
    >
      <option value="default">Default</option>
      <option value="acme">ACME Corporation</option>
      <option value="globex">Globex Industries</option>
    </select>
  );
}
```

### Radio Buttons

```tsx
export function BrandRadioGroup() {
  const { brand, setTheme } = useTheme();

  return (
    <fieldset>
      <legend>Select Brand</legend>
      {['default', 'acme', 'globex'].map((b) => (
        <label key={b}>
          <input
            type="radio"
            name="brand"
            value={b}
            checked={brand === b}
            onChange={(e) => setTheme({ brand: e.target.value })}
          />
          {b.charAt(0).toUpperCase() + b.slice(1)}
        </label>
      ))}
    </fieldset>
  );
}
```

## Contrast Validation

Validate custom brand tokens for WCAG 2.1 AA compliance:

```bash
pnpm validate-theme src/themes/brands/acme.json
```

### Example Output

```
✅ Theme contrast validation passed

Checked 48 color pairs:
- 48 passed (100%)
- 0 failed

Details:
✓ text.primary on bg.primary: 12.5:1 (AA)
✓ text.link on bg.primary: 4.8:1 (AA)
✓ action.primary on bg.primary: 4.2:1 (AA)
```

### Fixing Contrast Violations

If validation fails:

```
❌ Theme contrast validation failed

Failed pairs:
✗ text.secondary on bg.surface: 3.2:1 (expected 4.5:1 for normal text)
  Suggestion: Use #6c757d instead of #9ca3af
```

Update brand definition:

```typescript
export const acmeBrand: BrandVariantDefinition = {
  id: 'acme',
  overrides: {
    color: {
      text: {
        secondary: '#6c757d', // ✅ Fixed contrast
      },
    },
  },
};
```

## Multi-Tenant Configuration

### Load brand from subdomain

```tsx
// src/App.tsx
import { ThemeProvider } from '@django-core/theme-system';
import { getBrandFromHost } from './utils/brand';

export function App() {
  const brand = getBrandFromHost(window.location.hostname);

  return (
    <ThemeProvider defaultBrand={brand}>
      <Content />
    </ThemeProvider>
  );
}
```

```typescript
// src/utils/brand.ts
export function getBrandFromHost(hostname: string): string {
  if (hostname.includes('acme.')) return 'acme';
  if (hostname.includes('globex.')) return 'globex';
  return 'default';
}
```

### Load brand from API

```tsx
import { useEffect, useState } from 'react';
import { ThemeProvider } from '@django-core/theme-system';

export function App() {
  const [brand, setBrand] = useState('default');

  useEffect(() => {
    fetch('/api/tenant/brand')
      .then((res) => res.json())
      .then((data) => setBrand(data.brand));
  }, []);

  return (
    <ThemeProvider defaultBrand={brand}>
      <Content />
    </ThemeProvider>
  );
}
```

## TypeScript

Define brand variants with full type safety:

```typescript
import type {
  BrandVariantDefinition,
  BrandConfig,
  ThemeTokens,
} from '@django-core/theme-system';

// Partial overrides
const acmeBrand: BrandVariantDefinition = {
  id: 'acme',
  overrides: {
    color: {
      action: {
        primary: '#e74c3c', // ✅ Type-checked
        // invalid: '#fff',  // ❌ TypeScript error
      },
    },
  },
};

// Full configuration
const config: BrandConfig = {
  variants: {
    default: defaultBrand,
    acme: acmeBrand,
  },
  default: 'default',
};
```

## Complete Example

See [examples/theme-brand/](../../../examples/theme-brand/) for:
- Multiple brand variants
- Runtime brand switching
- Contrast validation workflow
- Multi-tenant setup

## Next Steps

- [Contrast Validation Guide](./contrast-validation.md)
- [API Documentation](../api/tokens.md)
- [Troubleshooting Guide](../troubleshooting.md)
