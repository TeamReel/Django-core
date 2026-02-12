# Frontend Integration Status

> Last updated: 2026-02-13 (UX Rebuild: Media Library + AI Studio + Content Library removal)

Dit document toont welke backend functionaliteit al in de frontend is geïntegreerd en wat nog moet worden toegevoegd.

## 🎯 Current Focus: Media & AI Studio UX Rebuild ✅

**Video in Frontend (2026-02-12)**:
- ✅ Video generation via AssetGenerationModal (async 202 + polling)
- ✅ Member detail page: Short Intro tab (kit × pose video grid)
- ✅ Member detail page: Celebration tab (kit × style video grid)
- ✅ Video preview modal with `<video>` playback + click-to-enlarge
- ✅ BatchGenerationModal supports video templates (detects `outputType === 'video'`)
- ✅ MemberMediaMatrix tracks 🎬 intro + 🎉 celebration video slots
- ✅ VideoVariantsMap state management in member detail
- ✅ 2 video constants: `member_intro` (6s, 9:16, 720p) + `member_goal_celebration` (6s, 9:16, 720p)
- ✅ Metadata storage: `membership.metadata.teamreel_assets.videos.intro` / `videos.celebration`
- ✅ useAssetGeneration hook: 202 → task_id → poll every 5s (max 150 polls = ~12.5 min)

**Backend Status (from B55 merge 2026-02-10)**:
- ✅ FFmpeg-based video processing (transcode, thumbnails, composition)
- ✅ 4 models: VideoJob, VideoPreset, PlatformExport, VideoOverlay
- ✅ 8 REST API endpoints
- ✅ Tiered Celery queues (video_fast, video_slow)
- ✅ Platform-specific exports (Instagram, TikTok, YouTube, Twitter)
- ✅ B37 Workflow integration (optional)
- ✅ 76 tests passing (73-97% coverage)

**Still TODO (B55 advanced features)**:
- [x] VideoJobListPage (standalone video processing queue UI) ✅ 2026-02-12
- [x] `/studio/videos` route + Sidebar nav ✅ 2026-02-12
- [ ] PresetSelector component (quality/platform preset picker)
- [ ] PlatformExportOptions (Instagram/TikTok/YouTube format selectors)
- [ ] ThumbnailGeneratorModal (timestamp picker for frame extraction)

**Previous**: B55 Video Frontend Integration (async video polling), B37 Workflow Engine (now integrated)

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

### B22 MediaLib ✅ (Rebuilt 2026-02-13)
- **Backend**: 78 MediaTags seeded, 0 MediaItems, 71 BrandAssets, 66 FileAssets
- **Frontend** (rebuilt to show real content):
  - ✅ MediaLibraryPage — dual-tab view (Brand Assets / Files)
  - ✅ `useBrandAssets` hook — fetches brand profiles → assets per profile, category filtering
  - ✅ `useFileAssets` hook — fetches files with org header, download URL support
  - ✅ `useMediaLibrary` hook (preserved for future MediaItem integration)
  - ✅ Brand Assets tab: thumbnail grid, category filters (Logos, Kits, Sponsors, Other), search
  - ✅ Files tab: file list with type icons, size display, download buttons
  - ✅ Asset type labels (40+ types: club_logo, home_kit, main_sponsor, etc.)
  - ✅ Category grouping via `getAssetCategory()` helper
- **Architecture Change**: Old page queried `/api/v1/media/items/` (0 records). New page queries:
  - `/api/v1/branding/profiles/?organisation={orgId}` → per-profile `/assets/` (71 BrandAssets)
  - `/api/v1/files/` with `X-Organization-ID` header (66 FileAssets)
- **TODO**:
  - [ ] Upload nieuwe FileAssets vanuit MediaLibrary
  - [ ] MediaItem integration wanneer MediaItems beschikbaar zijn
  - [ ] Tag management UI (CRUD voor project-specifieke tags)

### AI Studio ✅ (Rebuilt 2026-02-13)
- **Purpose**: Central hub for AI content generation (template browsing, history, quick actions)
- **Frontend**:
  - ✅ AIStudioPage — 3-tab view at `/studio`
  - ✅ `useGenerationHistory` hook — parallel fetch of asset + content templates + generation history
  - ✅ Templates tab: browse all templates with category filtering (Member, Pre-Match, During Match, etc.)
  - ✅ History tab: generation history with status badges (completed/failed/pending)
  - ✅ Quick Actions tab: navigation cards to Match Content, Member Assets, Video Queue, Content Templates
  - ✅ Template category labels mapping (TEMPLATE_CATEGORY_LABELS)
