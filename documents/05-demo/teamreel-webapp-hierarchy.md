# TeamReel Webapp Hierarchy (IA + Data Model)

**Last Updated:** 2026-01-08

Doel: een duidelijke, **webapp-first** structuur die zowel de UI navigatie als de backend data-architectuur volgt. Dit document is de “bron van waarheid” voor hoe we van **Organisation (Bond)** naar **Match** navigeren en welke modellen/relaties daarbij horen.

## 1) Concept: wat is “de app” vs “admin”?

### App (dagelijks gebruik)
Dit zijn pagina’s/features die **normale gebruikers** (Supporter/Team Member) en admins (Team/Club/Land) gebruiken:
- Dashboard
- Search
- Organisations (Bonds) – vooral lezen / context
- Clubs & Teams (Projects)
- Seasons (Periods)
- Squad (Memberships)
- Competitions (Periods)
- Matches (Activities)
- Content (Library + Studio)
- Notifications
- Profile

### Admin (beheer van de webapp)
Dit zijn beheerfuncties die je niet “in de weg” wil hebben in de hoofdapp, en die je **role-based** toont:
- Users / Permissions
- Audit Log
- Usage Events
- Feature Flags
- Credits (alleen voor rollen die credits mogen beheren)
- Governance defaults (policies): BalancePolicy + notification routing
- Platform status (Health/Observability/Integration)

**Superadmin** ziet altijd alles en kan (indien nodig) filteren op organisatie/project.

> TeamReel note: governance defaults worden in productie/demo gezet via `python manage.py seed_teamreel_governance`.

---

## 2) TeamReel domein-hierarchie

De TeamReel demo volgt:

1. **Organisation (Bond/Federatie)**
2. **Project (Club)** (root project: `parent_project = null`)
3. **Project (Team)** (child project: `parent_project = club`)
4. **Season (Period)** (team-scoped period)
5. **Squad (Memberships)** (team members, idealiter season-scoped)
6. **Competition (Period)** (child period van season)
7. **Match (Activity)** (activity gekoppeld aan team + competition)

Visueel:

```mermaid
graph TD
  Org[Organisation: Bond] --> Club[Project: Club]
  Club --> Team[Project: Team]
  Team --> Season[Period: Season]
  Season --> Comp[Period: Competition]
  Comp --> Match[Activity: Match]

  Season -. membership scope .-> Squad[ProjectMemberships (Squad)]
```

---

## 3) Mapping naar Django Core modellen

### 3.1 Organisations (Bonds)
- **Model:** `Organisation`
- **Rol in app:** Multi-tenant root, context voor clubs/teams.

### 3.2 Clubs & Teams (Projects)
- **Model:** `Project`
- **Club:** `parent_project = NULL`
- **Team:** `parent_project = <club>`
- **Belangrijk:** In TeamReel hebben clubs meestal **0 directe memberships**; memberships horen op team.

### 3.3 Seasons & Competitions (Periods)
- **Model:** `Period`
- **Season:** `project = <team>`, `parent_period = NULL`, `type = 'season'` (conventie)
- **Competition:** `project = <team>`, `parent_period = <season>`, `type = 'competition' | 'league' | 'cup' | ...`

### 3.4 Squad (ProjectMembership)
- **Model:** `ProjectMembership`
- **Doel:** wie hoort bij welk team.
- **Aanbevolen (TeamReel):** season-scoped memberships via `period_id` zodat transfers/seizoensselecties kloppen.

### 3.5 Matches (Activities)
- **Model:** `Activity`
- **Match:** `project = <team>` en `period = <competition>` en `activity_type = 'match'`
- **Aanbevolen:** `opponent_project_id` als FK voor tegenstander-selectie (cross-club read).

---

## 4) Webapp IA: URL-structuur (aanbevolen)

Deze URL’s zijn bedoeld als richtlijn voor een “echte” webapp (navigatie voelt natuurlijk; deep-links zijn stabiel).

### 4.1 Bonds (Organisation)
- `/organisations` → lijst bonds
- `/organisations/:orgSlug` → bond dashboard/overzicht

### 4.2 Clubs (Project root)
- `/organisations/:orgSlug/clubs` → lijst clubs binnen bond
- `/organisations/:orgSlug/clubs/:clubId` → club overview

### 4.3 Teams (Project child)
- `/organisations/:orgSlug/clubs/:clubId/teams` → teams binnen club
- `/organisations/:orgSlug/teams/:teamId` → team overview

### 4.4 Seasons (Period)
- `/organisations/:orgSlug/teams/:teamId/seasons` → seasons lijst
- `/organisations/:orgSlug/teams/:teamId/seasons/:seasonId` → season overview

### 4.5 Squad (Memberships)
- `/organisations/:orgSlug/teams/:teamId/seasons/:seasonId/squad` → squad voor season

### 4.6 Competitions (Period child)
- `/organisations/:orgSlug/teams/:teamId/seasons/:seasonId/competitions` → competitions
- `/organisations/:orgSlug/teams/:teamId/seasons/:seasonId/competitions/:competitionId` → competition

### 4.7 Matches (Activities)
- `/organisations/:orgSlug/teams/:teamId/seasons/:seasonId/competitions/:competitionId/matches` → match lijst
- `/matches/:matchId` → match detail (handig als globale deep-link)

---

## 5) Navigatie-principe (top navbar)

### App menu (primair)
- Dashboard
- Search
- Organisations (Bonds)
- Clubs & Teams
- Content + Create Content
- Notifications
- Profile

### Admin menu (secundair)
- Alleen tonen als gebruiker toegang heeft tot minstens 1 admin pagina.
- Superadmin: alles.
- Land/Club/Team Admin: org/project admin pagina’s (Credits/Audit/Usage/Flags/User management waar toegestaan).

---

## 6) RBAC: zichtbaarheid en beheer (high level)

- **Supporter:** vooral read-only (matches/content waar toegang is).
- **Team Member:** read-only + eigen profiel + eigen content (edit own).
- **Team Admin:** team beheren (matches/content/profiles/credits binnen team scope).
- **Club Admin:** club + child teams beheren.
- **Land Admin:** alles binnen bond.
- **Superadmin:** alles cross-organisation + filters.

Belangrijk: UI verbergt admin navigatie, maar **backend blijft de bron van waarheid** (no security by navbar).
