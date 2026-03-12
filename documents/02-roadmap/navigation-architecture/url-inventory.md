# URL Pattern Inventory — Full Frontend Audit

**Generated:** 2026-03-12
**Scope:** `demo/src/` — all `navigate()`, `<Link to>`, `<Navigate to>`, route `path=`, sidebar/navbar data

---

## 1. Static Routes (no parameters)

These are fixed URL paths — no dynamic segments.

| # | Pattern | Source Type | File(s) & Line(s) |
|---|---------|-------------|-------------------|
| 1 | `/` | Route, Navigate, navigate | [App.tsx](demo/src/App.tsx#L52), [BackNavigationProvider.tsx](demo/src/providers/BackNavigationProvider.tsx#L65), [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx#L54), [ProfilePage.tsx](demo/src/pages/identity/ProfilePage.tsx#L99) |
| 2 | `/login` | Route, Navigate, Link | [App.tsx](demo/src/App.tsx#L57), [PermissionGuards.tsx](demo/src/components/PermissionGuards.tsx#L79), [TopNavbar.tsx](demo/src/components/TopNavbar.tsx#L317), [LoginPage.tsx](demo/src/pages/LoginPage.tsx#L80) |
| 3 | `/register` | Route, Link | [App.tsx](demo/src/App.tsx#L58), [RegisterPage.tsx](demo/src/pages/RegisterPage.tsx#L169), [TopNavbar.tsx](demo/src/components/TopNavbar.tsx#L318) |
| 4 | `/dashboard` | Route, navigate, sidebarData | [App.tsx](demo/src/App.tsx#L63), [sidebarData.ts](demo/src/components/sidebarData.ts#L30), [MobileBottomNav.tsx](demo/src/components/MobileBottomNav.tsx#L91), [SmartActionsCard.tsx](demo/src/components/dashboard/SmartActionsCard.tsx#L75), [LoginPage.tsx](demo/src/pages/LoginPage.tsx#L16), [RegisterPage.tsx](demo/src/pages/RegisterPage.tsx#L21), [DirectoryPage.tsx](demo/src/pages/identity/DirectoryPage.tsx#L49), [OrganisationCreatePage.tsx](demo/src/pages/identity/OrganisationCreatePage.tsx#L56), [OrganisationEditPage.tsx](demo/src/pages/identity/OrganisationEditPage.tsx#L105), [ProjectCreatePage.tsx](demo/src/pages/identity/ProjectCreatePage.tsx#L76), [ProjectEditPage.tsx](demo/src/pages/identity/ProjectEditPage.tsx#L141), [ProjectSeasonSquadPage.tsx](demo/src/pages/periods/ProjectSeasonSquadPage.tsx#L49), [ProjectSeasonsPage.tsx](demo/src/pages/periods/ProjectSeasonsPage.tsx#L65), [ProjectCompetitionMatchesPage.tsx](demo/src/pages/periods/ProjectCompetitionMatchesPage.tsx#L73), [ProjectCompetitionSquadPage.tsx](demo/src/pages/periods/ProjectCompetitionSquadPage.tsx#L67), [useMemberDetailData.ts](demo/src/pages/periods/useMemberDetailData.ts#L235), [useProjectsPageData.ts](demo/src/pages/identity/useProjectsPageData.ts#L300) |
| 5 | `/recents` | Route | [App.tsx](demo/src/App.tsx#L64) |
| 6 | `/favorites` | Route | [App.tsx](demo/src/App.tsx#L65) |
| 7 | `/directory` | Route, sidebarData | [App.tsx](demo/src/App.tsx#L66), [sidebarData.ts](demo/src/components/sidebarData.ts#L31) |
| 8 | `/apps` | Route | [App.tsx](demo/src/App.tsx#L69) |
| 9 | `/content` | Route, navigate | [App.tsx](demo/src/App.tsx#L70), [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx#L106), [RecentContentCard.tsx](demo/src/components/dashboard/RecentContentCard.tsx#L95), [ContentBreakdownCard.tsx](demo/src/components/dashboard/ContentBreakdownCard.tsx#L95), [TopNavbar.tsx](demo/src/components/TopNavbar.tsx#L195), [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L55) |
| 10 | `/contentlib` | Route (redirect) | [App.tsx](demo/src/App.tsx#L71) → redirects to `/studio?tab=library` |
| 11 | `/settings` | Route | [App.tsx](demo/src/App.tsx#L72) |
| 12 | `/matches` | Route, navigate | [App.tsx](demo/src/App.tsx#L75), [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx#L167), [ContentLibraryPage.tsx](demo/src/pages/content/ContentLibraryPage.tsx#L288), [QuickActions.tsx](demo/src/components/QuickActions/QuickActions.tsx#L34) |
| 13 | `/matches/new` | navigate | [SmartEmptyState.tsx](demo/src/components/SmartEmptyState.tsx#L265) |
| 14 | `/federations` | Route, navigate | [App.tsx](demo/src/App.tsx#L79), [ProjectSeasonsPage.tsx](demo/src/pages/periods/ProjectSeasonsPage.tsx#L66), [MemberDetailPage.tsx](demo/src/pages/identity/MemberDetailPage.tsx#L155), [OrganisationCreatePage.tsx](demo/src/pages/identity/OrganisationCreatePage.tsx#L41), [OrganisationDetailPage.tsx](demo/src/pages/identity/OrganisationDetailPage.tsx#L62), [useOrgActions.ts](demo/src/pages/identity/useOrgActions.ts#L99), [useProjectsPageData.ts](demo/src/pages/identity/useProjectsPageData.ts#L301), [useUsersData/index.ts](demo/src/pages/identity/useUsersData/index.ts#L126), [ProjectListPage.tsx](demo/src/pages/projects/ProjectListPage.tsx#L72) |
| 15 | `/clubs` | Route, navigate | [App.tsx](demo/src/App.tsx#L80), [MemberDetailPage.tsx](demo/src/pages/identity/MemberDetailPage.tsx#L183) |
| 16 | `/teams` | Route | [App.tsx](demo/src/App.tsx#L81) |
| 17 | `/seasons` | Route | [App.tsx](demo/src/App.tsx#L82) |
| 18 | `/competitions` | Route | [App.tsx](demo/src/App.tsx#L83) |
| 19 | `/studio` | Route, sidebarData, MobileBottomNav | [App.tsx](demo/src/App.tsx#L86), [sidebarData.ts](demo/src/components/sidebarData.ts#L47), [MobileBottomNav.tsx](demo/src/components/MobileBottomNav.tsx#L94), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L102) |
| 20 | `/studio/videos` | Route (redirect) | [App.tsx](demo/src/App.tsx#L87) → redirects to `/approvals?tab=video` |
| 21 | `/search` | Route, navigate | [App.tsx](demo/src/App.tsx#L88), [SmartEmptyState.tsx](demo/src/components/SmartEmptyState.tsx#L271) |
| 22 | `/organisations` | Route (redirect) | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L177) → redirects to `/directory?tab=federations` |
| 23 | `/organisations/create` | Route, navigate | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L178), [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L62) |
| 24 | `/projects` | Route (redirect) | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L224) → redirects to `/directory?tab=clubs` |
| 25 | `/permissions` | Route, sidebarData | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L227), [sidebarData.ts](demo/src/components/sidebarData.ts#L57), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L178) |
| 26 | `/users` | Route, navigate | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L228), [MemberDetailPage.tsx](demo/src/pages/identity/MemberDetailPage.tsx#L184), [ProfilePage.tsx](demo/src/pages/identity/ProfilePage.tsx#L143), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L179) |
| 27 | `/profile` | Route, MobileBottomNav | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L232), [MobileBottomNav.tsx](demo/src/components/MobileBottomNav.tsx#L95) |
| 28 | `/audit` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L242), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L189) |
| 29 | `/organisation/audit` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L243), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L180) |
| 30 | `/flags` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L244), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L193) |
| 31 | `/credits` | Route, navigate | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L245), [DashboardPage.tsx](demo/src/pages/DashboardPage.tsx#L90), [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx#L268), [NavbarCreditsModal.tsx](demo/src/components/NavbarCreditsModal.tsx#L25), [QuickActions.tsx](demo/src/components/QuickActions/QuickActions.tsx#L58) |
| 32 | `/content-templates` | Route, sidebarData | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L246), [sidebarData.ts](demo/src/components/sidebarData.ts#L55), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L104) |
| 33 | `/workflow-templates` | Route, sidebarData | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L247), [sidebarData.ts](demo/src/components/sidebarData.ts#L56), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L157) |
| 34 | `/approvals` | Route, navigate, sidebarData | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L248), [sidebarData.ts](demo/src/components/sidebarData.ts#L48), [matchWizardGeneration.ts](demo/src/components/matchWizardGeneration.ts#L190), [useMatchWizardData.ts](demo/src/components/useMatchWizardData.ts#L203), [useMatchWizardGeneration.ts](demo/src/components/MatchWizardV2/useMatchWizardGeneration.ts#L187), [NavbarQuickReviewModal.tsx](demo/src/components/NavbarQuickReviewModal.tsx#L66), [useGenerationDispatch.ts](demo/src/pages/identity/ContentGenerationModal/useGenerationDispatch.ts#L196), [useSaveHandlers.ts](demo/src/pages/identity/ContentGenerationModal/useSaveHandlers.ts#L106) |
| 35 | `/preferences` | Route, navigate, sidebarData | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L249), [sidebarData.ts](demo/src/components/sidebarData.ts#L54) (as `?tab=profile`), [GovernanceSummaryCard.tsx](demo/src/components/Governance/GovernanceSummaryCard.tsx#L134), [ProfileAvatarDropdown.tsx](demo/src/components/ProfileAvatarDropdown.tsx#L194) |
| 36 | `/memberships` | Route, navigate | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L250), [ProfileHubPage.tsx](demo/src/pages/ProfileHubPage.tsx#L315), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L168) |
| 37 | `/billing` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L251), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L170) |
| 38 | `/usage-events` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L252) |
| 39 | `/routing-logs` | Route, navigate | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L253), [GovernanceSummaryCard.tsx](demo/src/components/Governance/GovernanceSummaryCard.tsx#L138) |
| 40 | `/routing-rules` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L254) |
| 41 | `/health` | Route, sidebarData | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L257), [sidebarData.ts](demo/src/components/sidebarData.ts#L58), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L191) |
| 42 | `/constitution` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L258), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L198) |
| 43 | `/security` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L259), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L197) |
| 44 | `/observability` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L260), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L196) |
| 45 | `/api-docs` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L261) |
| 46 | `/demo/websockets` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L262) |
| 47 | `/demo/performance` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L263), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L192) |
| 48 | `/design-system` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L266), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L195) |
| 49 | `/auth-flows` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L267) |
| 50 | `/context` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L268) |
| 51 | `/resources` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L269) |
| 52 | `/templates` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L270) |
| 53 | `/theme` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L271) |
| 54 | `/integration` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L272) |
| 55 | `/docs` | Route, sidebarData | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L275), [sidebarData.ts](demo/src/components/sidebarData.ts#L65), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L206) |
| 56 | `/tasks` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L276) |
| 57 | `/notifications` | Route, navigate | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L277), [NavbarNotificationsModal.tsx](demo/src/components/NavbarNotificationsModal.tsx#L21), [TopNavigation.tsx](demo/src/components/TopNavigation.tsx#L152), [ProfileHubPage.tsx](demo/src/pages/ProfileHubPage.tsx#L255) |
| 58 | `/deployment` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L278) |
| 59 | `/demo/files` | Route | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L281) |
| 60 | `/medialib` | Route, sidebarData | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L282), [sidebarData.ts](demo/src/components/sidebarData.ts#L47), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L103) |
| 61 | `/403` | Route | [App.tsx](demo/src/App.tsx#L96) |
| 62 | `/404` | Route | [App.tsx](demo/src/App.tsx#L97) |
| 63 | `/settings/memberships` | navigate | [SmartEmptyState.tsx](demo/src/components/SmartEmptyState.tsx#L268) |
| 64 | `/gallery` | navigate (QuickActions) | [QuickActions.tsx](demo/src/components/QuickActions/QuickActions.tsx#L40) |
| 65 | `/media` | navigate (QuickActions) | [QuickActions.tsx](demo/src/components/QuickActions/QuickActions.tsx#L52) |
| 66 | `/studio/create` | topNavbarHelpers | [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L56) |
| 67 | `/integration-status` | sidebarPanelBConfig | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L194) |

**Total: 67 unique static routes**

---

## 2. Parameterized Routes (dynamic segments)

### 2A. Hierarchy — Canonical (vanity) routes

The "canonical" URL shape: `/:org/:club/:team/:season/:competition/:match`

| # | Pattern | Route Key | File & Line |
|---|---------|-----------|-------------|
| 1 | `/:orgId/:clubId/:projectId` | h-vanity-team | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L144) |
| 2 | `/:orgId/:clubId/:projectId/seasons` | h-vanity-team-seasons | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L145) |
| 3 | `/:orgId/:clubId/:projectId/:seasonId` | h-vanity-season | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L146) |
| 4 | `/:orgId/:clubId/:projectId/:seasonId/members/:memberId` | h-vanity-member | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L147) |
| 5 | `/:orgId/:clubId/:projectId/:seasonId/:competitionId` | h-vanity-comp | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L148) |
| 6 | `/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId` | h-vanity-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L149) |

