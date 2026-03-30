# TeamReel — Complete UX Flow Map

> Auto-generated from codebase analysis of `demo/src/`.
> Covers all routes, navigation structures, pages, and user flows.

---

## Architecture Overview

### Provider Hierarchy (outer → inner)
```
ThemeProvider (main.tsx)
  └─ AuthProvider (main.tsx)
      └─ RouterProvider → AppShell (layouts/AppShell.tsx)
          ├─ ContextSwitcherProvider
          ├─ ToastProvider
          ├─ ConfirmProvider
          └─ BackNavigationProvider
              └─ MainLayout (layouts/MainLayout.tsx)
                  ├─ TopNavbar (desktop + mobile)
                  ├─ Sidebar (Panel A + Panel B — desktop)
                  ├─ <Outlet /> (page content)
                  ├─ OnboardingWizard (mobile only)
                  └─ MobileBottomNav (mobile only)
```

### Responsive Breakpoints
| Breakpoint | Shell |
|---|---|
| **< 640px** (Mobile) | MobileBottomNav + hamburger menu, no persistent sidebar |
| **640–1024px** (Tablet) | Sidebar collapsed by default |
| **≥ 1024px** (Desktop) | Full Sidebar (Panel A + Panel B), TopNavbar |

---

## 1. NAVIGATION & SHELL

### 1.1 Sidebar (Desktop) — `Sidebar.tsx` + `useSidebarData.tsx`

**Structure:** Dual-panel sidebar (Panel A: nav links, Panel B: contextual sub-nav)

**Panel A Sections** (from `sidebarData.ts`):

| Section | ID | Items | Visibility |
|---|---|---|---|
| **OVERVIEW** | `overview` | Dashboard, Directory (superadmin) | everyone |
| **APP** | `app` | Federation, Club, Team, Season, Competition, Match, Member, User | context-dynamic |
| **CONTENT** | `content` | Gallery, Media Library, Queue | everyone |
| **SETTINGS** | `settings` | Preferences, Templates, Workflows, Organisation, Platform | mixed |
| **HELP** | `help` | User Guide | everyone |

**Panel B Sections** (from `sidebarPanelBConfig.ts`):
- **Work** — Hierarchy-aware: shows org/club/team/season/competition/match tabs
- **Content** — Gallery categories, Media Library levels, Queue tabs
- **Templates** — All/Season/Pre-Match/During/Post/Member/Workflows
- **Preferences** — Profile, Personalisation, Notifications, Wallet, Memberships, Audit, Billing
- **Organisation** — Permissions, Users, Audit, Organisation Wallet (org_admin+)
- **Platform** — Health, Cache, Features, Integration, Design System, Observability, Security, Constitution (staff+)
- **Help** — User Guide

**Data dependencies:** Auth state, ContextSwitcher (org/project), useAppSelection (hierarchy slugs), useQueueCounts

---

### 1.2 MobileBottomNav — `MobileBottomNav.tsx`

**Layout:** `[ Home ] [ Season ] [ + Create ] [ Gallery ] [ Profile ]`

| Tab | Icon | Destination | Active logic |
|---|---|---|---|
| **Home** | Home | `/dashboard` | Dashboard, Recents, Favorites, Directory |
| **Season** | CalendarDays | Dynamic: team/season path | Vanity hierarchy paths |
| **+ Create** | Plus (raised FAB) | Opens `CreateWizard` modal | — |
| **Gallery** | Images | `/studio` | Studio, Approvals |
| **Profile** | UserCircle | `/profile` | Profile, Preferences, Credits, Memberships, Billing, Notifications, Settings |

**External trigger:** Listens for `teamreel:open-quick-create` custom event (match cards, empty states).

---

### 1.3 TopNavbar — `TopNavbar.tsx`

**Features:**
- Logo + breadcrumbs (desktop)
- Hamburger menu / back button (mobile)
- SearchBar + Command Palette (`Cmd+K`)
- Create menu (`+` button → dropdown with create options)
- Quick Review modal, Notifications modal, Credits modal
- Profile avatar dropdown
- Theme toggle (light/dark/auto)
- Context switcher (org/project)

**Data dependencies:** Auth state, useBackNavigation, useTopNavbarData, ContextSwitcher

---

### 1.4 OnboardingWizard — `OnboardingWizard.tsx`

**Flow name:** First-time user onboarding
**Entry point:** Auto-opens on first mobile visit (checked via `localStorage`)
**Steps:** Welcome → Quick Create → Upcoming Matches → Search & Find
**Type:** BottomSheet modal, 4 swipeable steps

---

## 2. IDENTITY & ORGANIZATION

### 2.1 Directory (Master Index)