- **APIs consumed**:
  - `GET /api/v1/generative/assets/templates/` — asset generation templates (8 templates)
  - `GET /api/v1/content-generation/templates/` — content templates (320 templates)
  - `GET /api/v1/generative/assets/history/` — generation history
- **Architecture**: AI Studio does NOT duplicate generation modals (those live on entity detail pages). It serves as a _browser_ and _launchpad_ for templates and history.
- **Status**: ✅ Volledig (replaced empty placeholder)

### B33 Branding ✅
- **Backend**: 102 BrandProfiles, 645 DesignTokens, 71 BrandAssets, 66 FileAssets
- **Frontend**:
  - ✅ IdentitySettingsCard (basic identity fields)
  - ✅ BrandProfileCard (read-only profile viewer with design tokens)
  - ✅ Identity tab op alle detail pages (Organisation, Club, Team, Season)
  - ✅ Token grouping by type (Colors, Typography, Spacing, Border Radius)
  - ✅ Color swatch preview voor color tokens
  - ✅ ProfileHeader met logo preview component
  - ✅ Club logos from S3 bucket (seeded via SoccerWiki import)
  - ✅ Player photos from S3 bucket (seeded via SoccerWiki import)
  - ✅ **Kits tab** in Club detail page with upload functionality
  - ✅ Kit asset types: home, away, third, goalkeeper, coach, assistant, training
  - ✅ Upload flow: FileAsset → BrandAsset with asset_type
  - ✅ Simplified status displays (no URL clutter)
  - ❌ Geen BrandProfile editor (create/update)
- **TODO**:
  - [ ] BrandProfile create/edit form
  - [ ] Token inheritance display (org → project → season)

---

## Workflow Module

### B37 Workflow Engine ✅
- **Backend**: Complete state machine with 3 templates, 10 API endpoints, 210 tests
  - WorkflowTemplate (Content Approval, Support Ticket, Invoice Approval)
  - WorkflowInstance (attach to any model via GenericForeignKey)
  - TransitionHistory (immutable audit trail)
  - ProjectPermissionOverride (role-based access per project)
- **API Endpoints**:
  - `/api/v1/workflows/templates/` - List/CRUD templates
  - `/api/v1/workflows/instances/` - Create/query instances
  - `/api/v1/workflows/instances/{id}/execute/` - Execute transitions
  - `/api/v1/workflows/history/` - Audit trail
  - `/api/v1/workflows/permissions/` - Permission overrides
- **Frontend**: ✅ Full UI integration (2026-02-12)
  - ✅ `useWorkflows.ts` hook — types, 4 list/detail hooks, mutations, state/action display helpers
  - ✅ `WorkflowStatusBadge` — color-coded pill badge by state category
  - ✅ `WorkflowActionButtons` — transition buttons with confirm dialog for destructive actions
  - ✅ `WorkflowTimeline` — vertical timeline of transition history
  - ✅ `WorkflowPanel` — composite component (status + actions + timeline)
  - ✅ `ApprovalsPage` — global approval inbox at `/approvals` with filter bar + counts
  - ✅ `WorkflowTemplatesPage` — admin template browser at `/workflow-templates`
  - ✅ Workflow tab on MatchDetailPage (contentType: activity)
  - ✅ Workflow tab on ProjectSeasonDetailPage (contentType: period)
  - ✅ Workflow tab on ProjectSeasonMemberDetailPage (contentType: projectmembership)
  - ✅ WorkflowStatusBadge on MediaAssetCard (approved/rejected workflow status)
  - ✅ Sidebar: Approvals in CONTENT section, Workflows in SETTINGS section
- **Status**: ✅ Volledig
- **TODO (Phase 2)**:
  - [ ] Async generation queue (Queue Generation button replacing blocking modal)
  - [ ] Notification triggers for state transitions (B16 integration)
  - [ ] Batch approval actions from ApprovalsPage

---

## Video Processing Module