### 2B. Hierarchy — `/organisations/` prefix duplicates

Identical to 2A but prefixed with `/organisations/`:

| # | Pattern | Route Key | File & Line |
|---|---------|-----------|-------------|
| 7 | `/organisations/:orgId/:clubId/:projectId` | h-org-vanity-team | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L152) |
| 8 | `/organisations/:orgId/:clubId/:projectId/seasons` | h-org-vanity-team-seasons | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L153) |
| 9 | `/organisations/:orgId/:clubId/:projectId/:seasonId` | h-org-vanity-season | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L154) |
| 10 | `/organisations/:orgId/:clubId/:projectId/:seasonId/members/:memberId` | h-org-vanity-member | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L155) |
| 11 | `/organisations/:orgId/:clubId/:projectId/:seasonId/:competitionId` | h-org-vanity-comp | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L156) |
| 12 | `/organisations/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId` | h-org-vanity-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L157) |

### 2C. Hierarchy — Back-compat `/seasons/` segment routes

| # | Pattern | Route Key | File & Line |
|---|---------|-----------|-------------|
| 13 | `/:orgId/:clubId/:projectId/seasons/:seasonId` | h-bc-season | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L160) |
| 14 | `/:orgId/:clubId/:projectId/seasons/:seasonId/members/:memberId` | h-bc-member | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L161) |
| 15 | `/:orgId/:clubId/:projectId/seasons/:seasonId/:competitionId` | h-bc-comp | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L162) |
| 16 | `/:orgId/:clubId/:projectId/seasons/:seasonId/:competitionId/:matchId` | h-bc-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L163) |
| 17 | `/organisations/:orgId/:clubId/:projectId/seasons/:seasonId` | h-org-bc-season | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L164) |
| 18 | `/organisations/:orgId/:clubId/:projectId/seasons/:seasonId/members/:memberId` | h-org-bc-member | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L165) |
| 19 | `/organisations/:orgId/:clubId/:projectId/seasons/:seasonId/:competitionId` | h-org-bc-comp | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L166) |
| 20 | `/organisations/:orgId/:clubId/:projectId/seasons/:seasonId/:competitionId/:matchId` | h-org-bc-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L167) |