| Property | Value |
|---|---|
| **Flow name** | Directory / Entity Browser |
| **Entry point** | Sidebar: "Directory" (superadmin) |
| **Route** | `/directory?tab={federations\|clubs\|teams\|seasons\|competitions\|matches\|users\|content\|all-content}` |
| **Key pages** | `DirectoryPage.tsx` → `FederationsList`, `ClubsList`, `TeamsList`, `SeasonsList`, `CompetitionsList`, `MatchesList`, `UsersList`, `ContentOverview`, `ContentList` |
| **Primary actions** | Browse all entities, filter by tab, navigate to detail |
| **Data dependencies** | Org-scoped API for each entity type |

### 2.2 Organisation (Federation) Management

| Property | Value |
|---|---|
| **Flow name** | Federation / Organisation CRUD |
| **Entry points** | Sidebar APP section "Federation", Directory, `/apps` tile |
| **Routes** | `/:orgId` (detail), `/organisations/create` (create), `/organisations/:id/edit` (edit) |
| **Key pages** | `OrganisationDetailPage`, `OrganisationCreatePage`, `OrganisationEditPage` |
| **Tabs** | Overview (`OrgOverviewTab`), Hierarchy (`OrgHierarchyTab`) |
| **Org context pages** | `/:orgId/clubs`, `/:orgId/teams`, `/:orgId/seasons`, `/:orgId/competitions`, `/:orgId/matches`, `/:orgId/users` |
| **Primary actions** | Create/edit org, browse sub-entities, manage hierarchy |
| **Data dependencies** | Organisations API, context switcher |

### 2.3 Club Management

| Property | Value |
|---|---|
| **Flow name** | Club Detail & Management |
| **Entry points** | Sidebar APP "Club", Directory clubs tab, Org detail |
| **Routes** | `/:orgId/:clubId` (vanity), `/clubs` (list) |
| **Key pages** | `ClubDetailPage` → `ClubOverviewTab`, `ClubHierarchyTab`, `ClubKitsTab` |
| **Primary actions** | View club info, browse hierarchy, manage kits |
| **Data dependencies** | Projects API (type=club), BrandProfile |

### 2.4 Team Management

| Property | Value |
|---|---|
| **Flow name** | Team Detail & Management |
| **Entry points** | Sidebar APP "Team", Directory teams tab, Club detail |
| **Routes** | `/:orgId/:clubId/:projectId` (vanity), `/teams` (list) |
| **Key pages** | `TeamDetailPage` → `TeamOverviewTab`, `TeamSelectieTab`, `TeamHierarchyTab`, `TeamMediaTab` |
| **Primary actions** | View team, manage selectie (squad), browse hierarchy, view media |
| **Data dependencies** | Projects API (type=team), Members, BrandProfile |

### 2.5 User Management

| Property | Value |
|---|---|
| **Flow name** | User Administration |
| **Entry points** | Sidebar Settings "Organisation", Panel B "Users" |
| **Routes** | `/users` (list), `/users/:userId` (detail) |
| **Key pages** | `UsersPage` → `UsersTable`, `UserDetailPage` → Overview, Identity, Activity, Membership tabs |
| **Primary actions** | Browse users, view detail, edit access, manage memberships |
| **Data dependencies** | Users API, Memberships API |
| **Permissions** | OrgAdmin+ |

### 2.6 Member Management

| Property | Value |
|---|---|
| **Flow name** | Member Detail & Editing |
| **Entry points** | Squad tabs, match lineups, search, CreateWizard member flow |
| **Routes** | `/organisations/:id/members/:memberId`, `/:orgId/:clubId/:projectId/:seasonId/members/:memberId` |
| **Key pages** | `MemberDetailPage`, `SeasonMemberDetailPage` with tabs: Identity, Assets, Action Photo, Celebration, Intro, Then vs Now, Walking Composite, Photo Composite, Overview, Input |
| **Primary actions** | View member, edit details, manage media assets, AI content generation |
| **Data dependencies** | Memberships API, BrandAssets, MediaItems |

### 2.7 Permissions Management

| Property | Value |
|---|---|
| **Flow name** | Organisation Permissions |
| **Entry point** | Sidebar Settings "Organisation" |
| **Route** | `/permissions` |
| **Key pages** | `PermissionsPage`, `PermissionsHierarchyTab` |
| **Primary actions** | Manage roles, view permission hierarchy |
| **Permissions** | AdminOnly |

---

## 3. SEASON & COMPETITION

### 3.1 Season Management

