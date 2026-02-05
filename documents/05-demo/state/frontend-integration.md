# Frontend Integration Status

> Last updated: 2026-02-05 21:11 (Brand Assets seeded, logo display WIP)

Dit document toont welke backend functionaliteit al in de frontend is geïntegreerd en wat nog moet worden toegevoegd.

## 🎯 Current Focus: Brand Identity Display

**Status**: BrandAssets seeded (71), maar logo's tonen nog niet correct
- ✅ Ajax logo URL gefixed (werkend)
- ❌ Andere club logos: Wikipedia thumbnail URLs geven 404
- ❌ KNVB logo: 404 error

**Volgende actie**: Fix broken logo URLs of verwijder ze tijdelijk

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Volledig geïntegreerd (API + UI) |
| 🟡 | Deels geïntegreerd (alleen API hook of basic UI) |
| ❌ | Niet in frontend (alleen backend) |
| ⚪ | Backend nog niet klaar |

---

## Core Modules

### B05 Organisations ✅
- **Backend**: 8 organisations seeded
- **Frontend**: Full CRUD via `OrganisationDetailPage`, membership UI
- **Status**: ✅ Volledig

### B06 Accounts & Auth ✅
- **Backend**: 2,780 users
- **Frontend**: Login/Register, ProfileAvatarDropdown
- **Status**: ✅ Volledig

### B07 Projects ✅
- **Backend**: 325 projects, 3,773 memberships
- **Frontend**: ProjectListPage, ProjectDetailPage, membership panels
- **Status**: ✅ Volledig

### B08 Permissions ✅
- **Backend**: 23 permissions, 5 roles
- **Frontend**: PermissionGuards, role assignment UI
- **Status**: ✅ Volledig

### B10 Feature Flags ✅ (NEW)
- **Backend**: 44 GLOBAL content flags, hierarchical override system (GLOBAL → ORG → PROJECT)
- **Frontend**:
  - ✅ FeatureFlagsPage (global flag management, sync from templates)
  - ✅ ContentAvailabilityCard (org/project scope toggles)
  - ✅ Settings tab in OrganisationDetailPage en ClubOrganisationDetailPage
  - ✅ `/api/v1/settings/feature-flags/resolve-all/` met project_id support
  - ✅ MatchDetailPage filtert templates op basis van enabled flags
- **Flag Hierarchy**:
  - Type level: `content__during_match` (master switch)
  - Subtype level: `content__during_match__goal` (category switch)
  - Style level: `content__during_match__goal__style__arms_wide` (fine-grained)
- **Status**: ✅ Volledig

---

## Activity & Period Modules

### B13 Activities ✅
- **Backend**: 865 activities (matches), 201 events
- **Frontend**: MatchDetailPage, match events, lineup display
- **Status**: ✅ Volledig

### B14 Periods ✅
- **Backend**: 679 periods (seasons, competitions)
- **Frontend**: ProjectSeasonDetailPage, ProjectCompetitionDetailPage
- **Status**: ✅ Volledig

### B29 Participations ✅
- **Backend**: 1,409 participations (squad members)
- **Frontend**: Squad tabs, SeasonSquadAddMemberModal
- **Status**: ✅ Volledig

---

## Content & Media Modules

### B31 Content Templates ✅
- **Backend**: 320 templates seeded
  - member: 196 (profile_photo, legacy_photo, closeup, intro, in_tenue, lineup, flyer)
  - during_match: 73 (goal, score_update, end_score, substitution, yellow_card, red_card, injury, highlights)
  - pre_match: 42 (lineup, flyer, walkon, anthem)
  - post_match: 6 (highlights, match_summary)
  - season: 3 (season_recap, transformation)
- **Frontend**:
  - ✅ ContentTemplatesPage (list/CRUD UI)
  - ✅ Subtype filter dropdown (cascading with type)
  - ✅ Category tabs (All, Pre-Match, During Match, Post-Match, Member, Season)
  - ✅ SUBTYPE_LABELS mapping for display
  - ✅ ContentGenerationModal (template selection)
  - ✅ Template grouping by subtype
- **Status**: ✅ Volledig

### B22 MediaLib ✅
- **Backend**: 78 MediaTags seeded, 0 MediaItems
- **Frontend**:
  - ✅ MediaLibraryPage (Smart Asset Library UI)
  - ✅ useMediaLibrary hook
  - ✅ Tag filter with category dropdown (useMasterData)
  - ✅ Tag selection with toggle buttons
  - ✅ Status filter (raw, edited, approved, published)
  - ✅ Search with pagination
- **TODO**:
  - [ ] Upload nieuwe MediaItems (presigned URL flow)
  - [ ] Tag management UI (CRUD voor project-specifieke tags)

### B33 Branding 🟡
- **Backend**: 102 BrandProfiles, 645 DesignTokens, **71 BrandAssets**, **66 FileAssets**
- **Frontend**:
  - ✅ IdentitySettingsCard (basic identity fields)
  - ✅ BrandProfileCard (read-only profile viewer with design tokens)
  - ✅ Identity tab op alle detail pages (Organisation, Club, Team, Season)
  - ✅ Token grouping by type (Colors, Typography, Spacing, Border Radius)
  - ✅ Color swatch preview voor color tokens
  - ✅ ProfileHeader met logo preview component
  - 🟡 BrandAssets seeded maar logo URLs deels broken (Wikipedia 404s)
  - ❌ Geen BrandProfile editor (create/update)
- **CURRENT ISSUE**: Logo URLs geven 404
  - ✅ Ajax logo gefixed (werkende URL)
  - ❌ Andere clubs/orgs nog broken
