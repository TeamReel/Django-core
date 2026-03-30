# Lineup Video & Flyer — Modulaire Architectuur

> Hoe de lineup video en lineup flyer stap-voor-stap worden opgebouwd: welke bestanden, welke assets, welke pipeline.
>
> Last updated: 2026-03-12
> Gerelateerd: [media-architecture.md](media-architecture.md) · [media-templates.md](media-templates.md)
>
> **Scope:** Dit document beschrijft specifiek de lineup pipeline. Andere video services (goal celebrations, match flyers, team posters, then-vs-now) volgen vergelijkbare patronen maar zijn hier niet gedocumenteerd.

---

## 1. Overzicht

TeamReel genereert twee visuele producten vanuit dezelfde databron:

| Product | Formaat | Resolutie | Duur |
|---------|---------|-----------|------|
| **Lineup Video** | MP4 (H.264) | 1080×1920 (9:16) | ~38s |
| **Lineup Flyer** | PNG (RGB24) | 1080×1920 (9:16) | — |

Beide delen dezelfde data-laag en header-generator:

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  Activity (wedstrijd)                                            │
│     │                                                            │
│     ▼                                                            │
│  LineupSegmentBuilder._gather_lineup_data()                      │
│     │                                                            │
│     ▼                                                            │
│  LineupData (dataclass)                                          │
│     │                    │                                       │
│     ▼                    ▼                                       │
│  compose_lineup_video()  generate_lineup_flyer()                 │
│  (FFmpeg + PIL)          (PIL + FFmpeg)                           │
│     │                    │                                       │
│     ▼                    ▼                                       │
│  MP4 video              PNG flyer                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Betrokken Bestanden

| Bestand | Rol |
|---------|-----|
| `src/video/services/lineup_builder.py` | **Data Layer** — haalt alle data op uit DB, retourneert `LineupData` |
| `src/video/services/lineup_composer.py` | **Video Compositor** — FFmpeg pipeline, 4 fasen + hold |
| `src/video/services/lineup_flyer_generator.py` | **Flyer Compositor** — PIL + FFmpeg, single PNG output |
| `src/video/services/header_generator.py` | **Header Renderer** — gedeelde PIL-header (video + flyer) |
| `src/video/services/asset_processing_specs.py` | **Asset Specs** — target specs voor fullbody/closeup/intro |
| `src/generative/services/asset_pipeline.py` | **AI Pipeline** — Gemini logo/sponsor verwerking + postprocessing |

---

## 3. Data Gathering: `_gather_lineup_data()`

### 3.1 Brand Hiërarchie

Assets worden opgehaald via een hiërarchie van `BrandProfile`s:

```
Organisation (top-level)           ← org_brand
  └── Club (parent_project)        ← club_brand
       └── Team (project)          ← team_brand
```

| Asset | Zoekvolgorde | Team overslaan? |
|-------|-------------|-----------------|
| **Logo** | club → org | **Ja** — logo erft altijd van club, nooit team |
| **Sponsor** | team → club → org | Nee — team kan sponsor overriden |
| **Veld achtergrond** | team → club → org | Nee |
| **Opponent logo** | opponent club | Ja — skip opponent team |
| **Merk kleur** | team → club (design_tokens) | Nee |

### 3.2 Logo & Sponsor Asset Types

Alleen AI-processed assets worden gebruikt. Geen fallbacks naar raw uploads of legacy types.

| Asset | Type | Beschrijving |
|-------|------|-------------|
| **Logo** | `logo` | AI-processed transparante PNG (verplicht) |
| **Sponsor** | `sponsor_logo` | AI-processed transparante PNG (verplicht) |

> **Belangrijk**: Als het processed logo (`logo`) of processed sponsor (`sponsor_logo`) niet beschikbaar is op club/org niveau, moet het eerst gegenereerd worden. Raw uploads (`logo_upload`, `sponsor_logo_upload`) worden niet gebruikt.

**Bescherming**: Assets met `file_size == 0` worden automatisch overgeslagen.

### 3.3 Speler Assets

Per speler worden 3 visuele assets opgehaald uit `ProjectMembership.metadata.teamreel_assets`:

| Asset | Bron | Formaat | Gebruikt in |
|-------|------|---------|-------------|
| **Fullbody** | `images.fullbody.{kit_type}` | PNG 1080×1920, transparant | Video deel 1-2, Flyer |
| **Closeup** | `images.closeup.{kit_type}` | PNG 512×512, transparant | Video deel 3 (badge), Flyer |
| **Intro video** | `videos.intro.{kit_type}_{style}` | WebM/MOV met alpha | Video deel 2 |