| Property | Value |
|---|---|
| **Flow name** | Season Detail & Squad Management |
| **Entry points** | Sidebar APP "Season", Directory, Team detail page |
| **Routes** | `/:orgId/:clubId/:projectId/:seasonId` (vanity), `/:orgId/projects/:projectId/:seasonId`, `/seasons` (list) |
| **Key pages** | `SeasonDetailPage` (wrapper with `SeasonProvider`) → `ProjectSeasonDetailPage` |
| **Tabs** | Overview (`SeasonOverviewTab`), Squad (`SeasonSquadTab`), Matches (`SeasonMatchesTab`), Competitions (`SeasonCompetitionsTab`), Content (`SeasonContentTab`), Media (`SeasonMediaTab`), Hierarchy (`SeasonHierarchyTab`), Team (`SeasonTeamTab`), Assets Settings (`SeasonAssetsSettingsTab`), Transactions (`SeasonTransactionsTab`), Workflow (`SeasonWorkflowTab`) |
| **Primary actions** | View season, manage squad, browse matches/competitions, generate content, view media, manage assets |
| **Data dependencies** | Periods API, Memberships, Activities, BrandAssets |

### 3.2 Competition Management

| Property | Value |
|---|---|
| **Flow name** | Competition Detail |
| **Entry points** | Season detail competitions tab, Directory |
| **Routes** | `/:orgId/:clubId/:projectId/:seasonId/:competitionId` (redirect via `HierarchyRedirect`), `/competitions` (list) |
| **Key pages** | `CompetitionDetailWrapper` → `ProjectCompetitionDetailPage` |
| **Tabs** | Overview (`CompetitionOverviewTab`), Matches (`CompetitionMatchesTable`), Content (`CompetitionContentTab`), Hierarchy (`CompetitionHierarchyTab`) |
| **Primary actions** | View competition, browse matches, manage competition content |
| **Data dependencies** | Periods API (child of season), Activities, Memberships |

### 3.3 Work Hierarchy List Pages

| Property | Value |
|---|---|
| **Flow name** | Flat list browsing for each entity type |
| **Entry points** | Sidebar, direct URL |
| **Routes** | `/federations`, `/clubs`, `/teams`, `/seasons`, `/competitions`, `/matches` |
| **Key pages** | `FederationsPage`, `ClubsPage`, `TeamsPage`, `SeasonsPage`, `CompetitionsPage`, `MatchesPage` (all in `pages/work/`) |
| **Shared component** | `WorkFilterBar` |
| **Primary actions** | Search, filter, navigate to detail |

---

## 4. ACTIVITY & MATCH

### 4.1 Match Detail

| Property | Value |
|---|---|
| **Flow name** | Match Management |
| **Entry points** | Dashboard `ActiveMatchCard`/`UpcomingMatchesCard`, Season matches tab, Competition matches, search, MobileBottomNav quick-create |
| **Routes** | `/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId` (vanity), `/matches/:matchId` (legacy redirect) |
| **Key pages** | `MatchDetailWrapper` → `MatchDetailPage` (`HierarchyMatchDetailPage`) |
| **Tabs** | Overview (`MatchOverviewTab`), Content (`MatchContentTab`), Lineup (`MatchLineupTab`), Transactions (`MatchTransactionsTab`) |
| **Modals** | `MatchDetailModal`, `MatchEditModal`, `ContentGenerationModal`, `ContentPreviewModal`, `SavedAssetPreviewModal` |
| **Primary actions** | View match details, edit match, set lineup, generate content (AI), preview/save content, share |
| **Data dependencies** | Activities API, Memberships (lineup), ContentGeneration API, BrandProfile |

### 4.2 Match Creation

| Property | Value |
|---|---|
| **Flow name** | Match Creation |
| **Entry points** | CreateWizard (M1 flow), `MatchCreateModal` from season/competition pages, TopNavbar create menu |
| **Key components** | `MatchCreateFlow` (wizard), `MatchCreateModal` (modal) |
| **Steps (wizard)** | Match Details (`MatchDetailsStep`) → Confirm (`MatchConfirmStep`) |
| **Primary actions** | Set opponent, date, venue, time → create match |
| **Data dependencies** | Activities API (POST), current team/season/competition context |

---

## 5. CONTENT & MEDIA

### 5.1 AI Studio (Gallery)

| Property | Value |
|---|---|
| **Flow name** | Content Gallery / AI Studio |
| **Entry points** | Sidebar CONTENT "Gallery", MobileBottomNav "Gallery" tab, Content landing page |
| **Route** | `/studio?category={all\|pre_match\|during_match\|post_match\|season\|member}` |
| **Key pages** | `AIStudioPage` |
| **View modes** | By content type, by match (chronological) |
| **Sub-components** | `StudioContentCard`, `StudioPreviewModal`, `ViewAllSheet`, `VideoJobCard`, `ActiveJobsStrip`, `StudioSection` |
| **Primary actions** | Browse generated content, preview, filter by phase/category, view video job status |
| **Data dependencies** | ContentGeneration results API, VideoJobs API |

