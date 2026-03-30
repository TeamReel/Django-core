# Mobile-First Patterns

> Last updated: 2026-03-12

## Philosophy

TeamReel is designed **mobile-first**: base CSS targets phone viewports, breakpoints progressively add complexity for larger screens. Any team member should be able to create match-day content from their phone on the sideline.

## Breakpoint System

| Name | Query | Target device |
|------|-------|--------------|
| Base | `< 640px` | Phone (portrait) |
| **sm** | `≥ 640px` | Phone (landscape), small tablet |
| **md** | `≥ 768px` | Tablet (portrait) |
| **lg** | `≥ 1024px` | Tablet (landscape), desktop |
| **xl** | `≥ 1280px` | Desktop |
| **2xl** | `≥ 1536px` | Wide desktop |

### CSS pattern

```css
/* Base: mobile layout */
.grid { grid-template-columns: 1fr; }

/* Desktop enhancement */
@media (min-width: 1024px) {
  .grid { grid-template-columns: 2fr 1fr; }
}
```

**Never write max-width queries for mobile** — that's desktop-first thinking. The only exception is targeting specific mobile behaviors:

```css
@media (max-width: 639px) {
  .modal { /* full-screen on mobile */ }
}
```

## Touch Targets

All interactive elements must meet **WCAG 2.5.8**: minimum **44×44px** touch target.

```css
/* Utility class */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}

/* Touch-specific media query */
@media (hover: none) and (pointer: coarse) {
  .button { min-height: 44px; padding: 12px 16px; }
}
```

## Safe Areas

iOS notch/home indicator safe areas are handled with environment variables:

```css
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.safe-bottom-nav {
  padding-bottom: calc(env(safe-area-inset-bottom, 0) + 56px);
}
```

The `safe-bottom-nav` class accounts for the `MobileBottomNav` fixed at the bottom.

## Navigation Patterns

### Desktop
- **Sidebar**: Dual-panel (Panel A icon strip + Panel B context list)
- **TopNavbar**: Search, org switcher, user menu
- Layout: sidebar + scrollable main content

### Tablet (640px – 1023px)
- **Panel A**: Collapses to 72px icon-only strip
- **Panel B**: Hidden (accessible via toggle)
- **TopNavbar**: Simplified, no search expansion

### Mobile (< 640px)
- **Sidebar**: Slide-out drawer (240px) with overlay backdrop
- **MobileBottomNav**: Fixed bottom bar with 5 nav items
- **TopNavbar**: Compact, hamburger menu
- Layout: full-width stacked content

```css
/* Sidebar responsive behavior */
@media (max-width: 639px) {
  .sidebar {
    position: fixed;
    transform: translateX(-100%);
    transition: transform var(--duration-slow) var(--ease-out);
    z-index: 1000;
  }
  .sidebar.open {
    transform: translateX(0);
  }
}
```

## Gesture Support

### Swipe-to-dismiss

`SwipeableCard` and `MobileFilterSheet` support horizontal swipe gestures:

```tsx
// Swipe logic is inline in SwipeableCard.tsx:
// - Touch start/move/end tracking
// - Threshold detection (>50% of width)
// - Spring-back animation on cancel
// - Haptic feedback on threshold cross
```

### Pull-to-refresh (planned)

> **Status:** Not yet implemented. Listed as future enhancement.

Intended for `DashboardPage`, `ApprovalsPage`, `VideoQueuePage`:

```tsx
// Planned: usePullToRefresh hook
// - Vertical pull detection (>60px threshold)
// - Loading spinner animation
// - Data refetch callback
```

## Container Queries

For component-level responsive behavior independent of viewport size (e.g., a card grid inside a variable-width panel):

```css
/* Define container */
.galleryWrapper { container: gallery / inline-size; }

/* Respond to container width */
@container gallery (max-width: 480px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@container gallery (max-width: 260px) {
  .grid { grid-template-columns: 1fr; }
}
```

Active containers:

| Container | Component | Breakpoints |
|-----------|-----------|-------------|
| `gallery` | Media gallery grid | 480px → 2-col, 260px → 1-col |
| `stats` | Stats dashboard grid | 400px → 4-col |
| `dashboard` | Dashboard layout | 768px → 2fr+1fr side-by-side |
| `card-grid` | Generic card grid | 500px → 2-col, 280px → 1-col |

## Mobile-Specific Components

| Component | Purpose |
|-----------|---------|
| **MobileBottomNav** | Fixed 5-item navigation bar |
| **MobileTabBar** | Tab bar for sectioned mobile views (181 LOC) |
| **MobileFilterSheet** | Bottom sheet for filter selection (swipe-to-dismiss) |
| **SwipeableCard** | Card with swipe gesture actions |
| **QuickActions** | Quick create actions (integrated in MobileBottomNav **+** button) |
| **OfflineBanner** | Connection status toast at screen top |

## Responsive Utility Classes

```html
<!-- Visibility -->
<div class="hide-mobile">Desktop/tablet only</div>
<div class="show-mobile-only">Phone only</div>
<div class="hide-tablet">Not on tablet</div>
<div class="hide-desktop">Not on desktop</div>

<!-- Responsive spacing -->
<div class="p-responsive">Padding scales with viewport</div>
<div class="gap-responsive">Gap scales with viewport</div>
<div class="m-responsive">Margin scales with viewport</div>
```

## Layout Patterns by Viewport

### Dashboard
- **Mobile**: Single column, activity feed stacked
- **Desktop**: CSS Grid `2fr 1fr` — main content + sidebar

### Detail Pages
- **Mobile**: Stacked sections, key info first
- **Desktop**: 3-column grid (metadata | content | actions)

### Gallery / Media Grid
- **Mobile**: 3-column square grid (Instagram-style)
- **Desktop**: `repeat(auto-fill, minmax(220px, 1fr))`

### Modals
- **Mobile**: Full-screen with safe-area padding
- **Desktop**: Centered overlay with max-width

### Tables
- **Mobile**: Horizontal scroll with sticky first column
- **Desktop**: Full table layout

## Performance Considerations

- **Lazy load** images below the fold
- **Skeleton screens** for loading states (not spinners)
- **Debounce** scroll/resize handlers (see `useDebounce` hook)
- **Passive event listeners** for touch handlers
- Keep main thread < 50ms per task for smooth 60fps gestures
