# TeamReel RBAC Configuration

**Last Updated:** 2026-01-08
**Environment:** Railway Production
**Status:** Ready to Deploy
**Related Docs:**
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Architecture & Design Decisions
- [TeamReel Database Audit](teamreel-db-audit.md) - Current Database State
- [TeamReel Data Structure](teamreel-data-structure.md) - Hierarchy examples

---

## 📋 Executive Summary

**RBAC Structure:** Production-ready hierarchical Role-Based Access Control volgens TeamReel strategy
- **23 Permissions** - Granulaire capabilities per resource type
- **5 Roles** - Hierarchische rollen (Land/Club/Team Admin + Member + Supporter)
- **433 Role Assignments** - Gekoppeld aan bestaande RBAC users (incl. 288 Team Members met functionele rollen)

**Key Features:**
- ✅ **Functional Role System:** Team Members (Keeper, Speler, Assistent, Verzorger) met identieke RBAC permissies
- ✅ **Cascading Feature Flag Enforcement** (higher levels block lower levels)
- ✅ **Cross-Club Visibility** (everyone can view opponents for match creation)
- ✅ **Content Ownership Logic** (Team Admin = all content, Team Member = own content only)
- ✅ **Hierarchical Credit Management**

---

## 🔐 Permissions Overview (23 Total)

### **Organisation-Level Permissions (3)**

| Permission | Description | Sensitive | Roles |
|------------|-------------|-----------|-------|
| `org.view_all` | View all organisations/federations (cross-club visibility) | No | All except Supporter |
| `org.manage_settings` | Manage organisation settings and metadata | Yes | Land Admin |
| `org.manage_credits` | Manage credit allocation at federation level | Yes | Land Admin |

---

### **Project-Level Permissions (4)**

| Permission | Description | Sensitive | Roles |
|------------|-------------|-----------|-------|
| `project.view_all` | View all projects/clubs/teams (opponent selection) | No | All except Supporter |
| `project.edit_own` | Edit own project/team settings | No | Land/Club/Team Admin |
| `project.edit_children` | Edit child projects (club → teams) | No | Land/Club Admin |
| `project.manage_credits` | Manage credit transactions for project/team | Yes | Land/Club/Team Admin |

---

### **Match/Activity Permissions (4)**

| Permission | Description | Sensitive | Roles |
|------------|-------------|-----------|-------|
| `match.create` | Create new matches for team | No | Land/Club/Team Admin |
| `match.edit_own_team` | Edit matches where user's team is involved | No | Land/Club/Team Admin |
| `match.delete` | Delete matches | Yes | Land/Club Admin |
| `match.view_all` | View all matches (read-only) | No | All |

**Key Logic:** Team Members kunnen matches BEKIJKEN maar NIET bewerken/aanmaken.

---

### **Content Permissions (4)**

| Permission | Description | Sensitive | Roles |
|------------|-------------|-----------|-------|
| `content.create` | Create content (line-ups, posts, media) | No | All except Supporter |
| `content.edit_own` | Edit own created content only | No | Team Member |
| `content.edit_all_team` | Edit all content for team (not restricted to own) | No | Land/Club/Team Admin |
| `content.approve` | Approve content before publication | No | Land/Club/Team Admin |

**Key Logic:**
- **Team Admin:** Kan ALLE team content bewerken (`content.edit_all_team`)
- **Team Member:** Kan content CREËREN maar ALLEEN eigen content bewerken (`content.edit_own`)

---

### **Profile Permissions (2)**

| Permission | Description | Sensitive | Roles |
|------------|-------------|-----------|-------|
| `profile.edit_own` | Edit own user profile (name, photo, birthdate) | No | All except Supporter |
| `profile.edit_team` | Edit profiles of team members | Yes | Land/Club/Team Admin |

**Key Logic:** Team Members kunnen ALLEEN eigen profiel bewerken, niet die van anderen.

---

### **Lineup Permissions (2)**

| Permission | Description | Sensitive | Roles |
|------------|-------------|-----------|-------|
| `lineup.create` | Create match lineups and formations | No | Land/Club/Team Admin |
| `lineup.edit` | Edit existing lineups | No | Land/Club/Team Admin |

---

### **Feature Flag Permissions (4) - Cascading Enforcement**

