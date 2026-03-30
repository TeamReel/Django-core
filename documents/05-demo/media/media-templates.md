# Media Templates — Lineup, Match Updates & Multi-Sport

> Hoe TeamReel modulaire media-content genereert: van lineup flyers tot match updates, herbruikbaar over sporten.
>
> Last updated: 2026-02-15
> Gerelateerd: [media-architecture.md](media-architecture.md) (4-laags opslagmodel)

---

## 1. Positie in de Media Architectuur

Dit document beschrijft **Laag 5 — Content Generation**: de templates en pipelines die visuele output produceren. De output (PNG/MP4) wordt opgeslagen via de [Media Architectuur](media-architecture.md) (Laag 1–4):

```
┌─────────────────────────────────────────────────────────────────┐
│  Laag 5: Content Generation (DIT DOCUMENT)                      │
│  (Bovenop de 4-laags media architectuur)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ MediaTemplate │  │ ContentType  │  │ SportConfig          │  │
│  │ (lineup,      │  │ (lineup,     │  │ (football, hockey,   │  │
│  │  match_update, │  │  match_update,│  │  basketball, ...)   │  │
│  │  player_card) │  │  player_card)│  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Template Engine                                         │    │
│  │ PIL (headers, labels) + FFmpeg (compositing, video)     │    │
│  └─────────────────────────────┬───────────────────────────┘    │
├────────────────────────────────┼────────────────────────────────┤
│  Laag 4: Video Processing      │  (media-architecture.md)       │
│  VideoJob, VideoPreset          │                                │
├────────────────────────────────┼────────────────────────────────┤
│  Laag 3: Linking & Context     │                                │
│  BrandAsset, MediaItemRelation  │                                │
├────────────────────────────────┼────────────────────────────────┤
│  Laag 2: Rich Media            │                                │
│  MediaItem                      │                                │
├────────────────────────────────┼────────────────────────────────┤
│  Laag 1: Storage               │                                │
│  FileAsset → S3                 ▼                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Template Architectuur — Gedeelde Componenten

Alle media-templates delen dezelfde visuele bouwstenen. Dit maakt het mogelijk om **nieuwe content types** toe te voegen met minimale code.

### 2.1 Herbruikbare componenten

```
┌─────────────────────────────────────────────────────────────┐
│                    GEDEELDE COMPONENTEN                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Header       │  │  Brand       │  │  Typography      │  │
│  │  Generator    │  │  System      │  │  System          │  │
│  │  ────────     │  │  ────────    │  │  ────────        │  │
│  │  • Logo's     │  │  • Kleuren   │  │  • Arial Bold    │  │
│  │  • Competitie │  │  • primary   │  │  • Wit + zwart   │  │
│  │  • Datum/tijd │  │  • secondary │  │    outline       │  │
│  │  • Locatie    │  │  • Gradient  │  │  • Font scaling  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Background   │  │  Sponsor     │  │  Label           │  │
│  │  System       │  │  Overlay     │  │  Placement       │  │
│  │  ────────     │  │  ────────    │  │  ────────        │  │
│  │  • Veld       │  │  • Logo      │  │  • Collision     │  │
│  │  • Gradient   │  │  • Positie   │  │    detection     │  │
│  │  • Custom BG  │  │  • Box       │  │  • Alpha bbox    │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                              │
│              ┌──────────────────────┐                        │
│              │  FFmpeg Compositor    │                        │
│              │  ────────             │                        │
│              │  • filter_complex     │                        │
│              │  • Overlay pipeline   │                        │
│              │  • Video concat       │                        │
│              └──────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Per component — hergebruik

| Component           | Lineup Flyer | Lineup Video | Match Update | Player Card | Score Graphic |
|---------------------|:---:|:---:|:---:|:---:|:---:|
| Header Generator     | ✅ | ✅ | ✅ | ❌ | ✅ |
| Brand System         | ✅ | ✅ | ✅ | ✅ | ✅ |
| Typography System    | ✅ | ✅ | ✅ | ✅ | ✅ |
| Background System    | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sponsor Overlay      | ✅ | ✅ | ✅ | ❌ | ✅ |
| Label Placement      | ✅ | ✅ | ❌ | ❌ | ❌ |
| FFmpeg Compositor    | ✅ | ✅ | ✅ | ❌ | ✅ |
| Player Kit Rendering | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## 3. Content Type: Lineup (Huidige Implementatie)

