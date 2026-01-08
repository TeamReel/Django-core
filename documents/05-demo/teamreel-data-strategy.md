# TeamReel Data Strategy - Django Core Mapping

**Last Updated:** 2026-01-08
**Purpose:** Master architecture document defining TeamReel's data model and design principles
**Status:** ✅ Design Decisions Confirmed
**Related Docs:**
- [TeamReel Data Structure](teamreel-data-structure.md) - Practical hierarchy examples
- [TeamReel RBAC Configuration](teamreel-rbac-config.md) - Permission model implementation
- [TeamReel Database Audit](teamreel-db-audit.md) - Current database state
- [index.md](index.md) - Documentation overview

---

## 🎯 Kernprincipes

1. **Stamdata cascade:** Data erft naar beneden (Land → Club → Team → Seizoen)
2. **Stap-voor-stap opbouw:** Elk niveau wordt compleet ingevuld voordat we verder gaan
3. **Metadata-driven:** Elk niveau heeft eigen metadata voor stamdata
4. **Herbruikbaar:** Dezelfde structuur werkt voor alle sporten
5. **User-centric:** Elke club ziet eigen competitie-view (geen gedeelde Periods)
6. **Pre-filled data:** Maximaal hergebruiken van club stamdata voor gebruiksgemak

---

## ✅ Design Decisions (Confirmed)

| Vraag | Beslissing | Rationale |
|-------|------------|-----------|
| **1. Sport-type niveau** | **Optie B: Club niveau** | Club bepaalt sport; geen omnisport scenario's. `club.metadata->>'sport'` |
| **2. Competitie scope** | **Optie B: Per-club** | Elke club beheert eigen competitie-view. Matches zijn "owned" door home team. |
| **3. Speler koppeling** | **Optie B: Period (Seizoen)** | `Membership.period_id` voor seizoen-specifieke selecties en transfers. |
| **4. Activity types** | **Optie B: Enum/Choices** | Vaste lijst in Django model voor type-safety en gebruiksgemak. |
| **5. Venue/Location** | **Optie A: Metadata only** | Stadium blijft in `club.metadata`, wordt automatisch ingevuld bij activities. |
| **6. Opponent reference** | **ForeignKey to Project** | Tegenstander is ForeignKey naar ander Project (niet string in metadata). |
| **7. Visibility levels** | **Hierarchical permissions** | Club-level: zie ALLES. Team-level: alleen eigen teams bewerken. |
| **8. User vs Character** | **Separation of concerns** | User = fysieke persoon (1x). Character/Membership = rol binnen team (meerdere mogelijk). |

---

## 🔐 Permission & Visibility Architecture

### Hierarchische Rollen

| Role Level | Scope | Read Access | Write Access | Credit Management | Example |
|------------|-------|-------------|--------------|-------------------|---------|
| **Land Admin** | Organisation-wide | Alle clubs/teams binnen land | Alle clubs/teams binnen land | Alle credits | KNVB beheerder |
| **Club Admin** | Club-wide | **ALLE clubs** (cross-club) <br> Alle teams binnen eigen club | Alleen eigen club + teams | Club-level credits | Ajax media manager |
| **Team Admin** | Team-specific | Alle teams binnen eigen club <br> **ALLE clubs** (read-only) | Team settings + **alle team matches** | Team credits only | Eerste Elftal coach |
| **Team Member** | User-specific | Eigen team <br> Andere teams binnen club (read-only) | **Only own user profile** (naam, foto, geboortedatum) | Cannot manage credits | Speler, assistent |
| **Supporter** | External viewer | Team content (if granted access) | None (read-only) | Cannot manage credits | Fan, ouder, sponsor |

### Visibility Matrix (Updated)

```
                    │ Own Profile │ Team Matches │ Team Content │ Other Teams │ Other Clubs │ Credits │
────────────────────┼─────────────┼──────────────┼──────────────┼─────────────┼─────────────┼─────────┤
Land Admin          │    R + W    │    R + W     │    R + W     │    R + W    │    R + W    │  Manage │
Club Admin          │    R + W    │    R + W     │    R + W     │    R + W    │    R only   │  Manage │
Team Admin          │    R + W    │    R + W     │    R + W     │    R only   │    R only   │  Manage │
Team Member         │    R + W    │    R only    │    R only*   │    R only   │      -      │    -    │
Supporter           │      -      │    R only**  │    R only**  │      -      │      -      │    -    │
────────────────────┴─────────────┴──────────────┴──────────────┴─────────────┴─────────────┴─────────┘

R = Read, W = Write
* = Can create content (line-ups, posts), but cannot edit matches
** = Only if explicitly granted access to team
```

### Key Principles

1. **Club-level = Database Browser:** Je kunt ALLE clubs zien (om tegenstanders te selecteren)
2. **Team-level = Sandboxed:** Je kunt alleen je eigen team(s) bewerken
3. **Match ownership:** Team Admins kunnen wedstrijden aanmaken/aanpassen, Team Members NIET
4. **Profile ownership:** Team Members kunnen alleen **eigen profiel** bewerken (naam, foto, geboortedatum)
5. **Cross-club visibility:** Altijd read-only (om wedstrijdgegevens tegenstander op te halen)
6. **Within-club visibility:** Siblings binnen club zijn zichtbaar maar niet bewerkbaar (tenzij je Club Admin bent)
7. **Supporter access:** External viewers kunnen content **bekijken** als ze toegang krijgen (geen edit rechten)
8. **Credits per Team:** Credits beheerd op team-niveau, alleen Team Admin kan credit-transacties doen
9. **Feature Flags hierarchy:** Hoger niveau (Land/Club) kan meer feature flags beheren dan lager niveau (Team)

---

## � Content Metadata Requirements

### Content Generation Context

Per **Seizoen** en per **Match** moet content gegenereerd kunnen worden met maximaal vooraf ingevulde data.

**Kernvelden voor Content Generation:**

| Categorie | Velden | Bron | Auto-Fill |
|-----------|--------|------|-----------|
| **Locatie** | Stadium, City, Address | Club metadata | ✅ Yes |
| **Datum/Tijd** | Match date, Match time, Season | Activity.start_time, Period | ✅ Yes |
| **Teams** | Home team, Away team (opponent) | Activity.project_id, Activity.opponent_project_id | ✅ Yes |
| **Clubdata** | Logo, Colors, Sponsor | Club metadata (via ForeignKey) | ✅ Yes |
| **Uitslag** | Score, Scorers (doelpuntmakers) | Activity.metadata | ⚠️ Manual/Post-match |
| **Opstelling** | Starting 11, Subs, Formation | MatchLineup entity (linked to Activity) | ⚠️ Manual/Pre-match |
| **Tactiek** | Formation (4-3-3, 4-4-2), Strategy | MatchLineup.metadata | ⚠️ Manual/Pre-match |
| **Wedstrijdcontext** | Competition, Round, Referee | Period metadata, Activity.metadata | ✅ Yes (competition), ⚠️ Manual (referee) |

### Metadata Hierarchy for Content

```
SEASON (Period)
├─ metadata: {"season": "2024/2025", "start_date": "...", "end_date": "..."}
│
└─> COMPETITION (Period - child)
    ├─ metadata: {"competition_name": "Eredivisie", "competition_type": "league"}
    │
    └─> MATCH (Activity)
        ├─ start_time: "2024-11-10 14:30:00"
        ├─ project_id: Ajax Eerste (ForeignKey) → Inherit: logo, colors, stadium
        ├─ opponent_project_id: PSV Eerste (ForeignKey) → Inherit: opponent logo, colors
        ├─ metadata: {
        │     "is_home": true,
        │     "round": 12,
        │     "referee": "Danny Makkelie",
        │     "score": "2-1",  // Post-match
        │     "scorers": ["Brobbey 23'", "Tadic 67'"],  // Post-match
        │     "attendance": 54990
        │   }
        │
        └─> MATCH LINEUP (New entity - proposed)
            ├─ match_id: Activity ForeignKey
            ├─ formation: "4-3-3"
            ├─ starting_11: [User IDs array]
            ├─ substitutes: [User IDs array]
            ├─ metadata: {
            │     "tactic": "High press",
            │     "captain_id": <user_id>,
            │     "positions": {
            │         "<user_id>": {"position": "GK", "number": 1},
            │         "<user_id>": {"position": "LB", "number": 3},
            │         ...
            │     }
            │   }
```

---

## 🆕 Proposed New Entity: MatchLineup

**Rationale:** Opstelling en tactiek zijn complex genoeg om aparte entiteit te rechtvaardigen (niet alleen metadata).

### MatchLineup Model

```python
# src/activities/models.py

class MatchLineup(BaseModel):
    """
    Lineup/Opstelling for a specific match.
    Links Users (players) to their positions in a match formation.
    """
    activity = models.OneToOneField(
        Activity,
        on_delete=models.CASCADE,
        related_name='lineup',
        help_text="Match this lineup belongs to"
    )

    formation = models.CharField(
        max_length=20,
        default='4-3-3',
        help_text="Formation (4-3-3, 4-4-2, 3-5-2, etc.)"
    )

    starting_players = models.ManyToManyField(
        User,
        through='LineupPosition',
        related_name='match_starts',
        help_text="Players in starting 11"
    )

    substitutes = models.ManyToManyField(
        User,
        related_name='match_subs',
        help_text="Substitute players"
    )

    captain = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='captain_of_matches',
        help_text="Team captain for this match"
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Tactical info: strategy, notes, formation_details"
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_lineups'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Match Lineup"
        verbose_name_plural = "Match Lineups"

    def __str__(self):
        return f"Lineup for {self.activity.title} ({self.formation})"


class LineupPosition(BaseModel):
    """
    Through model to link User to MatchLineup with specific position.
    """
    lineup = models.ForeignKey(MatchLineup, on_delete=models.CASCADE)
    player = models.ForeignKey(User, on_delete=models.CASCADE)

    position = models.CharField(
        max_length=10,
        help_text="Position code: GK, LB, CB, RB, LM, CM, RM, LW, ST, RW, etc."
    )

    jersey_number = models.IntegerField(
        help_text="Jersey number for this match"
    )

    class Meta:
        unique_together = [['lineup', 'player']]
        verbose_name = "Lineup Position"
        verbose_name_plural = "Lineup Positions"
```

**Voordelen:**
1. ✅ **Opstelling gescheiden van match data** (cleaner schema)
2. ✅ **Positions zijn type-safe** (niet alleen JSON blob)
3. ✅ **Query-able:** "Toon alle matches waar Brobbey starter was"
4. ✅ **Reusable formations:** Template formations kunnen hergebruikt worden
5. ✅ **Content generation:** Easy access to lineup data via `activity.lineup.starting_players.all()`

---

---

## 🤔 Ontbrekende Hiërarchie Niveaus? (Assessment)

### Current 6-Level Hierarchy

