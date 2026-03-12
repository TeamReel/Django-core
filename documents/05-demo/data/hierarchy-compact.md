# Compact Hierarchy Reference

> ⚠️ **STALE** — Laatste update 2026-02-09. Structuur is mogelijk verouderd. Controleer met productie-data.

> Last updated: 2026-02-09
> Full version: [hierarchy.md](hierarchy.md)

Quick reference for development. Use this for context injection in new modules.

## Quick Stats

| Entity | Count |
|--------|-------|
| Organisations | 8 |
| Clubs | 98 |
| Teams | 227 |
| Seasons | 108 |
| Competitions | 571 |
| Matches | 865 |
| Members | 2,780+ |
| Participations | 1,409 |

## Complete Hierarchy Tree

```
Organisation (Federation)
├── Club (Project, parent=null)
│   ├── Team (Project, parent=Club)
│   │   └── Season (Period, type=season)
│   │       └── Competition (Period, type=competition, parent=Season)
│   │           └── Match (Activity, period=Competition)
│   │               └── Event (goal, card, substitution, etc.)
│   └── Member* (can attach at any level)
└── Member* (org-level staff)

* Member inheritance: If attached to Season → auto-visible at Team, Club, Org
```

## Entity Relationships

### Match (Activity)
| Field | Type | Description |
|-------|------|-------------|
| `period` | FK → Competition | Competition this match belongs to |
| `project` | FK → Team | Team playing the match |
| `activity_type` | string | "match" |
| `scheduled_at` | datetime | Match date/time |
| `opponent` | FK → Project | Away team (nullable) |
| `home_score` / `away_score` | int | Final scores |

### Member (User + Participation)
| Scope | How | Example |
|-------|-----|---------|
| Organisation | `OrganisationMembership` | Federation staff |
| Club | `ProjectMembership` to club | Club director |
| Team | `ProjectMembership` to team | Coach, physio |
| Season | `Participation` to period | Player in 2024/25 squad |

**Inheritance Rule**: Participation at Season → visible at parent Competition, Team, Club, Org

### Participation (B29)
| Field | Type | Description |
|-------|------|-------------|
| `user` | FK → User | The member |
| `project` | FK → Team | Team context |
| `period` | FK → Season | Season context |
| `role` | string | player, staff, coach |
| `squad_number` | int | Jersey number (optional) |

## Organisations (Federations)

| Slug | Name | Clubs | Country |
|------|------|-------|---------|
| `knvb` | KNVB | 23 | 🇳🇱 Netherlands |
| `dfb` | DFB | 18 | 🇩🇪 Germany |
| `the-fa` | The FA | 20 | 🏴󠁧󠁢󠁥󠁮󠁧󠁿 England |
| `figc` | FIGC | 20 | 🇮🇹 Italy |
| `rbfa` | RBFA | 16 | 🇧🇪 Belgium |

## Key Clubs (KNVB - Primary Test Data)

### Ajax (ID: 2)
```
Slug: ajax
Teams:
  - ajax-1 (Eredivisie)
  - jong-ajax (Eerste Divisie)
  - ajax-o21 (O21)
  - ajax-vrouwen (Vrouwen Eredivisie)
  - ajax-eerste-elftal (Legacy)
```

### PSV (ID: varies)
```
Slug: psv
Teams:
  - psv-1 (Eredivisie)
  - jong-psv (Eerste Divisie)
  - psv-o21 (O21)
  - psv-vrouwen (Vrouwen Eredivisie)
  - psv-eerste-elftal (Legacy)
```

### Feyenoord
```
Slug: feyenoord
Teams:
  - feyenoord-1 (Eredivisie)
  - feyenoord-reserves
  - feyenoord-o21 (O21)
  - feyenoord-vrouwen
  - feyenoord-eerste-elftal (Legacy)
```

## Team Naming Patterns

| League | Pattern | Example |
|--------|---------|---------|
| KNVB Eredivisie | `{club}-1` | `ajax-1`, `psv-1` |
| KNVB O21 | `{club}-o21` | `ajax-o21` |
| KNVB Vrouwen | `{club}-vrouwen` | `ajax-vrouwen` |
| KNVB Reserves | `jong-{club}` or `{club}-reserves` | `jong-ajax` |
| DFB Bundesliga | `{club}-1-mannschaft` | `bayern-munchen-1-mannschaft` |
| DFB 2. Liga | `{club}-ii` | `bayern-munchen-ii` |
| FIGC Serie A | `{club}-1a-squadra` | `juventus-1a-squadra` |
| FIGC Primavera | `{club}-primavera` | `juventus-primavera` |
| FA Premier League | `{club}-first-team` | `arsenal-first-team` |
| FA U21 | `{club}-u21` | `arsenal-u21` |
| RBFA | `{club}-a`, `{club}-b` | `club-brugge-a` |

