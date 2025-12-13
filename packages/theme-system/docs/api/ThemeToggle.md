# ThemeToggle Component

Pre-built UI component for theme mode switching.

## Usage

```tsx
import { ThemeToggle } from '@django-core/theme-system';

function Header() {
  return (
    <nav>
      <ThemeToggle variant="icon" />
    </nav>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'icon' \| 'switch' \| 'dropdown'` | `'icon'` | UI variant |
| `showLabel` | `boolean` | `false` | Show text label |
| `className` | `string` | `undefined` | Additional CSS class |

## Variants

### Icon Button (`variant="icon"`)

Cycles through modes: light → dark → system

```tsx
<ThemeToggle variant="icon" />
```

**Appearance:**
- ☀️ Sun icon when light mode
- 🌙 Moon icon when dark mode
- 💻 System icon when system mode

**Interaction:**
- Click to cycle through modes
- Tooltip shows current mode

### Switch Toggle (`variant="switch"`)

Binary toggle between light and dark (skips system mode)

```tsx
<ThemeToggle variant="switch" />
```

**Appearance:**
- Toggle switch UI (Material Design style)
- Sun icon on left, moon icon on right
- Animated transition

**Interaction:**
- Click or drag to toggle
- Always switches between light/dark (no system mode)

### Dropdown Menu (`variant="dropdown"`)

Explicit selection of all three modes

```tsx
<ThemeToggle variant="dropdown" />
```

**Appearance:**
- Button with current mode icon
- Dropdown with 3 options:
  - ☀️ Light Mode
  - 🌙 Dark Mode
  - 💻 System Preference

**Interaction:**
- Click to open menu
- Select mode explicitly

## Examples

### Icon with Label

```tsx
<ThemeToggle variant="icon" showLabel={true} />
```

Displays: `☀️ Light` / `🌙 Dark` / `💻 System`

### Custom Styling

```tsx
import { ThemeToggle } from '@django-core/theme-system';
import { myButtonClass } from './styles.css';

<ThemeToggle variant="icon" className={myButtonClass} />
```

### Dropdown in Settings

```tsx
function SettingsPage() {
  return (
    <div>
      <h2>Preferences</h2>
      <label>
        Theme Mode
        <ThemeToggle variant="dropdown" />
      </label>
    </div>
  );
}
```

### Switch in Header

```tsx
function Header() {
  return (
    <header>
      <nav>
        <Logo />
        <NavLinks />
        <ThemeToggle variant="switch" />
      </nav>
    </header>
  );
}
```

## Accessibility

All variants are keyboard accessible:

- **Icon**: `Tab` to focus, `Enter`/`Space` to cycle
- **Switch**: `Tab` to focus, `Enter`/`Space` to toggle
- **Dropdown**: `Tab` to focus, arrow keys to navigate, `Enter` to select

ARIA attributes:

```html
<button
  role="switch"
  aria-checked="true"
  aria-label="Toggle dark mode"
>
  <!-- Icon variant -->
</button>
```

## Custom Theme Toggle

Build your own with `useTheme` hook:

```tsx
import { useTheme } from '@django-core/theme-system';

function CustomToggle() {
  const { mode, setTheme } = useTheme();

  return (
    <button onClick={() => setTheme({ mode: mode === 'dark' ? 'light' : 'dark' })}>
      {mode === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
    </button>
  );
}
```

## Styling

ThemeToggle uses theme tokens for styling:

```typescript
// Internal styles (simplified)
export const toggleButton = style({
  backgroundColor: themeVars.color.bg.surface,
  color: themeVars.color.text.primary,
  border: `1px solid ${themeVars.color.border.primary}`,
  borderRadius: themeVars.radius.md,
  padding: themeVars.spacing.sm,

  ':hover': {
    backgroundColor: themeVars.color.bg.secondary,
  },
});
```

Override with custom class:

```typescript
// styles.css.ts
import { style } from '@vanilla-extract/css';

export const customToggle = style({
  position: 'fixed',
  bottom: '20px',
  right: '20px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
});
```

```tsx
<ThemeToggle className={customToggle} />
```

## TypeScript

Full type definitions:

```typescript
import type { ThemeToggleProps } from '@django-core/theme-system';

const props: ThemeToggleProps = {
  variant: 'icon',
  showLabel: false,
  className: 'my-class',
};
```

## See Also

- [useTheme Hook](./useTheme.md)
- [ThemeProvider](./ThemeProvider.md)
- [Custom Components Guide](../guides/custom-components.md)
