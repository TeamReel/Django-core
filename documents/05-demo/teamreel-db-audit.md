# TeamReel Production Database Audit

**Last Updated:** 2026-01-09 10:58
**Environment:** Railway PostgreSQL Production
**Database Host:** switchback.proxy.rlwy.net:17304
**Database Name:** railway
**Purpose:** Comprehensive model-by-model analysis with changelog and health metrics
**Related Docs:**
- [TeamReel Current Database State](teamreel-current-db-state.md) - Quick reference statistics
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Architecture & Design Decisions
- [TeamReel Frontend Integration Audit](teamreel-frontend-integration-audit.md) - Backend-to-frontend mapping
- [index.md](index.md) - Documentation overview

---

## � How to Regenerate This Report

This comprehensive audit can be regenerated to reflect the current production database state.

### Using Django Management Command
```powershell
# Connect to Railway production database
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python manage.py audit_production_db > documents/05-demo/teamreel-db-audit-temp.md
```

### One-command Markdown Update (Recommended)

This will run the audit and update this file’s counts in-place:

```powershell
$env:DATABASE_URL="postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
python scripts/update_teamreel_db_audit.py
```

**Command:** `python manage.py audit_production_db`
**Source:** `src/organisations/management/commands/audit_production_db.py`
**Output:** Console output (redirect to file)
**Duration:** ~10-15 seconds

**Features:**
- ✅ Scans all 41 Django models
- ✅ Counts records per model
- ✅ Calculates database fill percentage
- ✅ Identifies empty vs populated tables
- ✅ Groups by app (accounts, organisations, projects, activities, etc.)

### Manual Update Process
1. Run the audit command and capture output
2. Review the generated statistics
3. Manually update this document with:
   - Updated record counts
   - New changelog entry with timestamp
   - Revised executive summary metrics
   - Any new observations or patterns

### When to Regenerate
- ✅ After major seeding operations (players, matches)
- ✅ Monthly for trend analysis
- ✅ Before/after database migrations
- ✅ When investigating data inconsistencies

---

## �📊 Executive Summary

- **Total Models Scanned:** 41
- **Empty Models:** 25
- **Total Records:** 14,927
- **Database Fill:** 39.0%
- **TeamReel Progress:** Core hierarchy present; supporting systems (billing/notifications/settings) still empty

> **Note on “Database Fill”**: This is the % of models that are **non-empty** (16/41 = 39.0%), not the % of “realism” or total rows.

---

## ✅ Seeding Progress

### Completed Levels

This section reflects the **current audit counts** (not historical claims). Detailed breakdown by federation/season is tracked elsewhere.

1. **Users** - 2,765 (`accounts_user`)
2. **Organisations** - 5 (`organisations_organisation`) *(THIN)*
3. **Projects (Clubs/Teams)** - 312 (`projects_project`)
4. **Periods (Seasons/Competitions)** - 675 (`activities_period`)
5. **Activities (Matches/Events)** - 852 (`activities_activity`)
6. **Project Memberships (Players/Staff)** - 2,353 (`projects_membership`)
7. **RBAC Roles/Assignments** - 5 roles, 1,546 assignments (`permissions_role`, `permissions_roleassignment`)

## Detailed Table Status

### 🏟️ TeamReel Core Hierarchy

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **accounts.User** | `accounts_user` | 2,765 | ✅ READY | Demo users present |
| **organisations.Organisation** | `organisations_organisation` | 5 | ⚠️ THIN | Federations present |
| **organisations.Membership** | `organisations_membership` | 2,250 | ✅ READY | Org-level memberships present |
| **projects.Project** | `projects_project` | 312 | ✅ READY | Clubs/teams present |
| **activities.Period** | `activities_period` | 675 | ✅ READY | Seasons/competitions present |
| **activities.Activity** | `activities_activity` | 852 | ✅ READY | Matches/events present |
| **projects.ProjectMembership** | `projects_membership` | 2,353 | ✅ READY | Player/staff memberships present |
| **activities.Participation** | `activities_participation` | 0 | 🔜 NEXT | Match participation (lineups, subs, goals) |

#### What Should `activities.Participation` Contain?

`Participation` links an **organisation membership** (`organisations.Membership`, not `accounts.User`) to **exactly one** of:

- a **Period** (e.g. season squad / competition squad) via `period_id`, or
- an **Activity** (e.g. a match lineup) via `activity_id`

For TeamReel matches, the most valuable starting data is **activity-level participation** (lineups):

