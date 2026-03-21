# UX Flows — Complete Overview

**Last Updated:** 2025-06-13
**Status:** Active
**Scope:** All user-facing flows in `demo/src/`

---

## 1. Application Shell

The app uses a **dual-panel sidebar + mobile bottom nav** pattern:

### Desktop Shell
```
┌──────────────────────────────────────────────────────────┐
│  Panel A (sidebar)  │  Panel B (context)  │   Page       │
│                     │                     │              │
│  OVERVIEW           │  Tab navigation     │              │
│  ├─ Dashboard       │  for current page   │              │
│  ├─ Directory*      │                     │              │
│                     │                     │              │
│  APP                │                     │              │
│  ├─ Federation*     │                     │              │
│  ├─ Club            │                     │              │
│  ├─ Team            │                     │              │
│  ├─ Season          │                     │              │
│  ├─ Competition     │                     │              │
│  ├─ Match           │                     │              │
│  ├─ Member          │                     │              │
│                     │                     │              │
│  CONTENT            │                     │              │
│  ├─ Gallery         │                     │              │
│  ├─ Media Library   │                     │              │
│  ├─ Queue           │                     │              │
│                     │                     │              │
│  SETTINGS           │                     │              │
│  ├─ Preferences     │                     │              │
│  ├─ Templates*      │                     │              │
│  ├─ Workflows*      │                     │              │
│  ├─ Organisation*   │                     │              │
│  ├─ Platform*       │                     │              │
│                     │                     │              │
│  HELP               │                     │              │
│  └─ User Guide      │                     │              │
└──────────────────────────────────────────────────────────┘
  * = role-restricted (superadmin / org_admin / staff)
```

### Mobile Shell (< 640px)
```
┌──────────────────────────────────┐
│           Page Content           │
│                                  │
├──────────────────────────────────┤
│ [Home] [Season] [+] [Gallery] [Profile] │
└──────────────────────────────────┘
  Center [+] = raised FAB → CreateWizard
  Season tab = dynamic label (Team/Season based on depth)
```

### Panel B (Context Sidebar)
Panel B appears contextually when the current route has sub-tabs:
- **Directory**: Federations, Clubs, Teams, Seasons, Competitions, Members
- **Gallery/Studio**: All, Videos, Images, Pending, Published
- **Media Library**: Organisation, Team, Season tabs
- **Approvals/Queue**: All, Review, Active, Done (with count badges)
- **Preferences**: Profile, Notifications, Credits, Memberships, Billing
- **Organisation**: Permissions, Users, Audit
- **Platform**: Health, Constitution, Security, Observability, Flags

---

## 2. Navigation Entry Points

| # | Entry Point | Desktop | Mobile | Opens |
|---|-------------|---------|--------|-------|
| 1 | **Sidebar Panel A** | Primary nav items | Hidden | Direct page navigation |
| 2 | **Sidebar Panel B** | Tab sub-navigation | Hidden | Tab/filter within page |
| 3 | **MobileBottomNav** | Hidden | 4+1 tab bar | Home, Season, Gallery, Profile + Create |
| 4 | **SearchBar** | Command palette (⌘K) | Search page | Full-text search across all entities |
| 5 | **CreateWizard** | Via quick-create events | Via [+] FAB | 5 create flows |
| 6 | **Dashboard Cards** | Click-through cards | Same | Active match, upcoming matches, quick actions |
| 7 | **Breadcrumbs** | Vanity URL hierarchy | Same | Org → Club → Team → Season → Competition → Match |

---

## 3. Permission Tiers

All navigation items have visibility scoping:

| Tier | Label | Access |
|------|-------|--------|
| 1 | `everyone` | All authenticated users |
| 2 | `org_admin` | Organisation admins + system admins |
| 3 | `staff` | System admin + land admin |
| 4 | `superadmin` | System admin only |

**Dashboard card visibility** is role-adaptive:
- **Active Match**: everyone
- **Squad Readiness + AI Queue**: non-member (coach+)
- **Credits Trend**: org-level admins
- **Member Content Progress + Assets Overview**: non-member
- **Org Stats**: org-level without team scope

---

## 4. Core User Journeys

### 4.1 Authentication Flow

```
/login → email/password → JWT → redirect to /dashboard
/register → create account → auto-login → /dashboard
```

**Pages:** `LoginPage`, `RegisterPage`
**Auth provider:** `@django-core/auth-ui` (AuthProvider, ProtectedRoute, AdminOnlyRoute, OrgAdminRoute)

### 4.2 Dashboard (Landing)

