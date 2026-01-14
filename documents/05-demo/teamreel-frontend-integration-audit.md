# TeamReel Frontend Integration Audit

**Last Updated:** 2026-01-08 09:20
**Environment:** Demo Application (Vite + React + TypeScript)
**Backend:** Railway PostgreSQL Production (switchback.proxy.rlwy.net:17304)
**Purpose:** Map backend models to frontend components, identify integration gaps
**Related Docs:**
- [TeamReel Database Audit](teamreel-db-audit.md) - Backend data state (8,029 records)
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Architecture & Design Decisions
- [TeamReel Current Database State](teamreel-current-db-state.md) - Quick reference statistics
- [index.md](index.md) - Documentation Overview

---

## � How to Regenerate This Audit

This frontend integration audit is **manually maintained** and should be updated when:
- New frontend components are added
- Backend API endpoints change
- Integration gaps are closed

### Manual Audit Process

#### 1. Scan Frontend Components
```powershell
# Search for all API endpoint usage in frontend
Get-ChildItem -Path demo/src -Recurse -Include *.tsx,*.ts | Select-String -Pattern "/api/v1/" | Format-Table -AutoSize
```

#### 2. Check Backend Models
```powershell
# Generate backend model inventory
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py audit_production_db
```

#### 3. Cross-Reference
- Compare backend models (from audit_production_db) with frontend API calls
- Identify models with data but no frontend component
- Document missing integrations in "Critical Missing" section
- Update "Fully Connected" and "Partially Connected" tables

#### 4. Test Integration Points
```powershell
# Start frontend dev server
cd demo
pnpm dev

# Open browser to http://localhost:5173
# Manually verify each page loads data correctly
```

#### 5. Update Document Sections
- **Executive Summary**: Update counts and percentages
- **Fully/Partially/Not Connected**: Adjust table rows
- **Component Audit**: Verify each component's status
- **Roadmap**: Mark completed tasks, add new priorities

### Useful Commands

**Find all fetch() calls:**
```powershell
Get-ChildItem -Path demo/src -Recurse -Include *.tsx,*.ts | Select-String -Pattern "fetch\(" -Context 1
```

**List all page components:**
```powershell
Get-ChildItem -Path demo/src/pages -Recurse -Include *.tsx | Select-Object Name
```

**Check API endpoint patterns:**
```powershell
Get-Content demo/src/**/*.tsx | Select-String -Pattern "'/api/v1/.*'" -AllMatches
```

### When to Update
- ✅ After implementing new frontend components (weekly during active development)
- ✅ After backend API changes or new endpoints
- ✅ Monthly for comprehensive integration health check
- ✅ Before major releases or stakeholder demos

---

## �📊 Executive Summary

| Metric | Count | Percentage | Status |
|--------|-------|------------|--------|
| **Total Backend Models** | 41 | 100% | - |
| **Models with Data** | 20 | 48.8% | 8,029 records |
| **Fully Connected** | 12 | 60% | 🟢 Working |
| **Partially Connected** | 3 | 15% | 🟡 Incomplete |
| **Not Connected** | 5 | 25% | 🔴 Missing |
| **Overall Integration** | - | 60% | 🟡 **Partially Complete** |

**Critical Finding:** 1,307 Activity records (matches) exist in backend but have **zero frontend visibility**.

---

## 🟢 Fully Connected Models
*Backend models with data that are actively consumed by frontend components*