- 11× `role=starter` per match
- 3–7× `role=substitute` per match
- Optional staff: `role=coach`, `role=assistant_coach`, `role=physio`, etc.

Suggested fields to populate:

- `status`: usually `confirmed`
- `data`: lightweight, role-specific metadata like:
  - `jersey_number`
  - `position` (e.g. GK/CB/CM/ST)
  - `minute_in` / `minute_out` (for substitutes)
  - `is_captain` (boolean)

API-wise this maps to:

- `POST /api/v1/participations/` with `{ member_id, activity_id, role, status, data }`

Note: match results (score/goals) are currently best stored on `activities.Activity.data`. Participation is primarily about **who took part**.

### 🔐 RBAC & Permissions

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **permissions.Permission** | `permissions_permission` | 23 | ✅ READY | TeamReel permissions (org, project, match, content, etc.) |
| **permissions.Role** | `permissions_role` | 5 | ⚠️ THIN | Role definitions present |
| **permissions.RoleAssignment** | `permissions_roleassignment` | 1,546 | ✅ READY | Role assignments present |

### 📊 Supporting Systems

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **audit.AuditEvent** | `audit_events` | 2,790 | ✅ OK | Audit logging present |
| **settings.FeatureFlag** | `settings_feature_flag` | 0 | ❌ EMPTY | Feature flags |
| **settings.Setting** | `settings_setting` | 0 | ❌ EMPTY | Configuration settings |
| **transactions.UsageEvent** | `transactions_usageevent` | 0 | ❌ EMPTY | Usage tracking |
| **transactions.Transaction** | `transactions_transaction` | 0 | ❌ EMPTY | Credit transactions |
| **credits.CreditsBalance** | `credits_creditsbalance` | 0 | ❌ EMPTY | Credit balances |
| **notifications.Notification** | `notifications_notification` | 0 | ❌ EMPTY | Notifications |
| **notifications.NotificationType** | `notifications_notification_type` | 0 | ❌ EMPTY | Notification types |
| **notifications.RetryPolicy** | `notifications_retry_policy` | 0 | ❌ EMPTY | Retry policies |
| **contextual_notifications.RoutingRule** | `contextual_notifications_routingrule` | 0 | ❌ EMPTY | Routing rules |

### 🖥️ System Tables (Auto-populated)

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **auth.Permission** | `auth_permission` | 164 | ✅ OK | Django permissions |
| **contenttypes.ContentType** | `django_content_type` | 41 | ✅ OK | Content types |
| **auth.Group** | `auth_group` | 1 | ✅ OK | Default group |
| **observability.SystemMetric** | `observability_systemmetric` | 1,144 | ✅ OK | System health metrics |
| **sessions.Session** | `django_session` | 1 | ⚠️ THIN | Active sessions exist |

### 🔄 Runtime Tables (Expected Empty)

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **token_blacklist.OutstandingToken** | `token_blacklist_outstandingtoken` | 0 | EMPTY-OK | JWT tokens |
| **token_blacklist.BlacklistedToken** | `token_blacklist_blacklistedtoken` | 0 | EMPTY-OK | Revoked tokens |
| **rtc_websockets.WebSocketConnection** | `realtime_websocket_connection` | 0 | EMPTY-OK | WebSocket connections |
| **rtc_websockets.RealtimeMessage** | `realtime_message` | 0 | EMPTY-OK | Real-time messages |
| **rtc_websockets.PresenceStatus** | `realtime_presence_status` | 0 | EMPTY-OK | User presence |
| **rtc_websockets.ActivityEvent** | `realtime_activity_event` | 0 | EMPTY-OK | Activity events |
| **contextual_notifications.NotificationPreference** | `contextual_notifications_notificationpreference` | 0 | EMPTY-OK | User preferences |
| **contextual_notifications.OrganisationNotificationPolicy** | `contextual_notifications_organisationnotificationpolicy` | 0 | EMPTY-OK | Org policies |
| **notifications.DeliveryAttempt** | `notifications_delivery_attempt` | 0 | EMPTY-OK | Delivery attempts |
| **transactions.BalancePolicy** | `transactions_balancepolicy` | 0 | EMPTY-OK | Balance policies |
| **files.FileAsset** | `files_fileasset` | 0 | EMPTY-OK | File uploads |
| **admin.LogEntry** | `django_admin_log` | 0 | EMPTY-OK | Admin actions |
| **search.SearchEntry** | `search_searchentry` | 0 | EMPTY-OK | Search index |
| **projects.ProjectInvite** | `projects_invite` | 0 | EMPTY-OK | Project invitations |
| **projects.ProjectMembershipPromotion** | `projects_promotion` | 0 | EMPTY-OK | Membership promotions |