**Intro stijl prioriteit**: `arms_crossed` → `thumbs_up` → `hand_up`
**Intro formaat**: voorkeur voor `processed_source` (.mov ProRes met alpha) boven `preview`

### 3.4 Gastspeler (Guest Player)

Als een speler geen assets heeft (geen fullbody, geen closeup), wordt automatisch een **silhouet-placeholder** gegenereerd. Hierdoor kan de video/flyer altijd gemaakt worden, ook als niet alle spelers foto's hebben.

- Silhouet: grijs figuur (hoofd + romp + benen) op transparant canvas
- Gegenereerd door `generate_guest_silhouette()` in `header_generator.py`
- `PlayerSegment.is_guest_player = True` markering in data
- Naam en rugnummer worden normaal weergegeven

### 3.5 LineupData Structuur

```python
@dataclass
class LineupData:
    activity_id: str
    match_date: str
    kickoff_time: str
    own_team_name: str
    opponent_name: str
    is_home: bool
    venue: str
    competition_name: str

    # Brand assets (URLs)
    logo_url: str | None           # Van club/org profiel
    opponent_logo_url: str | None  # Van opponent club profiel
    sponsor_url: str | None        # Van team/club/org profiel
    field_background_url: str | None

    # Spelers per linie (gesplitst op formatie)
    keepers: list[PlayerSegment]
    defenders: list[PlayerSegment]
    midfielders: list[PlayerSegment]
    attackers: list[PlayerSegment]

    # Output specs
    output_width: int   # 1080
    output_height: int  # 1920
    output_fps: int     # 30
```

---

## 4. Formatie Systeem

### 4.1 Ondersteunde Formaties

| Formatie | Verdedigers | Middenvelders | Aanvallers |
|----------|-------------|---------------|------------|
| 4-3-3 | 4 | 3 | 3 |
| 4-4-2 | 4 | 4 | 2 |
| 3-4-3 | 3 | 4 | 3 |

### 4.2 Y-posities (% van hoogte)

**Video:**

| Linie | Y-positie |
|-------|-----------|
| Keeper | 90% |
| Verdediging | 75% |
| Middenveld | 54% |
| Aanval | 40% |
| Coach | 70% |

**Flyer:**

| Linie | Y-positie |
|-------|-----------|
| Keeper | 82% |
| Verdediging | 66% |
| Middenveld | 50% |
| Aanval | 36% |

> Speler-hoogte = 16% van canvas (307px). Alle spelers vallen volledig onder de 300px header.

### 4.3 X-posities

- Gelijkmatig verdeeld met marges
- 4-speler rijen: `[0.11, 0.36, 0.64, 0.89]`
- 4-4-2 aanvallers: `[0.33, 0.67]`
- Video 4-speler rijen: Y-stagger `[-1.5%, +1.5%, +1.5%, -1.5%]` voor diepte-effect

---

## 5. Header Generator (Gedeeld)

De header is identiek voor video en flyer — gerenderd door `render_header_pil()`:

```
┌──────────────────────────────────────────────────────────┐
│                     1080 × 300 px                        │
│                                                          │
│  ┌─────────┐  ┌──────────────────────┐  ┌─────────┐    │
│  │         │  │    STARTING XI       │  │         │    │
│  │  THUIS  │  │  Ajax - Heracles     │  │  UIT    │    │
│  │  LOGO   │  │  Eredivisie          │  │  LOGO   │    │
│  │         │  │  Johan Cruijff Arena │  │         │    │
│  │         │  │  15-02-2026 • 14:30  │  │         │    │
│  └─────────┘  └──────────────────────┘  └─────────┘    │
│   wit (25%)    merk kleur (50%)          wit (25%)      │
└──────────────────────────────────────────────────────────┘
```

### Layout details

| Element | Font | Positie (Y%) |
|---------|------|-------------|
| STARTING XI | 72pt bold, wit + zwarte stroke | 18% |
| Wedstrijdtitel | 44pt bold, wit | 40% |
| Competitie | 32pt bold, wit | 56% |
| Locatie | 28pt bold, wit | 72% |
| Datum + tijd | 26pt bold, wit | 88% |

### Logo verwerking

