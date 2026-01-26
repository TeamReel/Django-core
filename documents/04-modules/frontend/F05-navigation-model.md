# Module F05: Final Navigation Model (Panel A + Panel B)

**Status:** Approved Specification
**Category:** Frontend
**Feature:** TeamReel Gamified Content Navigation
**Last Updated:** January 2026

## 0.5. Implementation Status (Reality Check)

This section summarizes what is already implemented in code today, what is still pending, and what the backend already enables (so it can be built next without major architecture work).

### Implemented (Frontend)

- **Panel A / Panel B navigation shell** implemented in `demo/src/components/Sidebar.tsx`.
  - Panel A is intentionally **high-level** (Overview / App / Content / Preferences / Organisation / Platform / Help).
  - Panel B provides **sub-navigation** for the active section (Directory tabs, entity tabs, Preferences, Organisation, Platform).
- **Panel A simplified** (to reduce cognitive load):
  - Personal routes (`/profile`, `/notifications`, `/preferences`) are not separate Panel A items; they live under **Preferences** and are shown in Panel B.
  - Search is not shown in Panel A (it exists as a route but is also accessible via the top navbar).
- **Wallet navigation is explicit**: `/credits` is split via a query param so Panel B links route correctly:
  - Personal wallet: `/credits?wallet=personal`
  - Organisation wallet: `/credits?wallet=org`
- **Match Hub “slot/action center” (basic)** exists on match overview (click → modal). This is the first slice of the “gamified slot system”.
- **Season “Setup (Beta)” placeholder** exists on season overview as the entry point for Smart Import / season reuse.

### Implemented (Backend/API)

- Credits/transactions foundations exist and are usable for the wallet UX:
  - Credits models include `UserCreditsBalance` (user-scoped balance per organisation).
  - Transactions support `wallet_scope` and `charged_user` so user-wallet transactions can be filtered.
- Minimal API surface to support “My Wallet” has been exposed:
  - `GET /api/v1/credits/me/?organisation_id=...` returns the authenticated user’s `UserCreditsBalance`.

### Pending (Not Implemented Yet)

- **Smart Import / Clone Season squad** is not implemented end-to-end (currently an entrypoint/placeholder only).
- **True gamification loop** (event triggers → slot unlock/pulse, completion scores computed from real data) is not wired.
- **Content template library + generation pipeline integration** (B31/B34) is still mocked in the UI.
- **Navigation/RBAC hardening** (guarantee “nav never reveals a 403 route” across all roles/routes) is not fully enforced.

## 0. Scope & Constraints

- **Execution:** This document acts as the blueprint for Frontend implementation.
- **Routes:** The model aligns with existing routes in `demo/src/App.tsx`, focusing on UI organization.
- **Panel roles:**
  - **Panel A** = primary navigation (sectioned, persistent, “where am I?”)
  - **Panel B** = contextual subnavigation (“what can I do here?”)

## 1. Product Intent & Context

**TeamReel Purpose:**
TeamReel is a gamification app designed to generate content per Team, per Match, and per Season. Unlike general admin panels, the navigation must support a specific core loop:
**Select context (Team/Season/Match) → Generate content → Review/approve → Publish/share → Track progress/credits → Repeat.**

**Strategic Constraints for Navigation:**
1.  **Multi-Sport Capable:** Context settings (Federation/Club) must define the Sport Type, which automatically filters available Templates and required roles (e.g., "Keeper" vs "Libero").
2.  **One-Time Setup (Inheritance):** Navigation must guide users to configure Identity (Logo, Colors, Sponsors) *once* at the top level. All child entities (Teams/Matches) inherit these settings automatically to minimize repetitive data entry.
3.  **One-Click Creation:** The "Overview" tabs at the Match/Season level act as "Action Centers" offering smart, one-click content generation based on the pre-configured context.

