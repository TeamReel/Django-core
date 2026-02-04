# TeamReel Domain Glossary

> **Purpose**: Canonical definitions, naming conventions, and existing data reference.

---

## 🏛️ Core Domain Concepts

### Organisation
A **football governing body** (bond/federation).

| Canonical Name | Country | Code | Notes |
|----------------|---------|------|-------|
| KNVB | Netherlands | NL | Koninklijke Nederlandse Voetbalbond |
| DFB | Germany | DE | Deutscher Fußball-Bund |
| FIGC | Italy | IT | Federazione Italiana Giuoco Calcio |
| The FA | England | GB | The Football Association |

**In production**: See [state/hierarchy.md](state/hierarchy.md) for currently seeded organisations.

**Naming convention**:
- Use official abbreviation (KNVB, not "Dutch Football Association")
- Store country as ISO 3166-1 alpha-2 (`NL`, `DE`, `IT`, `GB`)

---

### Project (Club)
A **root-level project** without a `parent_project`. Represents a football club.

**Examples**:
| Name | Organisation | Notes |
|------|--------------|-------|
| AFC Ajax | KNVB | Dutch Eredivisie |
| Bayern München | DFB | German Bundesliga |
| Juventus FC | FIGC | Italian Serie A |
| Manchester United FC | The FA | English Premier League |

**Naming convention**:
- Use official club name including suffix (FC, AFC, etc.)
- Example: "AFC Ajax" not "Ajax"
- Example: "Manchester United FC" not "Man Utd"

---

### Project (Team)
A **child project** with a `parent_project` (the club). Represents a specific team within a club.

**Examples**:
| Name | Parent (Club) | Notes |
|------|---------------|-------|
| Ajax 1 | AFC Ajax | First team / senior team |
| Ajax U21 | AFC Ajax | Under-21 team |
| Ajax U19 | AFC Ajax | Youth team |

**Naming convention**:
- `{ClubShort} {Designation}`
- Use "1" for first team, not "Eerste Elftal" or "First Team"
- Use "U21", "U19", etc. for youth (not "Under 21")
- Use "A2" for second senior team if applicable

---

### Period (Season)
A **root-level period** without a `parent_period`. Represents a football season.

**Examples**:
| Name | Format | Notes |
|------|--------|-------|
| 2024/2025 | YYYY/YYYY | Dutch/European standard |
| 2024-25 | YYYY-YY | Alternative (avoid) |

**Naming convention**:
- Always use `YYYY/YYYY` format (e.g., "2024/2025")
- Never use "24/25" or "2024-2025"
- Season starts in August, ends in May

---

### Period (Competition)
A **child period** with a `parent_period` (the season). Represents a competition/tournament.

**Examples**:
| Name | Parent (Season) | Organisation | Notes |
|------|-----------------|--------------|-------|
| Eredivisie | 2024/2025 | KNVB | Dutch top division |
| KNVB Beker | 2024/2025 | KNVB | Dutch cup |
| Champions League | 2024/2025 | UEFA | European competition |
| Bundesliga | 2024/2025 | DFB | German top division |

**Naming convention**:
- Use official competition name
- No "The" prefix ("Eredivisie", not "The Eredivisie")
- Include year in parent, not in competition name

---

### Match
A **scheduled or completed fixture** between two teams.

**Key fields**:
- `home_project` → Team (Project with parent)
- `away_project` → Team (Project with parent)
- `period` → Competition (Period with parent)
- `scheduled_at` → DateTime of kickoff

**Naming convention**:
- Match display: `{Home} vs {Away}` (not "v" or "-")
- Example: "Ajax 1 vs Feyenoord 1"

---

### MatchTemplate
A **template** defining match structure (formation slots, positions).

**Examples**:
| Name | Formation | Notes |
|------|-----------|-------|
| 4-3-3 Standard | 4-3-3 | Standard 11v11 with subs |
| 3-5-2 Defensive | 3-5-2 | Alternative formation |

**Naming convention**:
- `{Formation} {Variant}`
- Formation uses dashes: "4-3-3" not "433"

---

## 🔑 Natural Keys for Idempotent Seeding

Each model has a **natural key** for `update_or_create`:

| Model | Natural Key | Example |
|-------|-------------|---------|
| Organisation | `slug` | `"knvb"` |
| Project (Club) | `slug` + `organisation` | `"afc-ajax"` + KNVB |
| Project (Team) | `slug` + `parent_project` | `"ajax-1"` + AFC Ajax |
| Period (Season) | `slug` + `project` | `"2024-2025"` + Ajax 1 |
| Period (Competition) | `slug` + `parent_period` | `"eredivisie"` + 2024/2025 |
| Match | `external_id` OR `home+away+scheduled_at` | Composite key |
| User | `email` | `"player@example.com"` |

---

## 🏗️ Hierarchy Diagram

```
Organisation (KNVB)
├── Project/Club (AFC Ajax)
│   ├── Project/Team (Ajax 1)
│   │   ├── Period/Season (2024/2025)
│   │   │   ├── Period/Competition (Eredivisie)
│   │   │   │   ├── Match (Ajax 1 vs Feyenoord 1)
│   │   │   │   ├── Match (Ajax 1 vs PSV)
│   │   │   │   └── ...
│   │   │   ├── Period/Competition (KNVB Beker)
│   │   │   └── Period/Competition (Champions League)
│   │   └── Period/Season (2023/2024)
│   ├── Project/Team (Ajax U21)
│   └── Project/Team (Ajax U19)
├── Project/Club (Feyenoord Rotterdam)
└── Project/Club (PSV Eindhoven)
```

---

## 📐 FK Relationship Map

```
┌──────────────┐
│ Organisation │
└──────┬───────┘
       │ 1:N
┌──────▼───────┐
│  Project     │──┐
│  (Club)      │  │ parent_project (self-ref)
└──────┬───────┘  │
       │ 1:N      │
┌──────▼───────┐◄─┘
│  Project     │
│  (Team)      │
└──────┬───────┘
       │ 1:N
┌──────▼───────┐
│   Period     │──┐
│  (Season)    │  │ parent_period (self-ref)
└──────┬───────┘  │
       │ 1:N      │
┌──────▼───────┐◄─┘
│   Period     │
│ (Competition)│
└──────┬───────┘
       │ 1:N
┌──────▼───────┐
│    Match     │
└──────────────┘
```

---

## 🌐 External IDs & Integration

When integrating with external data sources:

| Source | ID Format | Storage Field |
|--------|-----------|---------------|
| Transfermarkt | Integer | `external_id` |
| WhoScored | Integer | `external_id` |
| Opta | String (UUID) | `external_id` |
| Internal | UUID | `id` (default) |

**Convention**: Store external IDs in `metadata` JSON if multiple sources:
```python
metadata = {
    "transfermarkt_id": 12345,
    "whoscored_id": 67890
}
```

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-04 | Initial glossary |