### 5.2 Media Library

| Property | Value |
|---|---|
| **Flow name** | Media Asset Browser |
| **Entry points** | Sidebar CONTENT "Media Library", Content landing page |
| **Route** | `/medialib?tab={organisation\|club\|team\|member\|files}` |
| **Key pages** | `MediaLibraryPage` (pages/medialib/) |
| **Sub-components** | `AssetCard`, `FileCard`, `MemberMediaCard`, `FilterChip`, `PreviewModal` |
| **Primary actions** | Browse brand assets by hierarchy level, search, filter by sub-type/kit type/file type, download, preview |
| **Data dependencies** | BrandAssets API (`/api/v1/branding/profiles`), FileAssets API (`/api/v1/files/`) |

### 5.3 Approvals Queue

| Property | Value |
|---|---|
| **Flow name** | Content Approval & Video Processing Queue |
| **Entry points** | Sidebar CONTENT "Queue", badge count on nav item |
| **Route** | `/approvals?tab={all\|review\|active\|completed\|rejected\|ai_queue\|video}` |
| **Key pages** | `ApprovalsPage` (refactored module in `ApprovalsPage/`) |
| **Sub-components** | `ApprovalsPageHeader`, `ApprovalsPageContent`, `ApprovalsContentTypeChips`, `ApprovalsWorkflowList`, `ApprovalsModals`, `ApprovalsToastContainer` |
| **Primary actions** | Review pending content, approve/reject, monitor AI queue, track video processing |
| **Data dependencies** | Workflows API, GenerationRequests, VideoJobs |

### 5.4 Content Landing Page

| Property | Value |
|---|---|
| **Flow name** | Content Section Hub |
| **Entry point** | Section title "CONTENT" in sidebar |
| **Route** | `/content` |
| **Key pages** | `ContentPage` |
| **Tiles** | Content Library → `/contentlib`, Media Library → `/medialib`, AI Studio → `/studio`, Video Projects → `/studio/videos`, Image Projects → `/studio/images` |
| **Primary actions** | Navigate to content sub-sections |

### 5.5 Content Templates

| Property | Value |
|---|---|
| **Flow name** | Content Template Management |
| **Entry points** | Sidebar Settings "Templates" |
| **Route** | `/content-templates?tab={all\|season\|pre_match\|during_match\|post_match\|member}` |
| **Key pages** | `ContentTemplatesPage`, `ContentTemplateModal`, `ContentTemplateRequirementsTab` |
| **Primary actions** | Browse templates, create/edit templates, manage template requirements |
| **Permissions** | Superadmin |
| **Data dependencies** | ContentTemplates API, ContentFields |

### 5.6 Workflow Templates

| Property | Value |
|---|---|
| **Flow name** | Workflow Template Management |
| **Entry points** | Sidebar Settings "Workflows", Panel B Templates section |
| **Route** | `/workflow-templates` |
| **Key pages** | `WorkflowTemplatesPage` |
| **Primary actions** | Browse/manage approval workflow templates |
| **Permissions** | Superadmin |

### 5.7 Content Generation (from Match)

| Property | Value |
|---|---|
| **Flow name** | AI Content Generation |
| **Entry points** | Match detail page, CreateWizard content flow (C3), `+` button, match cards |
| **Key components** | `ContentGenerationModal`, `ContentFlow` (CreateWizard), `SmartMatchStep` |
| **Steps** | Select match (SmartMatch) → Choose template → Generate → Preview → Save |
| **Primary actions** | Select match context, choose content type, trigger AI generation, preview result, save/share |
| **Data dependencies** | Activities, ContentTemplates, GenerationRequest/Result APIs, BrandProfile |

---

## 6. CREATE WIZARD (Universal)

### 6.0 CreateWizard — `CreateWizard.tsx` + `CreateWizardContext.tsx`

| Property | Value |
|---|---|
| **Flow name** | Universal Quick Create |
| **Entry points** | MobileBottomNav `+` FAB, TopNavbar create menu, `teamreel:open-quick-create` event |
| **Architecture** | Dual-context: `CreateWizardProvider` (domain state) + `WizardProvider` (navigation) |
| **Step 0** | `ChooseFlowStep` — "What do you want to create?" |