**Differentiation from ImageKit:**
While ImageKit is an asset management platform (DAM), TeamReel is a **Content Engine**.
- ImageKit navigation focuses on *finding* files.
- TeamReel navigation focuses on *creating* content.
Therefore, our "App/Context" section is not just a folder tree; it is the entry point to the "Game" of covering a season.

## 2. Source of Truth (Current Surface Area)

### 1.1. Current routes (authoritative)

Routes below are confirmed in `demo/src/App.tsx`.

**Public**
- `/` → redirects to `/dashboard` (authed) or `/login` (anon)
- `/login`, `/register`

**Overview / browse**
- `/dashboard` (Protected)
- `/directory` (Protected; uses `?tab=`)
- `/search` (Protected)

**Work list pages (Protected)**
- `/federations`, `/clubs`, `/teams`, `/seasons`, `/competitions`, `/matches`

**Content (Protected)**
- `/content`
- `/studio/create` (note: sidebar currently links `/studio`)

**Federation context pages (Protected)**
- `/:orgId/clubs|teams|seasons|competitions|matches|users`
- `/:orgId/hierarchy` (redirect to `/:orgId?tab=hierarchy`)

**Federation detail (Protected)**
- `/:id` (canonical federation detail)
- `/organisations/:id` (redirects to `/:id`)

**Club / Team / Season / Competition / Match hierarchy (Protected)**
- Club detail: `/:orgId/:projectId`
- Team detail: `/:orgId/:clubId/:projectId`
- Season detail: `/:orgId/:clubId/:projectId/:seasonId`
- Competition detail: `/:orgId/:clubId/:projectId/:seasonId/:competitionId`
- Match detail: `/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId`

(There are also multiple back-compat and redirect routes under `/organisations/...` and `/:orgId/projects/...` that ultimately navigate into the canonical paths above.)

**People (Org admin gated)**
- `/users` (OrgAdminRoute)
- `/users/:userId` (OrgAdminRoute)

**User self-service (Protected)**
- `/profile`
- `/notifications`
- `/preferences`

**Organisation admin / config**
- `/permissions` (AdminOnlyRoute)
- `/audit` (OrgAdminRoute)
- `/credits` (OrgAdminRoute)
- `/usage-events` (AdminOnlyRoute)
- `/routing-logs` (AdminOnlyRoute)

**Platform / tools (AdminOnlyRoute)**
- `/health`, `/flags`, `/constitution`, `/security`, `/observability`, `/api-docs`
- `/integration-status`
- `/design-system`, `/auth-flows`, `/context`, `/resources`, `/templates`, `/theme`, `/integration`
- Demo pages: `/demo/websockets`, `/demo/performance`, `/demo/files`

### 1.2. Current navigation implementation

**Panel A (primary)**
- Implemented by `NAV_CONFIG` in `demo/src/components/Sidebar.tsx`.
- Current top-level sections:
  - OVERVIEW: `/dashboard`, `/directory`
  - APP: injected “current context” hierarchy links (Federation → Club → Team → Season → Competition → Match + current User)
  - CONTENT: `/content`, `/studio`
  - PREFERENCES: high-level entry; sub-items live in Panel B (Profile / Notifications / Preferences / My Wallet)
  - ORGANISATION: high-level entry; sub-items live in Panel B (Permissions / Users / Audit / Credits)
  - PLATFORM: high-level entry; sub-items live in Panel B (Health / Flags / Integration / Observability / Security, staff-only)
  - HELP (bottom pinned): `/docs`, `/constitution`

**Panel B (contextual)**
- Implemented by `panelBConfig` in `demo/src/components/Sidebar.tsx`.
- Driven by route pattern matching + querystring `?tab=`.
- Confirmed behaviors:
  - `/dashboard` → Panel B: Overview (Dashboard, Directory)
  - `/directory` → Panel B: Directory tabs (`?tab=federations|clubs|teams|seasons|competitions|matches|users`)
  - `/profile` `/notifications` `/preferences` → Panel B: Preferences submenu
  - `/credits?wallet=personal` → Panel B: Preferences submenu (My Wallet)
  - `/credits?wallet=org` → Panel B: Organisation submenu (Credits)
  - `/permissions` `/users` `/audit` → Panel B: Organisation submenu
  - `/health` `/flags` `/integration-status` `/observability` `/security` → Panel B: Platform submenu
  - Federation pages → Panel B: Federation tabs (Overview, Hierarchy, Clubs, Teams, Seasons, Competitions, Matches, Members; plus Audit/Governance/Operations on federation detail)
  - Club/Team/Season/Competition/Match/User detail pages → Panel B: querystring tabs per entity (see §3)