```
1. Land/Federatie (Organisation)
2. Club (Project, parent=NULL)
3. Team (Project, parent=Club)
4. Seizoen (Period, parent=NULL)
5. Competitie (Period, parent=Seizoen)
6. Wedstrijd (Activity)
   └─> 🆕 MatchLineup (proposed)
```

### Potential Missing Levels

#### ❓ Option A: Match Events as Sub-Entities

**Scenario:** Wedstrijd heeft meerdere events (goals, substitutions, cards).

```
MATCH (Activity)
  └─> MATCH EVENT (New: MatchEvent)
      ├─ Type: Goal (scorer, assist, minute)
      ├─ Type: Card (player, type: yellow/red, minute)
      ├─ Type: Substitution (player_out, player_in, minute)
```

**Voordelen:**
- ✅ Gestructureerde data voor doelpuntmakers, wissels, kaarten
- ✅ Timeline van wedstrijd is query-able
- ✅ Content generation kan timeline tonen

**Nadelen:**
- ❌ Meer complexiteit in data model
- ❌ Moet handmatig ingevoerd worden (niet auto-fill)

**Aanbeveling:** ⏳ **Niet nodig voor MVP**, maar wel nuttig voor toekomstige fase (Fase 6-7 match analysis features).

**Alternatief (MVP):** Gebruik `Activity.metadata->>'scorers'` als list (simpeler).

---

#### ❓ Option B: Training Sessions & Practice Activities

**Scenario:** Team heeft niet alleen wedstrijden, maar ook trainingen.

```
COMPETITION (Period)
  ├─> MATCH (Activity, type="match")
  └─> TRAINING (Activity, type="training")
      ├─ No opponent (opponent_project_id=NULL)
      ├─ Location: club stadium or training ground
      ├─ Attendance: optional (for tracking participation)
```

**Voordelen:**
- ✅ Volledig overzicht van team activiteiten
- ✅ Aanwezigheid tracking voor trainingen
- ✅ Content generation voor training reports

**Nadelen:**
- ⚠️ Out of scope voor TeamReel? (primair focus op wedstrijden)

**Aanbeveling:** ⏳ **Check TeamReel scope** - Als trainingen ook content genereren → toevoegen. Anders skip voor MVP.

---

#### ❓ Option C: Squad/Roster as Separate Entity

**Scenario:** Seizoensselectie is een aparte entiteit (niet alleen Membership).

```
SEASON (Period)
  └─> SQUAD (New: TeamSquad)
      ├─ Team: Ajax Eerste
      ├─ Season: 2024/2025
      ├─ Players: [User IDs] via ManyToMany
      ├─ Metadata: {"squad_size": 25, "positions_filled": {...}}
      │
      └─> Used by: MatchLineup (only squad players can be in lineup)
```

**Voordelen:**
- ✅ Duidelijke scheiding tussen "lid van team" vs "in selectie voor seizoen"
- ✅ Squad changes (transfers) zijn trackable
- ✅ Lineup validation: alleen squad members kunnen in opstelling

**Nadelen:**
- ❌ **Duplicatie:** `Membership.period_id` doet dit al (link User ↔ Period)
- ❌ Extra complexiteit zonder veel meerwaarde

**Aanbeveling:** ❌ **Niet toevoegen** - `Membership` + filtering op `period_id` is voldoende.

---

#### ❓ Option D: Tournament/Knockout Stages

**Scenario:** Bekercompetities hebben knock-out rondes (1/16, 1/8, kwart, halve, finale).

```
COMPETITION (Period: "KNVB Beker 2024/2025")
  ├─> ROUND (New: CompetitionRound)
  │     ├─ Type: "1/16 Finale"
  │     ├─ Start date: "2024-12-15"
  │     └─> MATCHES belonging to this round
  │
  ├─> ROUND: "1/8 Finale"
  └─> ROUND: "Kwartfinale"
```

**Voordelen:**
- ✅ Structure voor knock-out competities
- ✅ Content generation per ronde (bracket visualization)

**Nadelen:**
- ⚠️ Kan ook via `Activity.metadata->>'round'` (simpeler)
- ❌ Niet alle competities hebben rondes (league = 34 speelrondes, geen knock-out)

**Aanbeveling:** ❌ **Niet toevoegen als entiteit** - Gebruik `Activity.metadata->>'round'` voor beide scenario's:
- League: `{"round": 12}` (speelronde 12)
- Cup: `{"round": "1/8 Finale"}` (knock-out fase)

---

### 🎯 Final Hierarchy Assessment

**Aanbevolen toevoegingen:**
1. ✅ **MatchLineup** (Opstelling) - Essential for content generation
2. ⏳ **MatchEvent** (Goals/Cards/Subs) - Useful but Fase 6+ feature
3. ❓ **Training Activities** - Depends on TeamReel scope (check with business docs)

**Niet toevoegen (use metadata instead):**
- ❌ Squad entity (Membership + period_id is sufficient)
- ❌ CompetitionRound entity (use Activity.metadata->>'round')

**Final Hierarchy (with additions):**
```
1. Land/Federatie (Organisation)
2. Club (Project, parent=NULL)
3. Team (Project, parent=Club)
4. Seizoen (Period, parent=NULL, type="season")
   └─ Players linked via Membership.period_id
5. Competitie (Period, parent=Seizoen, type="competition")
6. Wedstrijd (Activity, type="match")
   ├─ opponent_project_id (ForeignKey to Project)
   ├─ metadata: {score, scorers, attendance, round, referee}
   └─> MatchLineup (opstelling + tactiek)
       ├─ starting_players (ManyToMany User)
       ├─ substitutes (ManyToMany User)
       ├─ formation ("4-3-3")
       └─ metadata: {tactic, positions, captain}

Optional (Fase 6+):
7. Match Events (MatchEvent)
   ├─ activity (ForeignKey to Activity)
   ├─ event_type (Goal, Card, Substitution)
   ├─ minute (int)
   ├─ player (ForeignKey to User)
   └─ metadata (event-specific details)
```

---

## 🔍 Gap Analysis: TeamReel vs Django Core

### ✅ Wat ZIT er al in de codebase (DONE modules)?

| TeamReel Feature | Django Core Module | Status | Notes |
|------------------|-------------------|---------|-------|
| **Period hierarchy** | ✅ **B30 Activities** (`src/activities/`) | **DONE** | Complete unlimited-depth hierarchy |
| **Activity model** | ✅ **B30 Activities** | **DONE** | Generic activity with flexible type |
| **Participation** | ✅ **B30 Activities** | **DONE** | Links members to periods/activities |
| **File/Media management** | ✅ **B22 Files** (`src/files/`) | **DONE** | Storage adapters, thumbnails, ACL |
| **Organisations** | ✅ **B06** (`src/organisations/`) | **DONE** | Multi-tenant organisations |
| **Projects** | ✅ **B07** (`src/projects/`) | **DONE** | Hierarchical workspaces |
| **Membership** | ✅ **B07** | **DONE** | User ↔ Project roles |
| **Credits/Transactions** | ✅ **B11** (`src/credits/`, `src/transactions/`) | **DONE** | Account-based credits |
| **Notifications** | ✅ **B16 + B17** (`src/notifications/`) | **DONE** | Multi-level notifications |
| **Feature Flags** | ✅ **B10** (`src/settings/`) | **DONE** | Hierarchical flags |
| **Audit Logging** | ✅ **B09** (`src/audit_trail/`) | **DONE** | Full audit trail |
| **Magic Link auth** | ✅ **B05** (`src/accounts/`) | **DONE** | Passwordless login |

**Conclusie:** 🎉 **Alle basis infrastructure is COMPLEET!**

---

### 🚨 Wat ONTBREEKT (niet in codebase, niet in roadmap)?

#### 1. **ContentTemplate + ContentItem + ContentApproval** 🔴 **CRITICAL**

**TeamReel heeft:**
```python
ContentTemplate:  # Reusable templates (Line-up Video, Match Flyer)
  - name, template_type (pre/during/post-match)
  - ai_workflow_id (link to LangGraph)
  - template_settings (JSON)

ContentItem:  # Instance of generated content
  - template (FK), team (FK), match (FK)
  - status (generating/completed/approved/rejected)
  - input_data (JSON), output_url (S3)
  - created_by, approved_by

ContentApproval:  # Feedback workflow
  - content_item (FK), reviewer (FK)
  - status (pending/approved/rejected)
  - feedback_text
```

**Django Core heeft:**
- ❌ Geen ContentTemplate model
- ❌ Geen ContentItem model
- ❌ Geen ContentApproval model
- ✅ File upload/storage via B22 (kan output_url hosten)
- ✅ Notifications via B17 (kan "ready for approval" triggeren)

**Status:** **NIET in roadmap** (noch planned modules)

**Impact:** 🚨 **Showstopper** - Zonder dit kunnen gebruikers geen content genereren!

**Aanbeveling:** 🔴 **TOEVOEGEN ALS NIEUW MODULE** → Voorgesteld: **B33 Content Templates & Generation**

---

#### 2. **Opponent ForeignKey in Activity** 🟡 **MEDIUM**

**TeamReel heeft:**
```python
Activity:
  - opponent_project_id: ForeignKey to Project  # PSV Eerste Elftal
```

**Django Core heeft:**
```python
Activity:
  - metadata: JSONField  # Can store opponent as string, but not FK
```

**Status:** Model bestaat, maar **ForeignKey ontbreekt**

**Impact:** Geen database-driven opponent data, moet handmatig in metadata

**Aanbeveling:** ✅ **Toevoegen via migration** (simpele FK add)

---

#### 3. **Membership.period_id** 🟡 **MEDIUM**

**TeamReel heeft:**
```python
Membership:
  - period_id: ForeignKey to Period  # Link player to season
```

**Django Core heeft:**
```python
Membership:
  - project: ForeignKey to Project
  # No period_id
```

**Status:** Model bestaat, maar **period_id ontbreekt**

**Impact:** Kan spelers niet linken aan specifiek seizoen (alleen aan team)

**Aanbeveling:** ✅ **Toevoegen via migration** (simpele FK add)

---

#### 4. **CharacterRole.SUPPORTER** 🟢 **LOW**

**TeamReel heeft:**
```python
CharacterRole:
  - SUPPORTER = "supporter"  # Read-only external viewer
```

**Django Core heeft:**
```python
# Check projects/models.py for current roles
```

**Status:** Te checken - mogelijk al in roadmap of bestaande roles

**Impact:** Klein - kan via permissions workaround

**Aanbeveling:** ⚠️ **Check current roles eerst**, dan toevoegen als ontbreekt

---

#### 5. **Goalkeeper Outfit Metadata** 🟡 **MEDIUM**

**TeamReel heeft:**
```python
Club.metadata:
  - goalkeeper_color: "#00FF00"  # Different from field players
  - outfit_variants: ["home", "away", "goalkeeper"]
```