> Volledig werkend prototype in `local_lineup_test/`

### 3.1 Overzicht

| Output            | Formaat | Script              | Doel                                   |
|-------------------|---------|---------------------|----------------------------------------|
| **Lineup Video**  | MP4     | `build_lineup.py`   | Animatie met intro's, badges, closeups |
| **Lineup Flyer**  | PNG     | `build_flyers.py`   | Statisch beeld voor social media       |

### 3.2 Modulaire componenten — databronnen

| Component             | Lokaal (prototype)                     | Productie (Railway DB)                                       |
|-----------------------|----------------------------------------|--------------------------------------------------------------|
| **Veldachtergrond**   | `assets/background/voetbalveld.jpg`    | `BrandAsset(type="field_background")` → S3 presigned URL     |
| **Thuisclub logo**    | `assets/logos/ajax_logo.png`           | `Project.brand_assets(type="club_logo")` → S3                |
| **Uitclub logo**      | `assets/logos/psv_logo.png`            | Opponent logo via `Activity.opponent` → S3                   |
| **Sponsor logo**      | `assets/logos/ziggo_logo.png`          | `BrandAsset(type="sponsor_logo")` → S3                      |
| **Speler kit**        | `assets/fullbody/<naam>.png`           | `ProjectMembership.metadata.teamreel_assets.kit` → S3       |
| **Speler closeup**    | `assets/closeup/<naam>.png`            | `ProjectMembership.metadata.teamreel_assets.closeup` → S3   |
| **Speler intro video**| `assets/intro/<naam>.mov`              | `ProjectMembership.metadata.teamreel_assets.intro` → S3     |
| **Wedstrijdgegevens** | Hardcoded in `create_header.py`        | `Activity` model (datum, tijdstip, locatie, competitie)      |
| **Formatie**          | CLI `--formation 4-3-3`               | `Activity.formation` of `Lineup.formation`                   |
| **Brand kleuren**     | CLI `--brand-primary/secondary`        | `Project.brand_config.primary_color / secondary_color`       |
| **Spelersnamen**      | `manifest.json`                        | `ProjectMembership.user.full_name`                           |

### 3.3 Ondersteunde formaties

| Formatie  | Verdediging | Middenveld | Aanval | Positie-tweaks |
|-----------|-------------|------------|--------|----------------|
| **4-3-3** | 4           | 3          | 3      | CBs apart, halfs naar binnen, aanvallers hoog |
| **4-4-2** | 4           | 4          | 2      | CBs laag, aanvallers hoog |
| **3-4-3** | 3           | 4          | 3      | CV gecentreerd, keeper gecentreerd |

### 3.4 Flyer pipeline

```
PIL (header + labels) → FFmpeg filter_complex (compositing) → PNG
```

1. `create_header.py` → `assets/header_flyer.png` (PIL)
2. Per speler: naam-label als transparante PNG (PIL, arialbd.ttf)
3. FFmpeg compositeert alles in één filtergraaf:
   - Veld rotated (portrait) als achtergrond
   - Header overlay (bovenaan)
   - Sponsor overlay (links-onder)
   - Per speler: fullbody cutout + naam-label

### 3.5 Video pipeline

```
Keeper → Verdediging → Middenveld → Aanval (per linie: fullbody → intro → closeup badges)
```

Per linie:
1. **Fullbody fase** (3s) — spelers verschijnen op het veld
2. **Intro video** — persoonlijke introvideo (als beschikbaar)
3. **Fullbody kort** (1s) — terugkeer naar veldoverzicht
4. **Closeup badges** (persistent) — blijven staan

### 3.6 Label typografie & plaatsing

- **Font:** Arial Bold (`arialbd.ttf`)
- **Kleur:** Wit (`#FFFFFF`) met zwarte outline (`#000000`, stroke_width=3)
- **Positie:** Altijd onder de speler, nooit erboven
- **Collision detection:** Alpha bounding box, 2D nudge (dy+dx), font-size fallback

### 3.7 CLI

