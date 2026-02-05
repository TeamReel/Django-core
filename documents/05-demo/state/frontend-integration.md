# Frontend Integration Status

> Last updated: 2026-02-05 (Feature Flags integration complete)

Dit document toont welke backend functionaliteit al in de frontend is geïntegreerd en wat nog moet worden toegevoegd.

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

### B31 Content Templates 🟡
- **Backend**: 320 templates seeded
  - member: 196 (profile_photo, legacy_photo, closeup, intro, in_tenue, lineup, flyer)
  - during_match: 73 (goal, score_update, end_score, substitution, yellow_card, red_card, injury, highlights)
  - pre_match: 42 (lineup, flyer, walkon, anthem)
  - post_match: 6 (highlights, match_summary)
  - season: 3 (season_recap, transformation)
- **Frontend**:
  - ✅ ContentTemplatesPage (list/CRUD UI)
  - ✅ ContentGenerationModal (template selection)
  - ❌ Geen UI voor nieuwe member subtypes (profile_photo, legacy_photo, closeup)
  - ❌ Geen filter op template_subtype in UI
- **TODO**:
  - [ ] Filter dropdown voor subtypes toevoegen in ContentTemplatesPage
  - [ ] ContentGenerationModal updaten met member template categorieën

### B22 MediaLib 🟡
- **Backend**: 78 MediaTags seeded, 0 MediaItems
- **Frontend**:
  - ✅ MediaLibraryPage (basic list/filter UI)
  - ✅ useMediaLibrary hook
  - ❌ Tag filter dropdown nog niet gevuld met system tags
  - ❌ Geen tag management UI
- **TODO**:
  - [ ] Fetch system tags via API en toon in filter
  - [ ] Tag selector component voor MediaItems

### B33 Branding 🟡
- **Backend**: 102 BrandProfiles, 612 DesignTokens
- **Frontend**:
  - ✅ IdentitySettingsCard (basic identity fields)
  - ❌ Geen BrandProfile editor
  - ❌ Geen DesignToken viewer/editor
  - ❌ Geen design token preview
- **TODO**:
  - [ ] BrandProfilePage toevoegen
  - [ ] DesignTokensCard component
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
1. **MediaTags in filter** - Fetch `/api/v1/media/tags/?is_system=true` en toon in dropdown
2. **ContentTemplate subtype filter** - Dropdown in ContentTemplatesPage
3. **Member template categories** - UI voor profile_photo, legacy_photo, closeup

### Medium Priority
4. **BrandProfile viewer** - Read-only weergave van project branding
5. **DesignToken display** - Token values met inheritance
6. **File upload flow** - Direct upload naar S3 via presigned URL

### Low Priority
7. **Task status widget** - Celery queue monitoring
8. **Generation UI** - B34 pipeline triggers (wacht op backend)

---

## Recent Completions

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
| `/api/v1/media/tags/` | - | ❌ Niet aangeroepen |
| `/api/v1/branding/profiles/` | - | ❌ Niet aangeroepen |
| `/api/v1/branding/tokens/` | - | ❌ Niet aangeroepen |
| `/api/v1/sport-configuration/sports/` | useSports | ✅ |
| `/api/v1/sport-configuration/formations/` | useSports | ✅ |
| `/api/v1/files/` | - | ❌ Niet aangeroepen |
| `/api/v1/generative/templates/` | - | ⚪ Backend n/a |
| `/api/v1/generative/requests/` | - | ⚪ Backend n/a |
