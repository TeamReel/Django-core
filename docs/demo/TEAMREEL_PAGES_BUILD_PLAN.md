# TeamReel Demo – Pagina’s Walkthrough & Build Plan

Doel: gestructureerd (en herhaalbaar) alle kernpagina’s nalopen en afmaken zodat de productie-demo (Railway) overal realistische data toont, correcte hiërarchie-navigatie heeft, en geen onverwachte empty states laat zien.

## Scope (volgorde)
1. Federation detail
2. Club detail
3. Team detail
4. Season detail
5. Squad (team/competition squad view)
6. Competition detail
7. Matches (list + match detail)

## Globale regels (guardrails)
- **Navigatie:** Alleen **TopNavbar** is leidend; geen sidebar afhankelijkheden.
- **URL policy:** Prefer **slugs** voor organisations/projects/teams waar beschikbaar; **users blijven ID/UUID**.
- **Hiërarchie altijd zichtbaar:** Vanuit elke detailpagina minimaal naar **bovenliggend** (parent) én **onderliggend** (children) kunnen navigeren.
- **List pages zijn breadcrumb-roots:** Breadcrumbs starten bij de lijstpagina van dat niveau (geen “Dashboard / Federations …” overal hardcoded).
- **Breadcrumbs + Switchers (verplicht op detailpagina’s):** Elke detailpagina heeft breadcrumbs én een **select/switcher** op het relevante breadcrumb-niveau.
  - Federation detail: switcher met **alle federations**.
  - Club detail (binnen federation): club-breadcrumb heeft switcher met **alle clubs binnen die federation**.
  - Team detail (binnen club): team-breadcrumb heeft switcher met **alle teams binnen die club**.
  - Season/Competition/Match: switcher scoped op het **parent** niveau (seasons binnen team, competitions binnen season, matches binnen competition).
- **Geen mock data:** Alles via echte API’s; ontbrekende data → veilige idempotente seeders.
- **Modals:** In overview-tabellen is “View” een **modal** (niet navigeren), consistent met Organisations.
- **Pagina “diepte” (UX):** Hoe hoger in de hiërarchie (Federation/Club), hoe meer **hoog-over / dashboard**. Lager (Team/Season/Competition/Match) wordt de UI **detailgerichter**.

## Data model (verwachte demo-hiërarchie)
- Organisation (Federation)
  - Project (Club) = root project (`parent_project = null`)
    - Project (Team) = child project (`parent_project != null`)
      - Period (Season) = team-scoped root period (`parent_period = null`)
        - Period (Competition) = child period (`parent_period != null`)
          - Activity (Match) = gekoppeld aan team + competition

## Werkwijze per pagina (checklist)
Voor elke pagina:
- **Routing:** klopt de route + slug/id gedrag?
- **Breadcrumbs:** is de breadcrumb-hiërarchie correct voor dit niveau?
- **Breadcrumb switchers:** kan je peers selecteren binnen dezelfde parent-context?
- **Tabs:** tab labels kloppen (Club/Team/Season/Competition) en zijn niet generiek “Projects”.
- **Parent/Child links:** minimaal 1 parent-link en 1 child-link (of “none” met duidelijke empty state).
- **Data load & envelopes:** UI kan `{data:{results}}`, `{results}`, `{data}`, `[]` unwrap’en.
- **Permissions:** Create/Edit/Delete knoppen alleen tonen als permission helper dit toestaat.
- **Empty states:** alleen toegestaan als de DB echt leeg is (en dan seeding uitvoeren).

---

# 1) Federation detail
**Doel:** federation context tonen + clubs onder deze organisation.

**Must-haves**
- **Breadcrumbs aanwezig** met **Federation switcher** (alle federations waar je toegang toe hebt).
- Pagina is **hoog-over** (dashboard-achtig): kerncijfers + navigatie naar lagere niveaus.

## Federation detail = “dashboard + tabs”
Deze pagina is het startpunt binnen een federation. Het moet **alle data zichtbaar** kunnen maken, zonder dat je naar losse list pages móet.

