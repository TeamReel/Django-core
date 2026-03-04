# Plan – Teams Pages (TeamReel Demo)

**Pagina’s:**
- Teams list: `/teams`
- Team detail (nested): `/organisations/:orgId/projects/:clubId/teams/:teamId`

**Doel:** Teams (child Projects) moeten dezelfde stijl hebben als federations: duidelijke breadcrumbs + context switchers, volledige data zichtbaar (geen preview-only), en een consistente hiërarchie: Federation → Club → Team → Season → Competition → Match → Squad.

---

## 0) Data model (bron van waarheid)
- Federation/Organisation = `Organisation`
- Club = root `Project` (`parent_project IS NULL`)
- Team = child `Project` (`parent_project=<club>`)
- Season/Competition = `Period` (typisch `project=<team>`, `organisation=<org>`, competition via `parent_period`)
- Match = `Activity` (`project=<team>`, `period=<competition>`, `activity_type="match"`)
- Squad = `ProjectMembership(project=<team>, period=<season>)`

---

## 1) Routing & URL policy
**Requirements**
- Teams list blijft `/teams`.
- Team detail gebruikt de nested route (clubId verplicht): `/organisations/:orgId/projects/:clubId/teams/:teamId`.
- Prefer slugs voor team en club waar beschikbaar.

**Done-check**
- Geen routes waar team per ongeluk als club geopend wordt.
- Alle “Open team” links gebruiken nested route.

---

## 2) Page chrome: PageHeader + breadcrumbs + switchers

### 2.1 Teams list (`/teams`)
**Breadcrumb root**
- Breadcrumbs starten bij `/organisations`.

**Context & deep links**
- Superadmin: filters + deep-link support:
  - `?org_id=<id|slug>`
  - `?club_id=<id|slug>`
  - `?team_id=<id|slug>`

**Done-check**
- Vanuit federation detail Teams tab → “Open Teams List” opent `/teams?org_id=<orgSlugOrId>`.
- Vanuit club detail Teams tab → “View all teams” opent `/teams?org_id=<org>&club_id=<club>`.

### 2.2 Team detail (`/organisations/:orgId/projects/:clubId/teams/:teamId`)
**Breadcrumbs**
- `Federations` → federation switcher
- `Clubs` → club switcher (clubs binnen federation)
- `Teams` → team switcher (teams binnen club)
- huidige team

**Switcher scope (verplicht)**
- Federation switcher: alle federations.
- Club switcher: alleen clubs binnen huidige federation.
- Team switcher: alleen teams onder huidige club.

**Done-check**
- Switchers blijven hiërarchisch (club switch verandert team opties; team switch blijft binnen club).

---

## 3) Informatie-architectuur (tabs)

### 3.1 Teams list (`/teams`)
- Geen tabs nodig; filterbar + tabel.

### 3.2 Team detail
**Tab set (team-level, demo default)**
1. Overview
2. Seasons
3. Competitions
4. Matches
5. Squad
6. Members / Users
7. Governance
8. Audit
9. Operations (Admin)

**Belangrijke regels**
- Seasons/Competitions/Matches: volledige data zichtbaar via paginering (of load-all met server paging).
- Squad tab is de primaire “squad universe” voor demo-realism.

---

## 4) Page specs

### 4.1 Teams list (`/teams`)
**Query rules**
- Alleen teams: `parent_project__isnull=false`.
- Federatie filter: via parent club → `club.organisation` matcht org filter.
- Club filter: match `team.parent_id` (of fallback op `parent_name` als API dat levert).

**UX**
- Tabelkolommen: Team, Club, Federation, Status, Actions.
- Actions:
  - **View** opent modal (ProjectDetailModal) met kerninfo.
  - **Open** navigeert naar team detail nested route.
  - (Role-based) Edit/Delete.

**All data visible**
- Als API paging ondersteunt: server-side paging.
- Anders: client-side paging UI.

### 4.2 Team detail – Overview
**Toon minimaal**
- Status
- Season/Competition/Match counts
- Recente match (optioneel, 1–5)
- Entry points naar Seasons/Competitions/Matches/Squad tabs

### 4.3 Team detail – Seasons tab
**Query rules**
- `Period` filter: `project=<team>` + `type="season"` + `parent_period IS NULL`.

**UX**
- Tabel met season name, date range, #competitions, #matches.
- “Open” navigeert naar season detail route onder team.

### 4.4 Team detail – Competitions tab
**Query rules**
- `Period` filter: `project=<team>` + `parent_period IS NOT NULL`.

**UX**
- Tabel met competition name, parent season, #matches.
- “Open” navigeert naar competition detail route.

### 4.5 Team detail – Matches tab
**Query rules**
- `Activity` filter: `project=<team>` + `activity_type="match"`.

**UX**
- Tabel met date, opponent/home/away, status, score.
- “Open” navigeert naar match detail.

### 4.6 Team detail – Squad tab
**Query rules**
- Primair: `ProjectMembership(project=<team>, period=<season>)`.

**UX**
- Paginering.
- Roles/positions (als `data` beschikbaar).
- Doorklik naar user detail.

### 4.7 Governance / Audit / Operations
- Governance label blijft “Governance”.
- Audit toont team-scoped events.
- Operations: links naar admin pages (RBAC/flags/health/usage/notifications) met team context waar mogelijk.

---

## 5) Content Library (centraal + ingebed)
**Ingebed (Team detail)**
- Overview: content-summary + link naar `/content?team=<teamId>` (of bestaande filter key).

---

## 6) Implementatie checklist (volgorde)
1. Teams list: breadcrumbs consistent + deep-links + ensure all-data-visible + modal/open actions.
2. Team detail: breadcrumb switchers (federation/club/team) correct scoped.
3. Team tabs: Seasons/Competitions/Matches/Squad (paging) + correct routing.
4. Governance/Audit/Operations minimal wired.
5. Content entrypoint link.

---

## 7) Definition of Done
- Teams list toont alleen child projects.
- Team detail gebruikt altijd de nested route en laat club/team hiërarchie duidelijk zien.
- Tabs tonen realistische data (seasons/competitions/matches/squad) zonder preview-limieten.
- Switchers zijn consistent met federation detail en scoped (peers under same parent).
