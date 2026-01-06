# Demo Data Status Dashboard

**Last Updated:** 2026-01-05
**Source:** `production-db-audit.md`, `seed_memberships.py`, `seed_files.py`, `seed_settings.py`

## 🟢 Ready for Demo

These modules have sufficient data to show meaningful UI states.

| Module | Status | Notes |
| :--- | :--- | :--- |
| **B05 Auth** | ✅ **Rich** | 280+ Users, active sessions. |
| **B06 Organisations** | ✅ **Ready** | 6 Orgs, full membership coverage. |
| **B07 Projects** | ✅ **Ready** | 25 Projects, **125 Memberships** (Fixed via seeding). |
| **B09 Audit Log** | ✅ **Rich** | 2,200+ events recorded. |
| **B10 Settings** | ✅ **Ready** | **15 Settings** (i18n.preferences) seeded. |
| **B16 Notifications** | ✅ **Rich** | 2,000+ notifications. |
| **B18 Observability** | ✅ **Rich** | 4,000+ metrics points. |
| **B22 Files** | ✅ **Ready** | **23 File Assets** (Metadata seeded). |

## 🔴 Needs Seeding (Empty/Broken)

These areas will show "Empty State" screens or might behave unexpectedly.

| Module | Missing Data | Impact |
| :--- | :--- | :--- |
| **B15 Tasks** | `Task` (N/A) | *Not scanned in audit, but UI is missing anyway.* |

## 📉 Seeding Priorities

1.  **Tasks:** (Future) Implement UI and seed tasks.

## 📜 Recent Actions
- **2026-01-05:** Seeded 15 `Setting` records for `i18n.preferences` (Org & User scope).
- **2026-01-05:** Seeded 23 `FileAsset` records (metadata only) across 5 organisations.
- **2026-01-05:** Seeded 125 `ProjectMembership` records linking 25 existing users to all 25 projects. No new users were created.
