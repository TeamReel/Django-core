# @django-core/resource-alerts

Resource usage display and alert components for django-core.

## Installation

```bash
pnpm add @django-core/resource-alerts
```

## Dependencies

This package requires:
- React 18.x
- `@django-core/design-system` (F01)
- `@django-core/api-client`

## Development

### Build

```bash
pnpm build
```

Generates ESM and CJS outputs in `dist/` with TypeScript declarations.

### Test

```bash
pnpm test          # Run tests once
pnpm test:watch    # Watch mode
pnpm test:coverage # With coverage report
```

### Storybook

```bash
pnpm storybook
```

Launches Storybook on http://localhost:6006

### Type Checking

```bash
pnpm typecheck
```

## Scripts

- `pnpm build` - Build library for production
- `pnpm dev` - Start Vite dev server
- `pnpm test` - Run unit tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Generate coverage report
- `pnpm storybook` - Launch Storybook
- `pnpm build-storybook` - Build Storybook for deployment
- `pnpm lint` - Lint source files
- `pnpm typecheck` - Type check without emitting files

## Package Structure

```
packages/resource-display-alerts/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── index.ts        # Main entry point
├── stories/            # Storybook stories
├── tests/              # Test utilities and setup
├── .storybook/         # Storybook configuration
└── dist/               # Build output (generated)
```

## License

MIT