### B55 Video Processing Pipeline ✅ (Partially Integrated)
- **Backend**: FFmpeg-based async video processing (merged 2026-02-10)
  - VideoJob (transcode, thumbnail, compose jobs with status tracking)
  - VideoPreset (1080p_standard, 720p_mobile, 480p_web, thumbnail)
  - PlatformExport (Instagram 1:1/4:5/9:16, TikTok 9:16, YouTube 16:9, Twitter 16:9)
  - VideoOverlay (logo, text, watermark overlays with positioning)
  - Tiered Celery queues: video_fast (thumbnails), video_slow (transcoding)
  - B37 Workflow integration (optional approval flows)
- **API Endpoints** (8 total):
  - `POST /api/v1/video/jobs/` - Create processing job
  - `GET /api/v1/video/jobs/` - List jobs (paginated, filtered)
  - `GET /api/v1/video/jobs/{id}/` - Job detail with progress
  - `DELETE /api/v1/video/jobs/{id}/` - Cancel/delete job
  - `POST /api/v1/video/jobs/{id}/retry/` - Retry failed job
  - `GET /api/v1/video/presets/` - List encoding presets
  - `GET /api/v1/video/platforms/` - List platform export configs
  - `GET /api/v1/video/overlays/` - List overlays for job
- **Frontend**: ✅ Partially integrated (video generation for member assets)
  - ✅ AssetGenerationModal: async video generation with polling (202 → task_id → status)
  - ✅ BatchGenerationModal: video template detection + batch processing
  - ✅ Member detail page: Short Intro tab (kit × pose video grid)
  - ✅ Member detail page: Celebration tab (kit × style video grid)
  - ✅ Video preview modal with `<video>` playback
  - ✅ MemberMediaMatrix: video slot tracking (🎬 intro, 🎉 celebration)
  - ✅ MediaAssetCard: video rendering with play overlay
  - ✅ 2 video templates: `member_intro` (6s, 9:16) + `member_goal_celebration` (6s, 9:16)
  - ✅ useAssetGeneration: 150-poll async handler (~12.5 min max)
  - ✅ VideoQueuePage: standalone processing queue UI at `/studio/videos` (2026-02-12)
  - ✅ useVideoJobs hook: list/cancel/retry + auto-polling for active jobs
  - ✅ Sidebar: Video Queue in CONTENT section (Panel A + Panel B)
  - ❌ No platform export UI (Instagram/TikTok/YouTube selectors)
- **Status**: ✅ Core video generation + queue UI integrated, ❌ Advanced features pending
- **TODO** (lower priority):
  - [ ] PresetSelector component (quality/platform picker)
  - [ ] PlatformExportOptions (format selectors)
  - [ ] ThumbnailGeneratorModal (frame extraction)
  - [ ] VideoPlayerWithOverlay (preview with logo/watermark)

---

## Search Module

### B20 Global Search ✅
- **Backend**: PostgreSQL full-text search with SearchEntry model
- **Frontend**:
  - ✅ SearchPage component (`/search?q=...`)
  - ✅ useSearch hook (`searchGlobal`, `searchFiltered`)
  - ✅ Grouped results by category (clubs, teams, seasons, competitions, matches, users)
  - ✅ Category filtering (`?types=clubs,teams`)
  - ✅ Pagination for filtered results
  - ✅ Result highlighting
  - ✅ Category icons and labels
- **API Endpoints**:
  - `GET /api/v1/search/?q=query` - Global grouped search
  - `GET /api/v1/search/?q=query&types=clubs` - Filtered paginated search
- **Status**: ✅ Volledig

