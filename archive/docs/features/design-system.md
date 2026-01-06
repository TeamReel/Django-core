# Design System & B14 Integration

This guide explains how the Django Core Design System (feature F01) integrates with the B14 Web UI Baseline.

## Overview

The design system provides a **shared design language** across two distinct UI technologies:

- **F01 Design System**: React components + design tokens
- **B14 Web UI Baseline**: Django templates + design tokens

```
┌───────────────────────────────────────────────────────────────┐
│                    Design Tokens (F01)                        │
│  Colors • Spacing • Typography • Radius • Shadow • Z-Index   │
└────────────────┬──────────────────────────────────────┬───────┘
                 │                                      │
    ┌────────────▼────────────┐        ┌───────────────▼────────┐
    │  F01 React Components   │        │   B14 Django Templates │
    │  • Button, Input, Card  │        │   • HTML + CSS only    │
    │  • Modal, Tabs, Tooltip │        │   • Uses CSS variables │
    │  • Full interactivity   │        │   • No React required  │
    └─────────────────────────┘        └────────────────────────┘
             │                                      │
    ┌────────▼────────────┐        ┌───────────────▼────────────┐
    │   React Apps        │        │   Django Server-Side      │
    │   (SPA, dashboards) │        │   (Traditional views)     │
    └─────────────────────┘        └───────────────────────────┘
```

## What is Shared?

### Design Tokens ✅

Both F01 and B14 can use the same design tokens via CSS custom properties:

```css
/* These work in both React and Django templates */
--color-text-primary
--color-background-secondary
--spacing-4
--typography-fontSize-md
--radius-md
--shadow-md
```

**Example in React (F01)**:
```tsx
import { Button } from '@django-core/design-system';

<Button variant="primary">Click me</Button>
// Uses --color-primary internally
```

**Example in Django Template (B14)**:
```html
<button style="
  background: var(--color-primary);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
">
  Click me
</button>
```

### Visual Consistency ✅

Both systems produce visually identical UIs when using the same tokens:

- Same colors
- Same spacing scale
- Same typography
- Same border radius
- Same shadows
- Same motion timing

## What is NOT Shared?

### React Components ❌

B14 **cannot** import React components from F01:

```tsx
// ❌ This will NOT work in Django templates
import { Button } from '@django-core/design-system';
```

**Why?** B14 is server-rendered HTML with no React runtime.

### JavaScript Interactions ❌

B14 cannot use F01's JavaScript-based interactions:

```tsx
// ❌ B14 cannot use
<Modal isOpen={true} onClose={handleClose}>...</Modal>
<Tooltip content="Help text">...</Tooltip>
```

**Solution**: B14 must implement these patterns with plain JavaScript or use a lightweight library.

## Decision Tree: F01 vs B14

### Use F01 React Components When:

- ✅ Building a single-page application (SPA)
- ✅ Need rich client-side interactions
- ✅ Building dashboards or admin panels
- ✅ Prefer component-based development
- ✅ Want TypeScript type safety

### Use B14 Django Templates When:

- ✅ Building traditional server-rendered pages
- ✅ Need SEO-optimized content pages
- ✅ Working with existing Django views
- ✅ Minimal JavaScript requirements
- ✅ Want simplicity and fast server response

### Use Design Tokens (Both) When:

- ✅ **Always** - for visual consistency
- ✅ Need theme support (light/dark)
- ✅ Want maintainable design systems
- ✅ Building across React and Django

## Integration Patterns

### Pattern 1: Hybrid Application

Use React (F01) for interactive parts, Django templates (B14) for content:

```
┌─────────────────────────────────────────┐
│  Django Base Template (B14)             │
│  ┌─────────────────────────────────┐   │
│  │  Header (Django + tokens)       │   │
│  ├─────────────────────────────────┤   │
│  │  Content Area                   │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │ React Dashboard (F01)     │  │   │
│  │  │ • Interactive charts      │  │   │
│  │  │ • Real-time data          │  │   │
│  │  └───────────────────────────┘  │   │
│  ├─────────────────────────────────┤   │
│  │  Footer (Django + tokens)       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Implementation**:
```html
<!-- base.html (B14) -->
{% load static %}
<!DOCTYPE html>
<html class="theme-light">
<head>
    <link rel="stylesheet" href="{% static 'css/design-system-tokens.css' %}">
</head>
<body>
    <header style="background: var(--color-background-primary);">
        <!-- Django template content -->
    </header>

    <main>
        <!-- Mount React app here -->
        <div id="react-root"></div>
    </main>

    <footer style="background: var(--color-background-secondary);">
        <!-- Django template content -->
    </footer>

    <script src="{% static 'js/react-app.js' %}"></script>
