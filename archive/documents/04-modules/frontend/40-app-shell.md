# Module 40: AppShell & Navigation Architecture

**Status:** Draft
**Category:** Frontend
**Feature:** Application Layout, Navigation, and Shell

## 1. Frontend Analysis Report (Current State)

### 1.1. Component Structure
*   **`App.tsx`**: Defines a flat list of routes (`<Route path="..." element={<Page />} />`). Does *not* use a layout wrapper.
*   **`AppShell.tsx`**: A wrapper component used *manually* specifically inside page components (e.g., `DashboardPage`, `UsersPage`, `ActivitiesPage`).
    *   Contains: `TopNavbar` + `children`.
    *   **Missing:** Does NOT contain the `Sidebar`.
*   **`TopNavbar.tsx`**: Implemented as a "Docker-style mega menu".
*   **`Sidebar.tsx`**: Exists in `components/` but is **orphaned** (not used in `AppShell` or `App.tsx`).
*   **`Sidebar.tsx`**: Implemented with hardcoded navigation groups.

### 1.2. Identified Issues
1.  **Manual Wrapping (Anti-Pattern):** Every page wraps itself in `<AppShell>`. This causes the Shell (and Navigation) to unmount/remount on every page transition, killing state (e.g., scroll position, collapsed state, active tab) and causing visual flicker.
2.  **Fragmented Navigation:** Topbar is used, Sidebar is ignored.
3.  **Inconsistent Layout:** If a developer forgets `<AppShell>`, the page renders without navigation.
4.  **Legacy Redirects:** `App.tsx` contains heavy logic for redirects that should be handled by efficient routing patterns.

---

## 2. Spec-Kitty: Architecture Decision

**Objective:** Create a unified, persistent "AppShell" that supports the GitHub-like Topbar and ImageKit-like Sidebar.

### Option A: Page-Level Layout (Current Status Quo)
Continue wrapping each page in `<AppShell>`.
*   **Pros:** Minimal refactor of `App.tsx`.
*   **Cons:** Performance (remounts), Code Duplication, State Loss (Sidebar expansion state reset on nav), Maintenance risk.

### Option B: Route-Based Layout (Recommended)
Use `react-router-dom` v6 generic `Layout` routes.
*   **Pattern:** `<Route element={<MainLayout />}> ... child routes ... </Route>`
*   **Pros:**
    *   **Persistence:** Layout remains mounted while child pages change.
    *   **State:** Sidebar state (collapsed/expanded) persists across navigation.
    *   **DRY:** Layout defined once in `App.tsx`.
    *   **Standard:** Aligns with React Router naming conventions.
*   **Cons:** Requires refactoring `App.tsx` heavily.

### Recommendation
**Select Option B.** It aligns with the "Production Safety" and "Core-App" principles by establishing a robust, standard foundation for all future modules.

---

## 3. Technical Specification

### 3.1. New Component: `MainLayout.tsx`
A new layout component that replaces the usage of `AppShell` inside pages.

```tsx
// src/layouts/MainLayout.tsx (New)
import { Outlet } from 'react-router-dom';
import TopNavbar from '../components/TopNavbar';
import Sidebar from '../components/Sidebar';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-container">
       <TopNavbar />
       <div className="app-body">
          <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!s)} />
          <main className="app-content">
             <Outlet /> {/* This is where the page renders */}
          </main>
       </div>
    </div>
  );
}
```

### 3.2. Visual Design Targets
*   **Topbar (GitHub Style):**
    *   Dark/High-contrast header.
    *   Global Search input (centered or left-aligned).
    *   Context Switcher (Org/Project).
    *   User Profile / Notification indicators (right-aligned).
*   **Sidebar (ImageKit Style):**
    *   Collapsible (Width transition: 240px -> 60px).
    *   Icon-only mode when collapsed.
    *   Section dividers.
    *   Active state highlighting.

### 3.3. Refactoring Plan
1.  **Create `MainLayout`**: Combine Topbar and Sidebar.
2.  **Update `App.tsx`**:
    *   Group authenticated routes under `<Route element={<MainLayout />} >`.
    *   Group public routes (Login, Register) under `<Route element={<PublicLayout />} >` (optional).
