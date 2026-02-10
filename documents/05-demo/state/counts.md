# Database Model Counts

> Last updated: 2026-02-10 (B37 Workflow Engine Integration)

**Database**: postgresql (switchback.proxy.rlwy.net)

## Summary

| Category | Count | Change |
|----------|-------|--------|
| Organisations | 8 | - |
| Projects | 325 | - |
| Users | 2,781 | - |
| Project Memberships | 3,773 | - |
| Org Memberships | 2,284 | - |
| Sports | 15 | - |
| Formations | 6 | - |
| ContentTemplates | 320 | - |
| MediaTags | 78 | - |
| BrandProfiles | 102 | - |
| DesignTokens | 645 | - |
| BrandAssets | 71 | - |
| FileAssets | 66 | - |
| FeatureFlags | 44 | - |
| WorkflowTemplates | 3 | - |
| WorkflowInstances | 0 | - |
| TransitionHistory | 0 | - |
| VideoJobs | 0 | + NEW |
| VideoPresets | 0 | + NEW |
| PlatformExports | 0 | + NEW |
| VideoOverlays | 0 | + NEW |

## 🎯 Current Status: B55 Video Processing Pipeline Merged ✅

**Latest Merge (2026-02-10)**:
- ✅ B55 Video Processing Pipeline merged to main (60+ commits)
- ✅ FFmpeg-based async video transcoding, thumbnails, composition
- ✅ 76 tests passing (73-97% coverage per module)
- ✅ 4 new models: VideoJob, VideoPreset, PlatformExport, VideoOverlay
- ✅ 8 REST API endpoints (jobs, presets, platforms, overlays)
- ✅ Tiered Celery queues (video_fast, video_slow)
- ✅ Platform-specific exports (Instagram, TikTok, YouTube, Twitter)
- ✅ B37 Workflow integration (optional approval flows)
- ✅ Complete documentation (README, quickstart, manual tests)

**Previous Merges**:
- ✅ B37 Workflow Engine & State Machine (87 commits, 210 tests)
- ✅ AI Asset Generation Modal with 3-step wizard
- ✅ 6 generation templates (logo, sponsor, tenue, keeper, fullbody, closeup)

**Next**: B55 Frontend Integration (Video Upload & Processing UI)

## Project Hierarchy

| Level | Count | Description |
|-------|-------|-------------|
| Clubs (root) | 98 | Parent projects (Ajax, PSV, etc.) |
| Teams (child) | 227 | Child projects (Ajax 1, Ajax U21, etc.) |

## Period Hierarchy

| Level | Count | Description |
|-------|-------|-------------|
| Seasons | 108 | Root periods (2024/2025, 2023/2024) |
| Competitions | 571 | Child periods (League, Cup, etc.) |

## Feature Flags (B10)

44 GLOBAL content availability flags synced from templates:

| template_type | Type Flag | Subtype Flags | Style Flags |
|---------------|-----------|---------------|-------------|
| during_match | 1 | 3 (goal, end_score, score_update) | 7 |
| pre_match | 1 | 4 (lineup, flyer, walkon, anthem) | 0 |
| post_match | 1 | 2 (highlights, match_summary) | 0 |
| member | 1 | 7 (profile_photo, legacy_photo, closeup, intro, in_tenue, lineup, flyer) | 0 |
| season | 1 | 2 (season_recap, transformation) | 0 |
| **Total** | **5** | **18** | **7** |

**Hierarchy**: GLOBAL → ORGANISATION → PROJECT (each level can disable, lower levels inherit)

## Content Generation (B31)

| template_type | Count |
|---------------|-------|
| member | 196 |
| during_match | 73 |
| pre_match | 42 |
| post_match | 6 |
| season | 3 |
| **Total** | **320** |

## MediaTags (B22)

78 system tags seeded across 12 logical categories:
- content_context (5): member, season, pre-match, during-match, post-match
- subject (6): team, player, goalkeeper, coach, assistant, staff
- moment (21): lineup, flyer, walkon, anthem, goal, score-update, end-score, substitution, yellow-card, red-card, injury, highlights, match-summary, intro, celebration, in-tenue, closeup, profile-photo, legacy-photo, season-recap, transformation
- status (4): raw, edited, approved, published
- media_type (2): image, video
- orientation (5): portrait, landscape, square, story, reel
- style (5): classic, modern, minimal, bold, retro
- sport (6): football, basketball, handball, hockey, rugby, volleyball
- sport_variant (9): football-11v11, football-7v7, futsal-5v5, basketball-5v5, field-hockey, ice-hockey, handball-indoor, volleyball-indoor, rugby-union
- formation (6): 4-3-3, 4-4-2, 3-5-2, 4-2-3-1, 2-3-1, 3-2-1
- competition (4): league, cup, friendly, tournament
- platform (4): instagram, tiktok, youtube, website

