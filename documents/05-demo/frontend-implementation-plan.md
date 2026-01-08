# Frontend Implementation Plan: TeamReel Integration

This document outlines the step-by-step plan to align the generic frontend with the specific backend data structure of the TeamReel demo (Clubs, Teams, Seasons, Matches).

**Goal:** Provide full visibility into the populated database (8,000+ records) ending with a functional "Match Management" screen.

---

## 🏃 Phase 1: Critical Visibility (Matches & Schedule)
*Address the 1,307 "invisible" match records.*

### Step 1.1: Create Project Matches Component
*   **Target File:** `demo/src/pages/projects/ProjectMatches.tsx` (New)
*   **Route:** `/organisations/:orgId/projects/:projectId/matches`
*   **Functionality:**
    *   Fetch latest matches: `/api/v1/activities/?project=:id&activity_type=match`
    *   Table columns: Date, Status, Home Team, Away Team (Opponent), Score.
    *   **Crucial:** Resolve `opponent_project_id` to show the opponent name (not just ID).
*   **Integration:** Add as a tab in `ProjectDetailPage.tsx`.

### Step 1.2: Match Detail View
*   **Target File:** `demo/src/pages/activities/MatchDetailPage.tsx` (New)
*   **Route:** `/matches/:matchId`
*   **Functionality:**
    *   Show detailed match context (Competition, Round, Venue).
    *   Show Lineups (if `participation` data exists, otherwise placeholders).
    *   "Go to Content" button (future placeholder).

---

## 👥 Phase 2: Team Roster & Members (Season Scoping)
*Fix the issue where 1,758 players are hidden behind generic RBAC lists.*

### Step 2.1: Enhance Member List with Season Filter
*   **Target File:** `demo/src/pages/projects/components/MemberList.tsx` (Modify)
*   **Functionality:**
    *   Add "Season" dropdown (fetch from `/api/v1/periods/?project=:id&type=season`).
    *   When a season is selected, fetch members with `?period=:seasonId`.
*   **Display:**
    *   Show `metadata.position` (e.g., "Keeper", "Striker").
    *   Show `metadata.shirt_number`.
    *   Distinguish Staff (Coach) from Players.

---

## 💻 Phase 3: Dashboard & Intelligence
*Replace hardcoded mocks with real indicators of club activity.*

### Step 3.1: Connect Dashboard Counters
*   **Target File:** `demo/src/pages/DashboardPage.tsx`
*   **Functionality:**
    *   Use the new `OrganisationSerializer` fields (`clubs_count`, `matches_count`) to show real stats.
    *   Add "Next Match" card for the active user context.

### Step 3.2: User's Upcoming Matches Widget
*   **Target File:** `demo/src/components/UpcomingMatchesWidget.tsx` (New)
*   **Functionality:**
    *   Fetch matches where `project__memberships__user=me`.
    *   "You have a match against PSV on Saturday".

---

## 🤖 Phase 4: AI Studio & Content Flows (Future Ready)
*Prepare the shell for Generative AI workflows defined in functional design.*

### Step 4.1: AI Studio Entry Point
*   **Target File:** `demo/src/pages/aistudio/AIStudioPage.tsx` (New Shell)
*   **Route:** `/studio/create?context=:matchId`
*   **Functionality:**
    *   Simple form to select "Content Type" (Match Report, Social Post).
    *   Mock "Generating..." state connecting to backend async task.

### Step 4.2: Content Library Stub
*   **Target File:** `demo/src/pages/content/ContentLibraryPage.tsx` (New Shell)
*   **Route:** `/content`
*   **Functionality:**
    *   Grid view of generated assets (Placeholders for now).
    *   Filter by Team/Season.

---

## 💎 Phase 5: Credits & Value Reporting
*Demonstrate the business model.*

### Step 5.1: Credits Usage Report
*   **Target File:** `demo/src/pages/reporting/CreditsPage.tsx`
*   **Functionality:**
    *   Visualize `Transaction` model data.
    *   Show "Credits Saved" vs "Credits Spent".

---

## 📋 Execution Order

1.  **Phase 1** (Matches) - *Immediate Priority*
2.  **Phase 2** (Roster) - *Structural Correctness*
3.  **Phase 3** (Dashboard) - *User Experience*
4.  **Phase 4/5** (Future Shells) - *Vision Alignment*
