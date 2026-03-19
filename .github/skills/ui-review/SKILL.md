---
name: ui-review
description: "Audits React component source code for WCAG 2.1 AA accessibility, design token compliance, mobile responsiveness, and dark mode support. Use when reviewing a component for accessibility, checking token usage, or auditing a11y before shipping. This is a code-level review (not browser-based)."
metadata:
  author: teamreel
  argument-hint: "Component or page path (e.g. 'demo/src/pages/Dashboard')"
---

# UI Review Skill

Audit React components for accessibility (WCAG 2.1 AA), design system compliance, mobile responsiveness, and dark mode support.

## When to use
- Reviewing component **source code** for a11y, tokens, mobile patterns
- Checking CSS files for hardcoded values vs design tokens
- Auditing a component before shipping (code-level)

## When NOT to use
- Checking how a page **looks in a browser** → use `web-design-reviewer` instead
- Testing user **flows end-to-end** (click, navigate, verify) → use `webapp-testing` instead

## Audit Checklist

### 1. Design Token Compliance

Scan CSS files for hardcoded values:

```bash
# Find hardcoded colors (hex, rgb, hsl)
grep -rn '#[0-9a-fA-F]\{3,6\}\|rgb(\|hsl(' demo/src/components/<target>

# Find hardcoded spacing (px values except allowed)
# Allowed: 0, 1px, 100%, 100vh, auto, 50%
grep -rn '[0-9]\+px' demo/src/components/<target>
```

**Must use tokens for:**
- Colors → `var(--app-*)` semantic tokens
- Spacing → `var(--space-*)`
- Border radius → `var(--radius-*)`
- Shadows → `var(--shadow-*)`
- Transitions → `var(--duration-*)` + `var(--ease-*)`

### 2. Accessibility (WCAG 2.1 AA)

| Check | How to verify |
|-------|--------------|
| **Touch targets** ≥ 44×44px | Inspect all buttons, links, toggles |
| **Focus visible** | Every interactive element has `:focus-visible` style |
| **Keyboard navigation** | All actions reachable via Tab + Enter/Space |
| **Clickable non-buttons** | Must have `role="button"` + `tabIndex={0}` + `onKeyDown` |
| **Icon-only buttons** | Must have `aria-label` |
| **Form inputs** | Must have visible `<label>` or `aria-label` |
| **Images** | Must have `alt` text (or `alt=""` if decorative) |
| **Color contrast** | Text ≥ 4.5:1, large text ≥ 3:1 |
| **Error states** | Not conveyed by color alone — use icon + text |
| **Sheet/modal triggers** | `aria-haspopup="dialog"` + `aria-expanded` |
| **Live regions** | Status updates use `aria-live="polite"` |

### 3. Reduced Motion

Every component with animation/transition must include:

```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    transition: none;
  }
}
```

### 4. Mobile Responsiveness

| Check | Requirement |
|-------|------------|
| CSS approach | Mobile-first (base = phone) |
| No horizontal overflow | `overflow-x: hidden` where needed |
| Touch targets | ≥ 44×44px on mobile |
| Font sizes | Readable without zoom (≥ 14px body) |
| Stacking | Complex layouts stack vertically on mobile |

### 5. Dark Mode

| Check | Requirement |
|-------|------------|
| All colors via tokens | `var(--app-*)` semantic tokens, never hardcoded |
| No white backgrounds | Use `var(--app-surface)` etc. |
| Borders visible | Use `var(--app-border)` |
| Images | No white halos, use `object-fit` properly |

## Output Format

```markdown
## UI Review: [Component/Page Name]

### Summary
| Dimension | Score | Status |
|-----------|-------|--------|
| Token compliance | X/10 | ✅/⚠️/❌ |
| Accessibility | X/10 | ✅/⚠️/❌ |
| Reduced motion | X/10 | ✅/⚠️/❌ |
| Mobile | X/10 | ✅/⚠️/❌ |
| Dark mode | X/10 | ✅/⚠️/❌ |

### Issues
| # | Category | Severity | Location | Issue | Fix |
|---|----------|----------|----------|-------|-----|

### Passing
- ...
```
