# TeamReel Data Structure Reference

**Last Updated:** 2026-01-08
**Purpose:** Document the hierarchical data model used in the TeamReel demo
**Related Docs:**
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Architecture & Design Decisions
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
*   **Examples:** `Ajax 1`, `Bayern München 1. Mannschaft`, `Inter Milan 1a Squadra`.
*   **Key Characteristics:**
    *   This is the primary "Work Unit".
    *   Seasons and Memberships are attached here.

### Level 4: Season (Team-Scoped Period)
The main time-bound container for a yearly campaign.
*   **Model:** `Period`
*   **Scope:** `project = Team` (e.g., Ajax 1)
*   **Examples:** `Season 2024/2025`.
*   **Key Characteristics:**
    *   **Players are Members here**: `ProjectMembership` links a `User` to the `Team` Project, but scoped to this specific `Period`.
    *   This ensures players are only active for that specific season.

### Level 5: Competition (Sub-Period)
Specific contexts within a season (League, Cup, Friendly).
*   **Model:** `Period` (with `parent_period` set to Season)
*   **Parent:** Season Period
*   **Examples:** `Eredivisie` (NL), `Bundesliga` (DE), `KNVB Beker`.
*   **Metadata:**
    *   `type`: `"league"`, `"cup"`, `"friendly"`.
*   **Key Characteristics:**
    *   Matches are linked to this specific period context.

### Level 6: Match (Activity)
The actual event.
*   **Model:** `Activity`
*   **Linked Project:** The Team (e.g., Ajax 1)
*   **Linked Period:** The Competition (e.g., Eredivisie)
*   **Key Fields:**
    *   `title`: `"Ajax vs PSV"`
    *   `activity_type`: `"match"`
    *   `start_time`: Timezone-aware datetime.
    *   `metadata`: Contains scores, home/away flags, etc.

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

When seeding or querying:
1.  **Find the Team**: Dont dump members on the Club project (`parent_project=None`). Always look for the child project (`Ajax 1`).
2.  **Create Scope**: Create a `Period` tied to `project=team` (the Season).
3.  **Assign Members**: `ProjectMembership.objects.create(project=team, period=season, ...)`
4.  **Create Activities**: `Activity.objects.create(project=team, period=competition, ...)` where `competition.parent = season`.

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