```
/dashboard
├─ Header: greeting + org/project subtitle
├─ Low balance banner (org admins, conditional)
├─ Main column:
│   ├─ ActiveMatchCard (closest match to now)
│   ├─ Summary grid: SquadReadiness, AIQueue, CreditsTrend
│   ├─ ContentBreakdownCard (progress bars)
│   ├─ ContentOverviewCard (full inventory)
│   ├─ SmartActionsCard (contextual quick actions)
│   ├─ MemberContentProgressCard
│   ├─ AssetsOverviewCard
│   └─ UpcomingMatchesCard
├─ Side column:
│   └─ ActivityFeed (recent activities)
└─ PullToRefresh (mobile gesture)
```

**Preloaded routes:** DirectoryPage, SeasonDetailPage, MatchDetailWrapper

### 4.3 Hierarchy Navigation (Vanity URLs)

The core domain navigation follows a chain of vanity slugs:

```
/:orgId                                    → Organisation
/:orgId/:clubId                            → Club
/:orgId/:clubId/:projectId                 → Team
/:orgId/:clubId/:projectId/:seasonId       → Season
/:orgId/:clubId/:projectId/:seasonId/:competitionId → Competition
/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId → Match
/:orgId/:clubId/:projectId/:seasonId/:memberId → Member
```

Each level has **tabbed detail pages**:

| Entity | Tabs |
|--------|------|
| **Organisation** | Overview, Hierarchy, Clubs, Teams, Seasons, Competitions, Matches, Users |
| **Club** | Overview, Hierarchy, Kits, Organisation detail |
| **Team** | Overview, Hierarchy, Selectie (Squad), Media, Organisation detail |
| **Season** | Overview, Hierarchy, Squad, Competitions, Matches, Media, Content, Assets Settings, Transactions, Workflow |
| **Competition** | Overview, Hierarchy, Matches, Content, Squad |
| **Match** | Overview, Line-up, Content, Media, Modals (detail, edit, create) |
| **Member** | Overview, Identity, Input, Action Photo, Celebration, Intro, Photo Composite, Walking Composite, Then vs Now, Assets |

### 4.4 Directory & Discovery

```
/directory
├─ Tab: Federations
├─ Tab: Clubs
├─ Tab: Teams
├─ Tab: Seasons
├─ Tab: Competitions
└─ Tab: Members/Users
```

**Filtering:** `useDirectoryFilters` (427 lines — largest hook, cascading entity selection)
**Search:** Full-text search via SearchBar (⌘K) → `/search`

### 4.5 Content & Studio Flow

```
/studio                    → Gallery (all generated content)
/studio?tab=videos         → Video content
/studio?tab=images         → Image content
/studio/videos             → Video Queue page
/content                   → Content landing
/medialib                  → Media Library (organisation/team/season scoped)
/approvals                 → Approval Queue
/approvals?tab=review      → Items needing review (badge count)
/approvals?tab=active      → Currently processing
/approvals?tab=done        → Completed items
```

### 4.6 AI Content Generation Pipeline

```
Match/Member context
  → SmartMatchStep (auto-detect activity)
  → MatchWizardV2 (content generation wizard)
      ├─ Select content type (pre-match, post-match, line-up, etc.)
      ├─ Configure generation parameters
      ├─ Preview & confirm
      └─ Submit → GenerationJob → Celery pipeline
          → Approval Queue (/approvals)
          → Gallery (/studio)
```

**Components:** `MatchWizardV2/` (16 files), `ContentGenerationModal/`, `content-generation/`

### 4.7 Settings & Preferences

```
/settings                  → Settings landing
/preferences               → Preference tabs
  ├─ ?tab=profile          → Personal profile
  ├─ ?tab=notifications    → Notification preferences
  ├─ ?tab=credits          → Credit balance & usage
  ├─ ?tab=memberships      → Team memberships
  └─ ?tab=billing          → Billing & invoices
/profile                   → Profile hub page
```

### 4.8 Organisation Administration

```
/permissions               → Permission management
/users                     → User management table
/audit                     → Audit log
/credits                   → Organisation credits (wallet=org)
/organisation/:orgId       → Organisation detail
```

### 4.9 Platform Administration (Superadmin)

```
/health                    → System health dashboard
/constitution              → Constitution configuration
/security                  → Security settings
/observability             → Observability dashboard
/flags                     → Feature flags
/integration-status        → Integration status
```

### 4.10 Configuration (Superadmin)

```
/config/content-templates  → Content template editor
/config/workflow-templates → Workflow template editor
/config/routing-rules      → Content routing rules
/config/routing-logs       → Routing audit logs
/config/usage-events       → Usage event tracking
```

### 4.11 Frontend Development Pages