```bash
# Flyers (genereert alle formaties als geen --formation opgegeven)
python build_flyers.py --formation 4-3-3 --brand-primary "#D2122E"

# Video
python build_lineup.py --formation 4-3-3 --style popout

# Header apart genereren
python create_header.py
```

---

## 4. Content Type: Match Update (Toekomstig)

> Dezelfde header + brand styling, ander type content in de body.

### 4.1 Concept

Een **Match Update** is een social media graphic die wordt gegenereerd na een wedstrijdgebeurtenis:

| Event           | Trigger                      | Inhoud                               | Formaat |
|-----------------|------------------------------|--------------------------------------|---------|
| **Doelpunt**    | Goal gescoord                | Scorebord + scorende speler          | PNG     |
| **Rust**        | Eerste helft afgelopen       | Ruststand + statistieken             | PNG     |
| **Eindstand**   | Wedstrijd afgelopen          | Eindstand + doelpuntenmakers         | PNG     |
| **Rode kaart**  | Speler gestuurd              | Speler + minuut                      | PNG     |
| **Wissel**      | Spelerwissel                 | Eruit ↔ erin                         | PNG     |
| **Man of Match**| Wedstrijd afgelopen          | Beste speler + statistieken          | PNG     |

### 4.2 Gedeelde componenten met Lineup

```
┌──────────────── MATCH UPDATE GRAPHIC ──────────────────┐
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  HEADER (hergebruikt van create_header.py)       │   │  ← GEDEELD
│  │  Logo's • Competitie • Datum • Score             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  CONTENT BODY (nieuw per type)                   │   │  ← UNIEK
│  │                                                   │   │
│  │  ┌─────────┐   ┌──────────────────────────┐      │   │
│  │  │ Speler  │   │  "GOAL! • 23'"           │      │   │
│  │  │ Closeup │   │                           │      │   │
│  │  │         │   │  AJAX 2 - 1 PSV           │      │   │
│  │  └─────────┘   └──────────────────────────┘      │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SPONSOR + FOOTER (hergebruikt)                  │   │  ← GEDEELD
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Nieuwe databronnen (naast gedeelde)

| Component           | Lokaal (prototype)              | Productie (Railway DB)                           |
|---------------------|---------------------------------|--------------------------------------------------|
| **Score**           | CLI `--home-score 2 --away-score 1` | `Activity.metadata.score`                    |
| **Doelpuntenmakers**| `manifest.json` uitbreiden      | `ActivityEvent(type="goal")` + speler FK         |
| **Kaarten**         | `manifest.json`                 | `ActivityEvent(type="red_card")`                 |
| **Minuut**          | CLI `--minute 23`               | `ActivityEvent.minute`                           |
| **Statistieken**    | JSON bestand                    | `ActivityStatistic` model                        |
| **Speler foto**     | `assets/closeup/<naam>.png`     | `ProjectMembership.metadata.teamreel_assets`     |

### 4.4 Template parameters

```json
{
  "template": "match_update",
  "event_type": "goal",
  "activity_id": "uuid",
  "home_score": 2,
  "away_score": 1,
  "event_player_id": "uuid",
  "minute": 23,
  "options": {
    "show_assists": true,
    "show_scorers_list": true
  }
}
```

### 4.5 Implementatiepad

```python
# Conceptuele API — hergebruikt bestaande componenten
from create_header import create_header          # Gedeelde header
from brand_system import load_brand_config        # Gedeelde brand kleuren
from ffmpeg_compositor import composite_layers    # Gedeelde FFmpeg pipeline

def build_match_update(event_type: str, event_data: dict, brand: BrandConfig) -> Path:
    """Genereer match update graphic."""
    # 1. Header (hergebruikt) — nu met score erin
    header = create_header(
        home_name=event_data["home_name"],
        away_name=event_data["away_name"],
        score=f"{event_data['home_score']} - {event_data['away_score']}",
        competition=event_data["competition"],
        brand_primary=brand.primary_color,
    )

    # 2. Content body (uniek per event_type)
    body = render_event_body(event_type, event_data, brand)

    # 3. Composiet (hergebruikt FFmpeg pipeline)
    return composite_layers(
        background=brand.background_image,
        header=header,
        body=body,
        sponsor=brand.sponsor_logo,
    )
