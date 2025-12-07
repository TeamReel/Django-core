# B14 Web UI Baseline Integration Guide

This guide explains how to use the Django Core Design System (F01) design tokens in B14 Django templates **without React**.

## Overview

B14 can consume F01's design tokens as CSS custom properties (CSS variables) to maintain visual consistency across React and Django template-based UIs.

**What B14 Can Use:**
- ✅ Design tokens (colors, spacing, typography, etc.) via CSS variables
- ✅ CSS custom properties for theming
- ✅ Pre-built CSS utility classes (if provided)

**What B14 Cannot Use:**
- ❌ React components (Button, Card, Modal, etc.)
- ❌ JavaScript-based interactions
- ❌ ThemeProvider or React hooks

## Setup

### 1. Install the Package

Add the design system to your project:

```bash
pnpm add @django-core/design-system
# or
npm install @django-core/design-system
```

### 2. Copy Tokens CSS to Static Files

During your build process, copy `tokens.css` to your Django static files:

```bash
# Example build script
cp node_modules/@django-core/design-system/dist/tokens.css static/css/design-system-tokens.css
```

Or use Django's `collectstatic` with proper configuration:

```python
# settings.py
STATICFILES_DIRS = [
    ('design-system', 'node_modules/@django-core/design-system/dist'),
]
```

### 3. Include in Base Template

Add the tokens CSS to your Django base template:

```html
{% load static %}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Django App{% endblock %}</title>

    {# Include design system tokens #}
    <link rel="stylesheet" href="{% static 'css/design-system-tokens.css' %}">

    {# Your app styles #}
    <link rel="stylesheet" href="{% static 'css/app.css' %}">
</head>
<body>
    {% block content %}{% endblock %}
</body>
</html>
```

## Using Design Tokens

### Colors

Use color tokens for consistent branding:

```html
<div class="hero-section">
    <h1 class="hero-title">Welcome</h1>
    <p class="hero-description">Get started with our platform</p>
</div>

<style>
.hero-section {
    background: var(--color-background-secondary);
    border-bottom: 1px solid var(--color-border-primary);
    padding: var(--spacing-8);
}

.hero-title {
    color: var(--color-text-primary);
    font-size: var(--typography-fontSize-4xl);
    font-weight: var(--typography-fontWeight-bold);
}

.hero-description {
    color: var(--color-text-secondary);
    font-size: var(--typography-fontSize-lg);
}
</style>
```

### Spacing

Use spacing tokens for consistent layout:

```html
<div class="card">
    <div class="card-header">
        <h2>Card Title</h2>
    </div>
    <div class="card-body">
        <p>Card content goes here.</p>
    </div>
</div>

<style>
.card {
    background: var(--color-background-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-md);
}

.card-header {
    padding: var(--spacing-4);
    border-bottom: 1px solid var(--color-border-secondary);
}

.card-body {
    padding: var(--spacing-4);
}

.card + .card {
    margin-top: var(--spacing-4);
}
</style>
```

### Typography

Use typography tokens for text styling:

```html
<article class="article">
    <h1 class="article-title">Article Title</h1>
    <p class="article-meta">Published on Jan 1, 2025</p>
    <div class="article-content">
        <p>Article body text...</p>
    </div>
</article>

<style>
.article-title {
    font-family: var(--typography-fontFamily-sans);
    font-size: var(--typography-fontSize-3xl);
    font-weight: var(--typography-fontWeight-bold);
    line-height: var(--typography-lineHeight-tight);
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-2);
}

.article-meta {
    font-size: var(--typography-fontSize-sm);
    color: var(--color-text-tertiary);
    margin-bottom: var(--spacing-4);
}

.article-content {
    font-size: var(--typography-fontSize-md);
    line-height: var(--typography-lineHeight-relaxed);
    color: var(--color-text-secondary);
}
</style>
```

### Buttons

Create button styles using tokens:

```html
<button class="btn btn-primary">Primary Action</button>
<button class="btn btn-secondary">Secondary Action</button>

<style>
.btn {
    font-family: var(--typography-fontFamily-sans);
    font-size: var(--typography-fontSize-md);
    font-weight: var(--typography-fontWeight-medium);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-md);
    border: none;
    cursor: pointer;
    transition: all var(--motion-duration-fast) var(--motion-easing-standard);
}

.btn-primary {
    background: var(--color-primary);
    color: var(--color-text-inverse);
}

.btn-primary:hover {
    background: var(--color-primary-hover);
}

.btn-primary:active {
    background: var(--color-primary-active);
}

.btn-secondary {
    background: var(--color-secondary);
    color: var(--color-text-inverse);
}

.btn-secondary:hover {
    background: var(--color-secondary-hover);
}
</style>
```

## Theme Support

### Detecting User Theme Preference

Use JavaScript to detect and apply theme preference:

```html
<script>
// Apply theme class to html element
function applyTheme(theme) {
    document.documentElement.className = `theme-${theme}`;
}

// Check saved preference
const savedTheme = localStorage.getItem('theme') || 'light';

// Check system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = savedTheme === 'auto' ? (prefersDark ? 'dark' : 'light') : savedTheme;

applyTheme(theme);

// Listen for changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('theme') === 'auto') {
        applyTheme(e.matches ? 'dark' : 'light');
    }
});
</script>
```