**Django Core heeft:**
```python
Project.metadata:
  - colors: ["#FF0000", "#FFFFFF"]  # Generic
```

**Status:** Kan in metadata, maar **geen schema validatie**

**Impact:** AI kan geen keeper-tenue genereren (andere kleur)

**Aanbeveling:** ⚠️ **Uitbreiden in Fase 2** - Voor MVP: gebruik `colors[2]` als keeper kleur

---

### 📊 PRIORITIZED FEATURE GAPS

| Feature | In Codebase? | In Roadmap? | Priority | MVP Action |
|---------|--------------|-------------|----------|------------|
| **Period + Activity** | ✅ **YES (B30)** | ✅ Done | - | None needed |
| **Files/Media** | ✅ **YES (B22)** | ✅ Done | - | None needed |
| **ContentTemplate/Item/Approval** | ❌ **NO** | ❌ **NO** | 🔴 **CRITICAL** | ✅ **CREATE NEW MODULE** |
| **Activity.opponent_project_id** | ❌ NO (field) | ❌ NO | 🟡 MEDIUM | ✅ **Add migration** |
| **Membership.period_id** | ❌ NO (field) | ❌ NO | 🟡 MEDIUM | ✅ **Add migration** |
| **CharacterRole.SUPPORTER** | ❓ Unknown | ❓ Unknown | 🟢 LOW | ⚠️ **Check first** |
| **Goalkeeper outfit metadata** | ⚠️ Partial | ❌ NO | 🟡 MEDIUM | ⚠️ **Simplified MVP** |

---

### 🎯 ACTION PLAN

#### Phase 1: Check Current State (1 hour)
```bash
# 1. Check current Membership roles
grep -r "CharacterRole\|MemberRole" src/projects/

# 2. Check current Activity fields
grep -A 20 "class Activity" src/activities/models.py

# 3. Check B30 demo pages
ls -la demo/src/pages/*activities*
```

#### Phase 2: Database Migrations (2 hours)
```python
# Migration 1: Add opponent_project to Activity
# src/activities/migrations/00XX_add_opponent_project.py
operations = [
    migrations.AddField(
        model_name='activity',
        name='opponent_project',
        field=models.ForeignKey(
            'projects.Project',
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name='opponent_activities'
        )
    )
]

# Migration 2: Add period to Membership
# src/projects/migrations/00XX_add_period_to_membership.py
operations = [
    migrations.AddField(
        model_name='membership',
        name='period',
        field=models.ForeignKey(
            'activities.Period',
            on_delete=models.CASCADE,
            null=True,
            blank=True,
            related_name='memberships'
        )
    )
]
```

#### Phase 3: NEW MODULE - B33 Content Templates (8 hours)
```
Structure:
src/content/
  ├── __init__.py
  ├── models.py (ContentTemplate, ContentItem, ContentApproval)
  ├── admin.py
  ├── serializers.py
  ├── views.py
  ├── urls.py
  └── README.md

Demo page:
demo/src/pages/content/
  ├── templates.tsx (browse templates)
  ├── generate.tsx (create content)
  ├── approve.tsx (review & approve)
  └── library.tsx (content archive)
```

#### Phase 4: Database Rebuild (1 hour)
Gebruik de 8-step SQL rebuild (zie verderop in document)

---

### 🆕 PROPOSED NEW MODULES

**Module #040: B31 Content Templates & Generation**

**Roadmap Position:** Fase 10 (Content Engine Core) - tussen B30 (Activities) en B32 (Sport Configuration)

**Module ID:** `040-B31-content-templates-and-generation.md`

**Doel:** Reusable templates voor AI-content generatie met approval workflow

**Dependencies:**
- ✅ B30 (Activities) - Link content to matches/events
- ✅ B22 (Files) - Store generated media
- ✅ B17 (Notifications) - Alert users when content ready
- ✅ B09 (Audit Trail) - Track generations
- 🆕 B32 (Sport Configuration) - Sport-specific template validation

---

**Module #041: B32 Sport Configuration & Templates**

**Roadmap Position:** Fase 10 (Content Engine Core) - tussen B31 (Content Templates) en B33 (Brand Identity)

**Module ID:** `041-B32-sport-configuration-and-templates.md`

**Doel:** Sport-specifieke configuratie voor team sizes, positions, outfit variants en template requirements

**Why Critical for TeamReel:**
Verschillende sporten hebben verschillende requirements:
- **Voetbal**: 11 spelers, keeper heeft andere tenue kleur
- **Handbal**: 7 spelers, andere posities
- **Basketbal**: 5 spelers, geen keeper
- **Zaalvoetbal**: 5 spelers (zoals basketbal), maar andere posities

**Models:**
```python
# src/sport_config/models.py

class Sport(BaseModel):
    """Master data voor sport types"""
    name = models.CharField(max_length=50)  # "Football", "Handball"
    slug = models.SlugField(unique=True)
    federation = models.CharField(max_length=100)  # "KNVB", "NHV"
    is_active = models.BooleanField(default=True)


class SportConfiguration(BaseModel):
    """Sport-specific settings"""
    sport = models.OneToOneField(Sport, on_delete=models.CASCADE)
    team_size_min = models.IntegerField(help_text="Minimum field players")
    team_size_max = models.IntegerField(help_text="Maximum squad size")
    positions = models.JSONField(
        default=list,
        help_text="Position codes: ['GK', 'LB', 'CB', ...]"
    )
    outfit_variants = models.JSONField(
        default=list,
        help_text="Outfit types: ['home', 'away', 'goalkeeper']"
    )
    formation_defaults = models.JSONField(
        default=list,
        help_text="Default formations: ['4-3-3', '4-4-2']"
    )
    metadata = models.JSONField(
        default=dict,
        help_text="Sport-specific rules and validation"
    )


class OutfitConfiguration(BaseModel):
    """Sport-specific outfit per project"""
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    sport = models.ForeignKey(Sport, on_delete=models.PROTECT)
    outfit_type = models.CharField(
        max_length=50,
        choices=[
            ('home', 'Home Kit'),
            ('away', 'Away Kit'),
            ('goalkeeper', 'Goalkeeper Kit'),
            ('training', 'Training Kit')
        ]
    )
    colors = models.JSONField(
        default=dict,
        help_text="Color schema: primary, secondary, goalkeeper"
    )
    sponsor_position = models.CharField(max_length=50, default='chest')
    number_font = models.CharField(max_length=100, default='Helvetica Bold')
    badge_position = models.CharField(max_length=50, default='left_chest')
    metadata = models.JSONField(default=dict)
```

**Example Sport Configurations:**

| Sport | Team Size (Field) | Subs | Total Squad | Positions | Keeper Different? |
|-------|-------------------|------|-------------|-----------|-------------------|
| **Voetbal** | 11 | 7 | 18 | GK, LB, CB, RB, LM, CM, RM, LW, ST, RW | ✅ Yes |
| **Handbal** | 7 | 7 | 14 | GK, LW, LB, CB, RB, RW, P | ✅ Yes |
| **Basketbal** | 5 | 7 | 12 | PG, SG, SF, PF, C | ❌ No |
| **Zaalvoetbal** | 5 | 9 | 14 | GK, Fixo, Ala L, Ala R, Pivo | ✅ Yes |

**API Endpoints:**
```
GET    /api/v1/sports/                      # List sports
GET    /api/v1/sports/:id/configuration/    # Get sport config
POST   /api/v1/outfits/                     # Create outfit config
GET    /api/v1/outfits/?project=:id         # Get project outfits
PUT    /api/v1/outfits/:id/                 # Update outfit
```

**Demo Requirements:**
- `/demo/sport-config/sports` - Sport registry
- `/demo/sport-config/outfits` - Outfit designer with color picker
- `/demo/sport-config/positions` - Position manager per sport
- `/demo/sport-config/validate` - Lineup validation preview

**Dependencies:**
- ✅ B07 (Projects) - Sport in project.metadata
- 🆕 B30 (Activities) - Sport determined at club level
- 🆕 B31 (Content Templates) - Sport-aware templates

---

**Combined Dependencies (B31 + B32):**
```python
# src/content/models.py

class ContentTemplate(BaseModel):
    """Reusable templates linked to AI workflows"""
    name = models.CharField(max_length=100)
    template_type = models.CharField(
        max_length=50,
        choices=[
            ('pre-match', 'Pre-Match'),
            ('during-match', 'During-Match'),
            ('post-match', 'Post-Match'),
            ('season', 'Season Content')
        ]
    )
    sport = models.CharField(max_length=50)  # football, hockey, etc
    ai_workflow_id = models.CharField(max_length=100)  # LangGraph workflow
    template_settings = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)


class ContentItem(BaseModel):
    """Instance of generated content"""
    template = models.ForeignKey(ContentTemplate, on_delete=models.PROTECT)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    activity = models.ForeignKey(
        'activities.Activity',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=50,
        choices=[
            ('queued', 'Queued'),
            ('generating', 'Generating'),
            ('completed', 'Completed'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected')
        ],
        default='queued'
    )

    input_data = models.JSONField(default=dict)
    output_file = models.ForeignKey(
        'files.FileAsset',  # Link to B22
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_content'
    )
    approved_at = models.DateTimeField(null=True, blank=True)


class ContentApproval(BaseModel):
    """Approval workflow for generated content"""
    content_item = models.ForeignKey(
        ContentItem,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE)

    status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
            ('revision', 'Revision Requested')
        ],
        default='pending'
    )

    feedback_text = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(auto_now_add=True)
```

**API Endpoints:**
```
POST   /api/v1/content/templates/          # List templates
GET    /api/v1/content/templates/:id/      # Get template
POST   /api/v1/content/generate/           # Generate content (queues AI job)
GET    /api/v1/content/items/              # List generated content
GET    /api/v1/content/items/:id/          # Get content item
POST   /api/v1/content/items/:id/approve/  # Approve content
POST   /api/v1/content/items/:id/reject/   # Reject content
DELETE /api/v1/content/items/:id/          # Delete content
```

**Demo Requirements:**
- `/demo/content/templates` - Browse available templates
- `/demo/content/generate` - Create new content from template
- `/demo/content/library` - View generated content archive
- `/demo/content/approve/:id` - Review & approve workflow

---

### 📋 FINAL SUMMARY

**Existing Infrastructure (NO changes needed):**
- ✅ Period/Activity models (B30)
- ✅ File/Media storage (B22)
- ✅ Organisations/Projects/Membership (B06, B07)
- ✅ Credits/Transactions (B11)
- ✅ Notifications (B16, B17)
- ✅ Feature Flags (B10)
- ✅ Audit Trail (B09)

**Missing Fields (Simple migrations):**
- Activity.opponent_project (ForeignKey)
- Membership.period (ForeignKey)
- CharacterRole.SUPPORTER (enum value - check if exists)

**Missing Module (New development):**
- 🚨 **B33 Content Templates & Generation** (CRITICAL for MVP)