```

---

## 5. Content Type: Score Graphic (Toekomstig)

> Eenvoudiger dan match update — puur scorebord.

### 5.1 Layout

```
┌────────────────────────────────────────┐
│  HEADER (hergebruikt)                  │  ← GEDEELD
│  Logo • Competitie • Datum             │
├────────────────────────────────────────┤
│                                        │
│          AJAX  2 - 1  PSV              │  ← Grote score
│                                        │
│  ⚽ Tadic 23'        ⚽ De Jong 45'    │  ← Doelpuntenmakers
│  ⚽ Berghuis 67'                       │
│                                        │
├────────────────────────────────────────┤
│  SPONSOR (hergebruikt)                 │  ← GEDEELD
└────────────────────────────────────────┘
```

---

## 6. Multi-Sport Templates

> Dezelfde template-engine, andere sport-configuratie.

### 6.1 Wat verandert per sport?

| Component            | Voetbal          | Hockey             | Basketbal          | Handbal            |
|----------------------|------------------|--------------------|--------------------|--------------------|
| **Veldachtergrond**  | Voetbalveld      | Hockeyveld         | Basketbalveld      | Handbalveld        |
| **Formaties**        | 4-3-3, 4-4-2... | 3-3-3-1, 4-3-3... | 1-2-2, 2-1-2      | 6-0, 5-1, 3-2-1   |
| **Positienamen**     | Keeper, CB, ST   | Keeper, VB, MA     | PG, SG, SF, C     | Keeper, LO, RO     |
| **Speelveld formaat**| 105×68m          | 91×55m             | 28×15m             | 40×20m             |
| **Score termen**     | Goal, doelpunt   | Goal, strafcorner  | Punt, 3-pointer    | Goal, 7-meter      |
| **Kwarten/helften**  | 2 helften        | 4 kwarten          | 4 kwarten          | 2 helften          |
| **Team grootte**     | 11               | 11                 | 5                  | 7                  |

### 6.2 Wat blijft HETZELFDE (70%+ hergebruik)

| Component            | Verandert? | Toelichting                                    |
|----------------------|:---:|------------------------------------------------|
| Header Generator      | ❌  | Zelfde layout: logo's, competitie, datum/tijd  |
| Brand System          | ❌  | Kleuren, logo's werken hetzelfde               |
| Typography System     | ❌  | Arialbd, wit+zwart outline                     |
| Sponsor Overlay       | ❌  | Zelfde positie en styling                      |
| FFmpeg Compositor     | ❌  | Zelfde filter_complex pipeline                 |
| Label Placement       | ❌  | Zelfde collision detection algoritme           |
| Veld achtergrond      | ✅  | Ander veld per sport (config)                  |
| Formaties             | ✅  | Andere formaties (config)                      |
| Positienamen          | ✅  | Andere namen (config)                          |
| Update events         | ✅  | Andere events per sport (config)               |

### 6.3 Sport-configuratie model

```python
@dataclass
class SportConfig:
    """Configureerbaar per sport — alles wat verschilt."""
    sport: str                          # "football", "hockey", "basketball"
    field_aspect_ratio: tuple[int, int] # (105, 68) voor voetbal
    team_size: int                      # 11, 11, 5, 7
    formations: dict[str, list[int]]    # {"4-3-3": [1, 4, 3, 3], ...}
    position_names: dict[str, str]      # {"keeper": "GK", "defender": "CB", ...}
    period_names: list[str]             # ["1e helft", "2e helft"] of ["Q1","Q2","Q3","Q4"]
    event_types: list[str]             # ["goal", "assist", "red_card", ...]
    score_unit: str                     # "goal", "punt", "point"
    default_background: str             # S3 key voor standaard veld

    # Veld-specifieke positionering
    field_y_positions: dict[str, float] # {"keeper": 0.88, "defense": 0.68, ...}