3.  **Strip Pages**: Remove `<AppShell>` wrapping from `DashboardPage`, `UsersPage`, etc.
4.  **Sidebar Logic**: Update `Sidebar.tsx` to accept props for `collapsed` state and use `NavLink` for active states.

### 3.4. Navigation Structure (Sidebar)
*   **Dashboard** (Home)
*   **Work** (Hierarchy)
    *   Competitions
    *   Seasons
    *   matches
*   **Identity**
    *   Users
    *   Teams/Clubs
*   **Platform/Settings** (Bottom or separate section)

## 4. Quality Requirements
*   **Responsive:** Sidebar must be hidden/hamburger on mobile.
*   **Persist:** Sidebar collapsed state must be saved in `localStorage`.
*   **Theme:** Must use `@django-core/design-system` tokens (`var(--app-bg)`, etc.).
*   **Visibility:** Navigation must be filtered by Role (Everyone, Org Admin, Staff).

---

## 5. Information Architecture & Navigation

### 5.1. Visibility & Roles
The Sidebar must be "lean and mean". We strictly filter items based on three visibility levels.
*   **Everyone:** Core product features (Matches, Content, Team context).
*   **Org Admin:** Management features (Users, Org Settings).
*   **Staff:** Internal platform engineering tools (Health, Feature Flags, Design System).

**Rule:** Platform/Dev/Diagnostics links are **NOT** part of the primary sidebar for normal users. They are hidden.

### 5.2. Sidebar Taxonomy (Proposed v1)
The sidebar groups are limited to 4 key areas for normal users.

**1. Dashboard**
*   Home (Dashboard)
*   Directory (Entity Search)

**2. Work (Core Product)**
*   Matches
*   Competitions
*   Seasons
*   Clubs & Teams
*   *Note: These map to the hierarchy tabs.*

**3. Content (Studio)**
*   Library
*   AI Studio

**4. Organisation (Admin Only)**
*   Members (Users)
*   Settings & Permissions

**5. Platform (Staff Only - "Advanced")**
*   System Health & Metrics
*   Feature Flags
*   Developer Tools (API, Design System)

### 5.3. Navigation Mapping (Migration Plan)

| Current Topbar Item | Target Location | Visibility | Rationale |
|---------------------|-----------------|------------|-----------|
| **Directory Group** | | | |
| Directory (Root) | Sidebar > Dashboard | Everyone | Main entry point |
| Federations (Tab) | Sidebar > Work | Everyone | Core entity |
| Clubs (Tab) | Sidebar > Work | Everyone | Core entity |
| Teams (Tab) | Sidebar > Work | Everyone | Core entity |
| Seasons (Tab) | Sidebar > Work | Everyone | Core entity |
| Competitions (Tab) | Sidebar > Work | Everyone | Core entity |
| Matches (Tab) | Sidebar > Work | Everyone | Core entity |
| Users (Tab) | Sidebar > Organisation | Org Admin | User management is an admin task |
| **Content Group** | | | |
| Library | Sidebar > Content | Everyone | Asset management |
| AI Studio | Sidebar > Content | Everyone | Creation tools |
| Notifications | TopNavbar > Bell Icon | Everyone | Contextual alerting (Utility) |
| **Admin Group** | | | |
| Permissions | Sidebar > Organisation | Org Admin | Policy config |
| Feature Flags | Sidebar > Platform | **Staff** | Internal ops |
| Security | Sidebar > Organisation | Org Admin | Org-level audit |
| Audit Log | Sidebar > Organisation | Org Admin | Org-level audit |
| Integration Status | Sidebar > Platform | **Staff** | Ops monitoring |
| Health Check | Sidebar > Platform | **Staff** | Ops monitoring |
| Metrics | Sidebar > Platform | **Staff** | Ops monitoring |
| Usage Events | Sidebar > Platform | **Staff** | Data science |
| Cache Perf | Sidebar > Platform | **Staff** | Engineering debug |
| Routing Logs | Sidebar > Platform | **Staff** | Engineering debug |
| API Docs | Sidebar > Platform | **Staff** | Developer resource |
| Guides | Sidebar > Help (Bottom) | Everyone | User support |
| Design System | Sidebar > Platform | **Staff** | Engineering resource |
| Theme Demo | Sidebar > Platform | **Staff** | Engineering resource |
| Constitution | Sidebar > Help (Bottom) | Everyone | Policy Transparency |
| Deployment | Sidebar > Platform | **Staff** | Ops manual |