**Total Effort Estimate:**
- Check current state: 1 hour
- Database migrations: 2 hours
- B33 Content module: 8 hours (backend + API)
- Database rebuild: 1 hour
- Testing: 2 hours
- **Total: ~14 hours (2 werkdagen)**

---

| TeamReel Feature | Django Core Strategy | Status |
|------------------|----------------------|---------|
| Land/Federatie (Organisation) | Organisation | ✅ Aligned |
| Club (Project) | Project (parent=NULL, type="club") | ✅ Aligned |
| Team (Project) | Project (parent=club, type="team") | ✅ Aligned |
| Seizoen (Period) | Period (parent=NULL, type="season") | ✅ Aligned |
| Competitie (Period) | Period (parent=season, type="competition") | ✅ Aligned |
| Wedstrijd (Activity) | Activity (opponent_project ForeignKey) | ✅ Aligned |
| Speler/Coach/Keeper roles | CharacterRole enum in Membership | ✅ Aligned |
| Magic Link authenticatie | Already in Core-App | ✅ Aligned |
| Credits systeem | Mentioned (Team-level) | ✅ Conceptually aligned |
| Sport at Club level | `club.metadata->>'sport'` | ✅ Aligned |
| Stadium/Location | Computed from club metadata | ✅ Aligned |
| Player linking to Season | Membership.period_id | ✅ Aligned |

---

### 🚨 Wat ONTBREEKT in huidige strategy?

#### 1. Content Generation Entities

**TeamReel heeft:**
```python
# Technical Design - Section 5.2 Datalaag

ContentTemplate:
  - id
  - name: "Line-up Video", "Match Flyer", "Uitslag Graphic"
  - template_type: "pre-match", "during-match", "post-match"
  - sport: "football", "hockey", "basketball"
  - ai_workflow_id: Link to LangGraph workflow
  - template_settings: JSON (layout, aspect ratio, duration)

ContentItem:
  - id
  - template: ForeignKey to ContentTemplate
  - team: ForeignKey to Project
  - match: ForeignKey to Activity (optional)
  - status: "generating", "completed", "approved", "rejected"
  - input_data: JSON (players selected, score, custom text)
  - output_url: S3 link to generated visual/video
  - created_by: User who triggered generation
  - approved_by: User who approved output
  - created_at, approved_at
```

**Django Core heeft:**
- ❌ Geen ContentTemplate entiteit
- ❌ Geen ContentItem archief
- ❌ Geen link tussen Activity en gegenereerde media

**Impact:**
- Gebruikers kunnen geen "Line-up video maken" actie triggeren
- Geen archief van gegenereerde content per team/seizoen
- Geen tracking van welke templates al gebruikt zijn

**Aanbeveling:** ✅ **Toevoegen als nieuwe app: `content/`**

---

#### 2. AI Workflow Tracking

**TeamReel heeft:**
```python
# Technical Design - Section 6: AI-infrastructuur

AIWorkflow:
  - id
  - workflow_type: "clubflow", "teamflow", "personflow", "videoflow"
  - status: "queued", "running", "completed", "failed"
  - input_data: JSON (team_id, players, match_id)
  - output_data: JSON (generated URLs, metadata)
  - error_log: Text (if failed)
  - started_at, completed_at
  - triggered_by: User

WorkflowStep:
  - workflow: ForeignKey to AIWorkflow
  - step_name: "validate_input", "generate_outfit", "compose_video"
  - status: "pending", "completed", "failed"
  - duration: Float (seconds)
```

**Django Core heeft:**
- ❌ Geen AIWorkflow entiteit (workflows draaien in LangGraph maar niet tracked in DB)
- ❌ Geen status tracking van AI-generaties
- ❌ Geen error logging voor failed workflows

**Impact:**
- Gebruikers zien geen voortgang tijdens AI-generatie
- Geen troubleshooting mogelijk als workflow faalt
- Geen metrics over AI-usage per team

**Aanbeveling:** ⏳ **Optioneel voor MVP** - Kan in Fase 6+ (LangGraph heeft eigen state tracking)

**Alternatief MVP:** Gebruik Celery Task IDs + Redis voor realtime status.

---

#### 3. Outfit/Tenue Metadata

**TeamReel heeft:**
```python
# Functional Design - Section 2.4 Teamrollen en visuele weergave

Outfit (part of Club metadata):
  - base_jersey_color: "#FF0000"  # Ajax red
  - secondary_color: "#FFFFFF"    # Ajax white
  - goalkeeper_color: "#00FF00"   # Keeper green
  - sponsor_logo_url: S3 link
  - sponsor_position: "chest", "sleeve"
  - number_font: "Helvetica Bold"
  - badge_url: Club logo

# Per Membership (Player)
Membership.metadata:
  - jersey_number: 9
  - position: "Striker"
  - outfit_variant: "home", "away", "goalkeeper"
```

**Django Core heeft:**
- ✅ Club metadata heeft `colors`, `sponsor` (basic)
- ❌ Geen gedetailleerde outfit configuratie (keeper tenue, nummer fonts, badge positie)
- ❌ Geen outfit variants (home/away/keeper)

**Impact:**
- AI kan geen keeper-tenue genereren (andere kleur dan veld spelers)
- Geen onderscheid tussen thuis/uit tenue
- Geen controle over sponsor/badge plaatsing

**Aanbeveling:** ⚠️ **Uitbreiden in Fase 2** - Voor MVP: gebruik simpele `club.metadata->>'colors'` array.

**Alternatief MVP:**
```python
# Minimale outfit metadata voor MVP
PROJECT_CLUB_METADATA_SCHEMA = {
    "sport": "football",
    "stadium": str,
    "colors": ["#FF0000", "#FFFFFF"],  # First = primary, second = secondary
    "goalkeeper_color": "#00FF00",      # 🆕 Voor keeper tenue
    "sponsor": str
}
```

---

#### 4. Approval/Feedback Workflow

**TeamReel heeft:**
```python
# Functional Design - Section 7.2 Feedbackcyclus

ContentApproval:
  - content_item: ForeignKey to ContentItem
  - reviewer: ForeignKey to User
  - status: "pending", "approved", "rejected", "revision_requested"
  - feedback_text: Text (optional comments)
  - created_at, reviewed_at

Notification:
  - user: ForeignKey to User
  - notification_type: "content_ready", "approval_needed", "credit_low"
  - content_item: ForeignKey (optional)
  - is_read: Boolean
  - created_at
```

**Django Core heeft:**
- ✅ Notifications app bestaat al (B09 Feature)
- ❌ Geen ContentApproval entiteit
- ❌ Geen feedback loop voor AI-output

**Impact:**
- Gebruikers kunnen AI-output niet afkeuren/herzien
- Geen "wacht op goedkeuring" status
- Geen audit trail van wie wat goedkeurde

**Aanbeveling:** ✅ **Toevoegen** - Essentieel voor UX (gebruiker moet controle hebben over output).

---

#### 5. Match Events (Goals, Cards, Subs)

**TeamReel heeft:**
```python
# Optioneel in Technical Design (Fase 6+)

MatchEvent:
  - match: ForeignKey to Activity
  - event_type: "goal", "yellow_card", "red_card", "substitution"
  - minute: Integer (23, 67, etc)
  - player: ForeignKey to User
  - assist_player: ForeignKey to User (optional, for goals)
  - metadata: JSON (additional context)
```

**Django Core heeft:**
- ❌ Geen MatchEvent entiteit
- ✅ Workaround: `Activity.metadata->>'scorers'` als list

**Impact:**
- Geen gestructureerde timeline van wedstrijd events
- Kan niet query-en "Toon alle doelpunten van Brobbey in seizoen 2024/2025"

**Aanbeveling:** ⏳ **Fase 6+** - Voor MVP is `metadata->>'scorers'` voldoende.

---

### 🎯 Prioritized Missing Features

| Feature | Priority | Rationale | MVP Status |
|---------|----------|-----------|------------|
| **ContentTemplate + ContentItem** | 🔴 **HIGH** | Core functionaliteit - zonder dit geen content generatie | ✅ **Toevoegen** |
| **ContentApproval** | 🔴 **HIGH** | Essentieel voor UX - gebruiker moet controle houden | ✅ **Toevoegen** |
| **Goalkeeper outfit metadata** | 🟡 **MEDIUM** | Nodig voor correcte visuals, maar workaround mogelijk | ⚠️ **Simplified MVP** |
| **AIWorkflow tracking** | 🟡 **MEDIUM** | Nice-to-have voor debugging, Celery + Redis kan dit | ⏳ **Fase 6+** |
| **MatchEvent entiteit** | 🟢 **LOW** | Useful maar niet essentieel, metadata voldoet | ⏳ **Fase 6+** |

---

### 🆕 Proposed New Entities

#### App: `content/` (NEW)

```python
# src/content/models.py

class ContentTemplate(BaseModel):
    """
    Reusable templates for content generation.
    Links to LangGraph workflows.
    """
    name = models.CharField(max_length=100)  # "Line-up Video", "Match Flyer"
    template_type = models.CharField(
        max_length=50,
        choices=[
            ('pre-match', 'Pre-Match Content'),
            ('during-match', 'During-Match Content'),
            ('post-match', 'Post-Match Content')
        ]
    )
    sport = models.CharField(max_length=50)  # "football", "hockey"
    ai_workflow_id = models.CharField(max_length=100)  # LangGraph workflow reference
    template_settings = models.JSONField(default=dict)  # Layout, aspect ratio, etc

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ContentItem(BaseModel):
    """
    Instance of generated content (visual or video).
    Tracks status, input, output and approval.
    """
    template = models.ForeignKey(ContentTemplate, on_delete=models.PROTECT)
    team = models.ForeignKey('projects.Project', on_delete=models.CASCADE)
    match = models.ForeignKey('activities.Activity', on_delete=models.CASCADE, null=True, blank=True)

    status = models.CharField(
        max_length=50,
        choices=[
            ('queued', 'Queued'),
            ('generating', 'Generating'),
            ('completed', 'Completed'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected')
        ],
        default='queued'
    )

    input_data = models.JSONField(default=dict)  # Players, score, custom text
    output_url = models.URLField(blank=True)     # S3 link to generated media

    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='created_content')
    approved_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_content')

    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)


class ContentApproval(BaseModel):
    """
    Feedback and approval workflow for generated content.
    """
    content_item = models.ForeignKey(ContentItem, on_delete=models.CASCADE, related_name='approvals')
    reviewer = models.ForeignKey('users.User', on_delete=models.CASCADE)

    status = models.CharField(
        max_length=50,
        choices=[
            ('pending', 'Pending Review'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
            ('revision_requested', 'Revision Requested')
        ],
        default='pending'
    )

    feedback_text = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(auto_now_add=True)
```

---

### 📋 Updated Model Changes

**Total migrations needed:** 5