## Top 5 Largest Tables

1. **audit.AuditEvent** - 2,790 records ✅
2. **accounts.User** - 2,765 records ✅
3. **projects.ProjectMembership** - 2,353 records ✅
4. **organisations.Membership** - 2,250 records ✅
5. **permissions.RoleAssignment** - 1,546 records ✅

## Club Distribution by Federation

### 🇳🇱 KNVB (Netherlands) - 18 clubs
Eredivisie 2024/2025: PSV, Ajax, Feyenoord, FC Twente, AZ, FC Utrecht, Go Ahead Eagles, Fortuna Sittard, NEC, Willem II, NAC Breda, SC Heerenveen, FC Groningen, PEC Zwolle, Heracles Almelo, Sparta Rotterdam, Almere City, RKC Waalwijk

### 🇩🇪 DFB (Germany) - 18 clubs
Bundesliga 2024/2025: Bayern München, Bayer Leverkusen, Eintracht Frankfurt, RB Leipzig, Borussia Dortmund, VfB Stuttgart, VfL Wolfsburg, SC Freiburg, Borussia Mönchengladbach, FSV Mainz 05, Werder Bremen, FC Augsburg, Union Berlin, 1. FC Heidenheim, VfL Bochum, TSG Hoffenheim, FC St. Pauli, Holstein Kiel

### 🇧🇪 RBFA (Belgium) - 16 clubs
Jupiler Pro League 2024/2025: Club Brugge, Union Saint-Gilloise, Royal Antwerp, KAA Gent, RSC Anderlecht, KRC Genk, Standard Liège, Cercle Brugge, OH Leuven, KV Mechelen, Sporting Charleroi, STVV, KVC Westerlo, Beerschot VA, KAS Eupen, FCV Dender

## Changelog

### 2026-01-09 10:58 - Production Re-Audit (No Seeding) ✅
- **Ran:** `python manage.py audit_production_db`
- **Result:** 41 models scanned, 25 empty, 14,927 total records, 39.0% non-empty models
- **Notable:** Supporting systems remain empty (settings/billing/notifications). Match participation is still empty (`activities_participation = 0`).

### 2026-01-08 09:15 - Match Expansion: All Federations + Competition Normalization ✅
- **Added:** 680 new random league matches across 4 federations
  - KNVB: 500 matches (50 senior + 40 youth teams)
  - DFB: 60 matches (6 Bundesliga teams)
  - FIGC: 60 matches (6 Serie A teams)
  - The FA: 60 matches (6 Premier League teams)
- **Architecture:** Random opponent selection from different clubs within same federation
- **Match Distribution:** ~10 matches per senior team
- **Competition Normalization:** 48 competitions renamed from league-specific names (Eredivisie, Bundesliga, Serie A) to generic "League"
- **Commands:** `normalize_competition_names`, `seed_random_matches --organisation <slug>`
- **Total Activities:** 627 → 1,307 (+680)
- **Total Records:** 7,349 → 8,029 (+680)
- **Database Fill:** 61.1% → 68.3%
- **Status:** 🎉 **ALL FEDERATIONS NOW HAVE MATCH DATA** 🎉

### 2026-01-07 20:51 - Level 10 Complete: Matches Seeded ✅ **ALL LEVELS DONE**
- **Added:** 627 Activity records (matches) with LEAN data architecture
- **League matches:** 612 (18 Eredivisie teams × 34 matches each)
  - Round-robin format: each team plays all 17 opponents twice (home + away)
  - Weekly schedule from August 10, 2024 to May 2025
  - Scoped to "League" competition period per team
- **Cup matches:** 15 (KNVB Beker knock-out tournament)
  - Round of 16: 8 matches
  - Quarter-finals: 4 matches
  - Semi-finals: 2 matches
  - Final: 1 match
  - Scoped to "Cup" competition period per team
- **Data Architecture (LEAN):**
  - ✅ Via relationships: home team (`project` FK), opponent (`opponent_project` FK), location (club stadium), season/competition (`period` FK)
  - ✅ Stored explicitly: `start_time`, `end_time`, `metadata.round`, `metadata.status`
  - ✅ 1 match = 1 Activity record (no duplicates per team)
