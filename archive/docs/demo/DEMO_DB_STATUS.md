# Demo DB Status Report

**Date:** 2026-01-02
**Environment:** Production (Railway)

This document tracks the population status of all application tables to ensure the demo environment is fully ready for testing.

## Coverage Overview

| Model | Rows | Status | Last Updated | Reason |
| :--- | :--- | :--- | :--- | :--- |
| `accounts.User` | 281 | **READY** | 2025-12-31 11:12 | |
| `token_blacklist.OutstandingToken` | 0 | EMPTY-OK | - | |
| `token_blacklist.BlacklistedToken` | 0 | EMPTY-OK | - | |
| `rtc_websockets.WebSocketConnection` | 0 | EMPTY-OK | - | |
| `rtc_websockets.RealtimeMessage` | 0 | EMPTY-OK | - | |
| `rtc_websockets.PresenceStatus` | 0 | EMPTY-OK | - | |
| `rtc_websockets.ActivityEvent` | 0 | EMPTY-OK | - | |
| `organisations.Organisation` | 6 | **READY** | 2026-01-01 12:54 | |
| `organisations.Membership` | 281 | **READY** | - | |
| `projects.Project` | 25 | **READY** | 2025-12-31 14:27 | |
| `permissions.Permission` | 24 | **READY** | 2025-12-30 21:37 | |
| `permissions.Role` | 7 | **READY** | 2025-12-30 21:37 | |
| `permissions.RoleAssignment` | 555 | **READY** | - | |
| `audit.AuditEvent` | 2156 | **READY** | 2026-01-02 16:15 | |
| settings.FeatureFlag | 2 | **READY** | 2026-01-02 16:41 | |
| settings.Setting | 0 | EMPTY-OK | - | |
| transactions.UsageEvent | 300 | **READY** | 2026-01-02 16:49 | |
| `transactions.Transaction` | 77 | **READY** | 2026-01-01 11:59 | |
| `transactions.BalancePolicy` | 0 | EMPTY-OK | - | |
| `credits.CreditsBalance` | 5 | **READY** | 2026-01-01 11:59 | |
| `notifications.DeliveryAttempt` | 0 | EMPTY-OK | - | |
| `notifications.Notification` | 2060 | **READY** | 2025-12-31 17:09 | |
| `notifications.NotificationType` | 2 | **READY** | 2025-12-31 17:09 | |
| `notifications.RetryPolicy` | 3 | **READY** | 2025-12-31 17:09 | |
| `contextual_notifications.NotificationPreference` | 0 | EMPTY-OK | - | |
| `contextual_notifications.OrganisationNotificationPolicy` | 0 | EMPTY-OK | - | |
| `contextual_notifications.RoutingRule` | 8 | **READY** | 2025-12-30 21:35 | |
| `files.FileAsset` | 0 | EMPTY-OK | - | |

## Action Items

Use this list to track which tables need additional data for specific test scenarios.

- [ ] **Table Name**: [Instructions]