| Model | Records | Primary Endpoint | Frontend Component | Interaction Pattern | Status |
|-------|---------|------------------|-------------------|---------------------|--------|
| **accounts.User** | 2,121 | `/api/v1/users/me/` | `ProfilePage.tsx` | User profile display and edit | ✅ Connected |
| **organisations.Organisation** | 5 | `/api/v1/organisations/` | `OrganisationListPage.tsx` | List all federations, context switcher | ✅ Connected |
| **organisations.Membership** | 433 | `/api/v1/organisations/:slug/members/` | `OrganisationDetailPage.tsx` | Display org members with roles | ✅ Connected |
| **projects.Project** | 312 | `/api/v1/projects/` | `ProjectListPage.tsx` | List clubs/teams hierarchy | ✅ Connected |
| **projects.ProjectMembership** | 2,190 | `/api/v1/projects/:id/members/` | `MemberList.tsx` | Display team rosters per season | ✅ Connected |
| **activities.Period** | 400 | `/api/v1/periods/` | `ProjectDetailPage.tsx` | Filter projects by season/competition | ✅ Connected |
| **permissions.Permission** | 23 | `/api/v1/permissions/` | `PermissionsPage.tsx` | Display available permissions | ✅ Connected |
| **permissions.Role** | 5 | `/api/v1/roles/` | `RoleAssignmentPage.tsx` | List and assign roles | ✅ Connected |
| **permissions.RoleAssignment** | 433 | `/api/v1/role-assignments/` | `OrganisationDetailPage.tsx` | Show user roles per scope | ✅ Connected |
| **notifications.Notification** | ~100 | `/api/v1/user-notifications/` | `NotificationsPage.tsx` | Notification inbox with mark-read | ✅ Connected |
| **audit.AuditEvent** | 837 | `/api/v1/audit/` | `AuditLogTable.tsx` | Audit logs filtered by project | ✅ Connected |
| **observability.SystemMetric** | 44 | `/api/observability/metrics/` | `ObservabilityPage.tsx` | Real-time system health polling | ✅ Connected |

---

## 🟡 Partially Connected Models
*Backend tables with data but limited/incomplete frontend integration*

| Model | Records | Issue | Frontend Component | Missing Functionality | Impact |
|-------|---------|-------|-------------------|----------------------|--------|
| **activities.Activity** | 1,307 | **Invisible** | ❌ No component | No "Matches" page to display the 680 league matches created | **HIGH** - Core TeamReel data not accessible |
| **transactions.Transaction** | ~50 | **Limited** | `CreditsPage.tsx` | Only shows transaction history, not match-specific credits | **MEDIUM** - Works but incomplete |
| **contextual_notifications.NotificationPreference** | ~10 | **Complex UI** | `PreferencesPage.tsx` | Preference management exists but UX is complex | **LOW** - Functional but could improve |

---

## 🔴 Not Connected Models
*Backend tables with data but NO frontend component consuming them*

| Model | Records | Missing Endpoint Usage | Impact | Priority |
|-------|---------|----------------------|---------|----------|
| **activities.Participation** | 0 | `/api/v1/participations/` | No match lineups/stats visible | **LOW** (no data yet) |
| **transactions.BalancePolicy** | 6 | `/api/v1/transactions/policies/` | Admins cannot configure credit thresholds | **MEDIUM** |
| **contextual_notifications.OrganisationNotificationPolicy** | 6 | `/api/v1/contextual-notifications/policies/` | Admins cannot set org-wide notification rules | **LOW** |
| **credits.CreditsBalance** | 5 | `/api/v1/credits/balance/` | No real-time balance widget | **MEDIUM** |
| **settings.FeatureFlag** | ~10 | `/api/v1/settings/feature-flags/` | Feature flags UI exists but incomplete | **LOW** |

---

## 🎯 Critical Missing Integrations

### 1. **Matches Page (HIGHEST PRIORITY)**
**Backend:** 1,307 Activity records (680 new + 627 legacy)
**Frontend Status:** ❌ **No component exists**
**API Endpoint:** `/api/v1/activities/?activity_type=match`

**Required Functionality:**
- **List View:** Display all matches for a team or competition
- **Match Details:** Opponent, location, date, round number, status
- **Filtering:** By season, competition type, team, date range
- **Data Display:** Home/Away team names, venue (via opponent_project FK), match status

**Component Location:** `demo/src/pages/projects/MatchesPage.tsx` (does not exist)

**Technical Requirements:**
- Fetch activities with `activity_type=match` filter
- Display home team (project), away team (opponent_project), competition (period)
- Show match metadata: round, status (scheduled/live/finished)
- Integrate with existing project detail page as new tab