### 2D. Hierarchy — Legacy `/projects/` segment routes

| # | Pattern | Route Key | File & Line |
|---|---------|-----------|-------------|
| 21 | `/:orgId/projects/:projectId/seasons` | h-proj-seasons | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L109) |
| 22 | `/:orgId/projects/:projectId/:seasonId` | h-proj-season | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L110) |
| 23 | `/:orgId/projects/:projectId/:seasonId/:competitionId` | h-proj-comp | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L111) |
| 24 | `/:orgId/projects/:projectId/:seasonId/:competitionId/:matchId` | h-proj-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L112) |
| 25 | `/:orgId/projects/:clubId/teams/:projectId/seasons` | h-proj-team-seasons | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L113) |
| 26 | `/:orgId/projects/:projectId/seasons/:seasonId` | h-proj-season-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L114) |
| 27 | `/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId` | h-proj-team-season-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L115) |
| 28 | `/:orgId/projects/:projectId/seasons/:seasonId/squad` | h-proj-squad | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L116) |
| 29 | `/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/squad` | h-proj-team-squad | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L117) |
| 30 | `/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId` | h-proj-comp-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L118) |
| 31 | `/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId` | h-proj-team-comp-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L119) |
| 32 | `/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/matches` | h-proj-comp-matches | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L120) |
| 33 | `/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/matches` | h-proj-team-comp-matches | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L121) |
| 34 | `/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/matches/:matchId` | h-proj-comp-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L122) |
| 35 | `/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/matches/:matchId` | h-proj-team-comp-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L123) |
| 36 | `/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/squad` | h-proj-comp-squad | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L124) |
| 37 | `/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/squad` | h-proj-team-comp-squad | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L125) |

