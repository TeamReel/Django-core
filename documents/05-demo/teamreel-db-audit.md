# TeamReel Production Database Audit

**Last Updated:** 2026-01-08 09:15
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
$env:DATABASE_URL="postgresql://postgres:amItuWgShiNxWkvKmKyojIAahAtKTXPp@switchback.proxy.rlwy.net:17304/railway"
python manage.py audit_production_db > documents/05-demo/teamreel-db-audit-temp.md
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
- **Empty Models:** 21
- **Total Records:** 8,029
- **Database Fill:** 68.3%
- **TeamReel Progress:** Core Hierarchy 100% + RBAC + Players + Matches Expanded (All federations) ✅

---

## ✅ Seeding Progress

### Completed Levels

1. **Level 1: Users** - 2,121 users (1 admin + 2,120 demo users)
2. **Level 2: Organisations** - 5 European football federations
3. **Level 3: Clubs** - 92 top-tier clubs (Eredivisie, Bundesliga, Pro League, Premier League, Serie A)
4. **Level 4: Teams** - 220 teams as Child Projects with `parent_project=Club`
   - 🇳🇱 Netherlands: 72 teams (First, Reserves, Women, Youth per club)
   - 🇩🇪 Germany: 36 teams (First, Reserves per club)
   - 🇧🇪 Belgium: 32 teams (A, B per club)
   - 🏴 England: 40 teams (First, U21 per club)
   - 🇮🇹 Italy: 40 teams (1a Squadra, Primavera per club)
5. **Level 5: Seasons** - 50 root Periods (10 per federation, 2015-2025) with `parent_period=NULL`
6. **Level 6: Competitions** - 350 child Periods (7 per federation per season) with `parent_period=Season`
   - Generic types: League, Cup, European, League Cup, Play-offs, Friendly, Youth
   - Product-agnostic naming with federation examples in metadata
7. **RBAC Memberships** - 433 organisation-level users with RBAC roles (no period)
   - 1 Land Admin (KNVB directeur)
   - 18 Club Admins (Eredivisie directeuren)
   - 72 Team Admins (coaches per team)
   - 288 Team Members with functional roles (Keeper, Speler, Assistent, Verzorger)
   - 54 Supporters (3 fans per club)
8. **RBAC Permissions & Roles** - Production-ready hierarchical access control
   - 23 Permissions across 7 resource types
   - 5 Roles (Land/Club/Team Admin, Team Member, Supporter)
   - 433 Role Assignments with scope enforcement
9. **Level 9: Players** - 2,190 ProjectMemberships with season-specific data
   - **KNVB Season 2024/2025:** 1,358 memberships (all 18 Eredivisie clubs + reserves/youth/women)
   - **International Season 2024/25:** 302 memberships (DFB: 101, FIGC: 99, The FA: 102)
   - **Historical Seasons:** 98 memberships (Ajax, PSV, Feyenoord for 2020-2023)
   - **Note:** 1,758 period-based + 432 non-period RBAC roles = 2,190 total

10. **Level 10: Matches** - 627 Activities with `opponent_project` FK (LEAN data via relationships)
   - **League matches:** 612 (18 Eredivisie teams × 34 matches each)
   - **Cup matches:** 15 (knock-out: R16→QF→SF→F)
   - **Data strategy:** Lean metadata (round, status only) - all other data via FK relationships
   - **Architecture:** 1 match = 1 Activity record (no duplicates per team)

## Detailed Table Status

### 🏟️ TeamReel Core Hierarchy

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **accounts.User** | `accounts_user` | 2,121 | ✅ READY | 1 admin + 2,120 players/staff across all seasons |
| **organisations.Organisation** | `organisations_organisation` | 5 | ✅ READY | KNVB, DFB, RBFA, The FA, FIGC |
| **organisations.Membership** | `organisations_membership` | 1 | ✅ READY | KNVB Land Admin (Jan de Jong) |
| **projects.Project** | `projects_project` | 312 | 627 | ✅ READY | 612 league + 15 cup matches (LEAN metadata) |
| **activities.Participation** | `activities_participation` | 0 | 🔜 NEXT | Player match participation (lineups, subs, goals) with period |
| **activities.Period** | `activities_period` | 400 | ✅ READY | 50 seasons + 350 competitions (normalized to League/Cup/Youth) |
| **activities.Activity** | `activities_activity` | 1,307 | ✅ READY | 680 new random matches + 627 legacy Eredivisie matches |
| **activities.Participation** | `activities_participation` | 0 | 🔜 NEXT | Need player match participation |