---

### 2. **Team Roster View**
**Backend:** 2,190 ProjectMemberships (1,758 players across seasons)
**Frontend Status:** 🟡 **Partially connected** (MemberList shows RBAC roles only)
**API Endpoint:** `/api/v1/projects/:id/members/?period=:seasonId`

**Current Limitation:**
- Existing `MemberList.tsx` component displays RBAC admin/manager roles
- Does not show period-scoped player memberships with functional roles

**Required Enhancement:**
- **Season Filter:** Dropdown to select season (Period)
- **Player Roster Display:** Show players with positions (Keeper, Speler, Verdediger, etc.)
- **Jersey Numbers:** Display shirt numbers from membership metadata
- **Staff Roles:** Show coaches, assistants, medical staff per season

---

### 3. **Organisation-Level Audit Log**
**Backend:** 837 AuditEvents (login, membership changes, project operations)
**Frontend Status:** 🟡 **Partially connected** (project-scoped only)
**API Endpoint:** `/api/v1/audit/?organisation=:orgId`

**Current Limitation:**
- `AuditLogTable.tsx` only displays project-scoped audit events
- Federation-level events (org creation, org-level permissions) not visible

**Required Enhancement:**
- Add "Audit Log" tab to `OrganisationDetailPage.tsx`
- Display organisation-scoped events (cross-project operations)
- Show federation admin actions and organisation-wide changes

---

## 📊 API Endpoint Coverage

### Existing Endpoints (In Use)

| Endpoint | Method | Frontend Usage | Status |
|----------|--------|----------------|--------|
| `/api/v1/users/me/` | GET | ProfilePage | ✅ Working |
| `/api/v1/organisations/` | GET | OrganisationListPage | ✅ Working |
| `/api/v1/organisations/:slug/members/` | GET | OrganisationDetailPage | ✅ Working |
| `/api/v1/projects/` | GET | ProjectListPage | ✅ Working |
| `/api/v1/projects/:id/` | GET | ProjectDetailPage | ✅ Working |
| `/api/v1/projects/:id/members/` | GET | MemberList | ✅ Working |
| `/api/v1/periods/` | GET | ProjectDetailPage filters | ✅ Working |
| `/api/v1/permissions/` | GET | PermissionsPage | ✅ Working |
| `/api/v1/roles/` | GET | RoleAssignmentPage | ✅ Working |
| `/api/v1/user-notifications/` | GET | NotificationsPage | ✅ Working |
| `/api/v1/audit/` | GET | AuditLogTable | ✅ Working (project-scoped) |
| `/api/observability/metrics/` | GET | ObservabilityPage | ✅ Working |

### Missing/Unused Endpoints

| Endpoint | Backend Status | Frontend Status | Priority |
|----------|---------------|-----------------|----------|
| `/api/v1/activities/` | ✅ 1,307 records | ❌ No component | **HIGH** |
| `/api/v1/participations/` | ❌ Empty | ❌ No component | LOW |
| `/api/v1/transactions/policies/` | ✅ 6 records | ❌ No component | MEDIUM |
| `/api/v1/contextual-notifications/policies/` | ✅ 6 records | ❌ No component | LOW |
| `/api/v1/credits/balance/` | ✅ 5 records | 🟡 Mocked in Dashboard | MEDIUM |

---

## 🔍 Detailed Component Audit

### Dashboard (`DashboardPage.tsx`)
**Connected Backend Data:**
- ✅ User profile information (via authentication context)
- ✅ Organisation context (current federation/club)
- 🟡 Credits balance (hardcoded check for 'datalab' organisation slug)
- ❌ Recent activities (using mock data instead of API)

