# UserActiveContext — Navigation Context

> Last updated: 2026-03-12

## Overview

`UserActiveContext` is het **navigatie-geheugen** van een gebruiker. Het slaat op waar de user zich bevindt in de data-hiërarchie: welke organisatie, welk club, welk team, welk seizoen, welke competitie, welke wedstrijd.

**Doel:** Als een gebruiker terugkomt op het platform, herstelt de app automatisch hun laatste actieve context (club/team/seizoen/wedstrijd) zonder opnieuw te navigeren.

---

## Data Model

```
UserActiveContext (accounts app)
  ├── user         → User (OneToOne, CASCADE) ← exact één per user
  ├── organisation → Organisation (FK, SET_NULL, nullable)
  ├── club         → Project (FK, SET_NULL, nullable)   [parent_project IS NULL]
  ├── team         → Project (FK, SET_NULL, nullable)   [parent_project IS NOT NULL]
  ├── season       → Period (FK, SET_NULL, nullable)    [season-type]
  ├── competition  → Period (FK, SET_NULL, nullable)    [competition-type]
  ├── match        → Activity (FK, SET_NULL, nullable)
  ├── membership   → ProjectMembership (FK, SET_NULL, nullable)
  └── updated_at
```

**8 FK's** — allemaal nullable (SET_NULL) met `related_name="+"` (geen reverse relations).

**Hiërarchie volgt het datamodel:**
```
Organisation
  └── Club (Project, parent=null)
      └── Team (Project, parent=club)
          └── Season (Period, type=season)
              └── Competition (Period, parent=season)
                  └── Match (Activity)
```

---

## API

### Endpoint

```
GET/PATCH  /api/v1/auth/active-context/
```

- **GET:** Haalt de huidige context op — resolved met related data
- **PATCH:** Update een of meer velden (bijv. `{ "team": 5, "season": null }`)

### Resolution Logic

De backend bevat complexe **cascade resolution** (accounts/api/views.py, ~700 regels):

1. **Context switch:** Als `club` verandert → reset `team`, `season`, `competition`, `match`
2. **Team switch:** Als `team` verandert → reset `season`, `competition`, `match` en zoek matching membership
3. **Season switch:** Als `season` verandert → reset `competition`, `match`
4. **Auto-select:** Wanneer een club maar één team heeft → automatisch selecteren
5. **Membership sync:** `sync_membership_for_context()` koppelt automatisch de juiste `ProjectMembership` op basis van de actieve context
6. **Resolve membership:** `resolve_membership_from_context()` zoekt de membership op die past bij de geselecteerde club/team + user

### Cascade Rules

| Veld verandert | Automatisch gereset |
|---------------|---------------------|
| `organisation` | club, team, season, competition, match, membership |
| `club` | team, season, competition, match, membership |
| `team` | season, competition, match |
| `season` | competition, match |
| `competition` | match |

---

## Frontend Integratie

### useResolvedAppContext Hook

```
demo/src/hooks/useResolvedAppContext.ts
```

De primaire hook die de context beheert:
- **Fetch:** GET `/auth/active-context/` bij mount
- **Update:** PATCH bij navigatie-events
- **Event-driven sync:** Luistert naar `ACTIVE_CONTEXT_CHANGED_EVENT` zodat alle componenten in sync blijven

### @django-core/context-switcher Package

```
packages/context-switcher/
```

Dedicated package voor de context-switching UI-component (dropdown/selectors in de header/sidebar).

### Gebruik door andere componenten

De active context stuurt:
- **Sidebar navigatie** — toont data gefilterd op actieve club/team/seizoen
- **Dashboard** — toont activiteiten/statistieken van de actieve context
- **Breadcrumbs** — toont de hiërarchie op basis van context
- **Zoekresultaten** — scoped op actieve organisatie/club

---

## Lifecycle

```
1. User logt in
   └── useResolvedAppContext() → GET /auth/active-context/
       └── Returns saved context (of leeg bij eerste login)

2. User klikt op club "Bernt FC" in sidebar
   └── PATCH /auth/active-context/ { club: 5 }
       ├── Backend reset: team=null, season=null, competition=null, match=null
       ├── Backend auto-select: als club maar 1 team heeft → team=dat_team
       ├── Backend sync: vindt matching ProjectMembership
       └── Returns volledige resolved context

3. Dispatch ACTIVE_CONTEXT_CHANGED_EVENT
   └── Alle luisterende componenten re-fetchen hun data
```

---

## Gerelateerde docs

- [architecture.md](../architecture.md) — accounts app beschrijving
- [../data/tables.md](../data/tables.md) — FK relaties UserActiveContext (8 FK's)
