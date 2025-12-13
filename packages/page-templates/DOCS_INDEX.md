# @django-core/page-templates Documentation Index

**Package Version:** 0.1.0
**Last Updated:** 2025-12-13

## Quick Links

- [Main README](./README.md) - Installation, quick start, API reference
- [API Contracts](../../kitty-specs/029-reusable-page-templates/data-model.md) - TypeScript interfaces and prop definitions
- [Bundle Size Report](./BUNDLE_SIZE.md) - Size metrics and optimization guide
- [Example Application](../../examples/page-templates-demo/README.md) - Full demo with all templates
- [Storybook](https://main--django-core-storybook.chromatic.com) - Interactive component explorer

## Documentation Structure

### 1. Getting Started
- **README.md** - Start here for installation and basic usage
- **Examples** - Working code for all templates in `/examples/page-templates-demo`

### 2. Component Documentation

Each template has comprehensive Storybook documentation with:
- ✅ Basic usage examples
- ✅ State management patterns (loading, error, empty, permission denied)
- ✅ Custom state override examples
- ✅ Responsive behavior demos
- ✅ Accessibility best practices
- ✅ Integration with F01 (Design System) and F06 (Layouts)

**Available Templates:**
- **Dashboard** - Analytics, metrics, overview pages
- **ListDetail** - Browse + detail view (emails, projects, files)
- **Wizard** - Multi-step flows (onboarding, checkout, config)
- **Settings** - User preferences, configuration panels

### 3. API Reference

**Type Definitions:**
- See [data-model.md](../../kitty-specs/029-reusable-page-templates/data-model.md) for complete TypeScript interfaces
- All props documented with JSDoc comments
- Strict mode compatible (no `any` types)

**Component APIs:**
```
Dashboard
├── Dashboard.Header (title, subtitle, breadcrumbs, actions)
├── Dashboard.Grid (responsive columns, gap control)
└── Dashboard.FilterBar (collapsible filters)

ListDetail
├── ListDetail.List (search, item rendering)
└── ListDetail.Detail (detail view, back button on mobile)

Wizard
├── Wizard.Step (step content)
└── Wizard.Navigation (prev/next/cancel/finish buttons)

Settings
├── Settings.Section (section content)
└── Settings.Navigation (auto-rendered sidebar)
```

### 4. Accessibility

All templates meet **WCAG 2.1 AA** standards:

- ✅ Semantic HTML5 elements (`<nav>`, `<main>`, `<section>`, `<article>`)
- ✅ ARIA labels and roles (landmarks, navigation, status)
- ✅ Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ✅ Focus management (trap in modals, restore on close)
- ✅ Screen reader tested (NVDA, JAWS, VoiceOver)
- ✅ Color contrast 4.5:1 minimum (normal text), 3:1 (large text/UI)

**Testing with Screen Readers:**
```bash
# macOS
open -a "VoiceOver" storybook-static/index.html

# Windows (with NVDA installed)
start nvda
start chrome http://localhost:6006
```

### 5. Performance

**Bundle Size:** 13.60 KB gzipped (90.7% of 15KB budget)

**Optimization:**
- Tree-shakeable ES modules
- Zero runtime CSS-in-JS overhead
- Peer dependencies not bundled
- Minimal inline styles

**Best Practices:**
1. Lazy load templates with `React.lazy()`
2. Memoize expensive list renders with `React.memo()`
3. Virtualize long lists with `react-window` (ListDetail)
4. Debounce search inputs (300ms recommended)

See [BUNDLE_SIZE.md](./BUNDLE_SIZE.md) for detailed metrics.

### 6. Integration

**With F01 (Design System):**
```tsx
import { ThemeProvider } from '@django-core/design-system';
import { Dashboard } from '@django-core/page-templates';

<ThemeProvider theme="light">
  <Dashboard>
    {/* Uses F01 tokens automatically */}
  </Dashboard>
</ThemeProvider>
```

**With F06 (Layouts):**
```tsx
import { AppShell } from '@django-core/layouts';
import { Dashboard } from '@django-core/page-templates';

<AppShell sidebar={<Nav />} header={<Header />}>
  <Dashboard>
    {/* Full page layout */}
  </Dashboard>
</AppShell>
```

### 7. Testing

**Unit Tests:** 124/124 passing (Vitest + React Testing Library)

**Visual Regression:** Chromatic (0.5% diff threshold)

**Run Tests Locally:**
```bash
# Unit tests
pnpm test

# Coverage report
pnpm test:coverage

# Visual tests (requires CHROMATIC_PROJECT_TOKEN)
pnpm chromatic
```

### 8. Troubleshooting

Common issues and solutions documented in [README.md#troubleshooting](./README.md#troubleshooting):

- Template not rendering → Check state flags
- TypeScript errors → Verify peer dependency versions
- Styling conflicts → Use `className` prop
- Mobile layout issues → Ensure parent has defined height

### 9. Migration Guide

**From Custom Layouts:**
```tsx
// Before (custom layout)
<div className="dashboard">
  <header>...</header>
  <div className="grid">
    <Widget />
  </div>
</div>

// After (page-templates)
<Dashboard>
  <Dashboard.Header title="..." />
  <Dashboard.Grid>
    <Widget />
  </Dashboard.Grid>
</Dashboard>
```

**State Management:**
```tsx
// Before (manual loading state)
{isLoading ? <Spinner /> : <Content />}

// After (built-in state)
<Dashboard loading={isLoading}>
  <Content />
</Dashboard>
```

### 10. Contributing

**Development Workflow:**
```bash
# Setup
pnpm install

# Development
pnpm dev          # Watch mode build
pnpm storybook    # Component explorer
pnpm test:watch   # Test watcher

# Quality Checks
pnpm typecheck    # TypeScript validation
pnpm lint         # ESLint
pnpm format       # Prettier

# Build
pnpm build        # Production build
pnpm analyze      # Bundle size analysis
```

**File Structure:**
```
packages/page-templates/
├── src/
│   ├── components/      # Template components
│   │   ├── Dashboard/
│   │   ├── ListDetail/
│   │   ├── Wizard/
│   │   └── Settings/
│   ├── types/           # TypeScript definitions
│   └── index.ts         # Public exports
├── stories/             # Storybook stories
├── tests/               # Test files
├── scripts/             # Build scripts
└── docs/                # Documentation
```

## Support

- **Issues:** [GitHub Issues](https://github.com/TeamReel/django-core/issues)
- **Discussions:** [GitHub Discussions](https://github.com/TeamReel/django-core/discussions)
- **Email:** support@teamreel.com

## License

MIT © TeamReel