### B20.1 Hierarchical Search ✅ (NEW)
- **Backend**: Hierarchy resolvers for entity-centric navigation
  - `HierarchyNode` dataclass (id, type, title, url, children)
  - `BaseHierarchyResolver` abstract class
  - Per-entity resolvers registered in `search.hierarchy.registry`
  - Fail-safe error handling (hierarchy failures don't crash search)
  - Configurable limits: `SEARCH_HIERARCHY_MAX_DEPTH=3`, `SEARCH_HIERARCHY_MAX_NODES=100`, `SEARCH_HIERARCHY_PER_LEVEL_LIMIT=5`
- **Frontend**:
  - ❌ Hierarchy tree not yet implemented in SearchPage
  - ❌ No anchor-based navigation UI
- **API Parameters**:
  - `?hierarchy=true` - Include hierarchy tree in response
  - Response includes `anchor` (selected entity) and `tree` (children hierarchy)
- **TODO**:
  - [ ] Add hierarchy toggle button to SearchPage
  - [ ] HierarchyTreeView component (collapsible tree)
  - [ ] Anchor entity highlight in results

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
- **Frontend**:
  - ✅ NotificationsPage (full list with read/unread toggle)
  - ✅ TopNavbar bell badge (unread count + 30s polling)
  - ✅ useNotifications hook: shared CRUD with optimistic updates (2026-02-12)
  - ✅ useUnreadCount hook: lightweight for bell badge (2026-02-12)
  - ✅ Cross-component sync via 'notificationChanged' events
  - ✅ markRead/markUnread/markAllRead/markAllUnread mutations
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

### B35 File Storage ✅
- **Backend**: FileAsset model, canonical path structure
- **Path Structure**:
  - Club: `clubs/{slug}-{id}/{category}/{uuid}/filename.ext`
  - Team: `clubs/{club-slug}-{club-id}/teams/{team-slug}-{team-id}/{category}/{uuid}/filename.ext`
- **Frontend**:
  - ✅ File upload via Kit management (ClubKitsTab)
  - ✅ X-Organization-ID header for org-scoped uploads
  - ✅ path_prefix parameter for category routing
  - ✅ Backend auto-corrects frontend path issues (double-slug, missing UUID)
  - ❌ General file upload component in MediaLibrary
- **Backend Fixes** (2026-02-08):
  - ✅ Double-slug pattern (`ajax-ajax`) → resolved to correct project (`ajax`)
  - ✅ UUID added to all paths → prevents duplicate storage_path conflicts
- **TODO**:
  - [ ] File upload component in MediaLibrary

---

## Generation Modules

### B34 Generative Pipelines ✅ (NEW)
- **Backend**: Asset generation pipeline with Google Gemini
  - `/api/v1/generative/assets/generate/` - Generate variants (images + videos)
  - `/api/v1/generative/assets/generate/{task_id}/status/` - Async video polling
  - `/api/v1/generative/assets/save/` - Save accepted variant
  - 8 prompt templates (6 image + 2 video)
- **Frontend**:
  - ✅ AssetGenerationModal (3-step wizard: template → config → results)
  - ✅ useAssetGeneration hook (submit, variants, acceptVariant, async polling)
  - ✅ Template cards with icons and descriptions
  - ✅ Parameter configuration (sleeves, neck, pose, expression, kit_type)
  - ✅ Variant grid with selection
  - ✅ Feedback/refinement form for iterations
  - ✅ Previous result as reference option
  - ✅ Input key mapping (person→person_photo, reference→reference_photo)
  - ✅ **Video support**: async 202 → task_id polling for video generation
  - ✅ **Video preview**: `<video>` element with playback controls
- **Templates**:
  - `logo_standardize` - Logo naar vierkant formaat
  - `sponsor_standardize` - Sponsor logo standaardiseren
  - `tenue_generate` - Voetbaltenue genereren
  - `keeper_tenue` - Keeperstenue genereren
  - `fullbody_in_tenue` - Speler fullbody in tenue
  - `closeup_in_tenue` - Speler close-up in tenue
  - `member_intro` - 🎬 Short intro video (6s, 9:16, 720p)
  - `member_goal_celebration` - 🎉 Goal celebration video (6s, 9:16, 720p)
- **Integration Points**:
  - ✅ Club Assets tab (AssetsTab level="club")
  - ✅ Member detail page (tenue selector + generation)
  - ✅ Member Assets tab (generated fullbody/closeup per kit type)
  - ✅ **Member Intro tab** (kit × pose video grid)
  - ✅ **Member Celebration tab** (kit × style video grid)
  - ✅ **Batch generation** with video template support
- **B34↔B37 Integration** (2026-02-12):
  - ✅ useContentTypes hook: resolves Django ContentType model→ID (session-cached)
  - ✅ useAssetGeneration: auto-creates WorkflowInstance after asset save
  - ✅ useWorkflowInstances: listens for 'workflowChanged' events for live refresh
  - ✅ Backend: `GET /api/v1/workflows/content-types/` endpoint
- **Status**: ✅ Volledig (images + videos + workflow pipeline)

---

## Priority TODO List (Frontend)

### ~~High Priority~~ ✅ DONE
1. ~~**B55 Video queue UI**~~ ✅ VideoQueuePage at `/studio/videos` (2026-02-12)
2. ~~**B34↔B37 Pipeline connect**~~ ✅ Auto-create WorkflowInstance after save (2026-02-12)

### Medium Priority (Current)
3. **B16 Notification triggers for workflow** — Toast notifications when workflow transitions happen (approve/reject); backend signal → create_notification call
4. **Batch approval actions** — Select multiple items on ApprovalsPage, approve/reject in bulk
5. **BrandProfile editor** — Create/update brand profiles (currently read-only)
6. **FileAsset upload in MediaLibrary** — Upload component in Files tab

### Low Priority
7. **Hierarchical Search UI** — HierarchyTreeView in SearchPage
8. **Platform Export UI** — Instagram/TikTok/YouTube format selectors
9. **PresetSelector** — Quality/platform video preset picker
10. **Task status widget** — Celery queue monitoring dashboard

### Recommended Next Module
**B34 Generative Pipelines — Phase 2 (Core Models & API)** — The backend spec, plan, and data model are complete in `kitty-specs/043-ai-generation-pipeline/`. Ready for implementation: migrations, serializers, ViewSets for GenerationTemplate/Request/Output.

**Option B: B34 ↔ B37 Pipeline Connection** — Wire GenerationRequest completion to auto-create WorkflowInstance. Makes the Approvals page actually useful with real data flowing through. Deeper integration but higher value.

**Option C: B16 Notifications** — Add toast notifications for workflow transitions. Small scope, visible UX improvement: users get notified when their content is approved/rejected.

---

## Recent Completions

### 2026-02-13: Media & AI Studio UX Rebuild
- ✅ **Media Library rebuilt**: Dual-tab view (Brand Assets / Files) replacing empty MediaItems page
  - New hooks: `useBrandAssets`, `useFileAssets`
  - Brand Assets tab: thumbnail grid, category chips (Logos/Kits/Sponsors/Other), search
  - Files tab: file list with type icons, download buttons, size display
- ✅ **Content Library removed**: Route removed from App.tsx, Sidebar updated (was `/content` Library link → now `/medialib` Media Library)
- ✅ **AI Studio rebuilt**: 3-tab functional page replacing placeholder cards
  - New hook: `useGenerationHistory`
  - Templates tab: browse asset + content templates with category filtering
  - History tab: generation history with status badges
  - Quick Actions tab: cards linking to match/member/video/template pages
- ✅ Content section navigation: Library → Media Library, `/studio/create` → `/studio`
- ✅ Zero new backend changes (frontend-only refactor)

### 2026-02-12: B37 Workflow UI Integration
- ✅ 7 new files: useWorkflows hook, 4 Workflow components, ApprovalsPage, WorkflowTemplatesPage
- ✅ Workflow tab added to 3 detail pages (Match, Season, Member)
- ✅ WorkflowStatusBadge integrated into MediaAssetCard (approved/rejected)
- ✅ Routes + Sidebar navigation (Approvals, Workflow Templates)
- ✅ Zero TypeScript errors

### 2026-02-12: B55 Video Frontend Integration + Root Cleanup
- ✅ Video generation integrated in member detail page (intro + celebration)
- ✅ AssetGenerationModal extended with async video polling (202 → task_id → status)
- ✅ BatchGenerationModal supports video templates with "Video" badge
- ✅ Member detail: Short Intro tab (kit × pose grid with video preview)
- ✅ Member detail: Celebration tab (kit × style grid with video preview)
- ✅ MemberMediaMatrix tracks video slots (🎬 intro, 🎉 celebration)
- ✅ 2 video constants: member_intro (6s, 9:16, 720p), member_goal_celebration (6s, 9:16, 720p)
- ✅ Metadata storage in membership.metadata.teamreel_assets.videos
- ✅ Root cleanup: 54 files archived (30 scripts, 10 SQL, 5 images, 3 data, 6 docs)
- ✅ State documents updated

### 2026-02-09: AI Generation Integration Complete
- ✅ AssetGenerationModal with 3-step wizard (template selection → configuration → results)
- ✅ 6 generation templates (logo, sponsor, tenue, keeper, fullbody_in_tenue, closeup_in_tenue)
- ✅ useAssetGeneration hook with submit, variants, acceptVariant flow
- ✅ Member detail page with tenue selector grid (home, away, third, goalkeeper, training)
- ✅ Member Assets tab with CRUD for generated fullbody/closeup per kit type
- ✅ Input key mapping fix (person→person_photo, reference→reference_photo)
- ✅ Prompt engineering for exact kit reproduction from reference images
- ✅ SavedAssetInfo callback with storagePath for membership metadata updates
- ✅ Delete functionality for member generated assets
- ✅ Multiple variants (1-4) with visual selection
- ✅ Feedback/refinement form for iteration (colors, pattern, logo, collar)
- ✅ Previous result as reference option for improvements

### 2026-02-08: File Upload Path Fix
- ✅ Fixed canonical storage path structure for clubs and teams
- ✅ Backend intercepts legacy frontend paths (`logos/`, `clubs/`, `teams/`)
- ✅ Resolves project by ID or slug, rewrites to canonical path
- ✅ Added double-slug rescue logic (`ajax-ajax` → `ajax`)
- ✅ Added UUID to all project paths to prevent IntegrityError on duplicate filenames
- ✅ Cleaned up legacy S3 folders (`clubs/ajax-ajax/`, root team folders)

### 2026-02-07: Kit Upload & Identity UI Cleanup
- ✅ Kit asset types added to BrandAsset model (home, away, third, goalkeeper, coach, assistant, training)
- ✅ Kits tab added to Club detail page (Panel B sidebar with Scissors icon)
- ✅ Full kit upload flow: FileAsset creation → BrandAsset linking
- ✅ Replace existing kit functionality (PATCH existing BrandAsset)
- ✅ Upload progress indicator per kit type
- ✅ Removed URL displays from club logo and member photo sections
- ✅ Simple status indicators: "✓ Logo configured" / "No logo configured"
- ✅ Fixed brandProfileId loading for Kits tab (was only loading for Identity tab)

### 2026-02-06: SoccerWiki Data Import
- ✅ Eredivisie club logos imported to S3 (`logos/clubs/{club_id}.png`)
- ✅ Player photos imported to S3 (`players/{soccerwiki_id}.png`)
- ✅ User avatar_url updated with S3 photo URLs
- ✅ Brand logo display fixed (profile DETAIL endpoint, not LIST)

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
| `/api/v1/search/?q=...` | useSearch (searchGlobal) | ✅ |
| `/api/v1/search/?q=...&types=...` | useSearch (searchFiltered) | ✅ |
| `/api/v1/search/?hierarchy=true` | - | ❌ Not in frontend |
| `/api/v1/settings/feature-flags/` | FeatureFlagsPage | ✅ |
| `/api/v1/settings/feature-flags/resolve-all/` | ContentAvailabilityCard, MatchDetailPage | ✅ |
| `/api/v1/content-generation/templates/` | ContentTemplatesPage | ✅ |
| `/api/v1/media/items/` | useMediaLibrary (preserved) | ✅ |
| `/api/v1/media/tags/` | useMasterData (mediaTagsByCategory) | ✅ |
| `/api/v1/branding/profiles/{id}/assets/` | useBrandAssets (MediaLibrary) | ✅ |
| `/api/v1/generative/assets/templates/` | useGenerationHistory (AI Studio) | ✅ |
| `/api/v1/generative/assets/history/` | useGenerationHistory (AI Studio) | ✅ |
| `/api/v1/branding/profiles/` | BrandProfileCard | ✅ |
| `/api/v1/branding/tokens/` | - | ❌ Niet aangeroepen |
| `/api/v1/sport-configuration/sports/` | useSports | ✅ |
| `/api/v1/sport-configuration/formations/` | useSports | ✅ |
| `/api/v1/files/` | ClubKitsTab (kit upload) | ✅ |
| `/api/v1/generative/assets/generate/` | useAssetGeneration | ✅ |
| `/api/v1/generative/assets/generate/{id}/status/` | useAssetGeneration (video polling) | ✅ |
| `/api/v1/generative/assets/save/` | useAssetGeneration | ✅ |
| `/api/v1/video/jobs/` | - | ❌ Not in frontend |
| `/api/v1/video/presets/` | - | ❌ Not in frontend |
| `/api/v1/video/platforms/` | - | ❌ Not in frontend |
| `/api/v1/video/overlays/` | - | ❌ Not in frontend |
| `/api/v1/workflows/templates/` | - | ❌ Not in frontend |
| `/api/v1/workflows/instances/` | - | ❌ Not in frontend |
| `/api/v1/workflows/instances/{id}/execute/` | - | ❌ Not in frontend |
| `/api/v1/workflows/history/` | - | ❌ Not in frontend |
| `/api/v1/workflows/permissions/` | - | ❌ Not in frontend |
