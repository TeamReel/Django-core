# TeamReel Data Structure Reference

**Last Updated:** 2026-01-08
**Purpose:** Document the hierarchical data model used in the TeamReel demo
**Related Docs:**
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Architecture & Design Decisions
- [TeamReel Transactions, Balances & Wallets Plan](teamreel-transactions-wallets-plan.md) - Wallet scopes + balances + routing
- [TeamReel Database Audit](teamreel-db-audit.md) - Current Database State
- [TeamReel Seeding Plan](teamreel-seeding-plan.md) - Seeding Procedures
- [index.md](index.md) - Documentation Overview

---

## 📋 Overview

TeamReel follows a **Club → Team → Season → Competition → Match** hierarchy, matching real-world football league management structures. This model applies to all seeded federations (KNVB, DFB, FIGC, The FA).

---

## 1. Hierarchy Overview

The structure follows a **Club → Team → Season → Competition → Match** hierarchy.

```mermaid
graph TD
    Org["Organisation: KNVB/DFB"] --> Club["Project: Club - Ajax"]
    Club --> Team["Sub-Project: Team - Ajax 1"]

    subgraph Time_Activity["Time & Activity Scope"]
        Team --> Season["Period: Season 2024/2025"]
        Season --> Comp["Period: Competition - Eredivisie"]
        Comp --> Match["Activity: Match - Ajax vs PSV"]
    end

    subgraph Membership["Membership Scope"]
        Player["Player"] -.->|Member of| Season
        Staff["Staff"] -.->|Member of| Season
    end
```

---

## 2. Detailed Structure

### Level 1: Organisation
The top-level container for the federation or league association.
*   **Model:** `Organisation`
*   **Examples:** `KNVB` (Netherlands), `DFB` (Germany), `FIGC` (Italy), `The FA` (England).
*   **Role:** Administrative root.

### Level 2: Club (Project)
Represents the main institutional entity.
*   **Model:** `Project`
*   **Parent:** `None` (Root Project)
*   **Examples:** `Ajax`, `Bayern München`, `Manchester City`.
*   **Key Characteristics:**
    *   Acts as an umbrella container.
    *   Typically has **0 members** directly assigned.
    *   Has **0 periods/seasons** directly assigned.

