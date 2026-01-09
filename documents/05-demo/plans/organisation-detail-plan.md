# Plan – Organisation/Federation Detail Page (TeamReel Demo)

**Pagina:** Organisation detail (Federation/Bond)

**Doel:** Een federation-dashboard dat (1) context geeft, (2) volledige lijsten van Clubs/Teams/Users binnen de federation toont (met paginering), (3) federation-wide activity info alleen als hoog-over samenvat, en (4) operations/audit zichtbaar maakt zonder de hoofd-UX te vervuilen.

---

## 0) Data model (bron van waarheid)
- Organisation = `Organisation`
- Clubs = root `Project` met `organisation=<org>` en `parent_project IS NULL`
- Teams = child `Project` met `organisation=<org>` en `parent_project IS NOT NULL`
- Seasons/Competitions = `Period` met `organisation=<org>` en in TeamReel meestal `project=<team>`
  - Season: `parent_period IS NULL`
  - Competition: `parent_period=<season>`
- Matches = `Activity` met `project=<team>`, `period=<competition>`, `activity_type="match"`
- Squad:
  - Primair TeamReel: `ProjectMembership(project=<team>, period=<season>)`
  - Alternatief: `Participation(period=<season>, member=<org membership>)`

---

## 1) Routing & URL policy
**Requirements**
- Prefer slugs voor organisations: `/organisations/:orgSlug`.
- Als er nog legacy routes bestaan op ID: canonical redirect naar slug (alleen als slug resolvable).

**Done-check**
- Links vanuit alle children-level pages blijven orgSlug gebruiken.

---

## 2) Page chrome: PageHeader + breadcrumbs + switcher
**Breadcrumb root**
- Breadcrumbs starten bij `/organisations`.

**Switcher (verplicht)**
- Op de federation crumb: switcher met **alle federations** waar de user toegang toe heeft.

**Done-check**
- Switcher verandert de org context zonder “broken” tabs.

---

## 3) Informatie-architectuur (tabs)
**Tab set (definitief voor demo)**
1. Overview
2. Clubs
3. Teams
4. Seasons (hoog-over)
5. Competitions (hoog-over)
6. Matches (hoog-over)
7. Users
8. Governance
9. Audit
10. Operations (Admin)

**Belangrijke regels**
- Clubs/Teams/Users tabs: **alle data zichtbaar** via paginering (geen “top 5 preview”).
- Seasons/Competitions/Matches op federation niveau: **hoog-over** (totals + links naar gefilterde list pages).

---

## 4) Tab specs

### 4.1 Overview tab
**Doel:** dashboard-achtig: kerncijfers + entrypoints.

**Toon minimaal**
- Clubs count (root projects)
- Teams count (child projects)
- Members count (bij voorkeur: distinct users uit `ProjectMembership` binnen org; niet alleen org-admin memberships)
- Seasons/Competitions/Matches totals (hoog-over)

**Actions**
- Knoppen naar Clubs/Teams/Users list views (bij voorkeur als “View all …” binnen relevante tabs, niet als extra nav-card).

**Done-check**
- Geen redundante “Federation navigation” extra blok (TopNavbar + tabs zijn leidend).

### 4.2 Clubs tab
**Query rules**
- Alleen clubs: `organisation=<org>` + `parent_project IS NULL`.
- Als de API al filter ondersteunt (`parent_project__isnull=true`): gebruiken.
- Daarnaast defensief client filteren om teams uit te sluiten.

**UX**
- Tabel/kaarten met: club naam, status, #teams (indien beschikbaar), actions.
- “View” in tabel opent modal (niet navigeren).
- “Open detail” navigeert naar club detail.

**Pagination**
- Server-side paginering als API dit ondersteunt; anders client-side paginering.

### 4.3 Teams tab
**Query rules**
- Alle teams in org: `organisation=<org>` + `parent_project IS NOT NULL`.

**UX**
- Teams gegroepeerd per club (sections/accordion).
- In team-row: “Open” navigeert naar nested team route onder club waar mogelijk.

**Done-check**
- Team links gaan niet per ongeluk naar club detail.

### 4.4 Users tab
**Doel:** federation users (admin + squad universe)

**Query rules**
- Toon zowel:
  - Organisation memberships (org admins)
  - En/of federation-wide “squad users” via `ProjectMembership.project.organisation=<org>` (distinct users)

**UX**
- Paginering.
- Doorklik naar user detail.

### 4.5 Seasons / Competitions / Matches tabs (hoog-over)
**Doel:** niet alles in federation detail, maar wél zicht op volume + recente activiteit.

**Toon minimaal**
- Totals
- Recente items (optioneel)
- Links naar “View all …” list pages met filters (org + eventueel club/team selector)

### 4.6 Governance tab
**Label blijft Governance**
- Binnen tab secties:
  - Feature flags (tenant scoped)
  - Notification settings / routing (prefs + logs)
  - Policies/rules waar aanwezig

**Approval**
- Approval queue: **later** (pas als AI flows end-to-end staan); placement TBD.

### 4.7 Audit tab
- Audit log scoped op federation (links naar audit events met org filter).

### 4.8 Operations (Admin) tab
**Doel:** samenvatting + links naar Admin pages (TopNavbar), federation-scoped.

**Secties**
- Permissions/RBAC
- Feature flags
- Security events
- Integrations status
- Health/Observability/Metrics
- Usage events
- Notification routing logs
- API docs

---

## 5) Content Library (besluit: centraal + ingebed)
**Centraal**
- `/content` als doorzoekbare library met filters (org/club/team/season/match) waar mogelijk.

**Ingebed (Organisation detail)**
- In Overview of Governance: “Content summary/entrypoint” (counts + link naar `/content?org=<org>`).

---

## 6) Implementatie checklist (volgorde)
1. Confirm/normalize route (slug canonical) + breadcrumb root.
2. Add federation breadcrumb switcher.
3. Clubs tab: clubs-only query + pagination + modal view.
4. Teams tab: teams query + group by club + correct nested links.
5. Users tab: decide aggregation (org memberships + project memberships) + pagination.
6. Seasons/Competitions/Matches tabs: totals + links naar filtered list pages.
7. Governance/Audit/Operations tabs: wire up links + minimal summaries.
8. Content entrypoint: add org-scoped link to `/content`.

---

## 7) Definition of Done
- Geen empty states op Clubs/Teams/Users in de demo (tenzij DB echt leeg is → seeder).
- Clubs tab toont alleen root projects (geen teams).
- Teams tab groepeert per club.
- Breadcrumb switcher werkt en behoudt context.
- Federation-wide tabs (Seasons/Competitions/Matches) zijn hoog-over, met duidelijke “view all” flows.
- Operations/Governance/Audit zijn zichtbaar voor juiste roles (backend permissies blijven leidend).
