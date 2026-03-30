# Media Readiness Card

## Overview

The **MediaReadinessCard** provides a hierarchical view of media completeness across three tiers: **Club**, **Team**, and **Members**. It replaces the previous `TeamReadinessCard` with a richer, drill-down interface that shows exactly which assets are present, which variant is active (AI processed / Upload / Combined), and per-member media progress.

Located on the Dashboard, it gives coaches and admins a single glance at what's ready and what still needs to be uploaded or generated.

## User Flow

1. User sees the **Media gereedheid** card on the dashboard with three tier rows (Club, Team, Spelers) and an overall percentage badge.
2. User taps the card → a **NavigationSheet** opens with an overview showing all three tiers.
3. User taps **Club assets** → drills into club-level detail showing each asset (logo, background) with thumbnail, variant label, and presence indicator.
4. User taps **← Vorige** → returns to overview.
5. User taps **Team assets** → sees team-level assets (home kit, away kit, goalkeeper kit, sponsor) with the same detail.
6. User taps **Spelers media** → sees a list of all team members sorted by least-complete first, each with a progress bar.
7. User taps a member → drills into individual member detail showing 4 media types (profile photo, tenue photo, close-up, intro video).
8. If member has missing media, a **"Ontbrekende media genereren"** callout appears. Tapping it opens the Create Wizard for the first missing type.

## Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MediaReadinessCard` | `demo/src/components/dashboard/MediaReadinessCard.tsx` | Main dashboard card + 5-level drill-down sheet |
| `useMediaReadiness` | `demo/src/components/dashboard/useMediaReadiness.ts` | Data hook — fetches assets, members, gen requests |
| CSS Module | `demo/src/components/dashboard/MediaReadinessCard.module.css` | All styles with design tokens |
| `TierRowCompact` | (inline in MediaReadinessCard.tsx) | Card preview row (non-clickable) |
| `TierRowClickable` | (inline in MediaReadinessCard.tsx) | Sheet overview row (clickable with chevron) |

## Data Flow

```
BrandAssets API ──┐
                  ├─→ useMediaReadiness() ──→ MediaReadinessCard ──→ NavigationSheet
Project Members ──┤              │
                  │              ├── club: TierStatus
Gen Requests ─────┘              ├── team: TierStatus
                                 ├── members: { list: MemberMediaStatus[] }
                                 └── overallPercent: number
```

### Data Sources

| Source | Endpoint | What it provides |
|--------|----------|-----------------|
| Branding assets | `GET /branding/assets/?organisation_scope={org}` | All brand assets with `project_type` discriminator |
| Project members | `GET /organisations/{org}/projects/{project}/members/` | Team member list with user refs |
| Generative requests | `GET /generative/requests/?status=completed&project={id}` | Completed generation requests to track member media |

### Asset Categorisation

Assets are categorised by `project_type` field on `BrandAsset`:

| Tier | `project_type` | Expected Assets |
|------|---------------|-----------------|
| Club | `'club'` or `null` | `logo`, `background` (stadium/club) |
| Team | `'team'` | `kit_home`, `kit_away`, `kit_goalkeeper`, `sponsor_logo` |

Each expected asset maps to multiple `asset_type` variants:
- **Logo**: `logo`, `logo_upload`
- **Kit Home**: `kit_home`, `kit_home_upload`, `kit_home_combined`
- **Sponsor**: `sponsor_logo`, `sponsor_logo_upload`

The active variant determines the label shown: "AI verwerkt", "Upload", "Gecombineerd", "Stadionachtergrond".

### Member Media Types

| Key | Label | Source |
|-----|-------|--------|
| `profile_photo` | Profielfoto | Generative request with `template_subtype` |
| `in_tenue` | Tenue foto | Generative request with `template_subtype` |
| `closeup` | Close-up | Generative request with `template_subtype` |
| `short_intro` | Intro video | Generative request with `template_subtype` |

Member completeness is determined by matching completed `GenerationRequest` records where `template_type === 'member'` to member IDs via `input_data.member_ids` or `input_data.member_id`.

## Navigation Architecture

The card uses a single `NavigationSheet` with a view state machine for iOS-style drill-down:

```typescript
type SheetView =
  | { level: 'overview' }
  | { level: 'club' }
  | { level: 'team' }
  | { level: 'members' }
  | { level: 'member'; member: MemberMediaStatus }
```

Navigation uses a `history` stack:
- `pushView(next)` → appends current view to history, navigates to `next`
- `popView()` → pops last view from history, navigates back
- `NavigationSheet` receives `onBack` prop when history has entries → shows back button

## Wizard Integration

The member detail view dispatches a `teamreel:open-quick-create` CustomEvent when the "Ontbrekende media genereren" callout is tapped:

```typescript
window.dispatchEvent(
  new CustomEvent('teamreel:open-quick-create', {
    detail: { flow: 'content', subtype: firstMissing.key },
  }),
);
```

This opens the Create Wizard pre-configured for the first missing media type.

## Design Decisions

- **Single sheet with view state** instead of nested sheets: Avoids sheet-stacking complexity; a single `NavigationSheet` swaps content while maintaining a breadcrumb-like history.
- **Replaced TeamReadinessCard** rather than extending: The flat tab-based interface couldn't support the hierarchical club/team/member separation or multi-level drill-down.
- **Sort members by least complete first**: Surfaces the members needing the most attention at the top of the list.
- **Progress colour thresholds**: ≥80% green, ≥40% amber, <40% red — consistent across all progress bars.
- **Weighted average for overall %**: Simple arithmetic mean of club%, team%, members% — equal weight to each tier.

## Accessibility

- **Touch targets**: All interactive rows have `min-height: 44px`
- **Keyboard**: `onKeyDown` handlers for Enter/Space on all `role="button"` elements
- **Focus management**: `:focus-visible` outlines on card, tier rows, member rows, callouts
- **Screen reader**: Card announces `aria-haspopup="dialog"`, `aria-expanded` tracks sheet state
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all transitions and shimmer animation

## Responsive

- **Mobile (base)**: Full-width card, sheet takes full viewport
- **Touch**: `-webkit-tap-highlight-color: transparent`, scale-down on active press
- **Hover**: Only on `hover: hover` media query — no hover states on touch devices

## Related Files

- Frontend: `demo/src/components/dashboard/MediaReadinessCard.tsx`
- Hook: `demo/src/components/dashboard/useMediaReadiness.ts`
- Styles: `demo/src/components/dashboard/MediaReadinessCard.module.css`
- Dashboard: `demo/src/pages/DashboardPage.tsx`
- Sheet: `demo/src/components/ui/NavigationSheet.tsx`
- Branding types: `demo/src/types/api/branding.ts` (`BrandAsset`)
- Member types: `demo/src/types/api/project.ts` (`ProjectMembership`)
- Generation types: `demo/src/types/api/generative.ts` (`GenerationRequest`)
- Replaced: `demo/src/components/dashboard/TeamReadinessCard.tsx` (still exported as legacy)
