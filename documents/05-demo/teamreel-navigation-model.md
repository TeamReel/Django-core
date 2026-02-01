# TeamReel Navigation Model (Panel A + Panel B)

**Date:** 2026-01-30
**Status:** ✅ Shell implemented; Season tabs fully operational
**Related:**
- [TeamReel Layout Optimization](teamreel-layout-optimization.md)
- [TeamReel Webapp Hierarchy](teamreel-webapp-hierarchy.md)
- [TeamReel RBAC Configuration](teamreel-rbac-config.md)
- [TeamReel Templates & Content](teamreel-templates-content.md)

---

## Why this exists

TeamReel is not a generic admin panel; it’s a **content engine** with a repeatable loop:

Select context (Team/Season/Match) → Create content → Review/approve → Publish/share → Track progress/credits → Repeat.

The navigation is designed to:
- Keep **orientation** (where am I?) always clear.
- Make **creation** the default next action.
- Prevent “admin noise” from polluting day-to-day user flow.

---

## Core model (ImageKit-like)

### Panel A = stable categories
Panel A should be short (6–8 items max) and predictable.

Implemented in [demo/src/components/Sidebar.tsx](../../demo/src/components/Sidebar.tsx).

Current high-level sections:
- **OVERVIEW**: Dashboard, Directory
- **APP**: current hierarchy injection (Federation → Club → Team → Season → Competition → Match)
- **CONTENT**: Content Library, AI Studio
- **PREFERENCES**: personal area (sub-items live in Panel B)
- **ORGANISATION**: org admin area (sub-items live in Panel B)
- **PLATFORM**: staff-only area (sub-items live in Panel B)
- **HELP**: docs/constitution

### Panel B = contextual “what can I do here?”
Panel B shows the tabset/subnavigation that belongs to the current route.

Examples:
- `/directory?tab=matches` → Directory tab navigation
- `/:orgId/.../:matchId` → Match tabs
- `/preferences` → Personal settings tabs
- `/permissions` → Organisation admin tabs

Panel B is route-driven and uses route matching + querystring `?tab=` patterns.

---
## Panel B Tab Definitions (per Entity Type)

### Season Tabs (ProjectSeasonDetailPage.tsx)
The Season detail view contains 9 tabs:

| Tab ID | Label | Purpose |
|--------|-------|---------|
| `overview` | Overview | Stats, assets card, sport configuration |
| `hierarchy` | Hierarchy | Child periods tree view |
| `competitions` | Competitions | Competitions within season |
| `matches` | Matches | All matches (direct + via competitions) |
| `squad` | Squad | **Assigned members only** (with positions) |
| `team` | Team | **Unassigned team members** (ready to assign) |
| `media` | Media | Media completion matrix, member slots |
| `content` | Content | Content templates, generation, approval |
| `transactions` | Transactions | Credits/wallet transactions |

**Important distinction (2026-01-30 update):**
- **Squad tab**: Shows ONLY members who have a squad assignment (`MemberSeasonSquad` entry) for this season.
- **Team tab**: Shows team members who do NOT yet have a squad assignment. Used to assign new members.

### Club Tabs (ClubOrganisationDetailPage.tsx)
| Tab ID | Label | Purpose |
|--------|-------|---------|
| `overview` | Overview | Club stats, child teams |
| `teams` | Teams | Team list within club |
| `assets` | Assets | Club asset management (logo, tenue, sponsor) |

### Organisation Tabs (OrganisationDetailPage.tsx)
| Tab ID | Label | Purpose |
|--------|-------|---------|
| `overview` | Overview | Organisation dashboard |
| `teams` | Teams | Teams within organisation |

### Match Tabs
| Tab ID | Label | Purpose |
|--------|-------|---------|
| `overview` | Overview | Match details, status |
| `lineup` | Lineup | Formation, starting players |
| `content` | Content | Match-related content generation |

---
## Routing rules (important UX invariants)

### 1) Wallet split (Personal vs Organisation)
Credits is routed with a query param to keep the sidebar highlight correct:
- Personal wallet: `/credits?wallet=personal` (belongs under **Preferences**)
- Org wallet: `/credits?wallet=org` (belongs under **Organisation**)

This is intentionally explicit because the underlying data model supports wallet scope.

### 2) Deep links for “Create” actions
Some “Create” entry points are implemented as deep links (no new routes required):
- Create Match opens the real modal via: `/directory?tab=matches&create=match`

This keeps the UI fast and supports sharing links.

### 3) No-mock policy
UI may exist ahead of backend modules, but it should not:
- show fake datasets,
- pretend generation succeeded,
- simulate content cards as if they exist.

Instead: empty states + “requires module X” messaging.

---

## Implementation status (Reality Check)

### Implemented (Frontend)
- Panel A / Panel B shell and routing logic.
- Recents/Favorites UX (client-side only today).
- Quick Switcher / Command Palette (Ctrl/Cmd+K).
- Create split-button (main action points to Content Library).

### Implemented (Backend/API)
- Credits/transactions foundations exist to support wallet UX.
- Minimal credits API surface exists for “My Wallet” flows.

### Pending (Not implemented end-to-end)
- Smart Import / Clone Season squad.
- Full gamification loop (slot unlocks from real events).
- Content templates + generation pipeline integration (B31/B34/B35).
- Navigation/RBAC hardening: guarantee nav never reveals a route that would 403.

---

## Next 80/20 improvements (recommended)

1) **Fix AI Studio route consistency**
- Target: Panel A should link to `/studio/create` (not `/studio`) to match the real route.

2) **RBAC/Nav hardening (must-have)**
- One source of truth for “is route visible” so the nav never leaks a 403 route.

3) **Server-backed Recents/Favorites (cross-device)**
- Planned module: **B41 User Navigation State (Recents/Favorites)**
- Until then: localStorage-only is acceptable.

4) **Match/Season hubs evolve into real Action Centers**
- Tie slot availability to real data (participations + match events).

---

## Key code anchors

- Sidebar shell + Panel A/B config: [demo/src/components/Sidebar.tsx](../../demo/src/components/Sidebar.tsx)
- Recents/Favorites storage: `demo/src/utils/navStorage.ts`
- Command palette: `demo/src/components/CommandPalette.tsx`
- Match create deep-link handling: `demo/src/pages/identity/directory/MatchesList.tsx`

---

**Navigation:** [← Back to 05-demo index](index.md)