- **Commands:** `seed_eredivisie_matches`, `seed_cup_matches`
- **Total Records:** 6,722 → 7,349 (+627)
- **Database Fill:** 52.3% → 61.1%
- **Status:** 🎉 **ALL 8 LEVELS COMPLETE** 🎉 TeamReel demo fully populated!

### 2026-01-07 19:35 - Level 9 Complete: Players Seeded ✅
- **Added:** 1,758 period-based ProjectMemberships (players & coaching staff)
- **KNVB 2024/2025:** 1,358 memberships across all Eredivisie teams + reserves/youth/women
- **International 2024/25:** 302 memberships (DFB: 101, FIGC: 99, The FA: 102)
- **Historical (2020-2023):** 98 memberships for Ajax, PSV, Feyenoord
- **Total Users:** 434 → 2,121 (+1,687)
- **Total Memberships:** 432 → 2,190 (+1,758)
- **Total Records:** 3,132 → 6,722 (+3,590)
- **Database Fill:** 36.6% → 52.3%
- **Status:** 7/8 levels complete. Only matches (Level 10) remaining.

### 2026-01-07 13:40 - RBAC System Deployed ✅
- **Added:** 23 permissions, 5 roles, 433 role assignments
- **Team Members:** Expanded to 288 users with functional roles (Keeper, Speler, Assistent, Verzorger)
- **Total Users:** 218 → 434 (+216)
- **Total Records:** 1,787 → 3,132 (+1,345)
- **Database Fill:** 26.8% → 36.6%
- **Status:** RBAC fully operational. Core Hierarchy complete. Ready for Level 9 (Players).

### 2026-01-07 12:56 - RBAC Memberships Complete (CORE HIERARCHY 100%)
- *Match Data Architecture

### LEAN Metadata Strategy ✅

**Philosophy:** Data via relationships (FKs) not duplication in metadata

**Stored via Foreign Keys:**
- `project` → Home team
- `opponent_project` → Away team
- `period` → Competition (League/Cup)
- `period.parent_period` → Season
- `location` → Stadium (from home club)

**Stored explicitly:**
- `start_time` / `end_time` → Match datetime
- `metadata.round` → Round number or code (1-34, R16, QF, SF, F)
- `metadata.status` → Match status (scheduled, live, finished)

**Future expansions (commented in code):**
- `metadata.score` → {"home": 2, "away": 1}
- `metadata.goalscorers` → [{"player": "...", "minute": 23}]
- `metadata.winner` → team_id (for cup knock-outs)
- `metadata.penalties` → {"home": 5, "away": 4} (if applicable)

### Query Patterns

**Home matches:** `Activity.objects.filter(project=my_team, activity_type='match')`
**Away matches:** `Activity.objects.filter(opponent_project=my_team, activity_type='match')`
**All matches:** `Activity.objects.filter(Q(project=my_team) | Q(opponent_project=my_team), activity_type='match')`

## Next Steps (Optional Enhancements)

1. **Participation** - Link players to matches (lineups, substitutions, goals)
2. **Match Results** - Add scores and update status to "finished"
3. **O21/Women Matches** - Expand to reserve and women's teams
4. **International Matches** - Add matches for DFB, FIGC, The FA, RBFA
5. **Historical Matches** - Backfill 2020-2023 season matchecompetitions (7 types per season per federation)
- **Total Periods:** 50 → 400
- **Competition Types:** League, Cup, European, League Cup, Play-offs, Friendly, Youth
- **Total Records:** 994 → 1,344 (+350)

---

### 🏴󠁧󠁢󠁥󠁮󠁧󠁿 The FA (England) - 20 clubs
Premier League 2024/2025: Liverpool, Arsenal, Chelsea, Manchester City, Newcastle United, Manchester United, Tottenham Hotspur, Nottingham Forest, Brighton & Hove Albion, Fulham, Aston Villa, AFC Bournemouth, West Ham United, Everton, Leicester City, Brentford, Crystal Palace, Wolverhampton Wanderers, Ipswich Town, Southampton

### 🇮🇹 FIGC (Italy) - 20 clubs
Serie A 2024/2025: Inter Milan, Atalanta, Napoli, Juventus, Lazio, Fiorentina, AC Milan, Bologna, AS Roma, Udinese, Torino, Empoli, Parma, Hellas Verona, Como 1907, Cagliari, Genoa, Lecce, Venezia, Monza

## Critical Seeding Priorities

### Immediate Next Steps (Level 4)