1. Download van S3 (presigned URL)
2. Alpha cleanup (`_clean_logo_alpha()`) — verwijdert schaakbordpatroon van AI-gegenereerde PNGs
3. Thumbnail naar 80% van paneel (padding 10% rondom)
4. RGBA compositing op witte achtergrond
5. Eindresultaat geflat naar RGB (geen alpha in finale output)

### Twee entry points

| Functie | Gebruikt door | Retourneert |
|---------|--------------|-------------|
| `generate_header_image()` | Video compositor | Presigned S3 URL (PNG) |
| `render_header_pil()` | Flyer compositor | Raw PIL Image |

---

## 6. Lineup Video Pipeline

### 6.1 Architectuur

De video bestaat uit **4 fasen** (keeper → verdediging → middenveld → aanval), elk met 3 delen, plus een **hold frame** aan het eind:

```
┌─────────────────────────────────────────────────────────────┐
│                    LINEUP VIDEO (~38s)                       │
│                                                             │
│  Fase 1: Keeper (8s)                                        │
│  ├── Deel 1: Fullbody reveal (3s)                          │
│  └── Deel 2: Intro overlay (5s)                            │
│                                                             │
│  Fase 2: Verdediging (9s)                                   │
│  ├── Deel 1: Fullbody reveal (3s)                          │
│  ├── Deel 2: Intro overlay (5s)                            │
│  └── Deel 3: Badge transitie (1s)                          │
│                                                             │
│  Fase 3: Middenveld (9s)                                    │
│  ├── Deel 1: Fullbody reveal (3s)                          │
│  ├── Deel 2: Intro overlay (5s)                            │
│  └── Deel 3: Badge transitie (1s)                          │
│                                                             │
│  Fase 4: Aanval (9s)                                        │
│  ├── Deel 1: Fullbody reveal (3s)                          │
│  ├── Deel 2: Intro overlay (5s)                            │
│  └── Deel 3: Badge transitie (1s)                          │
│                                                             │
│  Hold Frame (3s) — alle badges                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Per Deel

#### Deel 1: Fullbody Reveal (3s)
- Spelers schuiven van onderaf omhoog (slide_up animatie)
- Fullbody PNG overlaid op veldachtergrond
- Wit naamlabel onder elke speler
- FFmpeg `filter_complex` met geanimeerde `overlay` y-expressies

#### Deel 2: Intro Overlay (5s)
- Intro video's (VP9 WebM of ProRes .mov met alpha) spelen over spelerpositie
- Fallback naar statisch fullbody als geen intro beschikbaar
- Naamlabels blijven zichtbaar
- Alpha compositing via FFmpeg

#### Deel 3: Badge Transitie (1s)
- Crossfade van fullbody → circulaire closeup badge
- Fullbody fades out, badge fades in
- Naamlabel gaat van volledige naam naar achternaam badge label
- FFmpeg crossfade + badge mask pipeline

### 6.3 Badge Rendering

```
┌─────────────────────────────────┐
│        Badge Opbouw             │
│                                 │
│    ┌───────────┐               │
│    │  Popout   │  ← hoofd boven│
│    │  ┌─────┐  │    cirkel     │
│    │  │Close│  │               │
│    │  │ up  │  │               │
│    │  │     │  │               │
│    │  └─────┘  │               │
│    │ ○ cirkel  │               │
│    │   mask    │               │
│    └───────────┘               │
│    ┌───────────┐               │
│    │ ACHTERNAAM│  ← wit label  │
│    └───────────┘    vaste      │
│                     breedte    │
└─────────────────────────────────┘
```

- Cirkel mask (platte bodem op 25%)
- Closeup geschaald met zoom (1.3× popout / 1.25× inside)
- Blauwe vulling (`#7EC8E3`) achter gemaskeerde speler
- Witte cirkel border overlay
- Popout: hoofd steekt boven cirkel uit
- Vast-breedte wit naamlabel

### 6.4 Persistent Badge Accumulatie

Na elke fase worden de badges pre-gerenderd naar PNG en toegevoegd aan een `persistent_players[]` lijst. Volgende fasen tonen alle eerdere badges als statische overlays (goedkoop vs. volledige filter pipeline).

### 6.5 Gemeenschappelijke Basis (elk frame)

```
wit canvas (1080×1920)
  → header overlay (y=0)
  → veld achtergrond (y=300)
  → sponsor overlay (linksonder)
  → persistent badges (eerdere fasen)
```

---

## 7. Lineup Flyer Pipeline

### 7.1 Stappen