## All Models

| App | Model | Count | Status |
|-----|-------|-------|--------|
| organisations | Organisation | 8 | 🟢 OK |
| organisations | Membership | 2,284 | 🟢 OK |
| projects | Project | 325 | 🟢 OK |
| projects | ProjectMembership | 3,773 | 🟢 OK |
| projects | ProjectInvite | 0 | 🔴 EMPTY |
| projects | ProjectMembershipPromotion | 11 | 🟢 OK |
| projects | ProjectFunctionalRoleAssignment | 3 | 🟢 OK |
| activities | Period | 679 | 🟢 OK |
| activities | Activity | 865 | 🟢 OK |
| activities | Participation | 1,409 | 🟢 OK |
| activities | ActivityEvent | 201 | 🟢 OK |
| accounts | User | 2,781 | 🟢 OK |
| accounts | UserActiveContext | 3 | 🟢 OK |
| permissions | Permission | 23 | 🟢 OK |
| permissions | Role | 5 | 🟢 OK |
| permissions | RoleAssignment | 1,546 | 🟢 OK |
| content_generation | ContentTemplate | 320 | 🟢 OK |
| content_generation | ContentItem | 0 | 🔴 EMPTY |
| content_generation | ContentApproval | 0 | 🔴 EMPTY |
| medialib | MediaItem | 0 | 🔴 EMPTY |
| medialib | MediaTag | 78 | 🟢 OK |
| medialib | Collection | 0 | 🔴 EMPTY |
| medialib | CollectionMembership | 0 | 🔴 EMPTY |
| medialib | MediaItemRelation | 0 | 🔴 EMPTY |
| medialib | MediaThumbnail | 0 | 🔴 EMPTY |
| **files** | **FileAsset** | **66** | **🟢 NEW** |
| branding | BrandProfile | 102 | 🟢 OK |
| branding | DesignToken | 645 | 🟢 OK |
| **branding** | **BrandAsset** | **71** | **🟢 NEW** |
| credits | CreditsBalance | 1 | 🟡 THIN |
| credits | ProjectCreditsBalance | 94 | 🟢 OK |
| credits | UserCreditsBalance | 3 | 🟢 OK |
| transactions | UsageEvent | 43 | 🟢 OK |
| transactions | Transaction | 74 | 🟢 OK |
| transactions | BalancePolicy | 8 | 🟢 OK |
| settings | FeatureFlag | 331 | 🟢 OK |
| settings | Setting | 1 | 🟡 THIN |
| sport_configuration | Sport | 15 | 🟢 OK |
| sport_configuration | SportConfiguration | 9 | 🟢 OK |
| sport_configuration | Formation | 6 | 🟢 OK |
| sport_configuration | OutfitConfiguration | 9 | 🟢 OK |
| notifications | DeliveryAttempt | 0 | 🔴 EMPTY |
| notifications | Notification | 25,401 | 🟢 OK |
| notifications | NotificationType | 2 | 🟡 THIN |
| notifications | RetryPolicy | 1 | 🟡 THIN |
| contextual_notifications | NotificationPreference | 3 | 🟢 OK |
| contextual_notifications | OrganisationNotificationPolicy | 8 | 🟢 OK |
| contextual_notifications | RoutingRule | 8 | 🟢 OK |
| audit | AuditEvent | 6,156 | 🟢 OK |
| navigation | UserRecent | 0 | 🔴 EMPTY |
| navigation | UserFavorite | 0 | 🔴 EMPTY |
| generative | GenerationTemplate | - | ⚪ NOT MIGRATED |
| generative | GenerationRequest | - | ⚪ NOT MIGRATED |
| generative | GenerationOutput | - | ⚪ NOT MIGRATED |
| workflows | WorkflowTemplate | 3 | 🟢 OK |
| workflows | WorkflowInstance | 0 | 🔴 EMPTY |
| workflows | TransitionHistory | 0 | 🔴 EMPTY |
| workflows | ProjectPermissionOverride | 0 | 🔴 EMPTY |
| **video** | **VideoJob** | **0** | **🔴 NEW** |
| **video** | **VideoPreset** | **0** | **🔴 NEW** |
| **video** | **PlatformExport** | **0** | **🔴 NEW** |
| **video** | **VideoOverlay** | **0** | **🔴 NEW** |

**Legend**: 🟢 OK (3+) | 🟡 THIN (1-2) | 🔴 EMPTY (0) | ⚪ NOT MIGRATED
