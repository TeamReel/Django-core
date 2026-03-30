# API Reference

> Last updated: 2026-03-21

## Overview

TeamReel exposes a REST API at `/api/v1/` authenticated via JWT. **~130 unique routes** across **30+ Django apps**, mostly using DRF ViewSets with DefaultRouter.

**Base URL:** `https://api.teamreel.app/api/v1/`
**Auth:** JWT Bearer token (`Authorization: Bearer <access_token>`)

---

## Endpoints by App

| App | Endpoints | Type | Key Resources |
|-----|-----------|------|---------------|
| **accounts.api** | 21 | Path views | register, login, logout, verify, profile, avatar, admin user mgmt |
| **generative** | 12 | Router + Custom | GenerationTemplate, GenerationRequest, GenerationOutput, asset gen, job queue |
| **organisations.api** | 7 | Router + Nested | Organisation, Membership, Project (nested) |
| **transactions.api** | 7 | Router + Custom | UsageEvent, Transaction, BalancePolicy, org/user/project balance |
| **observability** | 6 | Path views | metrics, health check, cache |
| **accounts** | 6 | Path views | register, login, logout (template-based) |
| **api.v1** | 5+ | Aggregator | JWT token endpoints, domain includes |
| **branding** | 5 | Router + Custom | BrandProfile, DesignToken, BrandAsset, AppBackground, TokenResolution |
| **workflows** | 5 | Router + Custom | WorkflowTemplate, WorkflowInstance, PermissionOverride, TransitionHistory |
| **projects.api** | 5 | Router + Nested | Project, ProjectMembership, FunctionalRole, Invite, Promotion |
| **activities** | 4 | Router | Period, Activity, Participation, ActivityEvent |
| **sport_configuration** | 4 | Router | Sport, OutfitConfiguration, Formation, Validation |
| **contextual_notifications** | 4 | Router + Custom | RoutingDecisionLog, RoutingRule, NotificationPreference, OrgPolicy |
| **notifications** | 3 | Router + Custom | Notification, UserNotification, health check |
| **content_generation** | 3 | Router | ContentTemplate, ContentItem, ContentApproval |
| **video** | 3 | Router | VideoJob, VideoPreset, PlatformExport |
| **medialib** | 3 | Router | MediaItem, MediaTag, Collection |
| **i18n_preferences** | 3 | Path views | UserPreference, EffectivePreference, OrgPreference |
| **tasks** | 3 | Path views | health, debug, list |
| **credits** | 3 | Path views | org credits, user credits, project credits |
| **permissions.api** | 3 | Router + Custom | Role, RoleAssignment, CurrentPermissions |
| **navigation** | 2 | Router | Recent, Favorite |
| **settings** | 2 | Router | FeatureFlag, Setting |
| **trash.api** | 1 | Router | TrashViewSet (soft-delete recovery) |
| **files** | 1 | Router | FileViewSet (S3 upload/download) |
| **audit** | 1 | Router | AuditEventViewSet |
| **search** | 1 | Path view | SearchAPIView (full-text) |
| **activity_feed.api** | 1 | Router | ActivityFeedViewSet |
| **security_baseline** | 1 | Path view | SecurityEventsView |
| **rtc_websockets** | 1 | Path view | WebSocket token |

---

## Authentication Flow

```
POST /api/v1/auth/token/          → { access, refresh }
POST /api/v1/auth/token/refresh/  → { access }
GET  /api/v1/auth/me/             → current user + permissions
```

## Common Patterns

- **Org-scoped querysets**: All ViewSets filter by `request.user`'s organisation(s)
- **Pagination**: `?page=1&page_size=20` (PageNumberPagination)
- **Filtering**: DjangoFilterBackend on most ViewSets
- **Ordering**: `?ordering=-created_at` (OrderingFilter)
- **Search**: `?search=query` on searchable fields

## Permission Classes

All ViewSets require at minimum `IsAuthenticated`. Resource-specific endpoints add:
- `IsProjectMember` — project hierarchy-aware membership check
- `IsOrganisationMember` — org-level access
- Workflow engine checks for state transitions (approve/reject)

See [../security/permission-layers.md](../security/permission-layers.md) for the 3-layer permission chain.

---

## Gerelateerde docs

- [architecture.md](../architecture/overview.md) — Full system architecture
- [../security/permission-layers.md](../security/permission-layers.md) — Permission chain
- [data-model.md](../architecture/data-model.md) — Database schema