1. ✅ **Membership:** Add `period_id` + `CharacterRole.SUPPORTER`
2. ✅ **Activity:** Add `opponent_project_id` + `created_by` + `activity_type`
3. 🆕 **Club metadata:** Add `goalkeeper_color` field
4. 🆕 **Content app:** Create ContentTemplate, ContentItem, ContentApproval
5. 🆕 **Notifications:** Extend for content-related notifications

---

### 🎯 Final Recommendation

**Voor MVP (Go-Live Track):**
1. ✅ **Toevoegen:** ContentTemplate + ContentItem + ContentApproval (essentieel)
2. ⚠️ **Uitbreiden:** Club metadata met `goalkeeper_color` (simplified outfit support)
3. ⏳ **Skip:** AIWorkflow tracking (gebruik Celery + Redis)
4. ⏳ **Skip:** MatchEvent entiteit (gebruik metadata)

**Voor Fase 6+ (Feature Expansion):**
- Volledige outfit configuratie (home/away/keeper variants)
- AIWorkflow tracking voor debugging
- MatchEvent entiteit voor timeline analysis

---

## 📊 Stap-voor-Stap Database Rebuild Plan

### Pre-Step: Backup Current State
```bash
# Create full backup before rebuild
$env:PGPASSWORD="amItuWgShiNxWkvKmKyojIAahAtKTXPp"
pg_dump -h switchback.proxy.rlwy.net -p 17304 -U postgres -d railway > backup_before_rebuild_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

---

### Rebuild Sequence (Tabel-voor-Tabel)

**Volgorde:** Children eerst (CASCADE prevention), dan parents.

```sql
-- ============================================
-- STEP 0: TRUNCATE IN CORRECT ORDER
-- ============================================

-- 7. Content (if exists - new app)
TRUNCATE TABLE content_contentapproval CASCADE;
TRUNCATE TABLE content_contentitem CASCADE;
TRUNCATE TABLE content_contenttemplate CASCADE;

-- 6. Memberships (links Users ↔ Projects ↔ Periods)
TRUNCATE TABLE projects_membership CASCADE;

-- 5. Activities (depends on Projects and Periods)
TRUNCATE TABLE activities_activity CASCADE;

-- 4. Periods (depends on Projects)
TRUNCATE TABLE activities_period CASCADE;

-- 3. Projects (depends on Organisations)
TRUNCATE TABLE projects_project CASCADE;

-- 2. Organisations (root level)
TRUNCATE TABLE organisations_organisation CASCADE;

-- 1. Users remain untouched (we need creator_id references)
-- DO NOT TRUNCATE users_user!

```

---

### STEP 1: Organisations (Land/Federatie)

**Doel:** Create Nederland as root organisation.

```sql
-- scripts/rebuild/01_organisations.sql

INSERT INTO organisations_organisation (id, name, slug, description, metadata, creator_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Nederland',
  'nederland',
  'Nederlandse voetbalfederatie KNVB',
  jsonb_build_object(
    'type', 'country',
    'federation', 'KNVB',
    'country_code', 'NL'
  ),
  (SELECT id FROM users_user LIMIT 1),  -- Use first user as creator
  NOW(),
  NOW()
) RETURNING id, name, metadata;
```

**Validatie:**
```sql
SELECT id, name, metadata FROM organisations_organisation WHERE name = 'Nederland';
```

**Verwacht:** 1 rij met Nederland + metadata.

---

### STEP 2: Projects - Clubs (Ajax, PSV, Feyenoord)

**Doel:** Create 3 clubs met volledige metadata (sport, stadium, colors, goalkeeper_color).

```sql
-- scripts/rebuild/02_clubs.sql

WITH nl AS (SELECT id FROM organisations_organisation WHERE name = 'Nederland'),
     creator AS (SELECT id FROM users_user LIMIT 1)

INSERT INTO projects_project (id, name, slug, description, organisation_id, parent_project_id, metadata, creator_id, created_at, updated_at)
VALUES
-- Ajax Amsterdam
(
  gen_random_uuid(),
  'Ajax Amsterdam',
  'ajax-amsterdam',
  'Ajax Amsterdam Football Club',
  (SELECT id FROM nl),
  NULL,
  jsonb_build_object(
    'type', 'club',
    'sport', 'football',
    'stadium', 'Johan Cruijff Arena',
    'city', 'Amsterdam',
    'founded', 1900,
    'colors', jsonb_build_array('#FF0000', '#FFFFFF'),
    'goalkeeper_color', '#00FF00',  -- 🆕 Keeper tenue
    'sponsor', 'Ziggo'
  ),
  (SELECT id FROM creator),
  NOW(),
  NOW()
),
-- PSV Eindhoven
(
  gen_random_uuid(),
  'PSV Eindhoven',
  'psv-eindhoven',
  'PSV Eindhoven Football Club',
  (SELECT id FROM nl),
  NULL,
  jsonb_build_object(
    'type', 'club',
    'sport', 'football',
    'stadium', 'Philips Stadion',
    'city', 'Eindhoven',
    'founded', 1913,
    'colors', jsonb_build_array('#FF0000', '#FFFFFF'),
    'goalkeeper_color', '#FFFF00',
    'sponsor', 'Philips'
  ),
  (SELECT id FROM creator),
  NOW(),
  NOW()
),
-- Feyenoord Rotterdam
(
  gen_random_uuid(),
  'Feyenoord Rotterdam',
  'feyenoord-rotterdam',
  'Feyenoord Rotterdam Football Club',
  (SELECT id FROM nl),
  NULL,
  jsonb_build_object(
    'type', 'club',
    'sport', 'football',
    'stadium', 'De Kuip',
    'city', 'Rotterdam',
    'founded', 1908,
    'colors', jsonb_build_array('#FF0000', '#FFFFFF'),
    'goalkeeper_color', '#00FF00',
    'sponsor', 'Bingoal'
  ),
  (SELECT id FROM creator),
  NOW(),
  NOW()
)
RETURNING id, name, metadata->>'sport' AS sport, metadata->>'stadium' AS stadium;
```

**Validatie:**
```sql
SELECT
  name,
  metadata->>'sport' AS sport,
  metadata->>'stadium' AS stadium,
  metadata->>'goalkeeper_color' AS keeper_color
FROM projects_project
WHERE parent_project_id IS NULL
ORDER BY name;
```

**Verwacht:** 3 rijen (Ajax, Feyenoord, PSV) met sport + stadium + keeper_color.

---

###
  - id: UUID
  - email: "brian@example.com"
  - username: "brian_stokvis"
  - name: "Brian Stokvis"
```

**Character/Membership = Rol binnen Team (meerdere mogelijk)**
```python
Membership (Character):
  - user_id: brian_stokvis
  - project_id: Ajax Eerste Elftal
  - period_id: Seizoen 2024/2025
  - role: "Player"
  - metadata: {"jersey": 9, "position": "Striker"}

Membership (Character):
  - user_id: brian_stokvis  # Zelfde User!
  - project_id: Ajax O21
  - period_id: Seizoen 2024/2025
  - role: "Coach"
  - metadata: {}
```

### Real-World Scenario

**Brian Stokvis** (1 User) heeft 3 rollen:
1. **Speler** bij Ajax Eerste (Seizoen 2024/2025)
2. **Coach** bij Ajax O21 (Seizoen 2024/2025)
3. **Speler** bij Amsterdam H&BC Hockey (Seizoen 2024/2025) - andere sport!

**Jan Jansen** (1 User) heeft 1 rol:
4. **Supporter** bij Ajax Eerste (Seizoen 2024/2025) - read-only fan

```
User: Brian Stokvis
  └─ Membership #1: Ajax Eerste → Player (jersey 9) → Can edit own content
  └─ Membership #2: Ajax O21 → Coach → Can edit all team content
  └─ Membership #3: Amsterdam H&BC → Player (jersey 14)

User: Jan Jansen
  └─ Membership #1: Ajax Eerste → Supporter → Read-only, no edit rights
```

### Implicaties voor Permissions

**User permissions = Union van alle Memberships:**
- Als Brian "Team Admin" is bij Ajax Eerste → kan **alle** Ajax Eerste content bewerken
- Als Brian "Team Member" (Player) is bij Ajax O21 → kan alleen **eigen** O21 content bewerken
- Als Brian "Club Admin" is bij Ajax → kan ALLE Ajax teams bewerken
- Als Jan "Supporter" is bij Ajax Eerste → kan **alleen lezen**, niets bewerken

**Content ownership check:**
```python
# Example: Can user edit this activity?
activity = Activity.objects.get(id=...)

# Check 1: Is user the creator?
if activity.created_by == current_user:
    can_edit = True

# Check 2: Is user Team Admin/Coach?
membership = current_user.memberships.filter(
    project=activity.project,
    role__in=[CharacterRole.ADMIN, CharacterRole.COACH]
).first()
if membership:
    can_edit = True

# Check 3: Is user a Supporter?
if current_user.memberships.filter(
    project=activity.project,
    role=CharacterRole.SUPPORTER
).exists():
    can_edit = False  # Supporters cannot edit
```

**Character metadata = Team/Season specific:**
- Jersey number verschilt per team/seizoen
- Position kan veranderen tussen seizoenen
- Role kan verschillen per team (speler bij één, coach bij ander)
- Supporter heeft geen jersey/position metadata

---

## 📊 Hiërarchie & Mapping (Final)