### Tabs (voorstel – relevant per federation)
- **Overview**: KPI’s + snelle navigatie.
- **Clubs**: alle clubs binnen deze federation.
- **Teams**: alle teams binnen deze federation (optioneel: gegroepeerd per club).
- **Seasons**: alle seasons binnen deze federation (via teams).
- **Competitions**: alle competitions binnen deze federation.
- **Matches**: alle matches binnen deze federation.
- **Users**: leden/gebruikers binnen deze federation.
- **Governance/Preferences**: federation settings/policies.
- **Audit**: auditlog scoped op federation.

### “Alle data kunnen zien” (belangrijk)
- In tabellen: **geen hard limit zoals 5 items**.
- Als performance een zorg is: gebruik **server-side paginering** (bijv. `page_size=50` met next/prev) i.p.v. een preview-limit.
- In de tab zelf moet je naar **alle pages** kunnen navigeren zodat uiteindelijk alles zichtbaar is.
- De knop “View all …” blijft OK, maar mag niet de enige manier zijn om alles te zien.

### Clubs tab (spec)
- Tab heet **Clubs** (niet Projects).
- Toont **alleen root projects** voor deze org (geen teams).
- Tabel/kaarten: Club naam, status, #teams (indien beschikbaar), actions.
- Breadcrumb switcher regels blijven gelden.

### Teams tab (spec)
- Toont alle teams binnen federation.
- Indien mogelijk: kolommen Club (parent), Team naam, status.
- Switcher blijft op Federation-niveau in breadcrumb; teams zijn peers binnen federation scope.

### Seasons / Competitions / Matches tabs (spec)
- Doel: “alles binnen federation” zichtbaar maken.
- Filters in tab (minimaal): Team/Club selector (afhankelijk van data availability).
- Match tab: link naar match detail (met correcte breadcrumbs).

### Quick links (optioneel)
- Knoppen/linkjes naar de losse overview pages (Clubs/Teams/Users/Seasons/Competitions/Matches) blijven handig, maar zijn secundair aan tabs.

**Check**
- Count labels in overview: “Clubs” toont clubs-count.
- Links gebruiken `org.slug` waar beschikbaar.

**Validatie**
- Open federation → Clubs tab → controleer dat club-items `parent_project = null` representeren.

---

## Open vragen (Federation detail)

### 1) “Governance” vs “Preferences” – wat wil je hier precies?
Opties:

**Optie A: Tab hernoemen naar “Preferences” (en Governance laten vervallen)**
- ✅ Voordelen: sluit aan bij wat jij verwacht (“Preferences”); eenvoudiger navigatie.
- ❌ Nadelen: als Governance ook policies/roles/audit-achtige dingen bevat, kan dat verwarrend worden.

**Optie B: “Governance” houden, en binnen die tab secties “Preferences/Policies/Feature flags”**
- ✅ Voordelen: governance is een brede container; product-agnostic.
- ❌ Nadelen: jij noemt expliciet “Preferences”; label mismatch.

**Optie C: Twee tabs: “Preferences” + “Governance”**
- ✅ Voordelen: maximale duidelijkheid; scheidt settings vs beleid.
- ❌ Nadelen: meer tabs; kan te druk worden op federation niveau.

⭐ Aanbeveling (voor Core-App demo): **Optie B**
- Rationale: governance is een veilige container op federatieniveau; “Preferences” kan als sectie/kop zichtbaar zijn.
- Als jij het label echt “Preferences” wil hebben in de UI, kies Optie A.

### 2) Hoe wil je “Teams” tonen binnen federation?
- (A) Platte lijst (Team, Club, Status)
- (B) Gegroepeerd per club (accordion/sections)
- (C) Alleen via Club detail (geen federation-wide teams tab)

### 3) Federation-wide Seasons/Competitions/Matches: hoe zwaar mag dit zijn?
- (A) Altijd federation-wide laden met paginering
- (B) Eerst een filter verplicht (kies club/team), daarna data laden
- (C) Alleen totals + “View all” links (maar dit botst met “alle data kunnen zien”)

---

# 2) Club detail
**Doel:** club als “root project” detail met children teams.