- **TODO**:
  - [ ] Fix broken logo URLs
  - [ ] BrandProfile create/edit form
  - [ ] BrandAsset upload component
  - [ ] Token inheritance display (org → project → season)

---

## Configuration Modules

### B32 Sport Configuration ✅
- **Backend**: 15 sports, 6 formations
- **Frontend**:
  - ✅ useSports hook
  - ✅ Sport selector in project settings
  - ✅ Formation display in match/lineup
- **Status**: ✅ Volledig

---

## Financial Modules

### B11 Credits ✅
- **Backend**: Balances + policies
- **Frontend**: CreditsChart, balance display
- **Status**: ✅ Volledig

### B12 Transactions ✅
- **Backend**: 74 transactions, 43 usage events
- **Frontend**: TransactionsPanel, CreateTransactionModal
- **Status**: ✅ Volledig

---

## Notification Modules

### B16 Notifications ✅
- **Backend**: 25,401 notifications
- **Frontend**: NotificationsPage
- **Status**: ✅ Volledig

### B17 Contextual Notifications ✅
- **Backend**: 8 routing rules, 8 org policies
- **Frontend**: NotificationRoutingLogsPage, policy config
- **Status**: ✅ Volledig

---

## Background & Storage

### B15 Background Tasks ❌
- **Backend**: Celery tasks configured
- **Frontend**: Geen task status UI
- **TODO**:
  - [ ] Task queue status widget (optional)
  - [ ] Async job progress indicator

### B35 File Storage ❌
- **Backend**: FileAsset model (0 items)
- **Frontend**: Geen directe file upload UI
- **TODO**:
  - [ ] File upload component in MediaLibrary
  - [ ] Presigned URL upload flow

---

## Generation Modules

### B34 Generative Pipelines ⚪
- **Backend**: NOT MIGRATED (design complete)
- **Frontend**: N/A
- **TODO**:
  - [ ] Backend migrations runnen
  - [ ] GenerationRequest submit UI
  - [ ] Job status polling/WebSocket

---

## Priority TODO List (Frontend)

### High Priority
1. **BrandProfile viewer** - Read-only weergave van project branding met tokens
2. **File upload flow** - Direct upload naar S3 via presigned URL

### Medium Priority
3. **DesignToken display** - Token values met inheritance (org → project → season)
4. **MediaItem upload** - File upload integratie met MediaLibrary

### Low Priority
5. **Task status widget** - Celery queue monitoring
6. **Generation UI** - B34 pipeline triggers (wacht op backend)

---

## Recent Completions

### 2026-02-05: Identity Tab on All Detail Pages
- ✅ BrandProfileCard component (read-only brand profile viewer)
- ✅ Design tokens grouped by type (Colors, Typography, Spacing, Border Radius)
- ✅ Color swatch preview for color tokens
- ✅ Identity tab added to:
  - OrganisationDetailPage (with organisationId support)
  - ClubOrganisationDetailPage (with projectId support)
  - TeamOrganisationDetailPage (with projectId support)
  - ProjectSeasonDetailPage (with seasonId support)
- ✅ Panel B navigation updated with Identity tab for all entity types
- ✅ Collapse button border removed for cleaner look

### 2026-02-05: Panel A Collapse/Expand + Section Landing Pages
- ✅ Collapse button in OVERVIEW section header (was in top-left logo area)
- ✅ Expand button visible when Panel A collapsed (absolute positioned on border)
- ✅ Clickable section titles (OVERVIEW → /dashboard, APP → /apps, CONTENT → /content, SETTINGS → /settings)
- ✅ Section landing pages with TileGrid navigation:
  - `/apps` - Apps landing page (Federation, Clubs, Seasons, Competitions, Matches)
  - `/content` - Content landing page (Media Library, AI Studio, Video Projects, Image Projects)
  - `/settings` - Settings landing page (Preferences, Templates, Organisation, Platform/Features)
- ✅ Panel B hidden on non-APP routes (/apps, /content, /settings, /medialib, /studio)
- ✅ AppsPage links synced with Panel A context (useAppSelection hook)

### 2026-02-05: Feature Flags / Content Availability
- ✅ Created `ContentAvailabilityCard` component for org/project scope management
- ✅ Added Settings tab to OrganisationDetailPage and ClubOrganisationDetailPage
- ✅ Extended `/resolve-all/` endpoint to support `project_id` parameter
- ✅ Synced 44 GLOBAL content flags from templates (type/subtype/style hierarchy)
- ✅ Integrated flag checking in MatchDetailPage template filtering
- ✅ Display labels mapping (goal → "Goal Celebration", etc.)

---

## API Endpoints Checklist

| Endpoint | Hook/Component | Status |
|----------|----------------|--------|
| `/api/v1/settings/feature-flags/` | FeatureFlagsPage | ✅ |
| `/api/v1/settings/feature-flags/resolve-all/` | ContentAvailabilityCard, MatchDetailPage | ✅ |
| `/api/v1/content-generation/templates/` | ContentTemplatesPage | ✅ |
| `/api/v1/media/items/` | useMediaLibrary | ✅ |
| `/api/v1/media/tags/` | useMasterData (mediaTagsByCategory) | ✅ |
| `/api/v1/branding/profiles/` | BrandProfileCard | ✅ |
| `/api/v1/branding/tokens/` | - | ❌ Niet aangeroepen |
| `/api/v1/sport-configuration/sports/` | useSports | ✅ |
| `/api/v1/sport-configuration/formations/` | useSports | ✅ |
| `/api/v1/files/` | - | ❌ Niet aangeroepen |
| `/api/v1/generative/templates/` | - | ⚪ Backend n/a |
| `/api/v1/generative/requests/` | - | ⚪ Backend n/a |