```
NIVEAU 1: LAND/FEDERATIE
┌─────────────────────────────────────────────────────┐
│ Organisation: "Nederland"                            │
│ metadata: {                                          │
│   "type": "country",                                 │
│   "federation": "KNVB",                              │
│   "country_code": "NL"                               │
│ }                                                    │
└─────────────────────────────────────────────────────┘
                    │
                    ├──> Project: "Ajax Amsterdam" (club-level)
                    ├──> Project: "PSV Eindhoven" (club-level)
                    └──> Project: "Feyenoord Rotterdam" (club-level)

NIVEAU 2: CLUB (Sport determined here)
┌─────────────────────────────────────────────────────┐
│ Project: "Ajax Amsterdam"                            │
│ organisation: Nederland                              │
│ metadata: {                                          │
│   "type": "club",                                    │
│   "sport": "football",           🔹 SPORT LEVEL     │
│   "stadium": "Johan Cruijff Arena",                  │
│   "city": "Amsterdam",                               │
│   "founded": 1900,                                   │
│   "colors": ["Red", "White"],                        │
│   "sponsor": "Ziggo"                                 │
│ }                                                    │
└─────────────────────────────────────────────────────┘
                    │
                    ├──> Project: "Ajax Eerste Elftal" (team-level)
                    ├──> Project: "Ajax O21" (team-level)
                    └──> Project: "Ajax O19" (team-level)

NIVEAU 3: TEAM
┌─────────────────────────────────────────────────────┐
│ Project: "Ajax Eerste Elftal"                        │
│ parent_project: "Ajax Amsterdam"                     │
│ metadata: {                                          │
│   "type": "team",                                    │
│   "age_group": "senior",                             │
│   "competition_level": "eredivisie"                  │
│ }                                                    │
└─────────────────────────────────────────────────────┘
                    │
                    └──> Period: "Seizoen 2024/2025" (season-level)

NIVEAU 4: SEIZOEN
┌─────────────────────────────────────────────────────┐
│ Period: "Seizoen 2024/2025 - Ajax Eerste"           │
│ project: Ajax Eerste Elftal                          │
│ metadata: {                                          │
│   "type": "season",                                  │
│   "season": "2024/2025",                             │
│   "start_date": "2024-08-01",                        │
│   "end_date": "2025-05-31"                           │
│ }                                                    │
│                                                      │
│ 🔹 SPELERS KOPPELEN HIER (Membership.period_id)     │
└─────────────────────────────────────────────────────┘
                    │
                    ├──> Period: "Eredivisie 2024/2025" (competition)
                    └──> Period: "KNVB Beker 2024/2025" (competition)

NIVEAU 5: COMPETITIE (Per-club view)
┌─────────────────────────────────────────────────────┐
│ Period: "Eredivisie 2024/2025 - Ajax"               │
│ parent_period: Seizoen 2024/2025                     │
│ project: Ajax Eerste Elftal                          │
│ metadata: {                                          │
│   "type": "competition",                             │
│   "competition_name": "Eredivisie",                  │
│   "competition_type": "league"                       │
│ }                                                    │
│                                                      │
│ 🔹 EIGEN VIEW (PSV heeft aparte "Eredivisie" Period)│
└─────────────────────────────────────────────────────┘
                    │
                    └──> Activity: "Ajax vs PSV" (match)

NIVEAU 6: WEDSTRIJD (Owned by home team)
┌─────────────────────────────────────────────────────┐
│ Activity: "Ajax Amsterdam vs PSV Eindhoven"          │
│ period: Eredivisie 2024/2025 - Ajax                  │
│ project: Ajax Eerste Elftal                          │
│ organisation: Nederland                              │
│ activity_type: "LEAGUE_MATCH"  🔹 ENUM               │
│ metadata: {                                          │
│   "opponent": "PSV Eindhoven",                       │
│   "is_home": true,                                   │
│   "location": "Johan Cruijff Arena",  // AUTO-FILLED │
│   "city": "Amsterdam",                // AUTO-FILLED │
│   "score": "2-1",                                    │
│   "scorers": ["Brobbey 23'", "Tadic 67'"],          │
│   "attendance": 54990,                               │
│   "round": 12                                        │
│ }                                                    │
└─────────────────────────────────────────────────────┘

🔹 PSV heeft aparte Activity: "PSV vs Ajax" in hun eigen Eredivisie Period
```

---

---

## 🔧 Stamdata Inheritance Rules

| Niveau | Erft van | Eigen data | Voorbeeld |
|--------|----------|------------|-----------|
| **Land** | - | federation, country_code | KNVB, NL |
| **Club** | Land | sport, stadium, city, colors, sponsor | football, Johan Cruijff Arena, Amsterdam |
| **Team** | Club + Land | age_group, level | O21, eredivisie |
| **Seizoen** | Team + Club + Land | season, dates | 2024/2025 |
| **Competitie** | Seizoen + Team + Club | competition_name, type | Eredivisie, league |
| **Wedstrijd** | Alle bovenliggende | opponent, score, location, date | Ajax vs PSV, 2-1 |

**Voorbeeld inheritance voor wedstrijd:**
```json
{
  "match": "Ajax Amsterdam vs PSV Eindhoven",
  "location": "Johan Cruijff Arena",      // FROM Club metadata (auto-filled)
  "city": "Amsterdam",                     // FROM Club metadata (auto-filled)
  "federation": "KNVB",                    // FROM Organisation metadata
  "sport": "football",                     // FROM Club metadata
  "competition": "Eredivisie",             // FROM Period (competition) metadata
  "season": "2024/2025",                   // FROM Period (season) metadata
  "colors": ["Red", "White"],              // FROM Club metadata
  "sponsor": "Ziggo"                       // FROM Club metadata
}
```

---

## 🔧 Model Changes Required

### 1. Membership Model Update
**Add period_id for season-specific squad assignments**

```python
# src/projects/models.py (Membership model)

class CharacterRole(models.TextChoices):
    """Roles a user can have within a team"""
    PLAYER = 'PLAYER', 'Player'
    COACH = 'COACH', 'Coach'
    ASSISTANT_COACH = 'ASSISTANT_COACH', 'Assistant Coach'
    PHYSIO = 'PHYSIO', 'Physiotherapist'
    MANAGER = 'MANAGER', 'Team Manager'
    ADMIN = 'ADMIN', 'Team Admin'
    SUPPORTER = 'SUPPORTER', 'Supporter (Read-Only)'  # 🆕 NEW ROLE

class Membership(BaseModel):
    """
    Represents a CHARACTER/ROLE that a User plays within a Team.
    A single User can have multiple Memberships (different roles/teams/seasons).

    Special cases:
    - SUPPORTER role: Read-only access, no edit permissions
    - Team Members: Can only edit content they created (created_by=self)
    - Team Admins: Can edit all team content
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='memberships')
    period = models.ForeignKey(  # 🆕 NEW FIELD
        'activities.Period',
        on_delete=models.CASCADE,
        null=True,  # Nullable for backwards compatibility
        blank=True,
        related_name='memberships',
        help_text="Season/Period this membership is valid for"
    )
    role = models.CharField(
        max_length=50,
        choices=CharacterRole.choices,  # 🆕 ENUM
        default=CharacterRole.PLAYER
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Role-specific data: jersey_number, position, is_captain, etc."
    )

    class Meta:
        unique_together = [['user', 'project', 'period', 'role']]  # Can have multiple roles per season
        verbose_name = "Team Membership"
        verbose_name_plural = "Team Memberships"

    def __str__(self):
        period_str = f" ({self.period.name})" if self.period else ""
        return f"{self.user.name} as {self.role} in {self.project.name}{period_str}"

    @property
    def is_supporter(self):
        """Check if this is a read-only supporter role"""
        return self.role == CharacterRole.SUPPORTER

    @property
    def can_edit_team_content(self):
        """Team Admins can edit all content, others only their own"""
        return self.role in [CharacterRole.ADMIN, CharacterRole.COACH]
```

**Migration needed:**
```bash
python manage.py makemigrations projects --name add_period_and_role_to_membership
```

---

### 2. Activity Model Update - Opponent as ForeignKey
**Change opponent from string to ForeignKey for database-driven data**

```python
# src/activities/models.py

class Activity(BaseModel):
    # ... existing fields ...
    project = models.ForeignKey(  # Home team
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='home_activities'
    )

    opponent_project = models.ForeignKey(  # 🆕 NEW FIELD
        'projects.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='away_activities',
        help_text="Opponent team (for matches)"
    )

    activity_type = models.CharField(
        max_length=50,
        choices=ActivityType.choices,
        default=ActivityType.LEAGUE_MATCH
    )

    created_by = models.ForeignKey(  # 🔹 Track content ownership
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_activities',
        help_text="User who created this activity (for permission checks)"
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Match-specific data: score, scorers, attendance, etc. (NO opponent name here!)"
    )

    # Helper properties
    @property
    def is_match(self):
        return self.activity_type in [
            ActivityType.LEAGUE_MATCH,
            ActivityType.CUP_MATCH,
            ActivityType.FRIENDLY,
            ActivityType.TOURNAMENT
        ]

    @property
    def opponent_name(self):
        """Get opponent name from ForeignKey (auto-fetches from database)"""
        return self.opponent_project.name if self.opponent_project else None

    @property
    def opponent_stadium(self):
        """Auto-fetch opponent stadium from their club metadata"""
        if not self.opponent_project:
            return None
        parent_club = self.opponent_project.parent_project
        return parent_club.metadata.get('stadium') if parent_club else None

    @property
    def location(self):
        """Auto-determine location based on is_home flag"""
        is_home = self.metadata.get('is_home', True)
        if is_home:
            # Get own club's stadium
            parent_club = self.project.parent_project
            return parent_club.metadata.get('stadium') if parent_club else None
        else:
            # Get opponent's stadium
            return self.opponent_stadium

    def user_can_edit(self, user):
        """
        Check if user can edit this activity.

        Rules:
        - Land/Club Admin: can edit all
        - Team Admin: can edit all team content
        - Team Member: can only edit own content (created_by=self)
        - Supporter: cannot edit anything
        """
        # Check if user is creator
        if self.created_by == user:
            return True

        # Check memberships
        memberships = user.memberships.filter(project=self.project)

        for membership in memberships:
            # Team Admins can edit all team content
            if membership.can_edit_team_content:
                return True
            # Supporters cannot edit
            if membership.is_supporter:
                return False

        return False
```

**Migration needed:**
```bash
python manage.py makemigrations activities --name add_opponent_project_fk_and_created_by
```

---

### 2. Activity Type Enum
**Add Django choices for activity_type field**

```python
# src/activities/models.py

class ActivityType(models.TextChoices):
    """Fixed activity types for type-safety and user experience"""
    LEAGUE_MATCH = 'LEAGUE_MATCH', 'League Match'
    CUP_MATCH = 'CUP_MATCH', 'Cup Match'
    FRIENDLY = 'FRIENDLY', 'Friendly Match'
    TRAINING = 'TRAINING', 'Training Session'
    TEAM_EVENT = 'TEAM_EVENT', 'Team Event'
    TOURNAMENT = 'TOURNAMENT', 'Tournament Match'

    # Future: Add sport-specific types via metadata if needed

class Activity(BaseModel):
    # ... existing fields ...
    activity_type = models.CharField(
        max_length=50,
        choices=ActivityType.choices,  # 🆕 ENUM CONSTRAINT
        default=ActivityType.LEAGUE_MATCH,
        help_text="Type of activity (match, training, event)"
    )
```

**Migration needed:**
```bash
python manage.py makemigrations activities --name add_activity_type_choices
```

---

### 3. Metadata Schema Validation (Updated)
**Document expected metadata structure per level**