**Must-haves**
- **Breadcrumbs aanwezig** met:
  - Federation crumb (optioneel switcher: alle federations)
  - **Club crumb switcher**: alle clubs binnen dezelfde federation (bv. KNVB).
- Pagina is **hoog-over**: club status/leden/teams samenvatting.
- Tabs consistent met design (Overview / Teams / Members / … afhankelijk van huidige implementatie).
- Child navigation: “View Teams” lijst onder club.
- “View” acties in tabellen openen modal.

**Data**
- Project detail endpoint + memberships.
- Teams onder club via project-list filter op `parent_project = club.id` (of org/projects endpoint + filter).

**Validatie**
- Vanuit club detail: klik door naar team detail via nested route.

---

# 3) Team detail
**Doel:** team detail met bovenliggend club en onderliggende seasons.

**Must-haves**
- Route voelt niet als club detail: prefer nested `/organisations/{org}/projects/{club}/teams/{team}`.
- **Breadcrumbs aanwezig** met:
  - **Club crumb switcher**: clubs binnen federation
  - **Team crumb switcher**: teams binnen club (bv. Ajax).
- Pagina is **detailgerichter** dan club: focus op seasons/competitions/matches.
- Parent link terug naar club detail.
- Child link naar seasons (team-scoped).

**Validatie**
- Vanuit Teams list: open team → breadcrumb en header tonen “Team”.

---

# 4) Season detail
**Doel:** season detail met child competitions.

**Must-haves**
- **Breadcrumbs aanwezig** met **Season switcher**: seasons binnen hetzelfde team.
- Season detail tabs: Overview + Competitions.
- Parent link naar team detail.
- Competitions list werkt en toont child periods.

**Validatie**
- Season → open Competition detail.

---

# 5) Squad
**Doel:** squad view (bij competitie/season/team) toont spelers/leden in context.

**Must-haves**
- Squad tab heeft breadcrumbs conform parent page (team/season/competition) met switcher op relevant niveau.
- Squad tab route werkt (geen 404).
- Data via juiste endpoint (competition squad of team memberships) en envelope-parsing.
- Empty state alleen als er echt geen members zijn.

**Validatie**
- Open een competition → Squad tab → lijst met spelers/staff.

---

# 6) Competition detail
**Doel:** competition detail met matches.

**Must-haves**
- **Breadcrumbs aanwezig** met **Competition switcher**: competitions binnen dezelfde season.
- Competition detail tabs: Overview + Matches + Squad (indien aanwezig).
- Parent link naar season detail.
- Matches tab/list toont activities voor deze competition.

**Validatie**
- Competition → Matches tab → open Match detail.

---

# 7) Matches (list + detail)
**Doel:** matches overzicht (filterbaar) + match detail met correcte breadcrumbs.

**Must-haves**
- Matches list: filter op org/team/competition waar mogelijk.
- Match detail: breadcrumb hiërarchie klopt: Federation → Club → Team → Season → Competition → Match (waar data beschikbaar).
- **Breadcrumbs aanwezig** met **Match switcher**: matches binnen dezelfde competition (of minimaal binnen dezelfde competition context).
- Slugs: org/project slugs prefer.

**Validatie**
- Vanuit matches list → match detail → terugnavigatie werkt.

---

## DB/API verificatie (voor wanneer iets leeg lijkt)
Omdat Railway shell niet beschikbaar is:
1. Zet lokaal `DATABASE_URL` naar de Railway **Public** PostgreSQL URL.
2. Draai alleen **read-only** checks of idempotente seeders.

**Snelle checks** (voorbeeld)
- Count clubs/teams:
  - `python manage.py shell -c "..."` of een veilige management command.
- Als er seeders bestaan: run alleen idempotent (`get_or_create` / `update_or_create`).

## Definition of Done (per pagina)
- Page rendert zonder errors.
- Correcte tab labels.
- Parent/child navigatie werkt.
- Geen onverwachte empty states.
- Slug policy gerespecteerd.
- Permissions correct (geen create/edit actions voor users zonder rechten).