### 🔐 RBAC & Permissions

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **permissions.Permission** | `permissions_permission` | 23 | ✅ READY | TeamReel permissions (org, project, match, content, etc.) |
| **permissions.Role** | `permissions_role` | 5 | ✅ READY | Land/Club/Team Admin, Team Member, Supporter |
| **permissions.RoleAssignment** | `permissions_roleassignment` | 433 | ✅ READY | All users assigned with scope enforcement |

### 📊 Supporting Systems

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **audit.AuditEvent** | `audit_events` | 837 | ✅ OK | Audit logging from seeding operations |
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
| **observability.SystemMetric** | `observability_systemmetric` | 44 | ✅ OK | System health metrics |
| **contenttypes.ContentType** | `django_content_type` | 41 | ✅ OK | Content types |
| **observability.SystemMetric** | `observability_systemmetric` | 4 | ✅ OK | System health metrics |

### 🔄 Runtime Tables (Expected Empty)

| Model | Table | Count | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **token_blacklist.OutstandingToken** | `token_blacklist_outstandingtoken` | 0 | EMPTY-OK | JWT tokens |
| **token_blacklist.BlacklistedToken** | `token_blacklist_blacklistedtoken` | 0 | EMPTY-OK | Revoked tokens |
| **rtc_websockets.WebSocketConnection** | `realtime_websocket_connection` | 1 | EMPTY-OK | WebSocket connections |
| **rtc_websockets.RealtimeMessage** | `realtime_message` | 0 | EMPTY-OK | Real-time messages |
| **rtc_websockets.PresenceStatus** | `realtime_presence_status` | 0 | EMPTY-OK | User presence |
| **rtc_websockets.ActivityEvent** | `realtime_activity_event` | 0 | EMPTY-OK | Activity events |
| **contextual_notifications.NotificationPreference** | `contextual_notifications_notificationpreference` | 0 | EMPTY-OK | User preferences |
| **contextual_notifications.OrganisationNotificationPolicy** | `contextual_notifications_organisationnotificationpolicy` | 0 | EMPTY-OK | Org policies |
| **notifications.DeliveryAttempt** | `notifications_delivery_attempt` | 0 | EMPTY-OK | Delivery attempts |
| **transactions.BalancePolicy** | `transactions_balancepolicy` | 0 | EMPTY-OK | Balance policies |
| **files.FileAsset** | `files_fileasset` | 0 | EMPTY-OK | File uploads |
| **admin.LogEntry** | `django_admin_log` | 0 | EMPTY-OK | Admin actions |
| **sessions.Session** | `django_session` | 0 | EMPTY-OK | User sessions |
| **search.SearchEntry** | `search_searchentry` | 0 | EMPTY-OK | Search index |
| **projects.ProjectInvite** | `projects_invite` | 0 | EMPTY-OK | Project invitations |
| **projects.ProjectMembershipPromotion** | `projects_promotion` | 0 | EMPTY-OK | Membership promotions |

## Top 5 Largest Tables

1. **accounts.User** - 2,121 records ✅ (Players, coaches, staff across all seasons)
2. **projects.ProjectMembership** - 2,190 records ✅ (1,758 period-based players + 432 RBAC roles)
3. **activities.Activity** - 1,307 records ✅ (680 random league + 627 legacy Eredivisie matches)
4. **audit.AuditEvent** - 837 records ✅ (Seeding operations audit trail)
5. **permissions.RoleAssignment** - 433 records ✅ (RBAC role assignments)

## Club Distribution by Federation

### 🇳🇱 KNVB (Netherlands) - 18 clubs
Eredivisie 2024/2025: PSV, Ajax, Feyenoord, FC Twente, AZ, FC Utrecht, Go Ahead Eagles, Fortuna Sittard, NEC, Willem II, NAC Breda, SC Heerenveen, FC Groningen, PEC Zwolle, Heracles Almelo, Sparta Rotterdam, Almere City, RKC Waalwijk

### 🇩🇪 DFB (Germany) - 18 clubs
Bundesliga 2024/2025: Bayern München, Bayer Leverkusen, Eintracht Frankfurt, RB Leipzig, Borussia Dortmund, VfB Stuttgart, VfL Wolfsburg, SC Freiburg, Borussia Mönchengladbach, FSV Mainz 05, Werder Bremen, FC Augsburg, Union Berlin, 1. FC Heidenheim, VfL Bochum, TSG Hoffenheim, FC St. Pauli, Holstein Kiel

### 🇧🇪 RBFA (Belgium) - 16 clubs
Jupiler Pro League 2024/2025: Club Brugge, Union Saint-Gilloise, Royal Antwerp, KAA Gent, RSC Anderlecht, KRC Genk, Standard Liège, Cercle Brugge, OH Leuven, KV Mechelen, Sporting Charleroi, STVV, KVC Westerlo, Beerschot VA, KAS Eupen, FCV Dender

## Changelog

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