### 2E. Hierarchy — Legacy `/organisations/` + `/projects/` routes

Same as 2D but with `/organisations/` prefix (17 routes):

| # | Pattern | Route Key | File & Line |
|---|---------|-----------|-------------|
| 38 | `/organisations/:orgId/projects/:projectId/seasons` | h-org-proj-seasons | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L128) |
| 39 | `/organisations/:orgId/projects/:clubId/teams/:projectId/seasons` | h-org-proj-team-seasons | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L129) |
| 40 | `/organisations/:orgId/projects/:projectId/seasons/:seasonId` | h-org-proj-season-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L130) |
| 41 | `/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId` | h-org-proj-team-season-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L131) |
| 42 | `/organisations/:orgId/projects/:projectId/seasons/:seasonId/squad` | h-org-proj-squad | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L132) |
| 43 | `/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/squad` | h-org-proj-team-squad | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L133) |
| 44 | `/organisations/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId` | h-org-proj-comp-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L134) |
| 45 | `/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId` | h-org-proj-team-comp-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L135) |
| 46 | `/organisations/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/matches` | h-org-proj-comp-matches | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L136) |
| 47 | `/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/matches` | h-org-proj-team-comp-matches | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L137) |
| 48 | `/organisations/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/matches/:matchId` | h-org-proj-comp-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L138) |
| 49 | `/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/matches/:matchId` | h-org-proj-team-comp-match | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L139) |
| 50 | `/organisations/:orgId/projects/:projectId/seasons/:seasonId/competitions/:competitionId/squad` | h-org-proj-comp-squad | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L140) |
| 51 | `/organisations/:orgId/projects/:clubId/teams/:projectId/seasons/:seasonId/competitions/:competitionId/squad` | h-org-proj-team-comp-squad | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L141) |

### 2F. Identity routes (org/project/member CRUD)

