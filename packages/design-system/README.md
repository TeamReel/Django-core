# @django-core/design-system

> Product-agnostic design system providing design tokens, core UI components, theming infrastructure, and interaction patterns.

## Features

- **Design Tokens**: Semantic color, typography, spacing, radius, shadow, z-index, breakpoint, and motion tokens
- **Theming**: Built-in light and dark themes with extension support for brand-specific themes
- **Components**: 15+ accessible, themeable UI components built with React and TypeScript
- **Zero-Runtime CSS**: Powered by vanilla-extract for type-safe, zero-runtime styling
- **Accessibility**: WCAG 2.1 AA compliant with automated testing
- **Documentation**: Comprehensive Storybook documentation with interactive examples
- **Testing**: Unit tests with Jest, accessibility tests with axe-core, visual regression tests with Chromatic

## Installation

```bash
# Using pnpm (recommended)
pnpm add @django-core/design-system react react-dom

# Using npm
npm install @django-core/design-system react react-dom

# Using yarn
yarn add @django-core/design-system react react-dom
```

## Quick Start

```tsx
import { Button, ThemeProvider } from '@django-core/design-system';
import '@django-core/design-system/tokens.css';

function App() {
  return (
    <ThemeProvider theme="light">
      <Button variant="primary" size="md">
        Click me
      </Button>
    </ThemeProvider>
  );
}
```

## Usage with B14 Django Templates

For non-React projects, import only the design tokens:

```html
<link rel="stylesheet" href="path/to/@django-core/design-system/dist/tokens.css">

<button style="
  background: var(--color-primary);
  color: var(--color-text-inverse);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
">
  Click me
</button>
```

## Development

### Prerequisites

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Install dependencies
pnpm install

# Start Storybook
pnpm --filter design-system storybook

# Run tests
pnpm --filter design-system test

# Run linter
pnpm --filter design-system lint

# Type check
pnpm --filter design-system typecheck

# Build package
pnpm --filter design-system build
```

### Project Structure

```
packages/design-system/
├── src/
│   ├── tokens/           # Design token definitions
│   ├── theme/            # Theme provider and utilities
│   ├── components/       # UI components
│   └── index.ts          # Package exports
├── tests/                # Test setup and utilities
├── .storybook/           # Storybook configuration
├── dist/                 # Build output
└── package.json
```

## Available Components

### Form Components
- Button
- Input
- Textarea
- Checkbox
- Radio / RadioGroup

### Feedback Components
- Card
- Alert
- Badge
- Spinner

### Typography Components
- Heading
- Text

### Layout Components
- Stack (HStack, VStack)
- Grid
- Container

### Interaction Components
- Modal
- Select
- Tabs
- Tooltip

## Theming

### Using Built-in Themes

```tsx
import { ThemeProvider } from '@django-core/design-system';

function App() {
  return (
    <ThemeProvider theme="dark">
      {/* Your app */}
    </ThemeProvider>
  );
}
```

### Creating Custom Themes

```tsx
import { createTheme } from '@django-core/design-system';

const brandTheme = createTheme({
  colors: {
    primary: '#FF5722',
    primaryHover: '#E64A19',
    primaryActive: '#BF360C',
  },
});

function App() {
  return (
    <ThemeProvider theme={brandTheme}>
      {/* Your app */}
    </ThemeProvider>
  );
}
```

## Testing

```bash
# Run all tests
pnpm --filter design-system test

# Run tests in watch mode
pnpm --filter design-system test:watch

# Generate coverage report
pnpm --filter design-system test:coverage
```

## Contributing

See the main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT © Django Core Team