1. **Teams (Projects)** - Create child projects with `parent_project=Club`:
   - Eerste Elftals (senior teams)
   - Youth teams (Jong Ajax, Jong PSV, etc.)
   - Women's teams
   - Reserve teams

### Database Architecture Validation ✅

All 3 new TeamReel hierarchy fields are **confirmed applied**:

- ✅ `projects.Project.parent_project` - Self-referential FK for Club→Team hierarchy
- ✅ `activities.Activity.opponent_project` - FK for match opponents
- ✅ `projects.ProjectMembership.period` - FK for season-specific memberships

**Migrations Applied:**
- `projects.0004_add_teamreel_hierarchy` [X]
- `activities.0003_add_teamreel_hierarchy` [X]

## Commands Used

```bash
# Level 1: Users
$env:DATABASE_URL="postgresql://..."; python manage.py seed_admin_user

# Level 2: Organisations
$env:DATABASE_URL="postgresql://..."; python manage.py seed_level_2_organisations

# Level 3: Clubs
$env:DATABASE_URL="postgresql://..."; python manage.py seed_level_3_clubs

# Audit (has unicode issues in PowerShell, use alternative)
# $env:DATABASE_URL="postgresql://..."; python manage.py audit_production_db
```

## Database Health

- **Connection:** ✅ Successful
- **Migrations:** ✅ All applied
- **Schema:** ✅ Valid (new TeamReel fields present)
- **Data Integrity:** ✅ No orphaned records
- **Progress:** 3/8 levels complete (37.5%)

## Next Session Goals

1. Create **seed_level_7_players.py** management command for ProjectMemberships
2. Decide: How many players per team? (Focus on current season 2024/25)
3. Link players to teams via ProjectMembership with `period=Season`
4. Consider: Squad sizes (25-30 players per first team)
5. Update this audit document with Level 7 status

## Changelog

### 2026-01-07 12:38 - Level 6 Complete (75% DONE)
- Added 350 competitions as child Periods with `parent_period=Season`
- Generic product-agnostic naming: League, Cup, European, League Cup, Play-offs, Friendly, Youth
- Each federation: 70 competitions (10 seasons x 7 types)
- Real-world examples stored in metadata only (e.g., "Eredivisie" for KNVB League)
- Database fill increased from ~19% to 19.5% (1,344 total records)
- Progress: 75% complete (6/8 levels)

### 2026-01-07 12:22 - Level 5 Complete ✅
- ✅ Added 50 root Periods (Seasons) with `parent_period=NULL`
- 🇳🇱 KNVB: "Season 2015/2016" t/m "Season 2024/2025" (10)
- 🇩🇪 DFB: "Season 2015/16" t/m "Season 2024/25" (10)
- 🇧🇪 RBFA: "Season 2015/16" t/m "Season 2024/25" (10)
- 🏴 The FA: "Season 2015/16" t/m "Season 2024/25" (10)
- 🇮🇹 FIGC: "Season 2015/16" t/m "Season 2024/25" (10)
- 📊 Database fill increased from 17.1% to ~19% (586 total records)
- 🎯 **Progress: 62.5% complete** (5/8 levels)

### 2026-01-07 12:16 - Level 4 Complete ✅ **HALFWAY POINT**
- ✅ Added 220 teams as child projects with `parent_project` FK
- 🇳🇱 Netherlands: 72 teams (First, Reserves, Women, Youth) - Premium coverage
- 🇩🇪 Germany: 36 teams (1. Mannschaft, II) - Basic coverage
- 🇧🇪 Belgium: 32 teams (A, B) - Basic coverage
- 🏴 England: 40 teams (First Team, U21) - Basic coverage
- 🇮🇹 Italy: 40 teams (1a Squadra, Primavera) - Basic coverage
- 📊 Database fill increased from 15% to 17.1% (536 total records)
- 🎯 **Progress: 50% complete** (4/8 levels)

### 2026-01-07 12:02 - Level 3 Complete
- ✅ Added 92 clubs from 5 European top leagues
- ✅ All clubs have `parent_project=NULL` (root level)
- ✅ Metadata includes: city, stadium, founded year, colors
- 📊 Database fill increased from 12.2% to ~15%

### 2026-01-07 11:53 - Level 2 Complete
- ✅ Added 5 European football federations
- ✅ Sport metadata stored at Organisation level

### 2026-01-07 11:52 - Level 1 Complete
- ✅ Created admin user (admin@teamreel.demo)
- ✅ Database flushed and migrations verified
