# Brand Identity — TeamReel

> Last updated: 2026-03-30

## Overview

TeamReel's brand identity combines **professional reliability** with **sporting energy**. This document defines the visual, verbal, and emotional identity of the brand — verified against the actual implementation in `demo/src/styles/tokens.css` and `demo/src/styles/theme.css`.

For technical token implementation, see [css-architecture.md](frontend-design/css-architecture.md) and [theming.md](frontend-design/theming.md).

---

## Brand Values

| Value | Meaning | Application |
|-------|---------|-------------|
| **Simplicity** | No unnecessary steps or visual noise | Minimal UI, clear typography |
| **Reliability** | Consistent quality in design and AI output | Predictable interactions, stable palette |
| **Accessibility** | Everyone can use it regardless of digital experience | High contrast, clear text, WCAG 2.1 AA |
| **Collaboration** | Built for clubs and volunteers, not individuals | Multi-role structure, shared workspaces |
| **Pride** | Content strengthens club identity | Every output carries club logo and colors |

> Every visual and textual element should reflect at least two of these values.

---

## Brand Personality

| Dimension | Description |
|-----------|-------------|
| **Tone** | Calm, knowledgeable, positive |
| **Experience** | Reliable, efficient, transparent |
| **Relationship** | Partner in the process, not just a tool |
| **Communication** | Direct, clear, slightly empathetic |

**Brand axis:**
- 70% professional / 30% human
- 60% innovative / 40% familiar
- 80% local (Dutch clubs) / 20% expandable (international)

---

## Color Palette

All colors are implemented as CSS custom properties in `demo/src/styles/tokens.css`. The palette uses a systematic 50–900 scale.

### Primary Colors (Ocean Teal)

| Token | Hex | Role |
|-------|-----|------|
| `--color-primary-50` | `#e6f4f7` | Lightest background tint |
| `--color-primary-100` | `#b3dfe8` | Subtle highlights |
| `--color-primary-200` | `#80c9d9` | Light accents |
| `--color-primary-300` | `#4db3ca` | Secondary elements |
| `--color-primary-400` | **`#3B8EA5`** | **Main brand color** — buttons, links, active states |
| `--color-primary-500` | `#2e7a8f` | Hover states |
| `--color-primary-600` | `#266879` | Pressed states |
| `--color-primary-700` | `#1e5563` | Dark accents |
| `--color-primary-800` | `#16424d` | Very dark |
| `--color-primary-900` | `#0e2f37` | Darkest |

### Neutral Colors (Navy → Ice)

| Token | Hex | Role |
|-------|-----|------|
| `--color-neutral-50` | `#EDF6FF` | Light backgrounds, cards |
| `--color-neutral-800` | **`#1C355E`** | **Deep Navy** — text, headers, navigation |
| `--color-neutral-900` | **`#0A192F`** | **Midnight** — dark backgrounds, overlays |

### Semantic Colors

| Purpose | Token | Hex | WCAG Note |
|---------|-------|-----|-----------|
| **Success** | `--color-green-500` | `#06D6A0` | Team Green — confirmations |
| **Error** | `--color-red-400` | `#E63946` | Signal Red — validation errors |
| **Warning** | `--color-amber-300` | `#FFD166` | Focus Amber — warnings |
| **Info** | `--color-blue-500` | `#3b82f6` | Actions, information |
| **Focus ring** | `--app-focus-ring` | `#FF8C42` | Energy Orange — keyboard focus |

### Color Guidelines
- Use `--color-primary-400` for primary CTAs and interactive elements
- Use `--color-neutral-800` for body text on light backgrounds
- Contrast ratio ≥ 4.5:1 for text and UI elements (WCAG 2.1 AA)
- Maximum two accent colors per screen

---

## Typography

The application uses **system font stacks** for optimal performance and native feel.

| Token | Stack | Usage |
|-------|-------|-------|
| `--font-sans` | -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif | All UI text |
| `--font-mono` | source-code-pro, Menlo, Monaco, Consolas, monospace | Code, technical content |

### Type Scale (fluid, viewport-responsive)