## S3 Storage Paths

### Canonical Structure (v2 - Current)
```
clubs/{club-slug}-{club-id}/
├── logo/{uuid}/filename.ext
├── kits/
│   ├── home/{uuid}/filename.ext
│   ├── away/{uuid}/filename.ext
│   └── third/{uuid}/filename.ext
└── teams/{team-slug}-{team-id}/
    ├── logo/{uuid}/filename.ext
    └── kits/...
```

### Examples
```
clubs/ajax-2/logo/abc123/ajax-logo.png
clubs/ajax-2/teams/ajax-1-94/logo/def456/ajax1-logo.png
clubs/ajax-2/teams/jong-ajax-95/logo/ghi789/jongajax.png
```

### Legacy Paths (Deprecated, auto-migrated)
```
logos/clubs/{id}.png          → clubs/{slug}-{id}/logo/...
logos/{team-slug}/...         → clubs/.../teams/{slug}-{id}/logo/...
players/{soccerwiki_id}.png   → (still in use for player photos)
```

## Period Types

| Type | Example | Parent |
|------|---------|--------|
| `season` | Season 2024/2025 | None |
| `competition` | Eredivisie, Cup, European | Season |

## Match Data (per Competition)

| Competition | Matches | Events |
|-------------|---------|--------|
| Eredivisie | ~34/team | goals, cards, subs |
| Cup | ~5-7/team | goals, cards, subs |
| European | ~6-14/team | goals, cards, subs |

## Member Types (Participation Roles)

| Role | Description | Typical Scope |
|------|-------------|---------------|
| `player` | Squad member | Season → Team |
| `coach` | Head coach | Team or Season |
| `assistant` | Assistant coach | Team or Season |
| `staff` | Technical staff | Team, Club, or Org |
| `medical` | Medical staff | Team or Club |
| `director` | Board member | Club or Org |

## Season Availability

| Club | Seasons |
|------|---------|
| Ajax | 2024/25, 2023/24, 2022/23, 2021/22, 2020/21 |
| PSV | 2024/25, 2023/24, 2022/23, 2021/22, 2020/21 |
| Feyenoord | 2024/25, 2023/24, 2022/23, 2021/22, 2020/21 |
| (Others) | 2024/25 only |

## Competition Types (per Season)

Standard set for Eredivisie clubs:
- Cup
- Eredivisie
- European
- Friendly
- League Cup
- Play-offs
- Youth

## API Context Headers

```
X-Organization-ID: {org-uuid}   # Required for org-scoped operations
```

## Common Test IDs

| Entity | ID | Slug |
|--------|-----|------|
| KNVB (Org) | `80941138-a06d-49a9-819c-12d05745841a` | `knvb` |
| Ajax (Club) | 2 | `ajax` |
| Ajax 1 (Team) | 94 | `ajax-1` |

---

## Usage in Prompts

Copy this block for quick context:

```markdown
**Hierarchy Quick Ref:**
- Orgs: knvb, dfb, the-fa, figc, rbfa
- Test Club: Ajax (slug: ajax, id: 2)
- Test Team: Ajax 1 (slug: ajax-1, id: 94)
- S3 Path: clubs/{slug}-{id}/logo/{uuid}/file.ext
- Team Path: clubs/{club}/teams/{team}/logo/{uuid}/file.ext
- Match: Activity under Competition (Period)
- Member: User + Participation (season-scoped, inherits up)
```

## Entity-Specific S3 Paths

```
# Club assets
clubs/{slug}-{id}/logo/{uuid}/...
clubs/{slug}-{id}/kits/home/{uuid}/...

# Team assets
clubs/{club}/teams/{slug}-{id}/logo/{uuid}/...
clubs/{club}/teams/{slug}-{id}/kits/home/{uuid}/...

# Member assets (player photos)
players/{soccerwiki_id}.png           # Legacy (SoccerWiki import)
members/{user-id}/photo/{uuid}/...    # Future canonical

# Match assets
matches/{match-id}/thumbnail/{uuid}/...
matches/{match-id}/highlights/{uuid}/...
```
