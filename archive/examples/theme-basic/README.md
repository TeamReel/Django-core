# Theme System Basic Example

Minimal example demonstrating theme system integration in a React SPA.

## Status

⚠️ **Placeholder** - Full working example deferred to post-release.

## Planned Features

- Light/dark mode toggle
- Theme persistence with localStorage
- Semantic token usage in styles
- Basic component library with themed styles

## Quick Reference

For now, refer to integration guides:

- [React SPA Integration Guide](../../packages/theme-system/docs/guides/react-spa.md)
- [API Documentation](../../packages/theme-system/docs/api/)

## Expected Structure

```
theme-basic/
├── package.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Card.tsx
│   │   ├── Card.css.ts
│   │   └── Header.tsx
│   └── styles/
│       └── global.css
└── README.md
```

## Setup (Future)

```bash
cd examples/theme-basic
pnpm install
pnpm dev
```

## Related

- [Next.js Example](../theme-nextjs/)
- [Brand Customization Example](../theme-brand/)