| Flow ID | Name | Steps | Key Components |
|---|---|---|---|
| **C3** `content` | Content Generation | SmartMatch → Template → Generate → Preview | `ContentFlow` |
| **M1** `match` | Match Creation | Details (`MatchDetailsStep`) → Confirm (`MatchConfirmStep`) | `MatchCreateFlow` |
| **M2** `member` | Add Member | Search (`MemberSearchStep`) → Details (`MemberDetailsStep`) → Role (`MemberRoleStep`) → Confirm (`MemberConfirmStep`) | `MemberAddFlow` |
| **M3** `team` | Create Team/Project | Context (`ProjectContextStep`) → Details (`ProjectDetailsStep`) → Confirm (`ProjectConfirmStep`) | `ProjectCreateFlow` |
| **M4** `season` | Create Season/Period | Type (`PeriodTypeStep`) → Details (`PeriodDetailsStep`) → Confirm (`PeriodConfirmStep`) | `PeriodCreateFlow` |

**Prefill context:** `organisationId`, `clubProjectId`, `teamProjectId`, `periodId`, `competitionId`, `activityId` — auto-populated from current page context.

---

## 7. CORE NAVIGATION PAGES

### 7.1 Dashboard

| Property | Value |
|---|---|
| **Flow name** | Main Dashboard |
| **Entry points** | Default after login, Sidebar "Dashboard", MobileBottomNav "Home" |
| **Route** | `/dashboard` |
| **Key page** | `DashboardPage` |
| **Cards (role-adaptive)** | `ActiveMatchCard`, `SquadReadinessCard`, `AIQueueCard` (not member), `CreditsTrendCard` (org-level), `ContentBreakdownCard`, `ContentOverviewCard`, `SmartActionsCard`, `MemberContentProgressCard` (not member), `AssetsOverviewCard` (not member), `UpcomingMatchesCard`, `OrgStatsCard` (org-level, no team scope) |
| **Sidebar** | `ActivityFeed` |
| **Special** | Low credit balance banner (org admins), Pull-to-refresh |
| **Data dependencies** | Auth, ContextSwitcher, Credits API, Activities, ContentGeneration, VideoJobs |

### 7.2 Recents & Favorites

| Property | Value |
|---|---|
| **Routes** | `/recents`, `/favorites` |
| **Key pages** | `RecentsPage`, `FavoritesPage` |
| **Entry points** | Sidebar (Overview section active), keyboard shortcut |
| **Data dependencies** | Navigation API (Recents, Favorites) |

### 7.3 Search

| Property | Value |
|---|---|
| **Flow name** | Global Search |
| **Entry points** | TopNavbar SearchBar, Command Palette (`Cmd+K`), Onboarding wizard |
| **Route** | `/search?q={query}&types={types}&hierarchy={true\|false}&page={n}` |
| **Key pages** | `SearchPage` |
| **Features** | Grouped results, type filtering, hierarchy view, pagination |
| **Search categories** | organisations, clubs, teams, seasons, competitions, matches, users, periods, activities, projects |
| **Data dependencies** | Search API (global, filtered, hierarchical) |

### 7.4 Apps Landing Page

| Property | Value |
|---|---|
| **Flow name** | Apps Hub |
| **Entry point** | Section title "APP" in sidebar |
| **Route** | `/apps` |
| **Key page** | `AppsPage` |
| **Tiles** | Federation, Clubs, Seasons, Competitions, Matches (links context-aware) |

---

## 8. USER SETTINGS & PROFILE

### 8.1 Profile Hub (Mobile-first)

| Property | Value |
|---|---|
| **Flow name** | Profile & Personal Settings |
| **Entry points** | MobileBottomNav "Profile" tab, Sidebar |
| **Route** | `/profile` |
| **Key page** | `ProfileHubPage` |
| **Sections** | Avatar, account info, appearance (theme), language, timezone, notifications, active context, memberships, sign out |
| **Modals** | Edit Profile, Change Password, Avatar Upload |
| **Data dependencies** | Auth (me/profile), Preferences API |

### 8.2 Preferences

| Property | Value |
|---|---|
| **Route** | `/preferences?tab={profile\|personalisation\|notifications\|audit}` |
| **Key pages** | `PreferencesPage`, `PreferencesProfileTab`, `PreferencesSettingsTabs`, `PreferencesModals` |
| **Primary actions** | Edit profile, set personalisation, configure notifications, view personal audit log |
| **Data dependencies** | Auth profile, Preferences API |

### 8.3 Credits

| Property | Value |
|---|---|
| **Route** | `/credits?wallet={personal\|org}` |
| **Key page** | `CreditsPage` |
| **Primary actions** | View balance, top up, view transaction history (personal or org wallet) |
| **Data dependencies** | Credits API |

### 8.4 Memberships

| Property | Value |
|---|---|
| **Route** | `/memberships` |
| **Key page** | `MembershipsPage` |
| **Primary actions** | View all org memberships, manage membership roles |
| **Data dependencies** | Memberships API |

### 8.5 Billing & Licensing

| Property | Value |
|---|---|
| **Route** | `/billing` |
| **Key page** | `BillingPage` |
| **Primary actions** | View billing info, manage licensing |