```
/frontend/design-system    → Component catalog (DesignSystemPage)
/frontend/auth-flows       → Auth flow testing
/frontend/context          → Context debugging
/frontend/resources        → Resource explorer
/frontend/templates        → Template showcase
/frontend/theme            → Theme editor
/frontend/integration      → Integration testing
```

---

## 5. Create Flows (Universal CreateWizard)

The **CreateWizard** is the universal entry point for creating new entities. It opens from:
- Mobile: [+] FAB in MobileBottomNav
- Desktop: Quick-create events from SmartEmptyState, match cards, etc.
- Custom events: `teamreel:open-quick-create`

### 5.1 Flow Architecture (Dual-Context Pattern)

```
CreateWizardProvider (domain: selectedFlow, prefill)
  └─ WizardProvider (navigation: steps, current step)
      └─ WizardShell (UI: header, progress, content)
```

### 5.2 Available Flows

| Flow | Code | Steps | Result |
|------|------|-------|--------|
| **Content** (C3) | `ContentFlow` | SmartMatch → MatchWizardV2 | AI generation job |
| **Match** (M1) | `MatchCreateFlow` | Details → Confirm | New Activity |
| **Member** (M2) | `MemberAddFlow` | Search → Role → Details → Confirm | New Membership |
| **Team** (M3) | `ProjectCreateFlow` | Context → Details → Confirm | New Project |
| **Season** (M4) | `PeriodCreateFlow` | Type → Details → Confirm | New Period |

### 5.3 Step 0: Choose Flow

```
ChooseFlowStep
├─ [🎬 Content]  → ContentFlow
├─ [⚽ Match]    → MatchCreateFlow
├─ [👤 Member]   → MemberAddFlow
├─ [👕 Team]     → ProjectCreateFlow
└─ [📅 Season]   → PeriodCreateFlow
```

When `initialFlow` is provided (e.g. from a context-aware button), Step 0 is skipped.

### 5.4 Context Prefill

The wizard receives contextual pre-fills from the current page:

```typescript
interface CreatePrefill {
  organisationId?: string;
  clubProjectId?: string | number;
  teamProjectId?: string | number;
  periodId?: string;
  competitionId?: string;
  activityId?: string;
  // + names for display
}
```

---

## 6. Modal Inventory

Key modals across the application:

### Identity Modals
| Modal | Trigger | Purpose |
|-------|---------|---------|
| `OrganisationCreateModal` | Directory / Admin | Create new organisation |
| `OrganisationDetailModal` | Directory click | View org details |
| `OrganisationEditModal` | Org detail | Edit organisation |
| `ProjectCreateModal` | Team pages | Create club/team |
| `ProjectDetailModal` | Team click | View project details |
| `ProjectEditModal` | Project detail | Edit project |
| `PeriodCreateModal` | Season pages | Create season/competition |
| `PeriodDetailModal` | Period click | View period details |
| `PeriodEditModal` | Period detail | Edit period |
| `MatchCreateModal` | Match pages | Create match (full form) |
| `MatchDetailModal` | Match click | View match details |
| `MatchEditModal` | Match detail | Edit match |
| `AddMemberModal` | Squad tab | Add member to team |
| `InviteMemberModal` | Team/Season | Invite new member |
| `MemberEditSheet` | Member card | Edit member (bottom sheet) |
| `MemberBatchActionModal` | Squad selection | Batch operations on members |
| `SeasonSquadAddMemberModal` | Season squad | Add members to season squad |

### User Modals
| Modal | Trigger | Purpose |
|-------|---------|---------|
| `CreateUserModal` | Admin users | Create new user account |
| `UserDetailModal` | User click | View user details |
| `UserEditModal` | User detail | Edit user |
| `AssignUserToOrgModal` | Admin | Assign user to organisation |
| `LinkUserModal` | Member detail | Link member to user account |
| `OrgEditMemberRoleModal` | Org members | Change member role |

### Content Modals
| Modal | Trigger | Purpose |
|-------|---------|---------|
| `ContentGenerationModal` | Studio / Match | Configure AI generation |
| `ReviewModal` | Approvals | Review generated content |
| `VideoReviewModal` | Approvals | Review generated video |
| `FollowUpModals` | Post-generation | Follow-up actions |
| `VideoPreviewModal` | Gallery | Preview video content |
| `ThenVsNowModal` | Member assets | Compare then vs now photos |
| `MemberAiModal` | Member detail | AI actions for member |
| `IntegrationStatusModals` | Platform | Check integration details |