```

### 6.4 Voorbeeld: hockey-configuratie

```python
HOCKEY = SportConfig(
    sport="hockey",
    field_aspect_ratio=(91, 55),
    team_size=11,
    formations={
        "3-3-3-1": [1, 3, 3, 3, 1],
        "4-3-3":   [1, 4, 3, 3],
        "3-3-4":   [1, 3, 3, 4],
    },
    position_names={
        "keeper": "K",
        "defender": "VB",
        "midfielder": "MV",
        "attacker": "VA",
        "spits": "MA",
    },
    period_names=["Q1", "Q2", "Q3", "Q4"],
    event_types=["goal", "strafcorner", "green_card", "yellow_card", "red_card"],
    score_unit="goal",
    default_background="fields/hockey_pitch.jpg",
    field_y_positions={
        "keeper": 0.88,
        "defense": 0.68,
        "midfield": 0.48,
        "attack": 0.28,
        "spits": 0.18,
    },
)
```

### 6.5 Implementatie in de template engine

```python
def build_lineup_flyer(
    players: list[PlayerSegment],
    match_data: dict,
    brand: BrandConfig,
    sport_config: SportConfig,      # ← Nieuw: sport-specifiek
    formation: str = "4-3-3",
) -> Path:
    """Sport-agnostische lineup flyer generator."""
    # 1. Valideer formatie voor deze sport
    assert formation in sport_config.formations, \
        f"{formation} niet beschikbaar voor {sport_config.sport}"

    # 2. Header (hergebruikt, sport-agnostisch)
    header = create_header(...)

    # 3. Positionering (sport-specifiek)
    lines = split_players_by_formation(
        players, sport_config.formations[formation]
    )
    for line_name, line_players in lines.items():
        y = sport_config.field_y_positions[line_name]
        xs = get_x_positions_for_group(len(line_players))
        ...

    # 4. Veld achtergrond (sport-specifiek)
    background = load_field_background(sport_config)

    # 5. Composiet (hergebruikt)
    return composite_layers(...)
```

---

## 7. Database Model voor Templates (Productie)

### 7.1 MediaTemplate model

```python
class MediaTemplate(TimeStampedModel):
    """Template definitie voor een type media-content."""
    slug = models.SlugField(unique=True)          # "lineup_flyer", "match_update_goal"
    name = models.CharField(max_length=100)        # "Lineup Flyer"
    content_type = models.CharField(              # "lineup" | "match_update" | "score" | "player_card"
        max_length=50,
        choices=CONTENT_TYPE_CHOICES
    )
    sport = models.CharField(                     # "football" | "hockey" | "basketball" | "all"
        max_length=50,
        default="all"
    )
    output_format = models.CharField(              # "png" | "mp4" | "both"
        max_length=10
    )
    output_dimensions = models.JSONField(          # {"width": 1080, "height": 1920}
        default=dict
    )
    parameters_schema = models.JSONField(          # JSON Schema voor input validatie
        default=dict
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["content_type", "sport"]),
        ]
```

### 7.2 MediaRender model (generatie log)

```python
class MediaRender(TimeStampedModel):
    """Specifieke render van een template met concrete data."""
    template = models.ForeignKey(MediaTemplate, on_delete=models.CASCADE)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE)
    activity = models.ForeignKey(                  # Optioneel: gekoppeld aan wedstrijd
        "activities.Activity", null=True, blank=True, on_delete=models.SET_NULL
    )
    input_data = models.JSONField()                # Template parameters
    output_file = models.ForeignKey(               # → FileAsset → S3
        "files.FileAsset", null=True, on_delete=models.SET_NULL
    )
    status = models.CharField(                     # pending → processing → completed → failed
        max_length=20, default="pending"
    )
    render_time_ms = models.IntegerField(null=True)
    error_message = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
```

### 7.3 SportConfiguration model

```python
class SportConfiguration(TimeStampedModel):
    """Sport-specifieke configuratie voor templates."""
    slug = models.SlugField(unique=True)           # "football", "hockey"
    name = models.CharField(max_length=50)          # "Voetbal"
    team_size = models.IntegerField()               # 11, 5, 7
    formations = models.JSONField()                 # {"4-3-3": [1,4,3,3], ...}
    position_names = models.JSONField()             # {"keeper": "GK", ...}
    period_names = models.JSONField()               # ["1e helft", "2e helft"]
    event_types = models.JSONField()               # ["goal", "assist", ...]
    field_y_positions = models.JSONField()          # {"keeper": 0.88, ...}
    default_background = models.ForeignKey(         # Standaard veldachtergrond
        "files.FileAsset", null=True, on_delete=models.SET_NULL
    )