```python
# Expected metadata schemas (for documentation/validation)

ORGANISATION_METADATA_SCHEMA = {
    "type": "country",           # Fixed: "country"
    "federation": str,           # e.g. "KNVB", "DFB", "FA"
    "country_code": str          # ISO 3166-1 alpha-2
}

PROJECT_CLUB_METADATA_SCHEMA = {
    "type": "club",              # Fixed: "club"
    "sport": "football",         # 🔹 Sport determined at club level
    "stadium": str,              # Auto-filled in activities
    "city": str,                 # Auto-filled in activities
    "founded": int,              # Year founded
    "colors": list[str],         # Primary colors
    "sponsor": str               # Main sponsor (optional)
}

PROJECT_TEAM_METADATA_SCHEMA = {
    "type": "team",              # Fixed: "team"
    "age_group": str,            # "senior", "O21", "O19", "O17"
    "competition_level": str     # "eredivisie", "eerste_divisie", etc
}

PERIOD_SEASON_METADATA_SCHEMA = {
    "type": "season",            # Fixed: "season"
    "season": str                # "2024/2025"
}

PERIOD_COMPETITION_METADATA_SCHEMA = {
    "type": "competition",       # Fixed: "competition"
    "competition_name": str,     # "Eredivisie", "KNVB Beker"
    "competition_type": str      # "league", "cup", "tournament"
}

ACTIVITY_MATCH_METADATA_SCHEMA = {
    # ⚠️ NO "opponent" field here! Use opponent_project ForeignKey instead
    "is_home": bool,             # Required: Home or away match
    "score": str,                # Optional: "2-1"
    "scorers": list[str],        # Optional: ["Brobbey 23'", "Tadic 67'"]
    "attendance": int,           # Optional
    "round": int,                # Optional: Match round number
    "referee": str,              # Optional
    "weather": str               # Optional: "Sunny", "Rainy"
}

MEMBERSHIP_METADATA_SCHEMA = {
    "jersey_number": int,        # Player jersey number
    "position": str,             # "Striker", "Midfielder", "Defender", "Goalkeeper"
    "is_captain": bool,          # Team captain flag
    "contract_type": str         # Optional: "Professional", "Amateur"
}
```

**Key Change:**
- `opponent` is **NO longer in metadata**
- Use `Activity.opponent_project` ForeignKey instead
- Location/city are **computed properties** from club metadata

---

## 📝 Implementatie Stappen (Updated)

### Pre-Step: Model Migrations
```bash
# 1. Add period_id to Membership
python manage.py makemigrations projects --name add_period_to_membership

# 2. Add activity_type choices
python manage.py makemigrations activities --name add_activity_type_choices

# 3. Apply migrations
python manage.py migrate
```

---

### Stap 1: Nederland (Organisation)
```sql
-- Clean start (CASCADE verwijdert alles!)
TRUNCATE TABLE activities_activity CASCADE;
TRUNCATE TABLE activities_period CASCADE;
TRUNCATE TABLE projects_membership CASCADE;  -- 🆕 Added
TRUNCATE TABLE projects_project CASCADE;
TRUNCATE TABLE organisations_organisation CASCADE;

-- Create Nederland
INSERT INTO organisations_organisation (id, name, slug, description, metadata, creator_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Nederland',
  'nederland',
  'Nederlandse voetbalfederatie KNVB',
  '{"type": "country", "federation": "KNVB", "country_code": "NL"}'::jsonb,
  1,
  NOW(),
  NOW()
) RETURNING id, name, metadata;
```

**Verwacht resultaat:**
```
id                                   | name      | metadata
-------------------------------------|-----------|----------------------------
<uuid>                               | Nederland | {"type": "country", ...}
```

### Stap 2: Ajax Amsterdam (Club-level Project with Sport)
```sql
-- Get Nederland ID
WITH nl AS (SELECT id FROM organisations_organisation WHERE name = 'Nederland')

INSERT INTO projects_project (id, name, slug, description, organisation_id, parent_project_id, metadata, creator_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Ajax Amsterdam',
  'ajax-amsterdam',
  'Ajax Amsterdam Football Club',
  nl.id,
  NULL,  -- No parent (club-level)
  jsonb_build_object(
    'type', 'club',
    'sport', 'football',          -- 🔹 SPORT AT CLUB LEVEL
    'stadium', 'Johan Cruijff Arena',
    'city', 'Amsterdam',
    'founded', 1900,
    'colors', jsonb_build_array('Red', 'White'),
    'sponsor', 'Ziggo'
  ),
  1,
  NOW(),
  NOW()
FROM nl
RETURNING id, name, metadata->>'sport' as sport, metadata->>'stadium' as stadium;
```

**Verwacht resultaat:**
```
id     | name           | sport    | stadium
-------|----------------|----------|--------------------
<uuid> | Ajax Amsterdam | football | Johan Cruijff Arena
```

### Stap 3: Ajax Eerste Elftal (Team-level Project)
```sql
-- Create team as child project
WITH
  nl AS (SELECT id FROM organisations_organisation WHERE name = 'Nederland'),
  ajax_club AS (SELECT id FROM projects_project WHERE name = 'Ajax Amsterdam')

INSERT INTO projects_project (id, name, slug, description, organisation_id, parent_project_id, metadata, creator_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Ajax Eerste Elftal',
  'ajax-eerste',
  'Ajax Amsterdam First Team',
  nl.id,
  ajax_club.id,  -- 🔹 Parent is the club
  jsonb_build_object(
    'type', 'team',
    'age_group', 'senior',
    'competition_level', 'eredivisie'
  ),
  1,
  NOW(),
  NOW()
FROM nl, ajax_club
RETURNING id, name, parent_project_id, metadata->>'type' as type;
```

**Verwacht resultaat:**
```
id     | name               | parent_project_id | type
-------|--------------------|--------------------|------
<uuid> | Ajax Eerste Elftal | <ajax_club_id>    | team
```

### Stap 4: Seizoen 2024/2025 (Root Period)
```sql
-- Create season
WITH ajax_team AS (SELECT id, organisation_id FROM projects_project WHERE name = 'Ajax Eerste Elftal')

INSERT INTO activities_period (id, name, description, start_date, end_date, parent_period_id, organisation_id, project_id, metadata, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Seizoen 2024/2025 - Ajax Eerste',
  'Ajax Eerste Elftal season 2024/2025',
  '2024-08-01'::date,
  '2025-05-31'::date,
  NULL,
  organisation_id,
  id,
  '{
    "type": "season",
    "season": "2024/2025"
  }'::jsonb,
  NOW(),
  NOW()
FROM ajax_team;
```

### Stap 5: Eredivisie Competitie (Child Period)
```sql
-- Create competition
WITH
  ajax_team AS (SELECT id, organisation_id FROM projects_project WHERE name = 'Ajax Eerste Elftal'),
  season AS (SELECT id FROM activities_period WHERE name LIKE 'Seizoen 2024/2025 - Ajax Eerste')

INSERT INTO activities_period (id, name, description, start_date, end_date, parent_period_id, organisation_id, project_id, metadata, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Eredivisie 2024/2025 - Ajax Eerste',
  'Eredivisie league competition for Ajax Eerste Elftal',
  '2024-08-01'::date,
  '2025-05-31'::date,
  season.id,
  ajax_team.organisation_id,
  ajax_team.id,
  '{
    "type": "competition",
    "competition_name": "Eredivisie",
    "competition_type": "league"
  }'::jsonb,
  NOW(),
  NOW()
FROM ajax_team, season;
```

### Stap 6A: PSV Eindhoven (Opponent Club & Team)
```sql
-- First, create PSV so we can reference them as opponent
WITH
  nl AS (SELECT id FROM organisations_organisation WHERE name = 'Nederland')

-- Insert PSV Club
INSERT INTO projects_project (id, name, slug, description, organisation_id, parent_project_id, metadata, creator_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'PSV Eindhoven',
  'psv-eindhoven',
  'PSV Eindhoven Football Club',
  nl.id,
  NULL,
  jsonb_build_object(
    'type', 'club',
    'sport', 'football',
    'stadium', 'Philips Stadion',      -- 🔹 PSV stamdata
    'city', 'Eindhoven',
    'founded', 1913,
    'colors', jsonb_build_array('Red', 'White'),
    'sponsor', 'Philips'
  ),
  1,
  NOW(),
  NOW()
FROM nl
RETURNING id, name, metadata->>'stadium' as stadium;

-- Insert PSV Eerste Elftal (Team)
WITH
  nl AS (SELECT id FROM organisations_organisation WHERE name = 'Nederland'),
  psv_club AS (SELECT id FROM projects_project WHERE name = 'PSV Eindhoven')

INSERT INTO projects_project (id, name, slug, description, organisation_id, parent_project_id, metadata, creator_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'PSV Eerste Elftal',
  'psv-eerste',
  'PSV Eindhoven First Team',
  nl.id,
  psv_club.id,
  jsonb_build_object(
    'type', 'team',
    'age_group', 'senior',
    'competition_level', 'eredivisie'
  ),
  1,
  NOW(),
  NOW()
FROM nl, psv_club
RETURNING id, name;
```

---

### Stap 6B: Wedstrijden (With opponent_project_id ForeignKey)
```sql
-- Create match with OPPONENT as ForeignKey
WITH
  ajax_team AS (SELECT id, organisation_id FROM projects_project WHERE name = 'Ajax Eerste Elftal'),
  psv_team AS (SELECT id FROM projects_project WHERE name = 'PSV Eerste Elftal'),  -- 🔹 ForeignKey target
  competition AS (SELECT id FROM activities_period WHERE name LIKE 'Eredivisie 2024/2025 - Ajax Eerste')

INSERT INTO activities_activity (
  id,
  title,
  description,
  start_time,
  end_time,
  period_id,
  organisation_id,
  project_id,         -- Home team (Ajax)
  opponent_project_id,-- 🔹 Away team (PSV) as ForeignKey
  activity_type,
  metadata,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  'Ajax Amsterdam vs PSV Eindhoven',
  'Eredivisie Round 12',
  '2024-11-10 14:30:00'::timestamp,
  '2024-11-10 16:30:00'::timestamp,
  competition.id,
  ajax_team.organisation_id,
  ajax_team.id,        -- Home team
  psv_team.id,         -- 🔹 Opponent ForeignKey (not string!)
  'LEAGUE_MATCH',
  jsonb_build_object(
    'is_home', true,   -- ⚠️ NO "opponent" string here!
    'score', '2-1',
    'scorers', jsonb_build_array('Brobbey 23''', 'Tadic 67'''),
    'attendance', 54990,
    'round', 12
  ),
  NOW(),
  NOW()
FROM ajax_team, psv_team, competition
RETURNING
  id,
  title,
  activity_type,
  project_id as home_team_id,
  opponent_project_id as away_team_id;
```

**Verwacht resultaat:**
```
id     | title                          | activity_type | home_team_id | away_team_id
-------|--------------------------------|---------------|--------------|-------------
<uuid> | Ajax Amsterdam vs PSV Eindhoven| LEAGUE_MATCH  | <ajax_id>    | <psv_id>
```

**🔹 Key Changes:**
1. Opponent is **ForeignKey** (opponent_project_id), niet string in metadata
2. Location wordt **computed** via model property (niet opgeslagen)
3. PSV data (stadium, city) is beschikbaar via ForeignKey → parent_project → metadata