### 5.4. Route Guards
*   Navigation filtering is UI-only.
*   **Security MUST** be enforced by existing Route Guards (e.g., `<AdminOnlyRoute>`, `<OrgAdminRoute>`).
*   Do NOT invent a new auth system; use `@django-core/auth-ui` and `PermissionGuards.tsx`.

## 6. Implementation Stages
**Blocking:** Do NOT start coding until this plan is approved.

1.  **Stage 1: Layout Scaffold**
    *   Create `MainLayout` with empty Sidebar and stripped-down TopNavbar.
    *   Verify Route-based layout rendering.
2.  **Stage 2: Sidebar Migration & Visibility**
    *   Implement `Sidebar.tsx` with role-based filtering logic (`useUserRole`).
    *   Define the `NavGroups` config with `visibility` properties.
    *   Move links from TopNavbar to Sidebar.
3.  **Stage 3: Topbar Cleanup**
    *   Remove legacy dropdowns from Topbar.
    *   Ensure Search and Avatar are correctly positioned.
4.  **Stage 4: Page Cleanup**
    *   Remove `<AppShell>` from individual pages.

## 7. Hierarchy & Context Rules (Mandatory)

### 7.1. Hierarchy Backbone
The application context and navigation **must** follow this strict hierarchy:
**Federation (Organisation) → Club (Project parent) → Team (Project child) → Season (Period) → Competition (Period child) → Match (Activity)**

### 7.2. Navigation Rules
1.  **Sidebar "Work" Order:** Must reflect hierarchy breadth-to-depth: Federations, Clubs, Teams, Seasons, Competitions, Matches.
2.  **Members Location:** "Members" belongs to Season context (scoped membership), NOT strictly top-level.
3.  **User Domain:** Users are separate entities (cross-cutting) and not part of the Work hierarchy breadcrumb chain.

### 7.3. Context Resolution (Panel A)
*   Panel A "Context" group must display the resolved chain in order: Club > Team > Season > Competition > Match.
*   It should act as a vertical breadcrumb for the current task context.
*   **Visual Separation:** The Context block must be visually distinct from the Application Navigation (e.g., breadcrumb styling vs menu styling).

**Implementation note (Jan 2026):** The TeamReel demo resolves the *default* context server-side via `GET /api/v1/auth/default-context/` and uses that single response to build stable, valid hierarchy links (instead of guessing paths on the client).

## 8. UX Stability & Freeze Rules (As of Jan 2026)

### 8.1. Architecture Freeze
1.  **Sidebar Structure:** The separation between the **Context Block** (Top) and **Navigation Sections** (Below) is STABLE. Do not merge them.
    *   *Context* = "Where I am" (Dynamic, hierarchical).
    *   *Menu* = "Where I can go" (Static, categorical).
2.  **Hierarchy Truth:** `Federation → Club → Team → Season → Competition → Match` is the authoritative source for sorting, breadcrumbs, and context logic.
3.  **Domain Separation:** "Users" are never part of the Work Hierarchy key chain. "Members" are Season-scoped only.

### 8.2. Visual Standards (ImageKit-style)
*   **Panel A:** Uses distinct uppercase Section Headers (WORK HIERARCHY, CONTENT, etc.).
*   **Context Block:** Uses a compact, breadcrumb-like list style, separated by a divider.
*   **De-emphasis:** Platform and Help sections should be visually recessive.

### 8.3. Modification Protocol
*   Future changes must **NOT** alter the Panel A layout structure or section ordering without explicit approval.
*   New routes must map to existing sections; do not create new top-level sections for single pages.