```

---

## 8. Lokaal Testen → Productie Workflow

### 8.1 Ontwikkelcyclus

```
┌─────────────────────────────────────────────────────────┐
│  1. LOKAAL PROTOTYPE (local_lineup_test/)               │
│     ┌───────────────────────────────────────────────┐   │
│     │ • Hardcoded data (manifest.json)               │   │
│     │ • Lokale assets (assets/)                      │   │
│     │ • CLI parameters i.p.v. database               │   │
│     │ • Snelle iteratie: wijzig → run → bekijk       │   │
│     │ • Geen netwerk/DB nodig                        │   │
│     └───────────────────────┬───────────────────────┘   │
│                             │ ✅ Visueel correct?        │
│                             ▼                            │
│  2. REFACTOR NAAR MODULE (src/video/ of src/media/)     │
│     ┌───────────────────────────────────────────────┐   │
│     │ • Extract functies naar herbruikbare module    │   │
│     │ • Vervang hardcoded data door function args    │   │
│     │ • Voeg type hints en docstrings toe            │   │
│     │ • Sport-agnostisch maken (SportConfig param)   │   │
│     └───────────────────────┬───────────────────────┘   │
│                             │ ✅ Unit tests passen?      │
│                             ▼                            │
│  3. DATABASE INTEGRATIE (src/video/services/)            │
│     ┌───────────────────────────────────────────────┐   │
│     │ • LineupSegmentBuilder haalt data uit DB       │   │
│     │ • BrandAssets → S3 presigned URLs              │   │
│     │ • Activity → wedstrijdgegevens                 │   │
│     │ • Membership → spelergegevens                  │   │
│     └───────────────────────┬───────────────────────┘   │
│                             │ ✅ Integratie test OK?     │
│                             ▼                            │
│  4. CELERY TASK + API ENDPOINT                          │
│     ┌───────────────────────────────────────────────┐   │
│     │ • POST /api/v1/video/render/                   │   │
│     │ • Celery task voor async processing            │   │
│     │ • Output → FileAsset → MediaItem               │   │
│     │ • WebSocket status updates                     │   │
│     └───────────────────────┬───────────────────────┘   │
│                             │ ✅ Staging OK?             │
│                             ▼                            │
│  5. DEPLOY NAAR RAILWAY                                 │
│     ┌───────────────────────────────────────────────┐   │
│     │ • FFmpeg in Docker container                    │   │
│     │ • S3 voor output opslag                        │   │
│     │ • Monitoring + error handling                  │   │
│     └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Lokaal testen — commando's

```powershell
cd local_lineup_test

# Header genereren
python create_header.py

# Alle formaties (flyer)
python build_flyers.py

# Specifieke formatie + kleuren (flyer)
python build_flyers.py --formation 4-3-3 --brand-primary "#D2122E"

# Video
python build_lineup.py --formation 4-3-3 --style popout

# Toekomstig: match update (concept)
python build_match_update.py --template goal --minute 23 --scorer "Tadic"
```

### 8.3 Assets structuur lokaal

```
local_lineup_test/
├── build_lineup.py            # Video generator (MP4) — werkend
├── build_flyers.py            # Flyer generator (PNG) — werkend
├── create_header.py           # Header component (PIL) — werkend
├── create_circle_assets.py    # Badge masker/rand
├── manifest.json              # Lokale spelersdata
├── ffmpeg_tools.py            # FFmpeg pad-detectie
├── process_intros_rvm.py      # BG-removal introvideo's
├── assets/
│   ├── background/            # Veldachtergrond(en)
│   │   └── voetbalveld.jpg    # Toekomstig: hockeyveld.jpg, etc.
│   ├── closeup/               # Speler closeup foto's
│   ├── fullbody/              # Speler fullbody in tenue
│   ├── intro/                 # Speler introvideo's (.mov)
│   ├── logos/                 # Club- en sponsorlogo's
│   ├── header.png             # Gegenereerde header (video)
│   ├── header_flyer.png       # Gegenereerde header (flyer)
│   ├── circle_mask.png        # Badge masker
│   └── circle_border.png      # Badge rand
└── output/
    ├── ajax_flyer_4-3-3.png
    ├── ajax_flyer_4-4-2.png
    ├── ajax_flyer_3-4-3.png
    ├── ajax_final_lineup_4-3-3.mp4
    ├── ajax_final_lineup_4-4-2.mp4
    └── ajax_final_lineup_3-4-3.mp4
```