## 3. Proposed final information architecture (ImageKit-like)

### 3.1. Principles

**Principle A: ImageKit-style Split (Personal vs. Org)**
- **Panel A** strictly separates "My Stuff" (Preferences) from "Our Stuff" (App/Org).
- **Personal settings** (Dark mode, Password) never affect the Club.
- **Org settings** (Credits, Permissions) are hidden from non-admins.

**Principle B: The Three Layers of Settings**
1.  **Personal (The User):**
    *   *Where:* Panel A > Preferences.
    *   *What:* Notifications (How do I want to be alerted?), UI Theme, My Profile.
2.  **Contextual (The Entity):**
    *   *Where:* Panel B > Settings (inside Club, Team, or Season).
    *   *What:* **Identity** (Colors, Logos, Sponsors). These cascade down (Club -> Team -> Match).
3.  **Governance (The Business):**
    *   *Where:* Panel A > Organisation.
    *   *What:* **Credits** (Buying/Allocating), **Permissions** (Who can do what?), **Users** (Seats).

**Principle C: Three-Layer Wallet System**
Reflecting the existing `transactions` module defined in `teamreel-transactions-transactions-wallets-plan.md`:
1.  **User Wallet:** Personal credits (top-up or assigned). Visible in "My Profile".
2.  **Project Wallet:** The Budget for a specific Team or Club. Managed by Team/Club Admins.
3.  **Organisation Wallet:** The ultimate fallback/source. Managed by Land Admin.
- **Routing:** Debits automatically cascade (e.g. User -> Team -> Org) based on Organisation configuration.
- **Visibility:** "Balance" tabs appear at every level (User/Team/Club) showing specific wallet state.

**Principle D: Notification Logic**
- **Triggers:** Events happen in the **Context** (e.g., "Goal Scored" in Match 45).
- **Preferences:** Users decide within **Personal Settings** *how* they receive these (Email, Push, In-app).

- **Panel A = stable categories** (6–8 items total, predictable)
- **Panel B = local navigation** for the active page/entity (tabs, subroutes, directory tabs)
- **TeamReel hierarchy first:** Federation → Club → Team → Season → Competition → Match
- **Users are cross-cutting** and should be reachable from both Directory and context.
- **RBAC is explicit:** items only appear if the user can actually access the route.

### 3.2. Proposed Panel A sections (routes must exist)

This is the “final model” target. Some items are already present; others are gaps in Panel A only (routes exist).

**A. OVERVIEW**
*Purpose: Immediate attention to what matters: active matches, drafts pending, and completion status.*
- Dashboard → `/dashboard`
- Directory → `/directory`
- Search → `/search` (route exists; intentionally not surfaced in Panel A because Search exists in the top navbar)

**B. APP (Context)**
Goal: mirror ImageKit’s “current folder” concept as “current hierarchy”.
*Purpose: Selecting the “who” we create content for (Federation→Club→Team→Season→Match).*
- Federation (current) → `/:orgId`
- Club (current) → `/:orgId/:clubId`
- Team (current) → `/:orgId/:clubId/:teamId`
- Season (current) → `/:orgId/:clubId/:teamId/:seasonId`
- Competition (current) → `/:orgId/:clubId/:teamId/:seasonId/:competitionId`
- Match (current) → `/:orgId/:clubId/:teamId/:seasonId/:competitionId/:matchId`
- User (current user) → `/users/:userId` (if accessible; otherwise fallback to `/profile`)

