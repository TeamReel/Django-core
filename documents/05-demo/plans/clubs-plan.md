# Plan – Clubs Pages (TeamReel Demo)

**Pagina’s:**
- Clubs list: `/clubs`
- Club detail: `/organisations/:orgId/projects/:clubId`

**Doel:** Clubs (root Projects) moeten dezelfde “federation-first” stijl hebben als de organisatiepagina: duidelijke breadcrumbs + context, volledige data zichtbaar (geen preview-only), consistente “View = modal / Open = navigate”, en strikte Club-vs-Team scheiding.

---

## 0) Data model (bron van waarheid)
- Federation/Organisation = `Organisation`
- Club = root `Project` met `organisation=<org>` en `parent_project IS NULL`
- Teams onder club = child `Project` met `organisation=<org>` en `parent_project=<club>`

---

## 1) Routing & URL policy
**Requirements**
- Clubs list blijft op `/clubs` (Work list page).
- Club detail gebruikt de bestaande route: `/organisations/:orgId/projects/:clubId`.
- Prefer slugs voor clubs waar beschikbaar: `:clubId` mag slug of id zijn.

**Done-check**
- Links vanuit clubs list en federation detail openen altijd club detail op de juiste route.
- Club detail toont nooit team-data als “club”.

---

## 2) Page chrome: PageHeader + breadcrumbs + switcher

### 2.1 Clubs list (`/clubs`)
**Breadcrumb root (consistent met federations)**
- Breadcrumbs starten bij `/organisations` (niet afhankelijk van sidebar).

**Org context**
- Superadmin: org-selectie via filter (WorkFilterBar) en deep-link support `?org_id=<id|slug>`.
- Niet-superadmin: org filter auto vanuit context.

**Done-check**
- Vanuit federation detail (tab Clubs) → “View all clubs” opent `/clubs?org_id=<orgSlugOrId>`.

### 2.2 Club detail (`/organisations/:orgId/projects/:clubId`)
**Breadcrumbs**
- `Federations` → federation switcher (alle federations waar toegang) → `Clubs` → club naam.

**Switcher scope (verplicht)**
- Federation switcher: alle federations.
- (Optioneel) Club switcher: alleen clubs binnen geselecteerde federation.

**Done-check**
- Switcher behoudt context en navigeert naar de juiste club binnen de gekozen federation.

---

## 3) Informatie-architectuur (tabs)

### 3.1 Clubs list (`/clubs`)
- Geen tabs nodig; filterbar + tabel is genoeg.

### 3.2 Club detail
**Tab set (club-level, demo default)**
1. Overview
2. Teams
3. Seasons (hoog-over)
4. Competitions (hoog-over)
5. Matches (hoog-over)
6. Users / Members (club-level)
7. Governance (club scoped)
8. Audit
9. Operations (Admin)

**Belangrijke regels**
- Teams tab: volledige lijst (paginering of “load all” met server-side paging), geen mix met clubs.
- Seasons/Competitions/Matches op club detail: hoog-over + links naar team-filtered list pages.

---

## 4) Page specs

### 4.1 Clubs list (`/clubs`)
**Query rules**
- Alleen clubs: `parent_project__isnull=true`.
- Filteren op federation: match `club.organisation` met geselecteerde org.

**UX**
- Tabelkolommen: Club, Federation, Status, Actions.
- Actions:
  - **View** opent modal (ProjectDetailModal) met kerninfo.
  - **Open** navigeert naar club detail.
  - (Role-based) Edit/Delete.

**All data visible**
- Als API paging ondersteunt: server-side paging.
- Anders: client-side paging in UI (minimaal 25 per pagina).

**Done-check**
- “View” opent modal; “Open” navigeert.
- `?org_id=` deep link zet filter correct (superadmin).

### 4.2 Club detail – Overview
**Doel**
- Dashboard voor club: context + kerncijfers.

**Toon minimaal**
- Team count (child projects)
- Season/Competition/Match totals (hoog-over)
- Status (active/inactive)

**Done-check**
- Geen “teams shortcut” duplicatie buiten de tabs (tabs leiden).

### 4.3 Club detail – Teams tab
**Query rules**
- Alleen teams binnen club: `parent_project=<club>`.

**UX**
- Tabel met Team, Status, Actions.
- Actions:
  - **View** (modal) optioneel
  - **Open** navigeert naar nested team route: `/organisations/:orgId/projects/:clubId/teams/:teamId`

**Done-check**
- Team links gaan altijd naar de nested team route (niet naar club detail).

### 4.4 Club detail – Seasons/Competitions/Matches (hoog-over)
**Doel**
- Alleen samenvatting + duidelijke entrypoints.

**View all flows**
- Seizoenen/competities/matches list pages vereisen team selectie; club detail biedt daarom:
  - Link naar `/teams?org_id=<org>&club_id=<club>` als eerste stap
  - En/of link direct naar `/seasons?org_id=<org>` met instructie “select team”

**Done-check**
- Gebruiker komt binnen 2 clicks bij een gefilterde lijst.

### 4.5 Club detail – Users / Members
**Doel**
- Club-level zicht op memberships (club admins + team memberships onder deze club).

**Query rules**
- Distinct users uit `ProjectMembership` op teams onder deze club, plus eventuele direct project memberships op de club.

**Done-check**
- Paginering; geen preview-only limiet.

### 4.6 Governance / Audit / Operations
- Governance label blijft “Governance”.
- Audit toont club-scoped events.
- Operations is links/verwijzingen naar admin pages (RBAC/flags/health/usage/notifications) met club context waar mogelijk.

---

## 5) Content Library (centraal + ingebed)
**Centraal**
- `/content` blijft centrale library.

**Ingebed (Club detail)**
- Overview: content-summary + link naar `/content?club=<clubId>` (of `?project_id=` als dat de bestaande filter key is).

---

## 6) Implementatie checklist (volgorde)
1. Clubs list: breadcrumbs consistent + ensure all-data-visible (paging) + modal/open actions.
2. Club detail: breadcrumbs + federation switcher; verify correct club/team separation.
3. Club tabs: Teams + high-over tabs + Users.
4. Governance/Audit/Operations minimal wired.
5. Content entrypoint link.

---

## 7) Definition of Done
- Clubs list toont alleen root projects.
- Club detail toont Teams tab met juiste nested routes.
- Geen preview-only lists: paging aanwezig waar lijsten groot kunnen worden.
- Breadcrumbs/switchers zijn consistent met federation detail.