---

## 9. Productie-integratie — Database Queries

### 9.1 Dataflow: Railway DB → Video/Flyer

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Railway DB     │     │  LineupSegment-    │     │  Template        │
│   (PostgreSQL)   │────▶│  Builder           │────▶│  Engine          │
│                  │     │                    │     │                  │
│  • Activity      │     │  Queries:          │     │  • PIL headers   │
│  • Lineup        │     │  1. Activity       │     │  • PIL labels    │
│  • Membership    │     │  2. Participations │     │  • FFmpeg comp.  │
│  • BrandAsset    │     │  3. Memberships    │     │                  │
│  • Project       │     │  4. Brand assets   │     │  Output → S3:    │
│  • SportConfig   │     │  5. Sport config   │     │  • MP4 (video)   │
│                  │     │                    │     │  • PNG (flyer)   │
└──────────────────┘     └───────────────────┘     └──────────────────┘
```

### 9.2 Productie dataclasses

```python
@dataclass
class PlayerSegment:
    slot: int                    # Positie in formatie (0-10)
    position: str                # "keeper" | "defender" | "midfielder" | "attacker"
    functional_role: str         # "player" | "goalkeeper" | "coach"
    member_id: str               # ProjectMembership.user.id
    member_name: str             # ProjectMembership.user.full_name
    jersey_number: str | None
    kit_url: str | None          # S3 presigned URL → fullbody in tenue
    intro_url: str | None        # S3 presigned URL → introvideo
    closeup_url: str | None      # S3 presigned URL → closeup
    x: int                       # X-positie op veld (px)
    y: int                       # Y-positie op veld (px)

@dataclass
class LineupData:
    activity_id: str
    match_date: str
    kickoff_time: str | None
    own_team_name: str
    opponent_name: str
    venue: str | None
    competition_name: str | None
    logo_url: str | None
    sponsor_url: str | None
    field_background_url: str | None
    keepers: list[PlayerSegment]
    defenders: list[PlayerSegment]
    midfielders: list[PlayerSegment]
    attackers: list[PlayerSegment]
    coach_name: str | None
    coach_kit_url: str | None
```

### 9.3 API Endpoint

```
POST /api/v1/video/render/
{
  "template": "lineup_flyer",       // of "lineup_video", "match_update_goal"
  "activity_id": "uuid",
  "formation": "4-3-3",
  "sport": "football",              // default
  "options": {
    "badge_style": "popout",
    "include_intros": true,
    "include_sponsor": true,
    "brand_primary": "#D2122E",     // override (optioneel)
    "brand_secondary": "#FFFFFF"    // override (optioneel)
  }
}

→ 202 Accepted
{
  "render_id": "uuid",
  "status": "pending",
  "estimated_seconds": 30
}

GET /api/v1/video/render/{render_id}/
→ 200 OK
{
  "status": "completed",
  "output_url": "https://s3.../lineup_flyer_4-3-3.png",
  "render_time_ms": 4200
}
```

---

## 10. Configuratie-constanten

| Constante                | Waarde   | Beschrijving                         |
|--------------------------|----------|--------------------------------------|
| `WIDTH`                  | 1080     | Output breedte (px)                  |
| `HEIGHT`                 | 1920     | Output hoogte (px, portrait)         |
| `FPS`                    | 30       | Video framerate                      |
| `PLAYER_SCALE_FULLBODY`  | 0.28     | Fullbody grootte (% van HEIGHT)      |
| `PLAYER_SCALE_CLOSEUP`   | 0.11     | Closeup badge grootte (% van HEIGHT) |
| `BADGE_CUT_FRACTION`     | 0.25     | Flat-bottom snijpunt badge           |
| `SPONSOR_W`              | 220      | Sponsor logo breedte (px)            |
| `LABEL_TEXT_COLOR`        | #FFFFFF  | Label tekstkleur                     |
| `LABEL_STROKE_COLOR`     | #000000  | Label outline kleur                  |

---

## 11. Header Component (gedeeld)

### Layout (1080×300 px)

```
┌──────────┬────────────────────────┬──────────┐
│  THUIS   │      RODE BAND         │   UIT    │
│          │                        │          │
│  Club-   │    STARTING XI         │  Club-   │
│  naam    │    COMPETITIE          │  naam    │
│          │    LOCATIE             │          │
│  Logo    │    DATUM • TIJD        │  Logo    │
│          │                        │          │
└──────────┴────────────────────────┴──────────┘
   25%              50%                25%