Notes:
- This aligns with the existing dynamic injection approach in `Sidebar.tsx`.
- The model intentionally points to **detail** pages (not list pages).

**C. CONTENT**
*Purpose: Managing generated outputs and workflows (review, publish, archive).*
- Library → `/content`
  - *Strategic Role:* The "Club Archive". Ensures continuity and ownership of content assets across seasons and volunteers.
- AI Studio → `/studio/create`
  - *Strategic Role:* The "Free-form Workshop". Allows ad-hoc creation (e.g., "Volunteers Wanted") outside the strict Match/Season stricture.

**D. PREFERENCES (Personal)**
*Purpose: User-level settings only.*
- Profile → `/profile`
- Notifications → `/notifications`
- Preferences → `/preferences`

**E. ORGANISATION (Configuration, Org Admin)**
*Purpose: Organisation setup to enable creation (users, permissions, credits).*
- Settings/Permissions → `/permissions`
- Users → `/users` (OrgAdminRoute)
- Audit → `/audit` (OrgAdminRoute)
- Credits → `/credits` (OrgAdminRoute)

**F. PLATFORM (Configuration, Staff/Admin)**
*Purpose: Staff-only platform operations.*
- Health → `/health`
- Feature Flags → `/flags`
- Integration Status → `/integration-status`
- Observability → `/observability`
- Security → `/security`
- Developer / Demo links (optional, staff-only): `/design-system`, `/api-docs`, `/demo/...`, etc.

**G. HELP (Bottom pinned)**
*Purpose: Guidance on how to create better content.*
- User Guide → `/docs`
- Constitution → `/constitution`

## 4. Proposed Panel B model (route-grounded)

Panel B should follow a single rule:

> If the current page represents an entity or tabbed section, Panel B shows its tab set.

### 4.1. Personal settings (PREFERENCES)
*Routes: `/profile`, `/notifications`, `/preferences`*
- **Tab Purposes:**
  - **My Wallet:** View Personal Credit Balance and transaction history.
  - Profile: Manage identity.
  - Notifications: Set alert preferences for content deadlines.
  - Preferences: UI settings.

### 4.2. Organisation configuration (ORGANISATION)
*Routes: `/permissions`, `/users`, `/audit`, `/credits`*
- **Tab Purposes:**
  - Permissions: Define who can create/approve content.
  - Users: Manage seat access.
  - Audit: Compliance logs.
  - Credits: Monitor balance for AI generation.

### 4.3. Platform configuration (PLATFORM)
*Routes: `/health`, `/flags`, etc.*
- **Tab Purposes:**
  - Health/Flags: System stability and feature toggles.

### 4.4. Directory (browse)
*Route: `/directory`*
- **Tab Purposes:**
  - Federations/Clubs/Teams...: Browse entities to jump into their context.

### 4.5. Federation (Organisation)
*Context: `/:orgId`*
- **Tab Purposes:**
  - Overview: High-level org status + **Completeness Visual** (Is the Org ready?).
  - Settings (Identity): Configure **Sport Type** (determines templates) and Country/Region. *Set once for all clubs.*
  - Hierarchy: Manage structure (Clubs/Teams).
  - Members: Manage people.
  - Audit/Governance: Org-wide compliance.

### 4.6. Club
*Context: `/:orgId/:projectId`*
- **Tab Purposes:**
  - Overview: Club readiness scorecard + **Completeness Visual**.
  - Settings (Identity): Configure Logo, Tenue (Kit), **Global Sponsor**, Location. *Root of Inheritance: all Teams inherit these.*
  - Hierarchy/Teams: Drill down to specific teams.
  - Balance: Credit usage per club.