| Permission | Description | Sensitive | Roles |
|------------|-------------|-----------|-------|
| `featureflag.view` | View feature flags configuration and inheritance chain | No | All except Supporter |
| `featureflag.override_team` | Override feature flags at team level (only if not blocked) | Yes | Land/Club/Team Admin |
| `featureflag.override_club` | Override feature flags at club level (blocks all teams below) | Yes | Land/Club Admin |
| `featureflag.override_org` | Override feature flags at org level (blocks all clubs/teams) | Yes | Land Admin |

**Cascading Logic:**
```
Land Admin disables → Club Admin CANNOT enable → Team Admin CANNOT enable
Club Admin disables → Team Admin CANNOT enable
Team Admin disables → Only affects own team
```

---

## 👥 Roles Overview (5 Total)

### **1. Land Admin** (Organisation Scope)

**Description:** Federation director with full access to all clubs/teams
**Scope:** `organisation` (KNVB, DFB, RBFA, The FA, FIGC)
**Permissions:** **22 / 23** (all except none)
**Current Users:** 1 (Jan de Jong @ KNVB)

**Full Permission List:**
- ✅ All `org.*` permissions (3/3)
- ✅ All `project.*` permissions (4/4)
- ✅ All `match.*` permissions (4/4)
- ✅ All `content.*` permissions (4/4)
- ✅ All `profile.*` permissions (2/2)
- ✅ All `lineup.*` permissions (2/2)
- ✅ All `featureflag.*` permissions (4/4)

**Can:**
- ✅ View/edit ALL organisations, clubs, teams
- ✅ Manage credits at all levels
- ✅ Create/edit/delete ALL matches
- ✅ Edit ALL content (not restricted to own)
- ✅ Edit ALL user profiles
- ✅ Override feature flags at org/club/team levels (cascading enforcement)

---

### **2. Club Admin** (Project Scope - Club Level)

**Description:** Club director with full access to club and all teams
**Scope:** `project` (root projects with `parent_project=NULL`)
**Permissions:** **21 / 23**
**Current Users:** 18 (Eredivisie club directors)

**Full Permission List:**
- ✅ `org.view_all` (can see other clubs for opponent selection)
- ❌ `org.manage_settings`, `org.manage_credits` (no org-level management)
- ✅ All `project.*` permissions (4/4)
- ✅ All `match.*` permissions (4/4)
- ✅ All `content.*` permissions (4/4)
- ✅ All `profile.*` permissions (2/2)
- ✅ All `lineup.*` permissions (2/2)
- ✅ `featureflag.view`, `override_team`, `override_club` (not `override_org`)

**Can:**
- ✅ View ALL clubs (read-only cross-club visibility)
- ✅ Edit own club + ALL child teams
- ✅ Manage credits for club + teams
- ✅ Create/edit/delete matches for all club teams
- ✅ Edit ALL content (not restricted to own)
- ✅ Override feature flags at club/team levels (blocks teams below)

**Cannot:**
- ❌ Manage organisation settings/credits
- ❌ Override org-level feature flags (only club/team)

---

### **3. Team Admin** (Project Scope - Team Level)

**Description:** Head coach with full access to team content and matches
**Scope:** `project` (child projects with `parent_project != NULL`)
**Permissions:** **17 / 23**
**Current Users:** 72 (coaches per team)

**Full Permission List:**
- ✅ `org.view_all`, `project.view_all` (can see ALL clubs/teams read-only)
- ❌ `org.manage_settings`, `org.manage_credits` (no org management)
- ✅ `project.edit_own`, `project.manage_credits`
- ❌ `project.edit_children` (no child teams)
- ✅ `match.create`, `match.edit_own_team`, `match.view_all`
- ❌ `match.delete` (cannot delete matches)
- ✅ `content.create`, `content.edit_all_team`, `content.approve`
- ✅ `profile.edit_own`, `profile.edit_team`
- ✅ All `lineup.*` permissions (2/2)
- ✅ `featureflag.view`, `override_team` (not `override_club/org`)

**Can:**
- ✅ View ALL clubs/teams (read-only for opponent selection)
- ✅ Edit own team settings
- ✅ Manage credits for own team
- ✅ Create/edit matches for own team
- ✅ Edit **ALL team content** (key difference with Team Member)
- ✅ Edit team member profiles
- ✅ Override feature flags at team level (if not blocked by club/org)

**Cannot:**
- ❌ Edit other teams
- ❌ Delete matches
- ❌ Override club/org feature flags

**Key Difference:** `content.edit_all_team` → Can edit content created by Team Members

