# Theme System Brand Customization Example

Example demonstrating custom brand variants with runtime switching.

## Status

⚠️ **Placeholder** - Full working example deferred to post-release.

## Planned Features

- Multiple brand variants (ACME, Globex)
- Runtime brand switching with dropdown
- Token overrides demonstration
- Contrast validation workflow
- Multi-tenant configuration example

## Quick Reference

For now, refer to brand customization guide:

- [Brand Customization Guide](../../packages/theme-system/docs/guides/brand-variants.md)
- [Theme Tokens](../../packages/theme-system/docs/api/tokens.md)

## Expected Structure

```
theme-brand/
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── themes/
│   │   └── brands/
│   │       ├── acme.ts
│   │       ├── globex.ts
│   │       └── index.ts
│   └── components/
│       ├── BrandSelector.tsx
│       └── Card.tsx
└── README.md
```

## Brand Variant Example

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
        primaryHover: '#c0392b',
      },
      text: {
        link: '#e74c3c',
        linkHover: '#c0392b',
      },
    },
  },
};
```

## Setup (Future)

```bash
cd examples/theme-brand
pnpm install
pnpm dev
```

## Contrast Validation

```bash
pnpm validate-theme src/themes/brands/acme.json
```

## Related

- [Basic Example](../theme-basic/)
- [Next.js Example](../theme-nextjs/)