### 4.7. Team
*Context: `/:orgId/:clubId/:projectId`*
*Concept: The "Permanent Shell". Defines what the team IS, not who is playing right now.*
- **Tab Purposes:**
  - Overview: Dashboard showing **Active Season** status + Shortcut to "Current Match".
    - **Action:** "Start New Season" wizard. Includes **"Clone Squad from Previous Year"** to auto-fill the roster (keeping Player IDs, resetting Kit Photos).
  - History: Archive access to previous seasons (Video Vault).
  - Settings (Identity): **Inherited from Club**. Configure overrides (Team Sponsor fallback) and **Team Type (Field 11v11 / 8v8 / Futsal)**.
  - Balance: Credit usage monitoring.
  *(Note: Roster and Matches are moved to Season level to ensure data hygiene).*

### 4.8. Season
*Context: `/:orgId/:clubId/:projectId/:seasonId`*
*Concept: The "Active Campaign". Contains all temporal data (Players, Assets, Matches).*
- **Tab Purposes:**
  - **Season Hub (Overview):** The Gamified Seasonal Dashboard.
    - **Coverage Score:** "Season completeness" (e.g. "Squad Photos uploaded", "Season Preview published").
    - **Seasonal Slots:** Cards for major milestones (Pre-season, Mid-season, End-of-season).
    - **Highlight:** "Then and Now" video generation (Start vs End).
  - **Media Day (Player Assets):** Digital Asset Management per player.
    - **Asset Matrix:** Status grid per player tracking completion.
    - **Photo Types:** [Close-up/Pasfoto], [Full Body in Kit], [Action Shot].
    - **Video Types:** [Intro Reveal], [Goal Celebration], [Walk-on].
    - **Effect:** Uploading these *once* enables automatic generation of Line-ups and Goal GIFs for the whole season.
  - **Squad:** The Roster for this specific year (Number, Position, Captaincy).
    - **Smart Import:** "Add Player from Club Database" (Re-use existing Profile/Headshot) or "Copy Season Squad".
    - **Asset Logic:** Reuse the Person (Name, DOB). *Reset* the Kit Photos (Context-specific). *Optional* carry-over of neutral Headshots.
  - Matches: The "levels" of the game; primary work list.
  - Transactions: Cost tracking.

### 4.9. Competition
*Context: `.../:competitionId`*
- **Tab Purposes:**
  - Overview: Standings/Stats source.
  - Matches: List of fixtures in this comp.

### 4.10. Match
*Context: `.../:matchId`*
- **Tab Purposes:**
  - **Match Hub (Overview):** The Gamified Dashboard.
    - **Coverage Score:** Progress bar (e.g., "3/6 items created").
    - **Timeline Slots:** Cards sorted by Pre-Match (Flyer, Line-up), Live (Goals), Post-Match (Result).
    - **Action:** One-click on an empty slot = "Generate".
  - Lineup (Squad): Drag-and-drop players. Critical input for Line-up/Goal templates.
  - Date/Timeline: Log events (goals, cards). Source for "Goal Alert" generation.
  - Output/Posts: Gallery of created assets.

### 4.11. User (Admin View)
*Context: `/users/:userId`*
- **Tab Purposes:**
  - Overview: User activity + **Profile Completeness**.
  - Profile (Identity): Name, Headshot (Pasfoto), Role details.
  - Transactions: Credit consumption history.

## 5. Content Creation Entry Points

Content creation should be intuitive and context-aware.

1.  **Team Level**
    - *Purpose:* Seasonal planning & Cadence.
    - *Action:* "Create new Season", "Add Match".
2.  **Match Level (Primary)**
    - *Purpose:* The primary logical unit of Game Time.
    - *Action:* Pre-match (Lineups), During-match (Events), Post-match (Results).
3.  **Season Level**
    - *Purpose:* Storytelling arc.
    - *Action:* "Generate Season Recap", "Highlight Reel", **"Then & Now"**.
4.  **AI Studio**
    - *Purpose:* Specialist/Ad-hoc workspace.
    - *Note:* Not the default start; users should start from the event (Match) to ensure context is auto-filled.

## 6. Gamification & Feedback Surface

Navigation must support the psychological loop of "Completion" and "Reward".