| Token | Size range | Usage |
|-------|-----------|-------|
| `--text-xs` | 11px → 12px | Badges, metadata |
| `--text-sm` | 13px → 14px | Captions, labels |
| `--text-base` | 15px → 16px | Body text |
| `--text-lg` | 18px → 20px | Subheadings |
| `--text-xl` | 20px → 24px | Section headings |
| `--text-2xl` – `--text-8xl` | 28px → 72px | Display headings, hero text |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | 400 | Body text |
| `--font-medium` | 500 | Labels, captions |
| `--font-semibold` | 600 | Headings, emphasis |
| `--font-bold` | 700 | Primary headings, hero text |

> **Note:** The original brand identity specified Manrope (headings) and Inter (body). These are aspirational for marketing materials and video templates. The web app uses system fonts for performance.

---

## Logo System

Logo assets are stored in `demo/src/assets/` and loaded via the frontend build.

### Logo Variants

| Variant | Context | Background |
|---------|---------|------------|
| Primary Light | Standard use on light backgrounds | Light / white |
| Primary Dark | Dark mode, video overlays | Dark |
| Primary White | On colored surfaces | Transparent |
| Horizontal Wide | Website headers, email banners | Various |
| Icon Only | App icon, favicon, small formats | Any |
| Monochrome | Black/white print, watermarks | Light or dark |

### Logo Rules
- Minimum clear space: 1× logo height around all sides
- No shadows, outlines, or distortions
- Icon Only variant for sizes < 64px width
- Horizontal Wide for layouts with aspect ratio > 3:1

---

## Iconography

TeamReel uses **Lucide React** — outline style, rounded corners, uniform stroke.

| Property | Value |
|----------|-------|
| Library | [Lucide React](https://lucide.dev) |
| Style | Outline (no fill) |
| Default stroke | 1.5px |
| Standard size | 20px (UI), 24px (navigation) |
| Corner style | Rounded |

### Color Rules for Icons
- Primary blue (`--color-primary-400`) for active elements
- Neutral dark for inactive elements
- White for icons on dark surfaces

---

## Tone of Voice

### General Guidelines

| Aspect | Guideline | Example |
|--------|-----------|---------|
| **Tone** | Sporty, enthusiastic, human | "Ready for kickoff? Create your video in 2 clicks." |
| **Language level** | B1 — clear, active | "Your club. Your style. Our AI." |
| **Rhythm** | Short sentences, action verbs | "Upload. Generate. Share." |
| **Perspective** | Second person ("you", "your club") | "We do it together." |
| **Humor** | Light, collegial, never silly | "From upload to applause in five minutes." |
| **Avoid** | Technical jargon, management speak | Not: "AI optimization pipeline"; Yes: "AI that finishes your video." |

### Tone by Context

| Context | Style |
|---------|-------|
| **Product UI** | Clear, action-oriented, minimal |
| **Marketing / landing pages** | Inspiring, storytelling |
| **Documentation** | Precise, structured, neutral |
| **Error messages** | Helpful, solution-focused, never blaming |

### Core Message

> **"TeamReel makes professional club videos simple and fun — in five minutes, in your style."**

---

## Photography & Image Style

- Show **real sports moments, real people** — no stock photos
- Preference: action, emotion, natural lighting
- Diversity and team spirit
- AI-generated content always carries club branding (logo, colors, kits)

---

## Spacing System

Based on a **4px base unit** (not 8px as originally planned).

| Token | Value |
|-------|-------|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-4` | 16px |
| `--space-6` | 24px |
| `--space-8` | 32px |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 2px | Small elements |
| `--radius-sm` | 4px | Buttons, inputs |
| `--radius-md` | 8px | Cards |
| `--radius-lg` | 12px | Modals, large components |
| `--radius-full` | 9999px | Circles, pills |

---

## Elevation (Shadows)

| Token | Usage |
|-------|-------|
| `--shadow-xs` | Subtle depth |
| `--shadow-sm` | Default card shadow |
| `--shadow-card` | Cards at rest |
| `--shadow-card-hover` | Cards on hover |
| `--shadow-lg` | Dropdowns, popovers |
| `--shadow-xl` | Modals |

---

## Motion

| Token | Duration | Usage |
|-------|----------|-------|
| `--duration-fast` | 100ms | Micro-interactions |
| `--duration-normal` | 200ms | Standard transitions |
| `--duration-slow` | 300ms | Page transitions |
| `--ease-default` | cubic-bezier(0.4, 0, 0.2, 1) | All animations |

All animations respect `@media (prefers-reduced-motion: reduce)`.