### 8.6 Notifications

| Property | Value |
|---|---|
| **Route** | `/notifications` |
| **Key page** | `NotificationsPage` |
| **Primary actions** | View notifications, mark read, configure |
| **Data dependencies** | Notifications API |

### 8.7 Settings Landing

| Property | Value |
|---|---|
| **Entry point** | Sidebar "SETTINGS" section title |
| **Route** | `/settings` |
| **Key page** | `SettingsLandingPage` |
| **Tiles** | Preferences, Templates (staff), Organisation (org_admin), Platform (staff), Feature Flags (staff) |

---

## 9. ORGANISATION ADMIN

### 9.1 Organisation Audit

| Property | Value |
|---|---|
| **Route** | `/organisation/audit` |
| **Key page** | `OrganisationAuditPage` |
| **Permissions** | OrgAdmin+ |

### 9.2 Global Audit Log

| Property | Value |
|---|---|
| **Route** | `/audit` |
| **Key pages** | `AuditLogPage`, `AuditLogDetailModal` |
| **Permissions** | OrgAdmin+ |
| **Data dependencies** | Audit events API |

### 9.3 Usage Events

| Property | Value |
|---|---|
| **Route** | `/usage-events` |
| **Key pages** | `UsageEventsPage`, `UsageEventDetailModal`, `UsageEventsFilters` |
| **Permissions** | AdminOnly |

### 9.4 Notification Routing

| Property | Value |
|---|---|
| **Routes** | `/routing-logs` (logs), `/routing-rules` (rules) |
| **Key pages** | `NotificationRoutingLogsPage`, `RoutingRulesPage` |
| **Permissions** | AdminOnly / OrgAdmin |

---

## 10. PLATFORM (Superadmin)

### 10.1 Health Check

| Property | Value |
|---|---|
| **Route** | `/health` |
| **Key page** | `HealthCheckPage` |
| **Permissions** | AdminOnly |

### 10.2 Feature Flags

| Property | Value |
|---|---|
| **Route** | `/flags` |
| **Key page** | `FeatureFlagsPage` |
| **Primary actions** | Toggle features, view flag status |
| **Permissions** | AdminOnly |

### 10.3 Observability

| Property | Value |
|---|---|
| **Route** | `/observability` |
| **Key page** | `ObservabilityPage` |
| **Permissions** | AdminOnly |

### 10.4 Security

| Property | Value |
|---|---|
| **Route** | `/security` |
| **Key page** | `SecurityPage` |
| **Permissions** | AdminOnly |

### 10.5 Constitution

| Property | Value |
|---|---|
| **Route** | `/constitution` |
| **Key page** | `ConstitutionPage` |
| **Permissions** | AdminOnly |

### 10.6 Cache Performance

| Property | Value |
|---|---|
| **Route** | `/demo/performance` |
| **Key page** | `CachePerformancePage` |
| **Permissions** | AdminOnly |

### 10.7 API Docs

| Property | Value |
|---|---|
| **Route** | `/api-docs` |
| **Key page** | `ApiDocsPage` |
| **Permissions** | AdminOnly |

### 10.8 WebSocket Test

| Property | Value |
|---|---|
| **Route** | `/demo/websockets` |
| **Key page** | `WebSocketTestPage` |
| **Permissions** | AdminOnly |

---

## 11. FRONTEND DEV TOOLS

### 11.1 Design System

| Property | Value |
|---|---|
| **Route** | `/design-system` |
| **Key page** | `DesignSystemPage`, `DesignSystemStaticSections` |
| **Permissions** | AdminOnly |

### 11.2 Auth Flows

| Property | Value |
|---|---|
| **Route** | `/auth-flows` |
| **Key page** | `AuthFlowsPage` |

### 11.3 Context Switcher Demo

| Property | Value |
|---|---|
| **Route** | `/context` |
| **Key page** | `ContextSwitcherPage` |

### 11.4 Resource Display

| Property | Value |
|---|---|
| **Route** | `/resources` |
| **Key page** | `ResourceDisplayPage` |

### 11.5 Templates Demo

| Property | Value |
|---|---|
| **Route** | `/templates` |
| **Key page** | `TemplatesPage` (with `TemplatesPagePanels`) |

### 11.6 Theme Demo

| Property | Value |
|---|---|
| **Route** | `/theme` |
| **Key page** | `ThemePage` |

### 11.7 Integration Patterns

| Property | Value |
|---|---|
| **Route** | `/integration` |
| **Key page** | `IntegrationPatternsPage` |

---

## 12. DOCUMENTATION & HELP