### 6.1. The Match Day "Slot System" (UX Pattern)
Instead of a generic "Create" button, the Match Hub presents **Empty Slots** that act as To-Do items.
- **Pre-Match Slots:** [Flyer], [Walk-on], [Line-up].
- **Live Slots:** [Kickoff], [Goal 1], [Goal 2], [Half-time].
- **Post-Match Slots:** [Full-time Result], [Player of the Match].

**UX Logic:**
1.  **Trigger:** User logs a goal in "Timeline".
2.  **Notification:** The [Goal] slot in the Hub pulses/unlocks.
3.  **Action:** User clicks the unlocked slot.
4.  **Creation:** AI generates the visual instantly (inheriting scorer photo + team branding).
5.  **Completion:** Slot fills with the thumbnail. Progress bar increases.

### 6.2. The Season Slot System (Long-term Gamification)
Similar to Match Day, the Season Hub uses slots for long-term storytelling.
- **Pre-Season Slots:** [New Kit Reveal], [Squad Presentation], [Season Schedule], [Goal Setting].
- **Mid-Season Slots:** [Half-Way Review], [Top Scorer Update], [Winterval/Holiday Message].
- **Post-Season Slots:** [Season Recap], [Player of the Season], **[Then & Now Video]** (comparing start vs end).

**UX Logic:**
- **Trigger:** Date-based (e.g., Aug 1st for Pre-season) or Data-based (e.g., "Season ended" flag).
- **Goal:** Encourages "completing" a season's legacy, not just single matches.

### 6.3. Progress/Completion Visuals
- **Dashboard:** "Next Match: Ajax vs Feyenoord - 30% Ready (Line-up missing)".
- **Team Overview:** Season Completion Score (e.g. "You covered 80% of matches this season!").

### 6.3 Credits/Usage Feedback
- Surface in **Organisation/Credits** (Admin view) and **Team/Balance** (User view).
- Feedback loop: "You have X credits left for this season."

### 6.4 Notifications
- Nudges to complete "Match Day" tasks (publish lineup, result).
- Located in **Preferences/Notifications** and via Dashboard badges.

## 7. Directory UX spec (filters + deep links)

This spec is grounded in what’s already implemented across `demo/src/pages/identity/directory/*List.tsx`, with a unification goal.

### 7.1. Tab order (fixed)

- Federations → Clubs → Teams → Seasons → Competitions → Matches → Users

### 7.2. Filter model (existing behavior)

**Federations**
- Filters: Status (All/Active/Inactive)
- Sorting: Column sort uses `?sort=` + `?order=`

**Clubs**
- Filters: Federation (superadmin, when not org-locked), Status

**Teams**
- Filters: Federation (superadmin, when not org-locked), Club (when not club-locked), Status

**Seasons**
- Filters: Federation (superadmin, when not org-locked), Club (when not club-locked), Team (when not team-locked), Status

**Competitions**
- Filters: Federation, Club, Team, Season (by name), Status

**Matches**
- Filters: Federation, Club, Team, Season (by name), Competition, Status
- Performance: supports “Load more” and “Load all” to limit initial fetch

**Users**
- Filters: Federation, Club, Team, Status, Role
- Create: “Create User” opens invite flow; requires a selected federation

### 7.3. Deep link rules (recommended)

- Directory state should be linkable via query params:
  - `/directory?tab=teams&org_id=...&club_id=...`
- When in a locked context (e.g., federation detail “Clubs” tab), the tab should open Directory scoped to that federation (no cross-org leakage).
Aligned with `teamreel-rbac-config`)

The navigation adapts strictly to the 5 defined roles:

1.  **Land Admin (Federation Director):**
    *   Full access to **Organisation Panel** (Permissions, Credits, Audit).
    *   Can edit any content or settings globally.
    *   Can see all Feature Flags.

2.  **Club Admin:**
    *   Full access to **Club Settings** and all child **Teams**.
    *   Cannot access Organisation-level configs (Credits/Permissions).
    *   Can Manage Club/Team Wallets.