```
1. Download achtergrond
     (landscape detectie → 90° rotatie)
2. Render header (render_header_pil)
     → RGBA → RGB conversie
3. Download sponsor
     (optioneel, transparent placeholder als fallback)
4. Download speler assets
     (fullbody/closeup per speler)
5. Bereken posities
     (_get_x_positions + _apply_formation_tweaks)
6. Label collision detectie
     (dy/dx offsets + font verkleining)
7. Render labels als transparante PNGs
     (witte tekst, zwarte stroke)
8. FFmpeg compositing
     veld → header → sponsor → spelers → labels → RGB24
9. Upload naar S3
     → presigned URL retourneren
```

### 7.2 Flyer Layout

```
┌──────────────────────────────────┐
│          HEADER (300px)          │
│  [Logo]  STARTING XI  [Logo]    │
│          AJAX - FEYENOORD       │
├──────────────────────────────────┤
│                                  │
│           ○  ○  ○  ← Aanval    │
│                                  │
│         ○  ○  ○  ○  ← Midden  │
│                                  │
│        ○  ○  ○  ○  ← Verdedig. │
│                                  │
│             ○  ← Keeper         │
│                                  │
│  ┌──────┐                       │
│  │Spons.│                       │
│  └──────┘                       │
└──────────────────────────────────┘
```

---

## 8. AI Logo Pipeline

### 8.1 Verwerking

```
Raw upload (JPG/PNG)
  │
  ▼
Preprocessing (_preprocess_logo)
  - Convert naar RGBA
  - Pad naar 512×512 transparant canvas
  - Logo geschaald naar max 480×480
  │
  ▼
Gemini AI generatie
  - Prompt: verwijder achtergrond, maak transparant
  - Output: RGBA PNG
  │
  ▼
Postprocessing (_postprocess_crop_and_center)
  - Tight-crop op alpha bounding box
  - Schaakbord cleanup (_strip_checkerboard)
  - Schaal naar 90% van 1024×1024 canvas
  - Centreer op transparant canvas
  │
  ▼
Opslag als BrandAsset (asset_type="logo")
  - FileAsset → S3
  - Presigned URL voor runtime gebruik
```

### 8.2 Schaakbord Bescherming

AI-modellen (Gemini) renderen soms een zichtbaar schaakbordpatroon in de RGB-pixels in plaats van echte transparantie. Twee beschermingslagen:

1. **Bron**: `_strip_checkerboard()` in `asset_pipeline.py` — draait bij postprocessing van nieuw-gegenereerde logos
2. **Runtime**: `_clean_logo_alpha()` in `header_generator.py` — draait bij elke header render

**Detectie heuristiek**: pixels met `alpha > 0`, achromatisch (`RGB spread < 30`), en helder (`brightness > 180`) worden als achtergrond behandeld → `alpha = 0`.

---

## 9. Asset Flow Diagram

```
                    BrandProfile (Club)
                    ├── logo ──────────────┐  (processed, verplicht)
                    ├── sponsor_logo ────────┤  (processed, verplicht)
                    └── stadium_background ──┤
                                             │
                    Opponent Club              │
                    └── logo ───────────────┤  (processed)
                                             │
                    ProjectMembership          │
                    ├── fullbody PNG ──────────┤
                    ├── closeup PNG ───────────┤
                    ├── intro video (.mov) ────┤
                    └── (of gastspeler silhouet) ┤  (auto-gegenereerd)
                                             │
                                             ▼
                                      LineupData
                                      ┌──────────────┐
                                      │ logo_url     │
                                      │ opp_logo_url │
                                      │ sponsor_url  │
                                      │ bg_url       │
                                      │ keepers[]    │
                                      │ defenders[]  │
                                      │ midfielders[]│
                                      │ attackers[]  │
                                      └──────┬───────┘
                                             │
                              ┌──────────────┴──────────────┐
                              ▼                             ▼
                       Lineup Video                  Lineup Flyer
                       (MP4, ~38s)                   (PNG, 1 frame)
```

---

## 10. Gerelateerde Documentatie

| Document | Beschrijving |
|----------|-------------|
| [media-architecture.md](media-architecture.md) | 4-laags media opslag model (FileAsset → MediaItem → BrandAsset) |
| [media-templates.md](media-templates.md) | Template systeem voor alle content types |
| [../data/tables.md](../data/tables.md) | Database tabel structuur |
| [../../03-system/glossary.md](../../03-system/glossary.md) | Domain concepten en naamgeving |
