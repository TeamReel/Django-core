# Production Database Audit Report

**Date:** 2026-01-06 19:57:20
**Environment:** Local Development
**Database Host:** switchback.proxy.rlwy.net

## Summary
- **Total Models Scanned:** 41
- **Empty Models:** 9
- **Largest Tables:**
  - `audit.AuditEvent`: 4785
  - `observability.SystemMetric`: 4064
  - `activities.Participation`: 2125
  - `notifications.Notification`: 2060
  - `permissions.RoleAssignment`: 555

## Detailed Audit

| Model | Table | Count | Status | Demo Impact |
| :--- | :--- | :--- | :--- | :--- |
| **accounts.User** | `accounts_user` | 281 | ✅ OK | Login, Team Members list |
| **activities.Activity** | `activities_activity` | 425 | ✅ OK | General data availability |
| **activities.Participation** | `activities_participation` | 2125 | ✅ OK | General data availability |
| **activities.Period** | `activities_period` | 18 | ✅ OK | General data availability |
| **admin.LogEntry** | `django_admin_log` | 0 | ❌ EMPTY | General data availability |
| **audit.AuditEvent** | `audit_events` | 4785 | ✅ OK | General data availability |
| **auth.Group** | `auth_group` | 3 | ⚠️ THIN | General data availability |
| **auth.Permission** | `auth_permission` | 164 | ✅ OK | General data availability |
| **contenttypes.ContentType** | `django_content_type` | 41 | ✅ OK | General data availability |
| **contextual_notifications.NotificationPreference** | `contextual_notifications_notificationpreference` | 84 | ✅ OK | General data availability |
| **contextual_notifications.OrganisationNotificationPolicy** | `contextual_notifications_organisationnotificationpolicy` | 6 | ✅ OK | General data availability |
| **contextual_notifications.RoutingRule** | `contextual_notifications_routingrule` | 8 | ✅ OK | General data availability |
| **credits.CreditsBalance** | `credits_creditsbalance` | 5 | ✅ OK | General data availability |
| **files.FileAsset** | `files_fileasset` | 23 | ✅ OK | General data availability |
| **notifications.DeliveryAttempt** | `notifications_delivery_attempt` | 0 | ❌ EMPTY | General data availability |
| **notifications.Notification** | `notifications_notification` | 2060 | ✅ OK | Notification bell/list (B16) |
| **notifications.NotificationType** | `notifications_notification_type` | 2 | ⚠️ THIN | General data availability |
| **notifications.RetryPolicy** | `notifications_retry_policy` | 3 | ⚠️ THIN | General data availability |
| **observability.SystemMetric** | `observability_systemmetric` | 4064 | ✅ OK | General data availability |
| **organisations.Membership** | `organisations_membership` | 281 | ✅ OK | User access to Orgs |
| **organisations.Organisation** | `organisations_organisation` | 6 | ✅ OK | Dashboard context, Org switcher (B06) |
| **permissions.Permission** | `permissions_permission` | 24 | ✅ OK | Granular access control |
| **permissions.Role** | `permissions_role` | 7 | ✅ OK | RBAC enforcement (B08) |
| **permissions.RoleAssignment** | `permissions_roleassignment` | 555 | ✅ OK | General data availability |
| **projects.Project** | `projects_project` | 25 | ✅ OK | Projects list, Task grouping (B07) |
| **projects.ProjectInvite** | `projects_invite` | 25 | ✅ OK | General data availability |
| **projects.ProjectMembership** | `projects_membership` | 125 | ✅ OK | General data availability |
| **projects.ProjectMembershipPromotion** | `projects_promotion` | 0 | ❌ EMPTY | General data availability |
| **rtc_websockets.ActivityEvent** | `realtime_activity_event` | 0 | ❌ EMPTY | General data availability |
| **rtc_websockets.PresenceStatus** | `realtime_presence_status` | 0 | ❌ EMPTY | General data availability |
| **rtc_websockets.RealtimeMessage** | `realtime_message` | 0 | ❌ EMPTY | General data availability |
| **rtc_websockets.WebSocketConnection** | `realtime_websocket_connection` | 0 | ❌ EMPTY | General data availability |
| **search.SearchEntry** | `search_searchentry` | 312 | ✅ OK | General data availability |
| **sessions.Session** | `django_session` | 39 | ✅ OK | General data availability |
| **settings.FeatureFlag** | `settings_feature_flag` | 2 | ⚠️ THIN | Feature toggles (B10) |
| **settings.Setting** | `settings_setting` | 15 | ✅ OK | General data availability |
| **token_blacklist.BlacklistedToken** | `token_blacklist_blacklistedtoken` | 0 | ❌ EMPTY | General data availability |
| **token_blacklist.OutstandingToken** | `token_blacklist_outstandingtoken` | 0 | ❌ EMPTY | General data availability |
| **transactions.BalancePolicy** | `transactions_balancepolicy` | 6 | ✅ OK | General data availability |
| **transactions.Transaction** | `transactions_transaction` | 77 | ✅ OK | Billing/Usage history |
| **transactions.UsageEvent** | `transactions_usageevent` | 300 | ✅ OK | General data availability |

## Seeding Priorities
Based on 'EMPTY' status and Demo Impact:

1. **admin.LogEntry**: General data availability
2. **notifications.DeliveryAttempt**: General data availability
3. **projects.ProjectMembershipPromotion**: General data availability
4. **rtc_websockets.ActivityEvent**: General data availability
5. **rtc_websockets.PresenceStatus**: General data availability
6. **rtc_websockets.RealtimeMessage**: General data availability
7. **rtc_websockets.WebSocketConnection**: General data availability
8. **token_blacklist.BlacklistedToken**: General data availability
9. **token_blacklist.OutstandingToken**: General data availability