```

### Parameters → database mapping

| Parameter      | Type   | Voorbeeld                | DB veld                          |
|----------------|--------|--------------------------|----------------------------------|
| `home_name`    | string | `"AJAX"`                 | `Project.name`                   |
| `away_name`    | string | `"PSV"`                  | `Activity.opponent.name`         |
| `competition`  | string | `"EREDIVISIE"`           | `Activity.competition.name`      |
| `venue`        | string | `"Johan Cruijff Arena"`  | `Activity.venue`                 |
| `date_text`    | string | `"15 FEB 2026"`          | `Activity.start_datetime`        |
| `kickoff_time` | string | `"20:00"`                | `Activity.start_datetime`        |
| Home logo      | image  | `ajax_logo.png`          | `Project.brand_assets.club_logo` |
| Away logo      | image  | `psv_logo.png`           | Opponent brand asset             |

---

## 12. Manifest Formaat (Lokaal Prototype)

```json
{
  "background_path": "assets/background/voetbalveld.jpg",
  "players": [
    {
      "member_id": "uuid-...",
      "name": "Bruno MARTINS INDI",
      "functional_roles": ["player"],
      "fullbody_path": "assets/fullbody/bruno_martins_indi.png",
      "closeup_path": "assets/closeup/bruno_martins_indi.png",
      "intro_path": "assets/intro/bruno_martins_indi.mov"
    }
  ]
}
```

In productie wordt dit JSON-object door `LineupSegmentBuilder` opgebouwd uit de database (zie §9.2).

---

## 13. Roadmap — Uitbreidingen

### Fase 1 — Meer formaties (voetbal)
- [ ] 5-3-2
- [ ] 4-2-3-1
- [ ] 4-1-4-1
- [ ] 3-5-2

### Fase 2 — Match Updates
- [ ] `build_match_update.py` lokaal prototype
- [ ] Doelpunt graphic (score + scorende speler)
- [ ] Ruststand graphic
- [ ] Eindstand graphic met doelpuntenmakers

### Fase 3 — Multi-Sport
- [ ] Hockey configuratie + hockeyveld achtergrond
- [ ] Basketbal configuratie + veld
- [ ] Handbal configuratie + veld
- [ ] `SportConfig` dataclass → DB `SportConfiguration` model

### Fase 4 — Automatisering
- [ ] Wissels/bank — tweede rij spelers onder het veld
- [ ] Auto-formatie — formatie afleiden uit posities in DB
- [ ] Score overlay — eindstand in header na afloop
- [ ] Animatie-varianten — fade-in, slide, zoom per speler

### Fase 5 — Platform-Specifiek
- [ ] Instagram Story (9:16) — al standaard
- [ ] Instagram Post (1:1) — crop/resize variant
- [ ] TikTok (9:16) — zelfde als Story
- [ ] Twitter/X (16:9) — landscape variant
- [ ] YouTube thumbnail (16:9) — landscape + tekst overlay

---

## 14. Gerelateerde Documentatie

| Document | Beschrijving |
|----------|-------------|
| [media-architecture.md](media-architecture.md) | 4-laags media opslag model (FileAsset → MediaItem → BrandAsset → VideoJob) |
| [../features/content-templates.md](../features/content-templates.md) | ContentTemplate + ContentField DB schema (feature-perspectief) |
| [../../04-modules/](../../04-modules/) | Module-specifieke documentatie |
| [../data/tables.md](../data/tables.md) | Database tabel structuur |
| [../../03-system/glossary.md](../../03-system/glossary.md) | Domain concepten en naamgeving |
