# Demo DB Status Report - TeamReel Rebuild

**Date:** 2026-01-07
**Environment:** Production (Railway)
**Scenario:** TeamReel Football Demo (KNVB Hierarchy)

This document tracks the hierarchical population of the TeamReel demo database.

## TeamReel Data Strategy

**Hierarchy (8 Levels):**
1. ✅ Users (foundation)
2. ✅ Organisations (5 European federations)
3. ⏳ Clubs (Projects with parent_project=NULL)
4. ⏳ Teams (Projects with parent_project=Club)
5. ⏳ Seasons (Periods with parent=NULL)
6. ⏳ Competitions (Periods with parent=Season)
7. ⏳ Players (ProjectMemberships with period=Season)
8. ⏳ Matches (Activities with opponent_project=Team)

## Coverage Overview

| Model | Rows | Status | Last Updated | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **LEVEL 1: Foundation** |
| `accounts.User` | 1 | ⚠️ THIN | 2026-01-07 11:52 | Admin user only |
| **LEVEL 2: Organisations** |
| `organisations.Organisation` | 5 | ✅ READY | 2026-01-07 11:53 | KNVB, DFB, RBFA, The FA, FIGC |
| `organisations.Membership` | 0 | ❌ EMPTY | - | Pending Level 2b |
| **LEVEL 3: Clubs** |
| `projects.Project` | 0 | ❌ EMPTY | - | Need: Ajax, PSV, Feyenoord (parent_project=NULL) |
| **LEVEL 4: Teams** |
| (Same table) | - | ❌ EMPTY | - | Need: Teams with parent_project=Club |
| **LEVEL 5: Seasons** |
| `activities.Period` | 0 | ❌ EMPTY | - | Need: 2024/2025 (parent=NULL) |
| **LEVEL 6: Competitions** |
| (Same table) | - | ❌ EMPTY | - | Need: Eredivisie, KNVB Beker (parent=Season) |
| **LEVEL 7: Players** |
| `projects.ProjectMembership` | 0 | ❌ EMPTY | - | Need: Memberships with period=Season |
| **LEVEL 8: Matches** |
| `activities.Activity` | 0 | ❌ EMPTY | - | Need: Matches with opponent_project=Team |
| `activities.Participation` | 0 | ❌ EMPTY | - | Player participation in matches |
| **Supporting Tables** |
| `permissions.Permission` | 0 | ❌ EMPTY | - | RBAC permissions |
| `permissions.Role` | 0 | ❌ EMPTY | - | Role definitions |
| `permissions.RoleAssignment` | 0 | ❌ EMPTY | - | User-role mappings |
| `audit.AuditEvent` | 0 | ❌ EMPTY | - | Audit logging |
| `settings.FeatureFlag` | 0 | ❌ EMPTY | - | Feature flags |
| `transactions.UsageEvent` | 0 | ❌ EMPTY | - | Usage tracking |
| `transactions.Transaction` | 0 | ❌ EMPTY | - | Credit transactions |
| `credits.CreditsBalance` | 0 | ❌ EMPTY | - | Credit balances |
| `notifications.Notification` | 0 | ❌ EMPTY | - | Notification queue |
| `notifications.NotificationType` | 0 | ❌ EMPTY | - | Notification types |
| `notifications.RetryPolicy` | 0 | ❌ EMPTY | - | Retry policies |
| `contextual_notifications.RoutingRule` | 0 | ❌ EMPTY | - | Routing rules |
| **System Tables (Auto-populated)** |
| `auth.Permission` | 164 | ✅ OK | - | Django permissions |
| `contenttypes.ContentType` | 41 | ✅ OK | - | Content types |
| `observability.SystemMetric` | 4 | ✅ OK | - | System metrics |
| **Runtime Tables (Empty-OK)** |
| `token_blacklist.OutstandingToken` | 0 | EMPTY-OK | - | |
| `token_blacklist.BlacklistedToken` | 0 | EMPTY-OK | - | |
| `rtc_websockets.WebSocketConnection` | 0 | EMPTY-OK | - | |
| `rtc_websockets.RealtimeMessage` | 0 | EMPTY-OK | - | |
| `rtc_websockets.PresenceStatus` | 0 | EMPTY-OK | - | |
| `rtc_websockets.ActivityEvent` | 0 | EMPTY-OK | - | |
| `contextual_notifications.NotificationPreference` | 0 | EMPTY-OK | - | |
| `contextual_notifications.OrganisationNotificationPolicy` | 0 | EMPTY-OK | - | |
| `notifications.DeliveryAttempt` | 0 | EMPTY-OK | - | |
| `transactions.BalancePolicy` | 0 | EMPTY-OK | - | |
| `files.FileAsset` | 0 | EMPTY-OK | - | |
| `settings.Setting` | 0 | EMPTY-OK | - | |
| `admin.LogEntry` | 0 | EMPTY-OK | - | |
| `auth.Group` | 0 | EMPTY-OK | - | |
| `sessions.Session` | 0 | EMPTY-OK | - | |
| `search.SearchEntry` | 0 | EMPTY-OK | - | |
| `projects.ProjectInvite` | 0 | EMPTY-OK | - | |
| `projects.ProjectMembershipPromotion` | 0 | EMPTY-OK | - | |

## Progress Summary

**Database Fill:** 12.2% (215 total records)
**Seeded Levels:** 2/8 complete

### Completed ✅
- **Level 1:** Users (1 admin)
- **Level 2:** Organisations (5 federations: KNVB, DFB, RBFA, The FA, FIGC)

### Next Steps ⏳
- **Level 3:** Clubs - Create root Projects (Ajax, PSV, Feyenoord) with parent_project=NULL
- **Level 4:** Teams - Create child Projects with parent_project=Club
- **Level 5:** Seasons - Create root Periods (2024/2025) with parent=NULL
- **Level 6:** Competitions - Create child Periods (Eredivisie, KNVB Beker) with parent=Season
- **Level 7:** Players - Create ProjectMemberships with period=Season
- **Level 8:** Matches - Create Activities with opponent_project=Team

## Commands Used

```bash
# Level 1: Users
python manage.py seed_admin_user

# Level 2: Organisations
python manage.py seed_level_2_organisations

# Audit
python manage.py audit_production_db
```