3.  **Team Admin (Coach):**
    *   Restricted to **Own Team** scope.
    *   Can manage **Team Settings** and **Team Wallet**.
    *   Can edit *all* content within the team.

4.  **Team Member (Player/Staff):**
    *   **Read-only** on Settings/Wallets (No "Settings" or "Balance" tabs in Panel B).
    *   **Creator:** Can create content, but edit *only own* content.
    *   **Profile:** Can only edit own profile.

5.  **Supporter:**
    *   **Read-only** everywhere. Can only view Matches/Results.

*Note: "Staff" (Platform Admins) have extra access to the Platform section (Health/Flags).*
Important: navigation should never reveal routes that would 403.

## 9. Comparison: Current vs Proposed

| Area | Current Behavior | Proposed Behavior | Benefit for Content Loop |
| :--- | :--- | :--- | :--- |
| **Panel A Categories** | Mixed generic labels (Overview, App, Content) | Functional groupings (Preferences, Organisation, Platform) | Clearer separation of "doing work" vs "admin setup". |
| **User Settings** | Buried or missing from Panel A | Dedicated **Preferences** section | Quick access to self-service. |
| **Org Settings** | Scattered (Permissions separated from Users) | Unified **Organisation** section | Admins can manage credits/seats faster. |
| **Match Tabs** | Generic (Overview, Hierarchy) | Purpose-driven (Overview = CTA, Lineup = Data) | Highlights *readiness* for content generation. |
| **Entry Point** | Dashboard or Directory | Dashboard -> Match Context | Reduces clicks to start the "Pre-match" flow. |

**What stays the same:**
- **Directory:** Remains the place to browse/filter tables.
- **Detail Page Panels:** The tab *machinery* of Panel B stays, only the *intent* of the tabs is clarified.
- **Routes:** No new routes or pages are required.

## 10. Gaps / Future Work (non-blocking)

These are the delta items between “proposed final model” and “today’s UI”, without changing any routes.

1. **Navigation shell is implemented, but deeper product flows are not**
  - Panel A is now high-level and Panel B contains sub-items (Preferences/Organisation/Platform).
  - Remaining gaps are now mainly about *data + workflows* (Smart Import, templates/pipelines, completion scores).

2. **AI Studio link mismatch**
  - There is still a mismatch risk: desired route is `/studio/create`.

3. **RBAC/nav consistency (hardening)**
  - Navigation should never reveal routes that would 403; this is partially handled by visibility checks, but is not yet guaranteed for every route/role.

4. **Panel B fallback “Directory shortcuts” mixes list pages**
   - The fallback uses `/federations`, `/clubs`, etc., while the newer model prefers `/directory?tab=...` for browse.

5. **Smart Import / Season reuse**
  - UI entrypoint exists; end-to-end import/copy logic is not built.

6. **User nav for non-org-admin**
   - Current APP section links current user to `/users/:id` (org-admin gated). The final model should fall back to `/profile` when `/users/:id` is not accessible.

*This spec is partially implemented: the navigation shell is real; the deeper workflows remain pending.*


---

## Appendix: Key implementation anchors (for later)

- Panel A config + injection: `demo/src/components/Sidebar.tsx` (`NAV_CONFIG`, `appDetailItems`)
- Panel B config: `demo/src/components/Sidebar.tsx` (`panelBConfig`)
- Directory tabs: `demo/src/pages/identity/DirectoryPage.tsx`
- Directory list filters:
  - `demo/src/pages/identity/directory/FederationsList.tsx`
  - `demo/src/pages/identity/directory/ClubsList.tsx`
  - `demo/src/pages/identity/directory/TeamsList.tsx`
  - `demo/src/pages/identity/directory/SeasonsList.tsx`
  - `demo/src/pages/identity/directory/CompetitionsList.tsx`
  - `demo/src/pages/identity/directory/MatchesList.tsx`
  - `demo/src/pages/identity/directory/UsersList.tsx`