**Integration Gaps:**
- Credit balance check uses hardcoded slug instead of real `/api/v1/credits/balance/` endpoint
- Activity feed shows placeholder data instead of fetching from `/api/v1/activities/`
- Missing match summary widget (upcoming matches for user's teams)

**Impact:** Dashboard shows partial information, missing real-time data

---

### Project Detail Page (`ProjectDetailPage.tsx`)
**Connected Backend Data:**
- ✅ Project details (club/team information)
- ✅ Organisation membership list (RBAC roles: Admin, Manager)
- ✅ Audit log (project-scoped events)
- ❌ **Missing:** Matches tab showing team's fixtures
- ❌ **Missing:** Player roster tab (period-scoped memberships)

**Integration Gaps:**
- No way to view the 680 matches associated with teams
- Cannot see season-specific player rosters
- Missing season selector to filter data by period

**Impact:** Core TeamReel functionality (matches, player rosters) invisible to users

---

### Organisation Detail Page (`OrganisationDetailPage.tsx`)
**Connected Backend Data:**
- ✅ Organisation information (federation details)
- ✅ Member list with RBAC roles
- ❌ **Missing:** Organisation-level audit log
- ❌ **Missing:** Balance policy management interface

**Integration Gaps:**
- Can only see project-level audit events, not federation-wide operations
- No UI for configuring credit policies and thresholds
- Missing notification policy management for org-wide rules

**Impact:** Federation administrators lack visibility and control tools

---

### Notifications Page (`NotificationsPage.tsx`)
**Connected Backend Data:**
- ✅ User notifications inbox
- ✅ Mark as read functionality
- ✅ Real-time polling (every 30 seconds)

**Status:** Fully functional, no gaps identified

---

### Credits Page (`CreditsPage.tsx`)
**Connected Backend Data:**
- ✅ Transaction history (credit purchases and usage)
- ❌ **Missing:** Real-time balance widget
- ❌ **Missing:** Match-specific credit allocation display

**Integration Gaps:**
- Cannot see current balance prominently
- No link between matches and credit consumption

**Impact:** Users cannot easily track credit usage per match/activity

---

## 🎬 Priority Integration Opportunities

### High Priority (Core Functionality)

#### 1. Matches List Page
**Estimated Effort:** 2-3 hours
**Backend Ready:** ✅ `/api/v1/activities/?project={id}&activity_type=match`
**Requirements:**
- New component: `demo/src/pages/projects/MatchesPage.tsx`
- Display table with: Date, Home Team, Away Team, Competition, Status
- Filter options: Season (period), Competition type
- Integration point: Add as tab in ProjectDetailPage

**Impact:** Makes 1,307 match records visible and accessible to users

---

#### 2. Dashboard Credits Fix
**Estimated Effort:** 30 minutes
**Backend Ready:** ✅ `/api/v1/credits/balance/`
**Requirements:**
- Replace hardcoded `slug === 'datalab'` check in DashboardPage.tsx
- Fetch real balance from credits API endpoint
- Display low balance alert when threshold reached

**Impact:** Shows accurate credit information instead of mock data

---

#### 3. Player Roster Enhancement
**Estimated Effort:** 1-2 hours
**Backend Ready:** ✅ `/api/v1/projects/:id/members/?period=:seasonId`
**Requirements:**
- Add season filter dropdown to MemberList.tsx
- Display period-scoped memberships (players, not just RBAC admins)
- Show player metadata: Position, Jersey number
- Separate display for players vs staff

**Impact:** Teams can view season-specific rosters with player details

---

### Medium Priority (Admin Tools)

#### 4. Organisation-Level Audit Log
**Estimated Effort:** 1 hour
**Backend Ready:** ✅ `/api/v1/audit/?organisation=:orgId`
**Requirements:**
- Extend AuditLogTable.tsx to support organisation scope parameter
- Add "Audit Log" tab to OrganisationDetailPage.tsx
- Display federation-wide events and cross-project operations

**Impact:** Federation admins gain visibility into org-level changes

---

#### 5. Balance Policy Management
**Estimated Effort:** 2-3 hours
**Backend Ready:** ✅ `/api/v1/transactions/policies/`
**Requirements:**
- New component for policy configuration
- Display current policies per organisation/project
- Form to create/edit credit thresholds and auto-purchase rules

**Impact:** Admins can configure automated credit management

---

### Low Priority (Enhancements)

#### 6. Match Detail Page
**Estimated Effort:** 3-4 hours (blocked by Participation data)
**Backend Status:** 🟡 Activity data ready, Participation data empty
**Requirements:**
- Detailed match view with lineup information
- Player statistics and participation records
- Match events timeline

**Impact:** Enhanced match viewing experience (blocked until Participation seeded)

---

#### 7. Real-Time Balance Widget
**Estimated Effort:** 1-2 hours
**Backend Ready:** ✅ `/api/v1/credits/balance/`
**Requirements:**
- Persistent balance display in top navigation
- Color-coded indicator (green/yellow/red based on threshold)
- Click to view transaction history

**Impact:** Improved UX for credit awareness

---

## 🔧 Technical Debt & Known Issues

### API Client Inconsistency
**Description:** Frontend codebase uses mix of direct `fetch()` calls and custom `fetchWithCSRF()` wrapper
**Impact:** Inconsistent CSRF token handling across components
**Risk Level:** Medium
**Resolution:** Standardize on unified `@django-core/api-client` wrapper for all API calls

---

### Mock Data Overrides
**Description:** Several components contain hardcoded fallback data and slug-based checks
**Examples:**
- Dashboard credits check: `organisation?.slug === 'datalab'`
- Activity feed using placeholder mock data
**Impact:** Production data not displayed even when available in backend
**Risk Level:** High (user-facing data accuracy)
**Resolution:** Remove all slug-based conditional logic, always fetch from API

---

### Missing Loading States
**Description:** Some data-fetching components lack loading indicators
**Impact:** Poor user experience during API calls, appears frozen
**Risk Level:** Low (UX only)
**Resolution:** Add consistent `<LoadingState />` component to all pages with async data

---

### Incomplete Error Handling
**Description:** API errors often result in blank screens instead of user-friendly messages
**Impact:** Users cannot diagnose connection or permission issues
**Risk Level:** Medium (support burden)
**Resolution:** Implement consistent error boundary pattern with retry mechanisms

---

## 🚀 Recommended Implementation Roadmap

### Phase 1: Critical Functionality (Week 1)
**Goal:** Make core TeamReel data visible to users

1. **MatchesPage Implementation**
   - Component creation: `demo/src/pages/projects/MatchesPage.tsx`
   - API integration: `/api/v1/activities/` endpoint
   - Tab integration: Add to ProjectDetailPage
   - **Milestone:** 1,307 matches become visible

2. **Dashboard Credits Fix**
   - Replace hardcoded slug check with real API call
   - Fetch from `/api/v1/credits/balance/`
   - **Milestone:** Accurate credit display for all organisations

3. **Player Roster Enhancement**
   - Add season filter to MemberList component
   - Display period-scoped memberships
   - Show functional roles (Keeper, Speler, Coach)
   - **Milestone:** Team rosters visible per season

**Phase 1 Completion Criteria:**
- ✅ Activities domain: 0% → 100% connected
- ✅ Credits display: Mock data → Real API
- ✅ Project memberships: RBAC-only → Players + Staff

---

### Phase 2: Admin Capabilities (Week 2)
**Goal:** Provide management tools for federation and club administrators

4. **Organisation-Level Audit Log**
   - Extend AuditLogTable for org-scope
   - Add tab to OrganisationDetailPage
   - **Milestone:** Federation-wide event visibility

5. **Balance Policy Management**
   - Create policy configuration component
   - CRUD operations on `/api/v1/transactions/policies/`
   - **Milestone:** Self-service credit policy management

6. **Notification Policy UI**
   - Organisation-level notification rules interface
   - Integration with `/api/v1/contextual-notifications/policies/`
   - **Milestone:** Org admins can configure notification routing

**Phase 2 Completion Criteria:**
- ✅ Transactions domain: 33% → 80% connected
- ✅ Notifications domain: 50% → 75% connected
- ✅ Admin tooling complete for core operations

---

### Phase 3: Enhanced Features (Week 3)
**Goal:** Polish user experience and add value-add features

7. **Match Detail Page**
   - Full match information display
   - Lineup integration (when Participation data available)
   - Match events timeline
   - **Milestone:** Rich match viewing experience

8. **Activity Feed Widget**
   - Real-time feed on Dashboard
   - Cross-team recent activities
   - **Milestone:** Increased user engagement

9. **Credits Dashboard**
   - Visual balance charts
   - Spending analytics per team/season
   - Predictive low-balance warnings
   - **Milestone:** Proactive credit management

**Phase 3 Completion Criteria:**
- ✅ All domains: 90%+ connected
- ✅ UX polish: Loading states, error handling, responsive design
- ✅ Value-add features: Analytics, predictions, automation

---

## 📈 Integration Completeness by Domain

| Domain | Tables | Connected | Percentage | Grade |
|--------|--------|-----------|------------|-------|
| **Identity & Auth** | 3 | 3 | 100% | ✅ A+ |
| **RBAC & Permissions** | 3 | 3 | 100% | ✅ A+ |
| **Organisations** | 2 | 2 | 100% | ✅ A+ |
| **Projects (Teams/Clubs)** | 2 | 2 | 100% | ✅ A+ |
| **Activities (Matches)** | 3 | 0 | 0% | ❌ F |
| **Notifications** | 4 | 2 | 50% | 🟡 C |
| **Transactions & Credits** | 3 | 1 | 33% | 🟡 D |
| **Observability** | 2 | 2 | 100% | ✅ A+ |

---

## 🚀 Recommended Implementation Order

### Phase 1: Critical Paths (Week 1)
1. ✅ **Matches List Page** - Show 1,307 matches
2. ✅ **Fix Dashboard Credits** - Use real balance API
3. ✅ **Player Roster View** - Period-scoped memberships

### Phase 2: Admin Tools (Week 2)
4. **Org-Level Audit Log** - Show federation-level events
5. **Balance Policy Management** - Configure credit thresholds
6. **Notification Policy UI** - Org-wide notification rules

### Phase 3: Enhancements (Week 3)
7. **Match Detail Page** - Show full match info with lineups (when Participation data exists)
8. **Activity Feed Widget** - Recent actions across org
9. **Credits Dashboard** - Real-time balance charts

---

## 🔧 Technical Debt & Issues

### API Client Inconsistency
**Issue:** Mix of `fetch()` and `fetchWithCSRF()` calls
**Impact:** CSRF token handling is inconsistent
**Fix:** Standardize on `@django-core/api-client` wrapper

### Mock Data Overrides
**Issue:** Several components have hardcoded fallbacks (e.g., `datalab` slug check)
**Impact:** Production data not visible even when present
**Fix:** Remove all slug-based mocks, use real API responses

### Missing Loading States
**Issue:** Some components don't show loading indicators
**Impact:** Poor UX during API calls
**Fix:** Add `<LoadingState />` component to all data-fetching pages

---

## 📋 Changelog

### 2026-01-08 09:20 - Initial Frontend Integration Audit
- Audited all 41 backend models against frontend components
- Identified 12 fully connected, 3 partially connected, 5 not connected models
- **Critical Finding:** 1,307 matches (Activity records) have NO frontend display
- Documented missing MatchesPage.tsx as highest priority
- Created implementation roadmap for Phase 1-3 integrations
- Overall assessment: 🟡 **Partially Connected** (60% coverage on critical paths)

---

## 🎯 Success Metrics

- [x] Identity & RBAC: 100% connected
- [x] Organisations: 100% connected
- [x] Projects: 100% connected
- [ ] **Activities: 0% connected** ⚠️ **BLOCKER**
- [x] Notifications: 50% connected
- [ ] Transactions: 33% connected
- [x] Observability: 100% connected

**Target:** 90% coverage on all domains by end of Phase 3