### Member Asset Tabs
| Tab | Page | Purpose |
|-----|------|---------|
| `MemberIdentityTab` | Member detail | Identity info |
| `MemberInputTab` | Member detail | Player input data |
| `MemberActionPhotoTab` | Member detail | Action photos |
| `MemberCelebrationTab` | Member detail | Celebration photos |
| `MemberIntroTab` | Member detail | Intro video |
| `MemberPhotoCompositeTab` | Member detail | Photo composite |
| `MemberWalkingCompositeTab` | Member detail | Walking composite |
| `MemberThenVsNowTab` | Member detail | Then vs Now comparison |
| `MemberAssetsTab` | Member detail | All assets overview |

---

## 7. Route Map (Complete)

### Public Routes
| Route | Page |
|-------|------|
| `/login` | LoginPage |
| `/register` | RegisterPage |

### Core Navigation (Protected)
| Route | Page | Section |
|-------|------|---------|
| `/` | RootRedirect → /dashboard or /login | — |
| `/dashboard` | DashboardPage | Overview |
| `/recents` | RecentsPage | Overview |
| `/favorites` | FavoritesPage | Overview |
| `/search` | SearchPage | Global |
| `/directory` | DirectoryPage | Overview |

### Hierarchy (Vanity URL)
| Route | Page |
|-------|------|
| `/:orgId` | OrganisationDetailPage |
| `/:orgId/:clubId` | ClubDetailPage |
| `/:orgId/:clubId/:projectId` | TeamDetailPage |
| `/:orgId/:clubId/:projectId/:seasonId` | SeasonDetailPage |
| `/:orgId/:clubId/:projectId/:seasonId/:competitionId` | CompetitionDetailWrapper |
| `/:orgId/:clubId/:projectId/:seasonId/:competitionId/:matchId` | MatchDetailWrapper |
| `/:orgId/:clubId/:projectId/:seasonId/:memberId` | MemberDetailPage |

### Project Hierarchy (Non-Vanity)
| Route | Page |
|-------|------|
| `/:orgId/projects/:projectId/seasons` | ProjectSeasonsPage |
| `/:orgId/projects/:projectId/seasons/:periodId` | ProjectSeasonDetailPage |
| `/:orgId/projects/:projectId/seasons/:periodId/squad` | ProjectSeasonSquadPage |
| `/:orgId/projects/:projectId/seasons/:periodId/members/:memberId` | ProjectSeasonMemberDetailPage |
| `/:orgId/projects/:projectId/seasons/:periodId/competitions/:competitionId` | ProjectCompetitionDetailPage |
| `/:orgId/projects/:projectId/seasons/:periodId/competitions/:competitionId/matches` | ProjectCompetitionMatchesPage |
| `/:orgId/projects/:projectId/seasons/:periodId/competitions/:competitionId/squad` | ProjectCompetitionSquadPage |

### Content & Studio
| Route | Page |
|-------|------|
| `/content` | ContentPage |
| `/studio` | StudioPage (Gallery) |
| `/studio/videos` | VideoQueuePage |
| `/medialib` | MediaLibraryPage |
| `/approvals` | ApprovalsPage |

### Identity & Management
| Route | Page |
|-------|------|
| `/organisations` | OrganisationsPage |
| `/organisations/create` | OrganisationCreatePage |
| `/organisations/:id` | OrganisationDetailPage |
| `/organisations/:id/edit` | OrganisationEditPage |
| `/users` | UsersPage |
| `/users/:userId` | UserDetailPage |
| `/permissions` | PermissionsPage |

### Settings
| Route | Page |
|-------|------|
| `/settings` | SettingsLandingPage |
| `/preferences` | SettingsPage |
| `/profile` | ProfileHubPage |
| `/credits` | Credits (via preferences) |
| `/memberships` | Memberships (via preferences) |
| `/billing` | Billing (via preferences) |
| `/notifications` | NotificationsPage |

### Work List Pages
| Route | Page |
|-------|------|
| `/federations` | Federations list |
| `/clubs` | Clubs list |
| `/teams` | Teams list |
| `/seasons` | Seasons list |
| `/competitions` | Competitions list |
| `/matches` | Matches list |
| `/apps` | AppsPage |

### Config (Superadmin)
| Route | Page |
|-------|------|
| `/config/content-templates` | Content Templates |
| `/config/workflow-templates` | Workflow Templates |
| `/config/approvals` | Approvals Config |
| `/config/preferences` | Global Preferences |
| `/config/audit` | Audit Log |
| `/config/flags` | Feature Flags |
| `/config/credits` | Credits Config |
| `/config/routing-rules` | Routing Rules |
| `/config/routing-logs` | Routing Logs |
| `/config/usage-events` | Usage Events |