| Route | Page | Purpose |
|---|---|---|
| `/docs` | `DocsPage` | User guide / documentation |
| `/tasks` | `TasksPage` | Task management reference |
| `/deployment` | `DeploymentPage` | Deployment documentation |

---

## 13. AUTH

| Route | Page | Purpose |
|---|---|---|
| `/login` | `LoginPage` | Sign in (JWT) |
| `/register` | `RegisterPage` | Sign up |
| `/` | `RootRedirect` | Redirects → `/dashboard` (authed) or `/login` (anon) |

**Auth config endpoints:** `/auth/login/`, `/auth/register/`, `/auth/logout/`, `/auth/password-reset/`, `/auth/password-reset-confirm/`, `/auth/me/`, `/auth/profile/`

---

## 14. ERROR PAGES

| Route | Page |
|---|---|
| `/403` | `ForbiddenPage` |
| `/404` | `NotFoundPage` |
| `*` (catch-all) | `NotFoundPage` |

---

## 15. FILES & DEMO

| Route | Page | Purpose |
|---|---|---|
| `/demo/files` | `FilesPage` | File asset browser (AdminOnly) |

---

## COMPLETE ROUTE TABLE

### Public Routes
| Path | Component | Guard |
|---|---|---|
| `/` | `RootRedirect` | None |
| `/login` | `LoginPage` | None |
| `/register` | `RegisterPage` | None |

### Core Navigation (Protected + MainLayout)
| Path | Component |
|---|---|
| `/dashboard` | `DashboardPage` |
| `/recents` | `RecentsPage` |
| `/favorites` | `FavoritesPage` |
| `/directory` | `DirectoryPage` |
| `/search` | `SearchPage` |
| `/apps` | `AppsPage` |
| `/content` | `ContentPage` |
| `/settings` | `SettingsLandingPage` |

### Content & Studio
| Path | Component |
|---|---|
| `/studio` | `AIStudioPage` |
| `/studio/videos` | Redirect → `/approvals?tab=video` |
| `/contentlib` | Redirect → `/studio?tab=library` |
| `/medialib` | `MediaLibraryPage` |
| `/approvals` | `ApprovalsPage` |

### Work Hierarchy Lists
| Path | Component |
|---|---|
| `/federations` | `FederationsPage` |
| `/clubs` | `ClubsPage` |
| `/teams` | `TeamsPage` |
| `/seasons` | `SeasonsPage` |
| `/competitions` | `CompetitionsPage` |
| `/matches` | `MatchesPage` |
| `/matches/:matchId` | `LegacyMatchRedirectPage` |

### Vanity Hierarchy (Dynamic Segments)
| Pattern | Component |
|---|---|
| `/:orgId` | `OrganisationDetailPage` |
| `/:orgId/:clubId` | `ClubDetailPage` |
| `/:orgId/:clubId/:projectId` | `TeamDetailPage` |
| `/:orgId/:clubId/:projectId/:seasonId` | `SeasonDetailPage` |
| `/:orgId/:clubId/:projectId/:seasonId/members/:memberId` | `SeasonMemberDetailPage` |
| `/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId` | `MatchDetailPage` |
| `/:orgId/:clubId/:projectId/:seasonId/:competitionId` | `HierarchyRedirect` |

### Project Hierarchy
| Pattern | Component |
|---|---|
| `/:orgId/projects/:projectId/seasons` | `ProjectSeasonsPage` |
| `/:orgId/projects/:projectId/:seasonId` | `ProjectHierarchySeasonRedirectPage` |
| `/:orgId/projects/:projectId/:seasonId/:competitionId` | `ProjectHierarchyCompetitionRedirectPage` |
| `/:orgId/projects/:projectId/:seasonId/:competitionId/:matchId` | `ProjectHierarchyMatchRedirectPage` |

### Org Context Pages
| Pattern | Component |
|---|---|
| `/:orgId/clubs` | `OrgClubsPage` |
| `/:orgId/teams` | `OrgTeamsPage` |
| `/:orgId/seasons` | `OrgSeasonsPage` |
| `/:orgId/competitions` | `OrgCompetitionsPage` |
| `/:orgId/matches` | `OrgMatchesPage` |
| `/:orgId/users` | `OrgUsersPage` |

### Identity CRUD
| Path | Component | Guard |
|---|---|---|
| `/organisations/create` | `OrganisationCreatePage` | Protected |
| `/organisations/:id/edit` | `OrganisationEditPage` | Protected |
| `/organisations/:id/members/:memberId` | `MemberDetailPage` | Protected |
| `/organisations/:orgId/projects/create` | `ProjectCreatePage` | Protected |
| `/organisations/:orgId/projects/:projectId/edit` | `ProjectEditPage` | Protected |
| `/permissions` | `PermissionsPage` | AdminOnly |
| `/users` | `UsersPage` | OrgAdmin |
| `/users/:userId` | `UserDetailPage` | OrgAdmin |
| `/profile` | `ProfileHubPage` | Protected |

