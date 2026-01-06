# Frontend Integration Proposal: Closing the Data Gaps

**Date:** 2026-01-06
**Objective:** Visualize the "Invisible" seeded data in the Demo Shell.

## 0. New Data Structure (Football Demo)

The backend seeding has been updated to reflect a realistic football structure, **scoped per project (Team)**:
*   **Root Period:** "Season 25/26 - {Team Name}"
*   **Child Periods:**
    *   "League Competition - {Team Name}" (Weekly matches)
    *   "Cup Tournament - {Team Name}" (Mid-week knockouts)
*   **Activity Types:** "League Match", "Cup Match"
*   **Opponents:** Real club names from the same league (e.g., "vs Feyenoord Rotterdam").

## 1. Dashboard Improvements (Global Visibility)

### Activity Feed Component (New)
*   **Data Source:** `/api/v1/activities/`
*   **Frontend Location:** `src/components/ActivityFeed/ActivityFeed.tsx`
*   **Integration:** Add to `src/pages/DashboardPage.tsx` (sidebar or main column).
*   **Features:**
    *   List recent matches (League & Cup).
    *   "Upcoming" vs "Past" visualisation.
    *   Show Context: "Cup Round of 16" or "League Round 5".
    *   Relative timestamps ("2 hours ago", "Tomorrow at 20:00").

### Credits Alert Fix
*   **Data Source:** `/api/v1/transactions/` (Calculate sum) or `/api/v1/credits/balance/`.
*   **Refactor:** `src/pages/DashboardPage.tsx`
*   **Logic:**
    *   Replace `slug === 'datalab'` check with real `useCreditBalance()` hook.
    *   Check seeded `BalancePolicy` (e.g., threshold < 500) to decide when to show the alert.

## 2. Organization Visibility (Admin & Compliance)

### Organization Audit Log (New)
*   **Data Source:** `/api/v1/audit/?organization={org_id}`
*   **Frontend Location:** `src/components/AuditLog/AuditLogTable.tsx`
*   **Integration:** `src/pages/identity/OrganisationDetailPage.tsx`
*   **Features:**
    *   Paginated table of audit events.
    *   Columns: Actor, Action, Target, IP Address, Date.
    *   Filter by Action type.

### Policy Management Section (New)
*   **Data Source:**
    *   `/api/v1/transactions/policies/` (Balance Policies)
    *   `/api/v1/contextual-notifications/policies/` (Notification Policies)
*   **Frontend Location:** `src/components/Organisations/PolicySettings.tsx`
*   **Integration:** Add as a "Configuration" tab/section in `OrganisationDetailPage.tsx`.
*   **Features:**
    *   View active Balance thresholds.
    *   View mandatory Notification settings.
    *   (Read-Only for demo is fine, but visibility is key).

## 3. Implementation Hierarchy

```text
demo/src/
├── components/
│   ├── ActivityFeed/
│   │   ├── ActivityItem.tsx     # Single event row
│   │   └── ActivityFeed.tsx     # Container (fetch logic)
│   ├── AuditLog/
│   │   └── AuditLogTable.tsx    # Reusable table for Org & Project scopes
│   └── Organisations/
│       └── PolicyList.tsx       # Display Balance & Notif policies
├── hooks/
│   └── useActivities.ts         # SWR/Query hook for /activities/ endpoint
└── pages/
    ├── DashboardPage.tsx        # <ActivityFeed /> replacement
    └── identity/
        └── OrganisationDetailPage.tsx # <AuditLogTable /> and <PolicyList /> added
```

## 4. Execution Plan (Spec-Kitty Track)
1.  **Backend Check:** Ensure `/api/v1/audit/` supports `?organization=` filtering (Currently validated for `?project_id=`).
2.  **Scaffold Components:** Create the missing React components.
3.  **Wire Up:** Import and place on the respective pages.

## 5. Functional Overview (What changes for the User?)

### Page: Dashboard (`/dashboard`)
*   **What Changes:** The "Activity Feed" widget updates from generic placeholder data to a realistic **Match Schedule**.
*   **User Experience:**
    *   Typically sees 30-40 matches per season.
    *   **Distinction:** Clear visual difference between "League Matches" (Weekly) and "Cup Matches" (Mid-week).
    *   **Context:** Headers will show hierarchy: `League Competition > Round 12` or `Cup Tournament > Round of 16`.
    *   **Opponents:** Instead of "Match vs Team A", users see "Home vs Ajax Amsterdam" or "Away @ PSV Eindhoven".

### Page: Organization Details (`/org/:id`)
*   **What Changes:** New "Governance" visibility.
*   **User Experience:**
    *   Admins can see a **Policy Overview** (checking if Credit Limits are enforced).
    *   **Audit Trail:** A table showing exactly when members joined, when roles changed, or when settings were updated to prove the system is "alive".

### General Experience
*   **Immersion:** The demo now feels like a real SaaS for Football Clubs rather than a generic template.
*   **Data Density:** No more empty states on core screens immediately after login.

## 6. UI/UX Consistency & Theming

To ensure the new components feel native to the existing application:

*   **Design System Compliance:**
    *   Use `@django-core/design-system` primitives (`Card`, `Badge`) where possible.
    *   **Theme Support:** All new components must strictly use CSS variables for colors to support Dark/Light mode automatically:
        *   Backgrounds: `var(--app-surface)`, `var(--app-surface-2)`
        *   Text: `var(--app-text)`, `var(--app-text-muted)`
        *   Borders: `var(--app-border)`
    *   **Responsive Layout:** The `ActivityFeed` should behave responsively within the CSS Grid layout of the Dashboard (taking up 4 columns on desktop, full width on mobile).

*   **Visual Hierarchy:**
    *   Matches should use distinct badges (e.g., Red for Match, Blue for Cup) that align with the existing alert/status colors.
    *   Dates should use the standard "Date Pill" design seen in other lists.