### Platform (Superadmin)
| Route | Page |
|-------|------|
| `/health` | Health Dashboard |
| `/constitution` | Constitution |
| `/security` | Security |
| `/observability` | Observability |

### Frontend Dev
| Route | Page |
|-------|------|
| `/frontend/design-system` | Design System Catalog |
| `/frontend/auth-flows` | Auth Flow Testing |
| `/frontend/context` | Context Debugger |
| `/frontend/resources` | Resource Explorer |
| `/frontend/templates` | Template Showcase |
| `/frontend/theme` | Theme Editor |
| `/frontend/integration` | Integration Testing |

### Documentation
| Route | Page |
|-------|------|
| `/docs` | Documentation |
| `/docs/tasks` | Task Manager |
| `/docs/notifications` | Notification docs |
| `/docs/deployment` | Deployment guide |

### Error Pages
| Route | Page |
|-------|------|
| `/403` | Forbidden |
| `/404` | Not Found |
| `*` | Catch-all → 404 |

---

## 8. File Counts by Feature Area

| Area | Files | Notes |
|------|------:|-------|
| pages/identity | 211 | Largest feature — org/club/team/season/member CRUD |
| pages/periods | 83 | Season detail, competition detail, member tabs |
| pages/config | 42 | Admin configuration pages |
| pages/activities | 24 | Match detail + modals |
| components/CreateWizard | 24 | Universal wizard + 5 flows |
| components/MatchWizardV2 | 16 | AI content generation wizard |
| components/ui | 16 | Shared UI primitives |
| components/AssetsTab | 14 | Asset management components |
| components/dashboard | ~12 | Dashboard cards |
| pages/studio | 3 | Gallery + video queue |
| pages/medialib | ~8 | Media library |
| pages/ApprovalsPage | ~5 | Approval queue |

**Total production files:** 850
**Total LOC:** 121,693
**CSS Modules:** 277
**Test files:** 191

---

## 9. State Management Overview

| Hook | Count | Purpose |
|------|------:|---------|
| useState | 1,228 | Local component state |
| useEffect | 642 | Side effects & data fetching |
| useCallback | 423 | Memoized callbacks |
| useMemo | 1,030 | Expensive computation caching |
| useContext | 118 | Context consumption |
| useRef | 141 | DOM refs & mutable values |
| useReducer | 66 | Complex state logic |
| React.memo | 882 | Component memoization |

**Key contexts:**
- `AuthProvider` — JWT auth state
- `ContextSwitcher` — Active organisation/project context
- `ThemeProvider` — Light/dark theme
- `CreateWizardProvider` — Universal create wizard domain state
- `WizardProvider` — Generic wizard navigation state
- `MatchWizardContext` — Match content generation state

---

## 10. Architecture Diagrams

### User Journey: Match Day Content

```
Login → Dashboard
  ├─ ActiveMatchCard → MatchDetailPage
  │   ├─ Line-up tab → Configure squad
  │   ├─ Content tab → View generated content
  │   └─ [Generate] → MatchWizardV2
  │       ├─ Select template (pre-match, post-match, line-up)
  │       ├─ Configure parameters
  │       └─ Submit → GenerationJob
  │           → Approvals Queue (/approvals?tab=review)
  │           → Review → Approve/Reject
  │           → Gallery (/studio)
  │
  └─ SmartActionsCard → Quick action buttons
      └─ [Create Content] → CreateWizard → ContentFlow → MatchWizardV2
```

### User Journey: Onboarding New Season

```
Dashboard → Team (sidebar APP section)
  └─ Season tab → [Create Season] (CreateWizard → PeriodCreateFlow)
      ├─ PeriodTypeStep: Season / Competition
      ├─ PeriodDetailsStep: Name, dates, parent
      └─ PeriodConfirmStep: Review & submit
          → SeasonDetailPage
              ├─ Squad tab → [Add Members] (SeasonSquadAddMemberModal)
              ├─ Competitions tab → [Add Competition] (PeriodCreateModal)
              └─ Content tab → Configure content generation
```

### User Journey: Member Management

```
Team → Season → Squad tab
  ├─ [Add Member] → AddMemberModal / InviteMemberModal
  ├─ [Batch Action] → MemberBatchActionModal
  │   ├─ Bulk asset generation
  │   └─ Bulk status changes
  └─ Member card → MemberDetailPage
      ├─ Identity tab → Personal info
      ├─ Input tab → Player stats
      ├─ Asset tabs → Photos, videos, composites
      │   └─ [Generate] → MemberAiModal → MatchWizardV2
      └─ [Edit] → MemberEditSheet
```