---

### **4. Team Member** (Project Scope - Team Level)

**Description:** Team members with functional roles (Keeper, Speler, Assistent, Verzorger) - all with same RBAC permissions
**Scope:** `project` (child projects/teams)
**Permissions:** **7 / 23**
**Current Users:** 288 (72 teams × 4 functional roles)

**Functional Roles (All Team Members):**
- 🧤 **Keeper** (Goalkeeper)
- ⚽ **Speler** (Player)
- 📋 **Assistent** (Assistant Coach)
- 🏥 **Verzorger** (Physiotherapist/Medical Staff)

> **Note:** These are **functional titles** for display purposes. All receive identical **Team Member** RBAC permissions regardless of role.

**Full Permission List:**
- ✅ `org.view_all`, `project.view_all` (read-only awareness)
- ✅ `match.view_all` (read-only)
- ✅ `content.create`, `content.edit_own` (can create, but only edit own)
- ❌ `content.edit_all_team`, `content.approve` (cannot edit others' content)
- ✅ `profile.edit_own`
- ❌ `profile.edit_team` (cannot edit other profiles)
- ❌ `lineup.create`, `lineup.edit` (cannot manage lineups)
- ✅ `featureflag.view` (read-only)
- ❌ All `featureflag.override_*` (cannot change flags)

**Can:**
- ✅ View ALL clubs/teams/matches (read-only awareness)
- ✅ Create content (line-ups, posts)
- ✅ Edit ONLY own created content
- ✅ Edit ONLY own profile

**Cannot:**
- ❌ Edit team settings
- ❌ Create/edit matches
- ❌ Edit content created by others (including Team Admin)
- ❌ Edit other team member profiles
- ❌ Manage lineups
- ❌ Change feature flags

**Key Logic:** Read-mostly access with content creation capability, but strict ownership enforcement.

---

### **5. Supporter** (Project Scope - Club Level)

**Description:** External viewer (fan/sponsor) with read-only access
**Scope:** `project` (root projects - clubs)
**Permissions:** **1 / 23**
**Current Users:** 54 (3 fans per Eredivisie club)

**Full Permission List:**
- ✅ `match.view_all` (read-only)
- ❌ ALL other permissions

**Can:**
- ✅ View matches (if granted access to club)

**Cannot:**
- ❌ Edit anything
- ❌ Create content
- ❌ View other clubs
- ❌ Edit own profile
- ❌ Manage anything

**Key Logic:** Purely passive viewer role for external stakeholders.

---

## 📊 Role Assignments (217 Total)

### **Breakdown by Role**

| Role | Scope | Count | Target Type | Examples |
|------|-------|-------|-------------|----------|
| **Land Admin** | Organisation | 1 | KNVB | Jan de Jong @ KNVB |
| **Club Admin** | Project (Club) | 18 | 18 Eredivisie clubs | Directeur Ajax, Directeur PSV |
| **Team Admin** | Project (Team) | 72 | 72 teams | Coach Ajax Eerste, Coach PSV Eerste |
| **Team Member** | Project (Team) | 288 | 72 teams × 4 roles | Keeper, Speler, Assistent, Verzorger |
| **Supporter** | Project (Club) | 54 | 18 clubs (3 each) | Supporter1 @ Ajax |
| **TOTAL** | - | **433** | - | - |

### **Team Member Functional Roles Distribution**

| Functional Role | Per Team | Total (72 teams) | RBAC Role | Permissions |
|-----------------|----------|------------------|-----------|-------------|
| 🧤 **Keeper** | 1 | 72 | Team Member | Identical |
| ⚽ **Speler** | 1 | 72 | Team Member | Identical |
| 📋 **Assistent** | 1 | 72 | Team Member | Identical |
| 🏥 **Verzorger** | 1 | 72 | Team Member | Identical |
| **SUBTOTAL** | 4 | **288** | - | 7 permissions each |

> **Note:** Functional roles are for **display/categorization** only. All Team Members receive the same 7 RBAC permissions regardless of role type.

### **Assignment Logic**

Automatic role assignment based on existing memberships:

```python
# Land Admin: Organisation Memberships with role='admin'
OrgMembership.filter(role='admin') → Land Admin (1)

# Club Admin: ProjectMemberships on root projects with role='admin'
ProjectMembership.filter(role='admin', project__parent_project=NULL) → Club Admin (18)

# Team Admin: ProjectMemberships on child projects with role='admin'
ProjectMembership.filter(role='admin', project__parent_project != NULL) → Team Admin (72)

# Team Member: ProjectMemberships with role='viewer' on TEAM level (functional roles)
ProjectMembership.filter(role='viewer', project__parent_project != NULL) → Team Member (288)
#   - keeper@{team}.demo → Keeper (72)
#   - speler@{team}.demo → Speler (72)
#   - assistant@{team}.demo → Assistent (72)
#   - verzorger@{team}.demo → Verzorger (72)

# Supporter: ProjectMemberships with role='viewer' on CLUB level
ProjectMembership.filter(role='viewer', project__parent_project=NULL) → Supporter (54)
```

---

## 🔄 Cascading Feature Flag Enforcement

### **Hierarchy & Enforcement Rules**

```
┌─────────────────────────────────────────────────────┐
│  LAND ADMIN (Org Level)                             │
│  └─ featureflag.override_org                        │
│     → Disabled = ALLE clubs/teams GEBLOKKEERD       │
└─────────────────────────────────────────────────────┘
            ↓ (inheritance + enforcement)
┌─────────────────────────────────────────────────────┐
│  CLUB ADMIN (Club Level)                            │
│  └─ featureflag.override_club                       │
│     → Disabled = ALLE teams binnen club GEBLOKKEERD │
│     → KAN NIET enablen als org disabled is          │
└─────────────────────────────────────────────────────┘
            ↓ (inheritance + enforcement)
┌─────────────────────────────────────────────────────┐
│  TEAM ADMIN (Team Level)                            │
│  └─ featureflag.override_team                       │
│     → Disabled = Alleen dit team                    │
│     → KAN NIET enablen als club/org disabled is     │
└─────────────────────────────────────────────────────┘
```

### **Implementation Logic**

```python
def is_feature_enabled(feature_name, team):
    """
    Check if feature is enabled with cascading enforcement.
    Higher levels BLOCK lower levels from enabling.
    """
    # 1. Check org-level override (highest priority)
    org_override = FeatureFlag.get(org=team.organisation, feature=feature_name)
    if org_override and org_override.enabled == False:
        return False  # ORG BLOCKED → Cannot be overridden

    # 2. Check club-level override
    club = team.parent_project
    club_override = FeatureFlag.get(project=club, feature=feature_name)
    if club_override and club_override.enabled == False:
        return False  # CLUB BLOCKED → Cannot be overridden

    # 3. Check team-level override
    team_override = FeatureFlag.get(project=team, feature=feature_name)
    if team_override:
        return team_override.enabled

    # 4. Fall back to system default
    return get_system_default(feature_name)
```

### **Example Scenarios**

**Scenario 1: Land Admin Blocks Feature**
```
Land Admin @ KNVB: override_org → Disable "AI_CONTENT_GENERATION"

Result:
- ALL clubs in KNVB: Feature disabled (greyed out, CANNOT enable)
- ALL teams in KNVB: Feature disabled (greyed out, CANNOT enable)
- Other federations: Not affected
```

**Scenario 2: Club Admin Blocks Feature**
```
Club Admin @ Ajax: override_club → Disable "AUTO_LINEUPS"

Result:
- Ajax Eerste Team: Feature disabled (CANNOT enable)
- Ajax Reserves Team: Feature disabled (CANNOT enable)
- Ajax O21 Team: Feature disabled (CANNOT enable)
- PSV teams: Not affected (different club)
```

**Scenario 3: Team Admin Disables Feature**
```
Team Admin @ Ajax Eerste: override_team → Disable "MATCH_REMINDERS"

Result:
- Ajax Eerste: Feature disabled
- Ajax Reserves: Feature still enabled (separate team)
- PSV Eerste: Feature still enabled (different club)
```

---

## 📋 Permission Matrix

### **Complete Permission Matrix by Role**

| Permission | Land Admin | Club Admin | Team Admin | Team Member | Supporter |
|------------|:----------:|:----------:|:----------:|:-----------:|:---------:|
| **Organisation** |
| `org.view_all` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `org.manage_settings` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `org.manage_credits` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Project** |
| `project.view_all` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `project.edit_own` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `project.edit_children` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `project.manage_credits` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Match** |
| `match.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `match.edit_own_team` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `match.delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `match.view_all` | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Content** |
| `content.create` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `content.edit_own` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `content.edit_all_team` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `content.approve` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Profile** |
| `profile.edit_own` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `profile.edit_team` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Lineup** |
| `lineup.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `lineup.edit` | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Feature Flag** |
| `featureflag.view` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `featureflag.override_team` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `featureflag.override_club` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `featureflag.override_org` | ✅ | ❌ | ❌ | ❌ | ❌ |
| **TOTAL** | **22/23** | **21/23** | **17/23** | **7/23** | **1/23** |

---

## 🔗 Consistency with Other Documents

### **Alignment with teamreel-data-strategy.md**

✅ **Decision 7: Visibility levels = Hierarchical permissions**
- Implemented via cascading permissions (org → club → team)

✅ **Permission & Visibility Architecture (Section 🔐)**
- All 5 roles match exactly: Land Admin, Club Admin, Team Admin, Team Member, Supporter
- Visibility Matrix implemented via permissions

✅ **Key Principles (lines 59-68)**
1. ✅ Club-level = Database Browser: `org.view_all`, `project.view_all`
2. ✅ Team-level = Sandboxed: `project.edit_own` only
3. ✅ Match ownership: Team Admin has `match.edit_own_team`, Team Member does not
4. ✅ Profile ownership: Team Member has `profile.edit_own` only
5. ✅ Cross-club visibility: All roles (except Supporter) have `org.view_all`
6. ✅ Credits per Team: `project.manage_credits` only for admins
7. ✅ Feature Flags hierarchy: Cascading `override_org/club/team` enforcement

### **Alignment with teamreel-db-audit.md**

✅ **User Counts:**
- 218 users total (1 admin + 217 RBAC users)
- Matches breakdown: 1 Land Admin + 18 Club + 72 Team + 72 Staff + 54 Supporters

✅ **Membership Counts:**
- Organisation Memberships: 1 (Land Admin)
- Project Memberships: 216 (Club/Team Admins + Staff + Supporters)
- Role Assignments: 217 (will be added after seeding)

✅ **Empty Tables (will be filled):**
- `permissions_permission`: 0 → 23
- `permissions_role`: 0 → 5
- `permissions_roleassignment`: 0 → 217

---

## 📅 Changelog

### 2026-01-07 14:20 - Functional Role System
- **Updated:** Team Members (72 → 288 users) met functionele rollen
- **Added:** 4 functional roles per team (Keeper, Speler, Assistent, Verzorger)
- **Clarified:** Functional roles zijn display-only, RBAC permissions blijven identiek
- **Logic:** Team members = `role='viewer'` op TEAM level, Supporters = `role='viewer'` op CLUB level
- **Impact:** Total role assignments: 217 → 433 (+216 Team Members)

### 2026-01-07 13:17 - RBAC Successfully Deployed ✅
- **Deployed:** 23 permissions, 5 roles, 217 role assignments
- **Duration:** 4 minutes (cache invalidation per assignment)
- **Status:** Production deployment successful

### 2026-01-07 13:05 - Initial RBAC Configuration
- **Created:** 23 permissions across 7 resource types
- **Created:** 5 hierarchical roles (Land/Club/Team Admin + Member + Supporter)
- **Ready:** 217 role assignments (pending seeding)
- **Feature:** Cascading feature flag enforcement (org → club → team blocking)
- **Status:** Production-ready configuration aligned with TeamReel strategy

---

## 🚀 Deployment Status

**Current State:** ⏳ Pending Re-Deployment (Functional Roles Update)
**Reason:** Updated Team Member seeding from 72 → 288 users (4 functional roles per team)

**Commands to Execute:**
```bash
# 1. Re-seed RBAC memberships with functional roles
python manage.py seed_rbac_memberships

# 2. Re-seed RBAC assignments (will handle new Team Members)
python manage.py seed_teamreel_rbac
```

**Expected Changes:**
- **Users:** +216 new Team Members (72 teams × 3 new roles: Keeper, Speler, Verzorger)
- **Project Memberships:** +216 (Keepers, Spelers, Verzorgers)
- **Role Assignments:** 217 → 433 (+216)

**Post-Deployment:**
- [ ] Run audit: `python manage.py audit_production_db`
- [ ] Update `teamreel-db-audit.md` with new counts
- [ ] Verify functional roles in Django Admin (check emails: keeper@, speler@, assistant@, verzorger@)
- [ ] Test that all Team Members have identical permissions despite different roles