</body>
</html>
```

### Pattern 2: Separate Applications

Use F01 for SPA, B14 for marketing site, share tokens:

```
example.com (B14)
├── /                  → Landing page (Django)
├── /about             → About page (Django)
├── /pricing           → Pricing page (Django)
└── /app               → Dashboard (React F01)
```

**Shared Configuration**:
```javascript
// webpack.config.js (React app)
module.exports = {
  externals: {
    '@django-core/design-system/tokens.css': 'commonjs2 @django-core/design-system/tokens.css'
  }
};
```

### Pattern 3: Progressive Enhancement

Start with B14, progressively enhance with React:

```html
<!-- B14 base HTML -->
<div class="user-card" data-component="user-card" data-user-id="123">
    <h3 class="user-name">John Doe</h3>
    <p class="user-bio">Software Engineer</p>
    <button class="btn btn-primary">Follow</button>
</div>

<script>
// Progressive enhancement: replace with React if JS enabled
if (window.React) {
    const container = document.querySelector('[data-component="user-card"]');
    const userId = container.dataset.userId;
    ReactDOM.render(<UserCard userId={userId} />, container);
}
</script>
```

## Setup Instructions

### For F01 (React Projects)

```bash
# Install the design system
pnpm add @django-core/design-system

# Use components
import { ThemeProvider, Button } from '@django-core/design-system';
import '@django-core/design-system/tokens.css';
```

### For B14 (Django Projects)

```bash
# Install for token access
npm install @django-core/design-system

# Copy tokens to static files
cp node_modules/@django-core/design-system/dist/tokens.css static/css/

# Include in templates
<link rel="stylesheet" href="{% static 'css/tokens.css' %}">
```

### For Hybrid Projects

```bash
# Install once, use in both contexts
pnpm add @django-core/design-system

# Configure static files
# settings.py
STATICFILES_DIRS = [
    ('design-system', 'node_modules/@django-core/design-system/dist'),
]
```

## Theme Synchronization

Ensure theme consistency across F01 and B14:

```javascript
// Shared theme management
class ThemeManager {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'light';
        this.applyTheme();
    }

    applyTheme() {
        // Apply to root element (works for both React and Django)
        document.documentElement.className = `theme-${this.theme}`;
    }

    setTheme(newTheme) {
        this.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        this.applyTheme();

        // Notify React app if present
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme: newTheme }
        }));
    }
}

// Initialize on page load
const themeManager = new ThemeManager();
```

## Common Use Cases

### Use Case 1: Marketing Site (B14) + Dashboard (F01)

- **Marketing pages**: Use B14 Django templates with design tokens
- **User dashboard**: Use F01 React components
- **Shared**: Design tokens, theme preferences, typography

### Use Case 2: CMS with Interactive Components

- **Base CMS**: B14 Django templates
- **Interactive widgets**: F01 React components embedded
- **Example**: Rich text editor, data visualizations, real-time chat

### Use Case 3: Multi-Tenant Platform

- **Admin interface**: F01 React (rich interactions)
- **Customer-facing**: B14 Django (fast, SEO-friendly)
- **Shared**: All design tokens, consistent branding

## Best Practices

### Do's ✅

1. **Use design tokens everywhere** - Both F01 and B14
2. **Document token usage** - Help teams understand which tokens to use
3. **Test both themes** - Light and dark modes in both contexts
4. **Sync theme preferences** - Use localStorage or cookies
5. **Version control tokens** - Update both systems together

### Don'ts ❌

1. **Don't duplicate styles** - Use tokens, not hard-coded values
2. **Don't import React into B14** - It won't work
3. **Don't create separate design systems** - Maintain one source of truth
4. **Don't forget accessibility** - Apply to both F01 and B14
5. **Don't skip documentation** - Keep integration guides updated

## Troubleshooting

### Issue: Styles Don't Match

**Cause**: Different token versions or missing CSS file

**Solution**:
```bash
# Verify both use the same version
npm list @django-core/design-system

# Re-copy tokens.css
cp node_modules/@django-core/design-system/dist/tokens.css static/css/
```

### Issue: Theme Not Syncing

**Cause**: Theme state not shared between React and Django

**Solution**: Use localStorage or cookies:
```javascript
// Set theme in Django view
localStorage.setItem('theme', 'dark');

// React app reads it
const theme = localStorage.getItem('theme') || 'light';
```

### Issue: Token Values Undefined

**Cause**: CSS not loaded or wrong path

**Solution**:
```html
<!-- Verify path -->
<link rel="stylesheet" href="{% static 'css/tokens.css' %}">

<!-- Check browser console for 404 errors -->
```

## Resources

- [F01 Design System Documentation](../packages/design-system/README.md)
- [B14 Integration Guide](../packages/design-system/docs/b14-integration.md)
- [Design Tokens Reference](../packages/design-system/src/docs/Tokens.mdx)
- [Theming Guide](../packages/design-system/src/docs/Theming.mdx)

## Contributing

When contributing to either F01 or B14:

1. **Update design tokens** in F01 first
2. **Test in both contexts** (React + Django templates)
3. **Update integration docs** if APIs change
4. **Version appropriately** (semver)
5. **Communicate breaking changes** to both teams

## Support

For questions or issues:
- [GitHub Issues](https://github.com/yourorg/yourrepo/issues)
- [Design System Slack Channel](#design-system)
- [Documentation Site](https://design-system.example.com)