**Query om opponent data op te halen:**
```sql
SELECT
  a.title,
  home_team.name as home_team,
  away_team.name as away_team,
  home_club.metadata->>'stadium' as home_stadium,
  away_club.metadata->>'stadium' as away_stadium,
  CASE
    WHEN a.metadata->>'is_home' = 'true' THEN home_club.metadata->>'stadium'
    ELSE away_club.metadata->>'stadium'
  END as match_location
FROM activities_activity a
JOIN projects_project home_team ON a.project_id = home_team.id
JOIN projects_project away_team ON a.opponent_project_id = away_team.id
JOIN projects_project home_club ON home_team.parent_project_id = home_club.id
JOIN projects_project away_club ON away_team.parent_project_id = away_club.id
WHERE a.activity_type = 'LEAGUE_MATCH';
```

**🔹 Database doet het werk: Location wordt automatisch gehaald uit club metadata!**

---

## ✅ Verificatie Checklist

Na elke stap:

- [ ] **Stap 1 - Nederland:** Organisation bestaat met KNVB metadata + country_code
- [ ] **Stap 2 - Ajax Club:** Project met **sport="football"** + stadium/city/colors metadata
- [ ] **Stap 3 - Ajax Team:** Child project met parent_project_id + age_group metadata
- [ ] **Stap 4 - Seizoen:** Root period met season metadata (hier kunnen spelers gekoppeld worden)
- [ ] **Stap 5 - Competitie:** Child period met competition metadata (per-club view!)
- [ ] **Stap 6A - PSV:** Opponent club + team aanmaken (tegenstander database)
- [ ] **Stap 6B - Wedstrijd:** Activity met **opponent_project_id ForeignKey** + activity_type ENUM

Query om complete hierarchy te controleren:
```sql
-- Check complete hierarchy with inheritance
SELECT
  o.name as organisation,
  o.metadata->>'federation' as federation,
  p_club.name as club,
  p_club.metadata->>'sport' as sport,          -- 🔹 SPORT CHECK
  p_club.metadata->>'stadium' as club_stadium,
  p_team.name as team,
  p_team.metadata->>'age_group' as age_group,
  per_season.name as season,
  per_season.metadata->>'season' as season_code,
  per_comp.name as competition,
  per_comp.metadata->>'competition_type' as comp_type,
  a.title as match,
  a.activity_type,                              -- 🔹 ENUM CHECK
  a.metadata->>'location' as match_location,    -- Should equal club_stadium
  a.metadata->>'city' as match_city,
  a.metadata->>'opponent' as opponent,
  a.metadata->>'score' as score
FROM organisations_organisation o
LEFT JOIN projects_project p_club ON p_club.organisation_id = o.id AND p_club.metadata->>'type' = 'club'
LEFT JOIN projects_project p_team ON p_team.parent_project_id = p_club.id AND p_team.metadata->>'type' = 'team'
LEFT JOIN activities_period per_season ON per_season.project_id = p_team.id AND per_season.metadata->>'type' = 'season'
LEFT JOIN activities_period per_comp ON per_comp.parent_period_id = per_season.id AND per_comp.metadata->>'type' = 'competition'
LEFT JOIN activities_activity a ON a.period_id = per_comp.id
WHERE o.name = 'Nederland'
ORDER BY a.start_time DESC;
```

**Expected inheritance verification:**
```
club_stadium = match_location  ✅
club.city = match_city  ✅
activity_type IN ('LEAGUE_MATCH', 'CUP_MATCH', ...)  ✅
competition per club (not shared)  ✅
```

---

## 🎯 Uitbreidingen (Later)

### Selectie/Spelers (Membership.period_id)
```sql
-- Add player to season squad
WITH
  brobbey AS (SELECT id FROM users WHERE username = 'brobbey'),
  ajax_team AS (SELECT id FROM projects_project WHERE name = 'Ajax Eerste Elftal'),
  season AS (SELECT id FROM activities_period WHERE name LIKE 'Seizoen 2024/2025 - Ajax Eerste')

INSERT INTO projects_membership (id, user_id, project_id, period_id, role, metadata, created_at, updated_at)
SELECT
  gen_random_uuid(),
  brobbey.id,
  ajax_team.id,
  season.id,  -- 🔹 SEASON-SPECIFIC
  'Player',
  jsonb_build_object(
    'jersey_number', 9,
    'position', 'Striker',
    'is_captain', false
  ),
  NOW(),
  NOW()
FROM brobbey, ajax_team, season;
```

**Voordeel:** Speler kan volgend seizoen bij ander team, of in zelfde seizoen bij meerdere teams (eerste + O21).

---

### Meerdere Clubs (Replication)
```sql
-- Replicate Stap 2-6 for PSV, Feyenoord, etc.
-- Same Organisation (Nederland)
-- Each club has own competitions (per-club view)
```

**Structuur:**
```
Nederland
  ├─ Ajax Amsterdam (football)
  │   ├─ Ajax Eerste → Seizoen 2024/2025 → Eredivisie 2024/2025 - Ajax
  │   └─ Ajax O21 → Seizoen 2024/2025 → Eredivisie O21 2024/2025 - Ajax
  ├─ PSV Eindhoven (football)
  │   └─ PSV Eerste → Seizoen 2024/2025 → Eredivisie 2024/2025 - PSV
  └─ Feyenoord Rotterdam (football)
      └─ Feyenoord Eerste → Seizoen 2024/2025 → Eredivisie 2024/2025 - Feyenoord
```

**Note:** "Eredivisie 2024/2025" bestaat 3x (per club), maar dat is juist de bedoeling (user-centric views).

---

### Andere Sporten (Sport at Club Level)
```sql
-- Create hockey federation
INSERT INTO organisations_organisation (name, slug, metadata, ...)
VALUES (
  'Nederland Hockey',
  'nederland-hockey',
  '{"type": "country", "federation": "KNHB", "country_code": "NL"}'::jsonb,
  ...
);

-- Create hockey club
INSERT INTO projects_project (name, metadata, ...)
VALUES (
  'Amsterdam H&BC',
  '{
    "type": "club",
    "sport": "hockey",  -- 🔹 Different sport
    "stadium": "Wagener Stadium",
    "city": "Amsterdam"
  }'::jsonb,
  ...
);
```

**Zelfde hiërarchie:**
- Organisation (KNHB)
  - Club (sport="hockey")
    - Team
      - Seizoen
        - Competitie
          - Wedstrijden

---

### Andere Landen
```sql
-- Create Duitsland
INSERT INTO organisations_organisation (name, metadata, ...)
VALUES (
  'Duitsland',
  '{"type": "country", "federation": "DFB", "country_code": "DE"}'::jsonb,
  ...
);

-- Clubs: Bayern München, Borussia Dortmund, etc.
-- Same structure, different federation/language
```

---

## 📌 Voordelen van deze aanpak (Final)

1. ✅ **Clear hierarchy:** Elke laag heeft duidelijke verantwoordelijkheid
2. ✅ **Stamdata reuse:** Location/city hoeft niet per match ingevuld (auto-fill from club)
3. ✅ **Schaalbaar:** Zelfde structuur voor 1 of 1000 clubs
4. ✅ **Type-safe:** Metadata type field + Activity ENUM voorkomt verwarring
5. ✅ **TeamReel-compliant:** Volgt exact de architectuur uit documentatie
6. ✅ **Sport-flexible:** Sport op club-niveau, makkelijk uitbreiden naar hockey/volleybal
7. ✅ **User-centric:** Elke club beheert eigen competitie-view (geen gedeelde Periods)
8. ✅ **Season tracking:** Spelers kunnen per seizoen gekoppeld worden (Membership.period_id)
9. ✅ **Transfer-ready:** Speler kan in 1 seizoen bij meerdere teams, of tussen seizoenen switchen
10. ✅ **Gebruiksgemak:** Maximaal data pre-filled (stadium, city) vanuit club metadata

---

## 🚀 Volgende Acties

### Fase 1: Model Migrations
- [ ] Create migration: `add_period_and_role_to_membership` (period_id + CharacterRole enum + SUPPORTER)
- [ ] Create migration: `add_opponent_project_fk_and_created_by` (opponent_project_id + created_by)
- [ ] Create migration: `add_activity_type_choices` (ActivityType enum)
- [ ] Apply migrations to Railway Production
- [ ] Test backwards compatibility (existing data without period_id/opponent_project_id/created_by)

### Fase 2: Data Implementation (6-Step Process)
- [ ] **Stap 1:** Create Nederland Organisation
- [ ] **Stap 2:** Create Ajax Amsterdam Club (with sport="football")
- [ ] **Stap 3:** Create Ajax Eerste Elftal Team
- [ ] **Stap 4:** Create Seizoen 2024/2025t
- [ ] **Stap 5:** Create Eredivisie 2024/2025 Competition
- [ ] **Stap 6A:** Create PSV Club + Team (opponent/tegenstander in database)
- [ ] **Stap 6B:** Create matches with opponent_project_id ForeignKey
- [ ] **Verify:** Run hierarchy check query, validate ForeignKey relationships

### Fase 3: Permissions Testing
- [ ] Test Club Admin: Can see ALL clubs (cross-club visibility)
- [ ] Test Team Admin: Can edit **all team content** (not just own)
- [ ] Test Team Member: Can only edit **own content** (created_by=self)
- [ ] Test Supporter: Can only **read** content, no edit rights
- [ ] Verify computed properties: `activity.opponent_name`, `activity.location`
- [ ] Verify ownership: `activity.user_can_edit(user)` method

### Fase 4: User-Character Testing
- [ ] Create User "Brian Stokvis"
- [ ] Create Membership: Brian as Player in Ajax Eerste (can edit own content only)
- [ ] Create Membership: Brian as Coach in Ajax O21 (can edit all team content)
- [ ] Create User "Jan Jansen"
- [ ] Create Membership: Jan as Supporter in Ajax Eerste (read-only)
- [ ] Verify: Jan cannot edit any content, Brian can edit depending on role

### Fase 5: Replication
- [ ] Replicate for Feyenoord (Stap 2-6)
- [ ] Add 3-5 more Eredivisie clubs
- [ ] Verify: Each club has own "Eredivisie 2024/2025" competition
- [ ] Verify: opponent_project_id creates proper cross-club match links

### Fase 6: Extensions
- [ ] Add players to squads (Membership with period_id)
- [ ] Add other sports (hockey, volleyball)
- [ ] Add other countries (Duitsland, Spanje)

---

**🎯 Key Changes Summary:**
1. **Opponent = ForeignKey** niet metadata string (database-driven tegenstander info)
2. **Location = Computed** niet opgeslagen (auto-fetch via ForeignKey → club metadata)
3. **Membership = Character** (User kan meerdere rollen/teams hebben)
4. **Permissions = Hierarchical** (Club sees all, Team sandboxed)
5. **Content ownership:** Team Members kunnen alleen **eigen** content (created_by=self) bewerken
6. **Supporter role:** Read-only access, geen edit rechten (externe viewers: fans, ouders, sponsors)

**Klaar voor uitvoering? Start met Fase 1: Model Migrations!**