### Theme Toggle

Add a theme switcher:

```html
<button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
    <span class="theme-icon">🌙</span>
</button>

<script>
const toggle = document.getElementById('theme-toggle');
const icon = toggle.querySelector('.theme-icon');

toggle.addEventListener('click', () => {
    const current = localStorage.getItem('theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';

    localStorage.setItem('theme', next);
    document.documentElement.className = `theme-${next}`;
    icon.textContent = next === 'light' ? '🌙' : '☀️';
});
</script>

<style>
.theme-toggle {
    background: var(--color-background-secondary);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-full);
    padding: var(--spacing-2);
    cursor: pointer;
    font-size: var(--typography-fontSize-lg);
}

.theme-toggle:hover {
    background: var(--color-background-hover);
}
</style>
```

## Available Token Categories

| Category | Example Tokens | Use Case |
|----------|----------------|----------|
| **Colors** | `--color-text-primary`, `--color-background-secondary` | Text, backgrounds, borders |
| **Spacing** | `--spacing-4`, `--spacing-8` | Padding, margins, gaps |
| **Typography** | `--typography-fontSize-md`, `--typography-fontWeight-bold` | Text styling |
| **Radius** | `--radius-md`, `--radius-lg` | Border rounding |
| **Shadow** | `--shadow-sm`, `--shadow-lg` | Elevation effects |
| **Z-Index** | `--zIndex-modal`, `--zIndex-dropdown` | Layer stacking |
| **Motion** | `--motion-duration-fast`, `--motion-easing-standard` | Animations |
| **Breakpoints** | `--breakpoint-md`, `--breakpoint-lg` | Responsive design |

See the [Design Tokens documentation](./Tokens.mdx) for complete token reference.

## Relationship with F01

```
┌─────────────────────────────────────────────────────────┐
│ F01 (Design System)                                     │
│ ┌────────────┐          ┌──────────────┐               │
│ │ Components │          │ Design       │               │
│ │ (React)    │          │ Tokens       │               │
│ │            │          │ (CSS Vars)   │               │
│ └────────────┘          └──────────────┘               │
│      ↓                         ↓                        │
│      ↓                         ↓                        │
│  React Apps            ┌──────────────┐                │
│                        │ B14 Django   │                │
│                        │ Templates    │                │
│                        └──────────────┘                │
└─────────────────────────────────────────────────────────┘
```

- **F01 Components** → Used in React applications only
- **F01 Design Tokens** → Shared between React apps and B14 Django templates

## Best Practices

### Do's ✅

- **Use semantic tokens** - `--color-text-primary` instead of `--color-gray-900`
- **Respect the spacing scale** - Use predefined spacing values
- **Support both themes** - Test light and dark modes
- **Follow token conventions** - Use the naming patterns consistently

### Don'ts ❌

- **Don't hard-code colors** - Always use token variables
- **Don't skip the spacing scale** - Avoid custom pixel values
- **Don't import React components** - B14 can't use them
- **Don't modify token values** - Override semantically if needed

## Common Patterns

### Card Component

```html
<div class="card">
    <h3 class="card-title">Card Title</h3>
    <p class="card-text">Card description</p>
    <button class="btn btn-primary">Action</button>
</div>

<style>
.card {
    background: var(--color-background-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
    box-shadow: var(--shadow-md);
}

.card-title {
    font-size: var(--typography-fontSize-xl);
    font-weight: var(--typography-fontWeight-semibold);
    color: var(--color-text-primary);
    margin-bottom: var(--spacing-2);
}

.card-text {
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-4);
}
</style>
```

### Alert/Notice

```html
<div class="alert alert-success">
    ✓ Operation completed successfully
</div>

<style>
.alert {
    padding: var(--spacing-4);
    border-radius: var(--radius-md);
    border: 1px solid;
}

.alert-success {
    background: color-mix(in srgb, var(--color-success) 10%, transparent);
    border-color: var(--color-success);
    color: var(--color-text-primary);
}
</style>
```

## Troubleshooting

### Tokens Not Working

**Problem**: CSS variables showing as undefined

**Solution**: Ensure `tokens.css` is loaded:
```html
<link rel="stylesheet" href="{% static 'css/design-system-tokens.css' %}">
```

### Theme Not Switching

**Problem**: Dark theme styles not applying

**Solution**: Verify the theme class is applied to a parent element:
```html
<html class="theme-dark">
```

### Specificity Issues

**Problem**: Token values being overridden

**Solution**: Check CSS specificity order. Token variables should be defined at root level.

## Examples

See complete examples in the repository:
- [Django Template Examples](../../examples/django-templates/)
- [Token Usage Patterns](../../examples/token-patterns/)

## Support

For questions or issues:
- [Design System Documentation](../README.md)
- [Design Tokens Reference](./Tokens.mdx)
- [GitHub Issues](https://github.com/yourorg/yourrepo/issues)