### Config
| Path | Component | Guard |
|---|---|---|
| `/preferences` | `PreferencesPage` | Protected |
| `/credits` | `CreditsPage` | Protected |
| `/memberships` | `MembershipsPage` | Protected |
| `/billing` | `BillingPage` | Protected |
| `/content-templates` | `ContentTemplatesPage` | Protected |
| `/workflow-templates` | `WorkflowTemplatesPage` | Protected |
| `/audit` | `AuditLogPage` | OrgAdmin |
| `/organisation/audit` | `OrganisationAuditPage` | OrgAdmin |
| `/usage-events` | `UsageEventsPage` | AdminOnly |
| `/routing-logs` | `NotificationRoutingLogsPage` | AdminOnly |
| `/routing-rules` | `RoutingRulesPage` | OrgAdmin |

### Platform
| Path | Component | Guard |
|---|---|---|
| `/health` | `HealthCheckPage` | AdminOnly |
| `/constitution` | `ConstitutionPage` | AdminOnly |
| `/security` | `SecurityPage` | AdminOnly |
| `/observability` | `ObservabilityPage` | AdminOnly |
| `/api-docs` | `ApiDocsPage` | AdminOnly |
| `/demo/websockets` | `WebSocketTestPage` | AdminOnly |
| `/demo/performance` | `CachePerformancePage` | AdminOnly |
| `/demo/files` | `FilesPage` | AdminOnly |

### Frontend Dev
| Path | Component | Guard |
|---|---|---|
| `/design-system` | `DesignSystemPage` | AdminOnly |
| `/auth-flows` | `AuthFlowsPage` | AdminOnly |
| `/context` | `ContextSwitcherPage` | AdminOnly |
| `/resources` | `ResourceDisplayPage` | AdminOnly |
| `/templates` | `TemplatesPage` | AdminOnly |
| `/theme` | `ThemePage` | AdminOnly |
| `/integration` | `IntegrationPatternsPage` | AdminOnly |

### Docs
| Path | Component | Guard |
|---|---|---|
| `/docs` | `DocsPage` | AdminOnly |
| `/tasks` | `TasksPage` | AdminOnly |
| `/notifications` | `NotificationsPage` | Protected |
| `/deployment` | `DeploymentPage` | AdminOnly |

### Errors
| Path | Component |
|---|---|
| `/403` | `ForbiddenPage` |
| `/404` | `NotFoundPage` |
| `*` | `NotFoundPage` |

---

## PERMISSION MODEL

| Guard | Who sees it |
|---|---|
| **None** | Public (login, register) |
| **Protected** | Any authenticated user |
| **OrgAdmin** | Organisation admins + system admins |
| **AdminOnly** | System admins (superadmin / staff) |

Role hierarchy: `superadmin` > `land_admin` > `org_admin` > `coach` > `player` > `supporter`

---

## KEY MODALS & SHEETS

| Modal | Trigger | Purpose |
|---|---|---|
| `CreateWizard` | Mobile FAB / TopNavbar + / Custom event | Universal create (content, match, member, team, season) |
| `OnboardingWizard` | First mobile visit | 4-step onboarding tour |
| `CommandPalette` | `Cmd+K` | Quick command / search |
| `ContentGenerationModal` | Match detail, gallery | AI content generation |
| `MatchCreateModal` | Season/competition pages | Quick match creation |
| `MatchDetailModal` / `MatchEditModal` | Match card clicks | View/edit match |
| `PeriodCreateModal` / `PeriodEditModal` | Season pages | Create/edit periods |
| `ProjectCreateModal` / `ProjectEditModal` | Org/club pages | Create/edit projects |
| `OrganisationCreateModal` / `OrganisationEditModal` | Directory, org pages | Create/edit orgs |
| `AddMemberModal` / `InviteMemberModal` | Squad tabs | Add/invite members |
| `MemberEditSheet` | Member cards | Edit member details |
| `ContentTemplateModal` | Templates page | Edit content template |
| `AuditLogDetailModal` | Audit pages | View audit event detail |
| `ThenVsNowModal` | Member media | Compare before/after photos |
| `VideoPreviewModal` | Studio, match detail | Preview generated video |
| `PreviewModal` (medialib) | Media library | Preview asset |
| `ReviewModal` / `VideoReviewModal` | Approvals | Review content for approval |
| `NavbarQuickReviewModal` | TopNavbar | Quick review from navbar |
| `NavbarNotificationsModal` | TopNavbar bell icon | View notifications |
| `NavbarCreditsModal` | TopNavbar credits icon | View credit balance |