### Level 3: Team (Sub-Project)
Represents the specific squad or functional unit (e.g., First Team, U21, Women's Team).
*   **Model:** `Project` (with `parent_project` set to Club)
*   **Parent:** Club Project
*   **Sport:** `sport` FK to `Sport` (inherits from Club if not set)
*   **Examples:** `Ajax 1`, `Bayern München 1. Mannschaft`, `Inter Milan 1a Squadra`.
*   **Key Characteristics:**
    *   This is the primary "Work Unit".
    *   Seasons and Memberships are attached here.
    *   Sport configuration drives template availability and validation.
*   **Metadata (Required):**
    *   `team_type`: `"field_11v11"`, `"field_8v8"`, `"field_6v6"`, `"futsal"`, `"basketball_5v5"` (CRITICAL: Drives template availability. e.g. No corner kicks in futsal; smaller pitch image for 6v6).
    *   `gender`: `"male"`, `"female"`, `"mixed"`.

### Level 4: Season (Team-Scoped Period)
The main time-bound container for a yearly campaign.
*   **Model:** `Period`
*   **Scope:** `project = Team` (e.g., Ajax 1)
*   **Examples:** `Season 2024/2025` (Standardized).
*   **Key Characteristics:**
    *   **Players are Members here**: `ProjectMembership` links a `User` to the `Team` Project, but scoped to this specific `Period`.
    *   This ensures players are only active for that specific season.
*   **Consistency Rule:** Use standardized names from Organisation configuration (e.g., `YYYY/YYYY` format). Do not use free-text variants like "25/26".

### Level 5: Competition (Sub-Period)
Specific contexts within a season (League, Cup, Friendly).
*   **Model:** `Period` (with `parent_period` set to Season)
*   **Parent:** Season Period
*   **Sport:** `sport` FK to `Sport` (variant) - **THIS IS WHERE SPORT VARIANT LIVES**
*   **Examples:** `Eredivisie` (NL), `Bundesliga` (DE), `KNVB Beker`, `Summer 7v7 Tournament`.
*   **Metadata:**
    *   `type`: `"league"`, `"cup"`, `"friendly"`, `"tournament"`.
*   **Key Characteristics:**
    *   Matches are linked to this specific period context.
    *   Sport variant determines which templates are available.
    *   Same team can have different sport variants across competitions!

### Level 6: Match (Activity)
The actual event.
*   **Model:** `Activity`
*   **Linked Project:** The Team (e.g., Ajax 1)
*   **Linked Period:** The Competition (e.g., Eredivisie)
*   **Sport:** Inherited from Competition's `sport` field
*   **Key Fields:**
    *   `title`: `"Ajax vs PSV"`
    *   `activity_type`: `"match"`
    *   `start_time`: Timezone-aware datetime.
    *   `metadata`: Contains scores, home/away flags, etc.

### Level 7: Sport Configuration (B32)
Defines sport-specific rules, positions, formations, and outfit types.

**Hierarchical Structure:**
```
SportCategory (Organisation level)     SportVariant (Competition level)
────────────────────────────────────────────────────────────────────────
Football ⚽                         →  Football 11v11, Futsal 5v5, Football 7v7
Handball 🤾                         →  Indoor Handball
Basketball 🏀                       →  Basketball 5v5
Hockey 🏒                           →  Ice Hockey, Field Hockey
```

*   **Models:** `Sport`, `SportConfiguration`, `OutfitConfiguration`
*   **Sport (Category):** Main sport type, assigned at Organisation level
    *   `parent_sport = NULL`
    *   Examples: Football, Handball, Basketball
*   **Sport (Variant):** Specific discipline, assigned at **Competition level**
    *   `parent_sport = <Category>`
    *   Examples: Football 11v11, Futsal 5v5, Football 7v7
*   **SportConfiguration:** Rules per variant (only variants have configs):
    *   `team_size_min`, `team_size_max`, `max_substitutes`
    *   `positions`: ["GK", "LB", "CB", "RB", "CM", "LW", "RW", "ST", ...]
    *   `formations`: {"4-3-3": {...}, "4-4-2": {...}}
    *   `outfit_types`: ["home", "away", "goalkeeper", "third_kit"]
    *   `pitch_type`: "outdoor_large", "outdoor_small", "indoor", "court"
    *   `has_corner_kicks`: True/False (False for futsal)
    *   `has_offside`: True/False
    *   `match_duration_minutes`: 90, 40, 50, etc.
*   **OutfitConfiguration:** Club/Team specific colors:
    *   `outfit_type`: "home", "away", "goalkeeper"
    *   `colors`: {"primary": "#FFFFFF", "secondary": "#000000"}
    *   Inheritance: Team erft van Club indien niet expliciet gezet

**Hierarchy Application (Sport Variant on Competition):**
```
Organisation (KNVB)
    └── Implicit sport_category via clubs: Football ⚽

Club (Ajax)
    └── OutfitConfigurations: home/away/goalkeeper

Team (Ajax 1)
    └── Season 2024/2025
          │
          ├── Competition: Eredivisie
          │     └── sport: Football 11v11 ⚽
          │     └── Matches use 11v11 templates
          │
          ├── Competition: KNVB Beker
          │     └── sport: Football 11v11 ⚽
          │     └── Matches use 11v11 templates
          │
          └── Competition: Summer Tournament 7v7
                └── sport: Football 7v7 ⚽
                └── Matches use 7v7 templates (no offside stats!)
```

**Key Benefit:** Same team can participate in different formats within one season!

### Level 8: Content Generation (B31)
Templates and generated content for matches and teams.
*   **Model:** `ContentTemplate`, `ContentItem`, `ContentApproval`
*   **ContentTemplate:** Reusable content blueprints
    *   `template_type`: "pre_match", "during_match", "post_match", "promotional"
    *   `sport`: Optional FK - sport-specific templates
    *   `tone`: "professional", "exciting", "casual"
    *   `content_template`: Jinja2/Django template string
*   **ContentItem:** Generated content instance
    *   Links to: `template`, `project` (team), `activity` (match)
    *   `status`: "draft", "pending_review", "approved", "rejected", "published"
    *   `generated_content`: The actual rendered content
*   **ContentApproval:** Review workflow
    *   `reviewer`, `status`, `feedback_text`

---

## 2b. Credits & Wallets Overlay (TeamReel)

Credits sit "next to" the hierarchy as an immutable ledger (`Transaction`). In TeamReel we use three wallet scopes:

- **User wallet** (within an org): `wallet_scope=user`, `charged_user != NULL`
- **Team/Project wallet**: `wallet_scope=project`, `project != NULL`
- **Organisation wallet**: `wallet_scope=organization`, `project=NULL`, `charged_user=NULL`

Balances are queried via the transactions API (used by the TeamReel webapp):

- `GET /api/v1/transactions/organizations/<org_uuid>/balance/` (organisation)
- `GET /api/v1/transactions/projects/<project_id>/balance/` (team/project)
- `GET /api/v1/transactions/organizations/<org_uuid>/balance/me/` (logged-in user)

Routing note:
- Debits can be routed (fallback) based on an org-configured strategy (B10 setting `transactions_payer_routing_default`).
- If a debit falls back to the **org** wallet, the resulting transaction is intentionally **org-scoped** (`project=NULL`). The initiating team context is retained via `UsageEvent`/`notes`.

Demo verification:
- Deterministic routing verification can be seeded with `python manage.py seed_transactions_routing_smoke --settings=config.settings.production --org knvb`.
- Optional `--team-id <project_id>` targets a specific team for reproducibility.

---

## 3. Example Data Trace (Ajax)

| Level | Name | Details / Metadata |
| :--- | :--- | :--- |
| **Org** | `KNVB` | Federation |
| **Club** | `Ajax` | Parent Project (Container) |
| **Team** | `Ajax 1` | Child Project (The Squad) |
| **Season** | `Season 2024/2025` | **Period** on `Ajax 1`. Contains 22 Members (Players). |
| **Comp** | `Eredivisie` | **Sub-Period** of Season. `type: league`. |
| **Match** | `Ajax vs Feyenoord` | **Activity** linked to `Ajax 1` (Project) and `Eredivisie` (Period). |

## 4. Example Data Trace (Bayern München)

| Level | Name | Details / Metadata |
| :--- | :--- | :--- |
| **Org** | `DFB` | Federation |
| **Club** | `Bayern München` | Parent Project (Container) |
| **Team** | `1. Mannschaft` | Child Project (The Squad) |
| **Season** | `Season 2024/2025` | **Period** on `1. Mannschaft`. Contains 25 Members (Players). |
| **Comp** | `Bundesliga` | **Sub-Period** of Season. `type: league`. |

---

## 5. Technical Implementation Notes

### A. Database Table Names

The actual PostgreSQL table names differ from model names:

| Django Model | Database Table | App |
| :--- | :--- | :--- |
| `Organisation` | `organisations_organisation` | organisations |
| `Project` | `projects_project` | projects |
| `ProjectMembership` | `projects_membership` | projects |
| `Period` | `activities_period` | activities |
| `Activity` | `activities_activity` | activities |
| `AuditEvent` | `audit_events` | audit |

**Important:** When writing raw SQL queries or debugging FK constraints, use the database table names, not the model names.

### B. Seeding & Query Patterns

When seeding or querying:
1.  **Find the Team**: Don't dump members on the Club project (`parent_project=None`). Always look for the child project (`Ajax 1`).
2.  **Create Scope**: Create a `Period` tied to `project=team` (the Season).
3.  **Assign Members**: `ProjectMembership.objects.create(project=team, period=season, ...)`
4.  **Create Activities**: `Activity.objects.create(project=team, period=competition, ...)` where `competition.parent = season`.

### C. Temporal Membership Model

Users can be members of different teams over time, but **always one active membership** at any moment:

```python
# Example: Player transfers from Ajax to Feyenoord
# Season 2024/2025 at Ajax
ProjectMembership.objects.create(
    user=player,
    project=ajax_team,
    period=season_2024_2025,
    role="player",
    joined_at="2024-07-01"
)

# Season 2025/2026 at Feyenoord (new membership)
ProjectMembership.objects.create(
    user=player,
    project=feyenoord_team,
    period=season_2025_2026,
    role="player",
    joined_at="2025-07-01"
)
```

Each membership is scoped to:
- **Project (Team)**: The squad they belong to
- **Period (Season)**: The timeframe they're active
- **Organisation**: Derived from `project.organisation`

### D. Foreign Key Constraints & Deletion Order

When deleting entities with dependencies, respect this cascading order to avoid FK violations:

1. **Activities** (references `period_id` and `project_id`)
2. **Periods** (references `project_id` and `parent_period_id`)
3. **ProjectMemberships** (references `project_id` and `period_id`)
4. **Audit Events** (references `project_id`)
5. **Child Projects** (references `parent_project_id`)
6. **Parent Projects** (root level)

Example deletion command:
```sql
-- 1. Delete activities
DELETE FROM activities_activity WHERE period_id IN (SELECT id FROM activities_period WHERE project_id = <team_id>);
DELETE FROM activities_activity WHERE project_id = <team_id>;

-- 2. Delete periods
DELETE FROM activities_period WHERE project_id = <team_id>;

-- 3. Delete memberships
DELETE FROM projects_membership WHERE project_id = <team_id>;

-- 4. Delete audit events
DELETE FROM audit_events WHERE project_id = <team_id>;

-- 5. Delete the project
DELETE FROM projects_project WHERE id = <team_id>;
```

**Note:** Django signals (e.g., for search indexing via Celery) are bypassed when using raw SQL deletion.

---

## 6. Data Retrieval & Aggregation Guide

This section defines how to retrieve the counts and overviews required for dashboard views (like Organisation List).

### A. Membership Counts ("Why are Org members 0?")
There are two types of membership in the system. When building simple counters, specific queries are needed.

1.  **Direct Organisation Membership** (Admin Layer)
    *   **What:** Users with global roles (Federation Admin) or specific generic roles at the top level.
    *   **Query:** `OrganisationMembership.objects.filter(organisation=org)`
    *   **Typical Count:** Low (1-5 per federation).
    *   **Usage:** Access Control, Federation Management.

2.  **Project Membership** (The Data Layer)
    *   **What:** Players, Coaches, and Staff assigned to specific Teams.
    *   **Query:** `ProjectMembership.objects.filter(project__organisation=org)`
    *   **Typical Count:** High (Hundreds/Thousands).
    *   **Usage:** Rosters, Team assignments.
    *   **To Count "Total Players":** Count distinct Users in ProjectMemberships where `project__organisation=org`.

### B. Project Hierarchy Counts
Since Clubs and Teams share the `Project` model, they are distinguished by the `parent` field and depth.

| Metric | Query Logic | Description |
| :--- | :--- | :--- |
| **Total Clubs** | `Project.objects.filter(organisation=org, parent=None)` | Root-level projects only. |
| **Total Teams** | `Project.objects.filter(organisation=org, parent__isnull=False)` | Sub-projects (the actual squads). |

### C. Operational Volume (Seasons & Matches)
These metrics indicate the "activeness" of the organisation.

| Metric | Query Strategy | Performance Note |
| :--- | :--- | :--- |
| **Seasons** | `Period.objects.filter(project__organisation=org, type='season').count()` | Filter by `type` to exclude Competitions/Rounds. |
| **Matches** | `Activity.objects.filter(project__organisation=org, activity_type='match').count()` | Use index on `project__organisation`. |

### D. Frontend Integration Strategy
To show these stats on `OrganisationListPage` without N+1 queries:

1.  **Backend:** Ensure the `OrganisationSerializer` includes annotated counts (using `Count` and `Subquery`).
    *   `clubs_count`
    *   `teams_count`
    *   `total_members_count` (aggregated sub-projects)
    *   `matches_count`
2.  **Frontend:** Display "Members" as the `total_members_count` (reach), not just the admin count.

---

## 7. Audit Events & Observability

Every significant action (project creation, membership changes, activity updates) generates an **Audit Event**:

*   **Model:** `AuditEvent`
*   **Table:** `audit_events`
*   **Links To:** `project_id` (optional), `user_id`, `organisation_id`
*   **Purpose:** Compliance, debugging, activity feeds

### Audit Event Structure

```python
{
    "id": "uuid",
    "event_type": "project.created",
    "actor": "user@example.com",
    "project_id": "project-uuid",
    "organisation_id": "org-uuid",
    "timestamp": "2026-01-08T10:00:00Z",
    "metadata": {
        "project_name": "Ajax 1",
        "parent_project": "Ajax"
    }
}
```

**FK Constraint:** Audit events must be deleted before deleting the referenced project.

---

## 8. Common Pitfalls & Solutions

### Problem 1: "Why do Organisations show 0 members?"

**Cause:** Querying `OrganisationMembership` instead of `ProjectMembership`.

**Solution:**
```python
# ❌ Wrong (only shows admins)
member_count = OrganisationMembership.objects.filter(organisation=org).count()

# ✅ Correct (shows all players/staff)
member_count = ProjectMembership.objects.filter(project__organisation=org).values('user').distinct().count()
```

### Problem 2: "Users not appearing in Users list"

**Cause:** No `ProjectMembership` records exist linking users to teams.

**Solution:** Run membership seeding:
```bash
python manage.py seed_org_memberships
```

### Problem 3: "FK Constraint violation on deletion"

**Cause:** Django ORM cascades trigger signals (Celery tasks) that fail without Redis.

**Solution:** Use raw SQL deletion in correct order (see Section 5D).

### Problem 4: "Clubs have members but Teams don't"

**Cause:** Members assigned to Club (parent) instead of Team (child).

**Solution:** Always assign to **Team** (the Project with `parent_project_id != None`):
```python
# ❌ Wrong
club = Project.objects.get(name="Ajax", parent_project=None)
ProjectMembership.objects.create(project=club, ...)

# ✅ Correct
team = Project.objects.get(name="Ajax 1", parent_project__name="Ajax")
ProjectMembership.objects.create(project=team, period=season, ...)
```