| # | Pattern | Route Key | File & Line |
|---|---------|-----------|-------------|
| 52 | `/organisations/:orgId/clubs` | i-org-clubs | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L181) |
| 53 | `/organisations/:orgId/teams` | i-org-teams | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L182) |
| 54 | `/organisations/:orgId/seasons` | i-org-seasons | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L183) |
| 55 | `/organisations/:orgId/competitions` | i-org-competitions | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L184) |
| 56 | `/organisations/:orgId/matches` | i-org-matches | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L185) |
| 57 | `/organisations/:orgId/users` | i-org-users-legacy + i-org-users | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L186), [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L203) |
| 58 | `/:orgId/clubs` | i-ctx-clubs | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L189) |
| 59 | `/:orgId/teams` | i-ctx-teams | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L190) |
| 60 | `/:orgId/seasons` | i-ctx-seasons | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L191) |
| 61 | `/:orgId/competitions` | i-ctx-competitions | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L192) |
| 62 | `/:orgId/matches` | i-ctx-matches | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L193) |
| 63 | `/:orgId/users` | i-ctx-users | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L194) |
| 64 | `/:orgId/hierarchy` | i-ctx-hierarchy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L195) |
| 65 | `/organisations/:id` | i-org-detail-redirect | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L198) — redirects to `/:id` |
| 66 | `/:id` | i-org-detail | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L199) |
| 67 | `/organisations/:id/members/:memberId` | i-org-member | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L202) |
| 68 | `/organisations/:id/edit` | i-org-edit | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L204) |
| 69 | `/organisations/:orgId/projects` | i-org-projects | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L207) — redirect |
| 70 | `/organisations/:orgId/projects/create` | i-org-proj-create | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L208) |
| 71 | `/organisations/:orgId/projects/:projectId` | i-org-proj-detail | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L209) — redirect |
| 72 | `/:orgId/projects/:projectId` | i-proj-detail | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L210) — redirect |
| 73 | `/organisations/:orgId/:projectId` | i-org-club | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L213) |
| 74 | `/:orgId/:projectId` | i-club | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L214) |
| 75 | `/organisations/:orgId/projects/:clubId/teams/:projectId` | i-org-team-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L217) — redirect |
| 76 | `/:orgId/projects/:clubId/teams/:projectId` | i-team-legacy | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L218) — redirect |
| 77 | `/organisations/:orgId/projects/:projectId/edit` | i-org-proj-edit | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L221) |
| 78 | `/users/:userId` | i-user-detail | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L229) |
| 79 | `/matches/:matchId` | legacy-match | [App.tsx](demo/src/App.tsx#L76) — LegacyMatchRedirectPage |

### 2G. Dynamic navigate() patterns (constructed at runtime)

| # | Pattern | File(s) & Line(s) |
|---|---------|-------------------|
| 80 | `/organisations/:slug` | [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx#L52), [OrganisationsPage.tsx](demo/src/pages/identity/OrganisationsPage.tsx#L247), [FederationsList.tsx](demo/src/pages/identity/directory/FederationsList.tsx#L226), [MatchRow.tsx](demo/src/pages/identity/directory/MatchRow.tsx#L72), [CompetitionsList.tsx](demo/src/pages/identity/directory/CompetitionsList.tsx#L136), [SeasonsList.tsx](demo/src/pages/identity/directory/SeasonsList.tsx#L122), [TeamsListTable.tsx](demo/src/pages/identity/directory/TeamsListTable.tsx#L72), [OrganisationCreatePage.tsx](demo/src/pages/identity/OrganisationCreatePage.tsx#L38), [OrganisationEditPage.tsx](demo/src/pages/identity/OrganisationEditPage.tsx#L90), [MemberDetailPage.tsx](demo/src/pages/identity/MemberDetailPage.tsx#L161), [UsersFilterBar.tsx](demo/src/pages/identity/UsersFilterBar.tsx#L62), [useFeatureFlagsData.ts](demo/src/pages/config/useFeatureFlagsData.ts#L113), [ProjectSeasonSquadPage.tsx](demo/src/pages/periods/ProjectSeasonSquadPage.tsx#L29), [ProjectSeasonsPage.tsx](demo/src/pages/periods/ProjectSeasonsPage.tsx#L67), [ProjectCompetitionSquadPage.tsx](demo/src/pages/periods/ProjectCompetitionSquadPage.tsx#L68), [useMemberDetailData.ts](demo/src/pages/periods/useMemberDetailData.ts#L214), [useProjectsPageData.ts](demo/src/pages/identity/useProjectsPageData.ts#L302), [useUsersData/index.ts](demo/src/pages/identity/useUsersData/index.ts#L129) |
| 81 | `/organisations/:orgSlug/projects/:projectSlug` | [ProjectCreatePage.tsx](demo/src/pages/identity/ProjectCreatePage.tsx#L62), [ProjectsTable.tsx](demo/src/pages/identity/ProjectsTable.tsx#L97), [ProjectEditPage.tsx](demo/src/pages/identity/ProjectEditPage.tsx#L119), [ProjectSeasonSquadPage.tsx](demo/src/pages/periods/ProjectSeasonSquadPage.tsx#L33), [ProjectSeasonsPage.tsx](demo/src/pages/periods/ProjectSeasonsPage.tsx#L76), [ProjectCompetitionSquadPage.tsx](demo/src/pages/periods/ProjectCompetitionSquadPage.tsx#L73), [useMemberDetailData.ts](demo/src/pages/periods/useMemberDetailData.ts#L217) |
| 82 | `/organisations/:orgId/projects/create` | [ProjectsPage.tsx](demo/src/pages/identity/ProjectsPage.tsx#L89), [ProjectCreatePage.tsx](demo/src/pages/identity/ProjectCreatePage.tsx#L133) |
| 83 | `/organisations/:orgId/members/:memberId` | [MemberDetailPage.tsx](demo/src/pages/identity/MemberDetailPage.tsx#L214) |
| 84 | `/:orgSlug/:clubSlug` | [Breadcrumbs.tsx](demo/src/components/Breadcrumbs.tsx#L216), [MatchRow.tsx](demo/src/pages/identity/directory/MatchRow.tsx#L85), [CompetitionsList.tsx](demo/src/pages/identity/directory/CompetitionsList.tsx#L152), [SeasonsList.tsx](demo/src/pages/identity/directory/SeasonsList.tsx#L140), [TeamsListTable.tsx](demo/src/pages/identity/directory/TeamsListTable.tsx#L86), [ClubsList.tsx](demo/src/pages/identity/directory/ClubsList.tsx#L206), [ClubOverviewTab.tsx](demo/src/pages/identity/ClubOverviewTab.tsx#L114), [ProjectCompetitionMatchesPage.tsx](demo/src/pages/periods/ProjectCompetitionMatchesPage.tsx#L79) |
| 85 | `/:orgSlug/:clubSlug/:teamSlug` | [Breadcrumbs.tsx](demo/src/components/Breadcrumbs.tsx#L198), [TeamsListTable.tsx](demo/src/pages/identity/directory/TeamsListTable.tsx#L99), [useTeamDetailData.ts](demo/src/pages/identity/useTeamDetailData.ts#L223), [TeamOrganisationDetailPage.tsx](demo/src/pages/identity/TeamOrganisationDetailPage.tsx#L337) |
| 86 | `/:orgSlug/:clubSlug/:teamSlug/:seasonKey` | [useSidebarData.tsx](demo/src/components/useSidebarData.tsx#L175) (sidebar), [MobileBottomNav.tsx](demo/src/components/MobileBottomNav.tsx#L75) |
| 87 | `/:org/:club/:team/:season/:competition` | [useSidebarData.tsx](demo/src/components/useSidebarData.tsx#L177) (sidebar) |
| 88 | `/:org/:club/:team/:season/:competition/:match` | [useSidebarData.tsx](demo/src/components/useSidebarData.tsx#L178) (sidebar) |
| 89 | `/matches/:matchSlugOrId` | [ActiveMatchCard.tsx](demo/src/components/dashboard/ActiveMatchCard.tsx#L148), [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx#L184), [UpcomingMatchesWidget.tsx](demo/src/components/UpcomingMatchesWidget.tsx#L104), [ProjectMatches.tsx](demo/src/pages/projects/ProjectMatches.tsx#L148), [ProjectCompetitionMatchesPage.tsx](demo/src/pages/periods/ProjectCompetitionMatchesPage.tsx#L261) |
| 90 | `/content/:id` | [RecentContentCard.tsx](demo/src/components/dashboard/RecentContentCard.tsx#L107) |
| 91 | `/teams/:projectSlug/squad` | [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx#L50), [MemberContentProgressCard.tsx](demo/src/components/dashboard/MemberContentProgressCard.tsx#L142) |
| 92 | `/teams/:projectSlug/identity` | [AssetsOverviewCard.tsx](demo/src/components/dashboard/AssetsOverviewCard.tsx#L248) |
| 93 | `/users/:userId` | [Breadcrumbs.tsx](demo/src/components/Breadcrumbs.tsx#L127), [UsersTable.tsx](demo/src/pages/identity/UsersTable.tsx#L128), [ProjectSeasonSquadPage.tsx](demo/src/pages/periods/ProjectSeasonSquadPage.tsx#L214), [useSidebarData.tsx](demo/src/components/useSidebarData.tsx#L213), [UsersTableActions.tsx](demo/src/pages/identity/UsersTableActions.tsx#L111) |
| 94 | `/organisations/:orgId/projects/:projectId` (redirect) | [appRedirects.tsx](demo/src/appRedirects.tsx#L120), [ProjectListPage.tsx](demo/src/pages/projects/ProjectListPage.tsx#L75) |
| 95 | `${seasonsBasePath}/:seasonKey` (dynamic base) | [ProjectCompetitionDetailPage.tsx](demo/src/pages/periods/ProjectCompetitionDetailPage.tsx#L63), [ProjectSeasonSquadPage.tsx](demo/src/pages/periods/ProjectSeasonSquadPage.tsx#L96), [useSeasonDetailPageData.ts](demo/src/pages/periods/useSeasonDetailPageData.ts#L121), [useSquadPageData.ts](demo/src/pages/periods/useSquadPageData.ts#L263) |
| 96 | `${seasonsBasePath}/:seasonKey/competitions/:compId` | [ProjectCompetitionSquadPage.tsx](demo/src/pages/periods/ProjectCompetitionSquadPage.tsx#L82) |
| 97 | `${seasonsBasePath}/:seasonKey/squad` | [useSquadPageData.ts](demo/src/pages/periods/useSquadPageData.ts#L287) |
| 98 | `${competitionBasePath}?tab=matches` | [useMatchActions.ts](demo/src/pages/activities/useMatchActions.ts#L151) |

---

## 3. Query-Parameter Routes

URL patterns that rely on `?tab=`, `?q=`, or other query params for state.

| # | Pattern | File(s) & Line(s) |
|---|---------|-------------------|
| 1 | `/directory?tab=federations` | [appRedirects.tsx](demo/src/appRedirects.tsx#L14), [appRedirects.tsx](demo/src/appRedirects.tsx#L21), [appRedirects.tsx](demo/src/appRedirects.tsx#L28) |
| 2 | `/directory?tab=clubs` | [appRouteGroups.tsx](demo/src/appRouteGroups.tsx#L224), [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L61) |
| 3 | `/directory?tab=teams` | [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L60) |
| 4 | `/directory?tab=seasons` | [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L59) |
| 5 | `/directory?tab=competitions` | [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L58) |
| 6 | `/directory?tab=matches` | [LegacyMatchRedirectPage.tsx](demo/src/pages/activities/LegacyMatchRedirectPage.tsx#L256) |
| 7 | `/directory?tab=matches&create=match` | [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L57) |
| 8 | `/directory?tab=users` | [useSidebarData.tsx](demo/src/components/useSidebarData.tsx#L200) |
| 9 | `/directory?tab=clubs&org_id=:orgId` | [appRedirects.tsx](demo/src/appRedirects.tsx#L39) |
| 10 | `/search?q=:query` | [SearchBar.tsx](demo/src/components/SearchBar.tsx#L64), [ActivityFeed.tsx](demo/src/components/ActivityFeed/ActivityFeed.tsx#L221) |
| 11 | `/search?q=:query&types=:category` | [SearchBar.tsx](demo/src/components/SearchBar.tsx#L57) |
| 12 | `/studio?tab=library` | [App.tsx](demo/src/App.tsx#L71) (redirect from `/contentlib`) |
| 13 | `/studio?category=all` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L109) |
| 14 | `/studio?category=pre_match` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L110) |
| 15 | `/studio?category=during_match` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L111) |
| 16 | `/studio?category=post_match` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L112) |
| 17 | `/studio?category=season` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L113) |
| 18 | `/studio?category=member` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L114) |
| 19 | `/studio/videos?tab=:filter` | [VideoQueuePage.tsx](demo/src/pages/studio/VideoQueuePage.tsx#L184) |
| 20 | `/approvals?tab=video` | [App.tsx](demo/src/App.tsx#L87) (redirect from `/studio/videos`) |
| 21 | `/approvals?tab=all` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L119) |
| 22 | `/approvals?tab=review` | [NavbarQuickReviewModal.tsx](demo/src/components/NavbarQuickReviewModal.tsx#L251), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L120) |
| 23 | `/approvals?tab=active` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L121) |
| 24 | `/approvals?tab=completed` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L122) |
| 25 | `/approvals?tab=rejected` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L123) |
| 26 | `/approvals?tab=ai_queue` | [NavbarQuickReviewModal.tsx](demo/src/components/NavbarQuickReviewModal.tsx#L117), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L124) |
| 27 | `/preferences?tab=profile` | [sidebarData.ts](demo/src/components/sidebarData.ts#L54), [ProfileAvatarDropdown.tsx](demo/src/components/ProfileAvatarDropdown.tsx#L185), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L164) |
| 28 | `/preferences?tab=personalisation` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L165) |
| 29 | `/preferences?tab=notifications` | [NotificationsPage.tsx](demo/src/pages/NotificationsPage.tsx#L62), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L166) |
| 30 | `/preferences?tab=audit` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L169) |
| 31 | `/credits?wallet=personal` | [ProfileHubPage.tsx](demo/src/pages/ProfileHubPage.tsx#L174), [ProfileAvatarDropdown.tsx](demo/src/components/ProfileAvatarDropdown.tsx#L203), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L167) |
| 32 | `/credits?wallet=org` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L181) |
| 33 | `/content-templates?tab=all` | [ContentTemplatesPage.tsx](demo/src/pages/config/ContentTemplatesPage.tsx#L152), [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L151) |
| 34 | `/content-templates?tab=season` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L152) |
| 35 | `/content-templates?tab=pre_match` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L153) |
| 36 | `/content-templates?tab=during_match` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L154) |
| 37 | `/content-templates?tab=post_match` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L155) |
| 38 | `/content-templates?tab=member` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L156) |
| 39 | `/medialib?tab=organisation` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L93) |
| 40 | `/medialib?tab=club` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L94) |
| 41 | `/medialib?tab=team` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L95) |
| 42 | `/medialib?tab=member` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L96) |
| 43 | `/medialib?tab=files` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L97) |
| 44 | `/organisations/:orgSlug?tab=settings` | [useFeatureFlagsData.ts](demo/src/pages/config/useFeatureFlagsData.ts#L113) |
| 45 | `/organisations/:orgSlug?tab=hierarchy` | [appRedirects.tsx](demo/src/appRedirects.tsx#L29) |
| 46 | `/matches/:matchSlugOrId?tab=content` | [UpcomingMatchesWidget.tsx](demo/src/components/UpcomingMatchesWidget.tsx#L136), [GalleryCreateContentButton.tsx](demo/src/pages/content/GalleryCreateContentButton.tsx#L75) |
| 47 | `/content/generate?match=:matchId` | [SmartEmptyState.tsx](demo/src/components/SmartEmptyState.tsx#L258) |
| 48 | `/clubs?org_id=:orgId` | [ProjectSeasonsPage.tsx](demo/src/pages/periods/ProjectSeasonsPage.tsx#L70) |
| 49 | `${seasonsBasePath}/:seasonKey?tab=:tabId` | [ProjectSeasonSquadPage.tsx](demo/src/pages/periods/ProjectSeasonSquadPage.tsx#L84), [useSeasonDetailPageData.ts](demo/src/pages/periods/useSeasonDetailPageData.ts#L125) |
| 50 | `${seasonsBasePath}/:seasonKey?tab=selectie` | [ProjectSeasonMemberDetailPage.tsx](demo/src/pages/periods/ProjectSeasonMemberDetailPage.tsx#L166), [Link in ProjectSeasonMemberDetailPage.tsx](demo/src/pages/periods/ProjectSeasonMemberDetailPage.tsx#L268) |
| 51 | `${seasonsBasePath}/:seasonKey?tab=content` | [Link in ProjectSeasonMemberDetailPage.tsx](demo/src/pages/periods/ProjectSeasonMemberDetailPage.tsx#L269) |
| 52 | `${seasonsBasePath}/:seasonKey?tab=competitions` | [useCompetitionMutations.ts](demo/src/pages/periods/useCompetitionMutations.ts#L145) |
| 53 | `${base}?tab=:tab` (SmartActions dynamic) | [SmartActionsCard.tsx](demo/src/components/dashboard/SmartActionsCard.tsx#L72) |
| 54 | `/:orgId/:clubId/:projectId/:seasonId?tab=competitions` | [appRedirects.tsx - TeamCompetitionRedirect](demo/src/appRedirects.tsx#L240) |
| 55 | `/:orgId/:clubId/:projectId/:seasonId?tab=squad` | [appRedirects.tsx - SeasonSquadRedirect](demo/src/appRedirects.tsx#L59) |

---

## 4. Summary Statistics

| Category | Count |
|----------|-------|
| **Static routes** | 67 |
| **Parameterized route defs (appRouteGroups)** | 79 |
| **Dynamic navigate patterns** | 19 unique shapes |
| **Query-param patterns** | 55 |
| **Total unique URL shapes** | ~160 |

### Duplication Analysis

| Canonical Pattern | Variants | Registered Routes |
|-------------------|----------|-------------------|
| `/:org/:club/:team` (TeamDetailPage) | 4 variants | vanity, /organisations/ prefix, /projects/ legacy, /organisations/+/projects/ |
| `/:org/:club/:team/:season` (SeasonDetailPage) | 6 variants | vanity, /organisations/, /seasons/ back-compat, /organisations/+/seasons/, /projects/, /organisations/+/projects/ |
| `/:org/:club/:team/:season/:comp` (CompetitionRedirect) | 6 variants | same 6 patterns |
| `/:org/:club/:team/:season/:comp/:match` (MatchDetailPage) | 6 variants | same 6 patterns |
| `/:org/:club/:team/:season/members/:id` (MemberDetailPage) | 4 variants | vanity, /organisations/, /seasons/ back-compat, /organisations/+/seasons/ |

### Files with Most navigate() Calls

| File | Count |
|------|-------|
| [Breadcrumbs.tsx](demo/src/components/Breadcrumbs.tsx) | 8 |
| [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx) | 8 |
| [ProjectSeasonSquadPage.tsx](demo/src/pages/periods/ProjectSeasonSquadPage.tsx) | 7 |
| [ProjectSeasonsPage.tsx](demo/src/pages/periods/ProjectSeasonsPage.tsx) | 7 |
| [MemberDetailPage.tsx](demo/src/pages/identity/MemberDetailPage.tsx) | 6 |
| [ProfileHubPage.tsx](demo/src/pages/ProfileHubPage.tsx) | 3 |
| [SmartEmptyState.tsx](demo/src/components/SmartEmptyState.tsx) | 5 |

### Navigation Surfaces Summary

| Surface | Source File | Paths Referenced |
|---------|------------|-----------------|
| **Sidebar Panel A** | [sidebarData.ts](demo/src/components/sidebarData.ts) | `/dashboard`, `/directory`, `/studio`, `/medialib`, `/approvals`, `/preferences?tab=profile`, `/content-templates`, `/workflow-templates`, `/permissions`, `/health`, `/docs` |
| **Sidebar Panel A (App)** | [useSidebarData.tsx](demo/src/components/useSidebarData.tsx) | Dynamic: `/:org`, `/:org/:club`, `/:org/:club/:team`, `/:org/:club/:team/:season`, competition path, match path, member path, `/users/:id` |
| **Sidebar Panel B** | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts) | 40+ sub-navigation items (medialib, studio, approvals, content-templates, preferences, organisation, platform tabs) |
| **Mobile Bottom Nav** | [MobileBottomNav.tsx](demo/src/components/MobileBottomNav.tsx) | `/dashboard`, dynamic season path, `/studio`, `/profile` |
| **Top Navbar Create Menu** | [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts) | `/content`, `/studio/create`, `/directory?tab=matches&create=match`, `/directory?tab=competitions`, `/directory?tab=seasons`, `/directory?tab=teams`, `/directory?tab=clubs`, `/organisations/create` |
| **Profile Avatar Dropdown** | [ProfileAvatarDropdown.tsx](demo/src/components/ProfileAvatarDropdown.tsx) | `/preferences?tab=profile`, `/preferences`, `/credits?wallet=personal` |
| **Quick Actions** | [QuickActions.tsx](demo/src/components/QuickActions/QuickActions.tsx) | `/matches`, `/gallery`, `/organisations/:slug` or `/directory`, `/media`, `/credits`, `/settings` |
| **Command Palette** | [CommandPalette.tsx](demo/src/components/CommandPalette.tsx) | Dynamic (follows search result URLs) |

---

## 5. Dead / Orphan URLs

Patterns referenced in `navigate()` but with **no matching route definition**:

| Pattern | File | Notes |
|---------|------|-------|
| `/gallery` | [QuickActions.tsx](demo/src/components/QuickActions/QuickActions.tsx#L40) | No `/gallery` route — likely should be `/studio` |
| `/media` | [QuickActions.tsx](demo/src/components/QuickActions/QuickActions.tsx#L52) | No `/media` route — likely should be `/medialib` |
| `/studio/create` | [topNavbarHelpers.ts](demo/src/components/topNavbarHelpers.ts#L56) | No `/studio/create` route defined |
| `/content/:id` | [RecentContentCard.tsx](demo/src/components/dashboard/RecentContentCard.tsx#L107) | No `/content/:id` route defined |
| `/content/generate?match=:id` | [SmartEmptyState.tsx](demo/src/components/SmartEmptyState.tsx#L258) | No `/content/generate` route defined |
| `/matches/new` | [SmartEmptyState.tsx](demo/src/components/SmartEmptyState.tsx#L265) | No `/matches/new` route — CreateWizard uses modal |
| `/settings/memberships` | [SmartEmptyState.tsx](demo/src/components/SmartEmptyState.tsx#L268) | No nested `/settings/memberships` — should be `/memberships` |
| `/integration-status` | [sidebarPanelBConfig.ts](demo/src/components/sidebarPanelBConfig.ts#L194) | Should be `/integration` |
| `/teams/:id/squad` | [DashboardSummaries.tsx](demo/src/components/dashboard/DashboardSummaries.tsx#L50) | Legacy — no `/teams/:id/squad` route |
| `/teams/:id/identity` | [AssetsOverviewCard.tsx](demo/src/components/dashboard/AssetsOverviewCard.tsx#L248) | Legacy — no `/teams/:id/identity` route |
| `/:org/:club/:team/directory` | [TeamOrganisationDetailPage.tsx](demo/src/pages/identity/TeamOrganisationDetailPage.tsx#L337) | No `/directory` sub-route on team |
