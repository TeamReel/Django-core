# Media & File Architectuur

> Hoe TeamReel media (afbeeldingen, video's, documenten) beheert op elk niveau van de hiërarchie.
>
> Last updated: 2026-02-12 (B55 Video Integration + Video Processing Pipeline)

## Architectuur Overview

TeamReel gebruikt een **4-laags media architectuur** die opslag scheidt van business logica en video processing.
Daarboven zit **Laag 5: Content Generation** — zie [media-templates.md](media-templates.md).

```
┌─────────────────────────────────────────────────────────────┐
│  Laag 4: Video Processing                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ VideoJob     │  │ VideoPreset   │  │ VideoOverlay  │      │
│  │ (transcode,  │  │ (1080p, 720p, │  │ (logo, text,  │     │
│  │  thumbnail,  │  │  480p, thumb) │  │  watermark)   │      │
│  │  compose)    │  │               │  │               │      │
│  └──────┬──────┘  └──────────────┘  └───────────────┘       │
│         │         ┌──────────────┐                           │
│         │         │PlatformExport │ (IG, TikTok, YT, X)     │
│         │         └──────────────┘                           │
├─────────┼───────────────────────────────────────────────────┤
│  Laag 3: Linking & Context                                  │
│  ┌─────────────┐  ┌──────────────────┐                      │
│  │ BrandAsset   │  │ MediaItemRelation │  (GenericFK)        │
│  │ (semantisch) │  │ (any model)      │                      │
│  └──────┬──────┘  └────────┬─────────┘                      │
├─────────┼──────────────────┼────────────────────────────────┤
│  Laag 2: Rich Media                                         │
│  │              ┌──────────┴─────────┐                      │
│  │              │ MediaItem           │                      │
│  │              │ (processing, tags,  │                      │
│  │              │  search, metadata)  │                      │
│  └──────┬──────┘└──────────┬─────────┘                      │
├─────────┼──────────────────┼────────────────────────────────┤
│  Laag 1: Storage                                            │
│         └──────────────────┴─────────┐                      │
│                              ┌───────┴───────┐              │
│                              │  FileAsset     │              │
│                              │  (S3 pad,      │              │
│                              │   grootte,     │              │
│                              │   mime type)   │              │
│                              └───────┬───────┘              │
│                                      │                      │
│                              ┌───────┴───────┐              │
│                              │  Amazon S3     │              │
│                              │  (fysieke      │              │
│                              │   opslag)      │              │
│                              └───────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Waarom 4 lagen?

| Laag | Model | Verantwoordelijkheid | Weet van business? |
|------|-------|---------------------|--------------------|
| **Storage** | `FileAsset` | S3 pad, bestandsgrootte, mime type, soft-delete | ❌ Nee |
| **Rich Media** | `MediaItem` | Processing state, search, tags, dimensies | 🔶 Project-scoped |
| **Linking** | `BrandAsset` / `MediaItemRelation` | Semantische koppeling aan elk business-object | ✅ Ja |
| **Video Processing** | `VideoJob` / `VideoPreset` / `VideoOverlay` / `PlatformExport` | FFmpeg transcoding, thumbnails, composition, platform-specifieke exports | ✅ Ja |

**Principe:** FileAsset is een "domme" opslagrecord. Het weet niets van clubs, teams, of seizoenen. Alle business-context wordt via **linking models** toegevoegd. Video processing is een optionele laag bovenop de media stack voor transcode/compose/export workflows.

---

## De Modellen

### 1. FileAsset (Storage Laag)

**App:** `src/files/`
**Doel:** Één-op-één referentie naar een bestand op S3.

| Veld | Type | Beschrijving |
|------|------|-------------|
| `id` | UUID | Primary key |
| `organization` | FK → Organisation | Org-scoped (multi-tenancy) |
| `uploaded_by` | FK → User | Wie heeft het geüpload |
| `original_name` | CharField | Originele bestandsnaam |
| `storage_path` | CharField | S3 key (bijv. `orgs/{org}/logos/club-logo.png`) |
| `file_size` | PositiveInteger | Grootte in bytes |
| `mime_type` | CharField | bijv. `image/png`, `video/mp4` |
| `is_public` | Boolean | Publiek toegankelijk via URL? |
| `is_deleted` | Boolean | Soft-delete flag |
| `metadata` | JSONField | Vrije metadata (dimensies, etc.) |
| `thumbnail_path` | CharField | Pad naar gegenereerde thumbnail |

**Gebruik:** Elk bestand dat wordt geüpload krijgt eerst een FileAsset record. Dit is de basis voor alles.

---

### 2. BrandAsset (Branding Laag)

**App:** `src/branding/`
**Doel:** Semantische koppeling van bestanden aan een BrandProfile (logo's, kits, watermarks).

| Veld | Type | Beschrijving |
|------|------|-------------|
| `id` | UUID | Primary key |
| `profile` | FK → BrandProfile | Brand identity eigenaar |
| `file` | FK → FileAsset | Het fysieke bestand |
| `asset_type` | CharField | Semantisch type (zie tabel) |
| `alt_text` | CharField | Accessibility tekst |
| `is_active` | Boolean | Actief ja/nee |

**Beschikbare `asset_type` waarden:**

**Branding & Logo:**

| Type | Fase | Beschrijving |
|------|------|-------------|
| `logo_upload` | 🔵 Raw | Originele upload van gebruiker |
| `logo_light` | 🟢 AI-bewerkt | Gestandaardiseerd logo (lichte achtergrond) |
| `logo_dark` | 🟢 AI-bewerkt | Logo variant voor donkere achtergrond |
| `watermark` | 🟢 AI-bewerkt | Semi-transparant watermerk |
| `favicon` | 🟢 AI-bewerkt | Browser favicon (32x32) |
| `font_file` | 🔵 Upload | Custom lettertype (.woff2) |

**Sponsor:**

| Type | Fase | Beschrijving |
|------|------|-------------|
| `sponsor_logo_upload` | 🔵 Raw | Originele sponsor logo upload |
| `sponsor_logo` | 🟢 AI-bewerkt | Gestandaardiseerd sponsor logo |

**Tenues (per type × thuis/uit/derde):**

| Type | Fase | Beschrijving |
|------|------|-------------|
| `kit_home_upload` | 🔵 Raw | Upload thuistenue (speler) |
| `kit_home` | 🟢 AI-bewerkt | Gestandaardiseerd thuisshirt |
| `kit_home_combined` | 🟣 AI-combined | Tenue + logo + sponsor |
| `kit_away_upload` | 🔵 Raw | Upload uittenue |
| `kit_away` | 🟢 AI-bewerkt | Gestandaardiseerd uitshirt |
| `kit_away_combined` | 🟣 AI-combined | Tenue + logo + sponsor |
| `kit_third_upload` | 🔵 Raw | Upload derde tenue |
| `kit_third` | 🟢 AI-bewerkt | Gestandaardiseerd derde shirt |
| `kit_third_combined` | 🟣 AI-combined | Tenue + logo + sponsor |
| `kit_goalkeeper_upload` | 🔵 Raw | Upload keeperstenue |
| `kit_goalkeeper` | 🟢 AI-bewerkt | Gestandaardiseerd keepersshirt |
| `kit_goalkeeper_combined` | 🟣 AI-combined | Keeper + logo + sponsor |
| `kit_coach_upload` | 🔵 Raw | Upload trainerstenue |
| `kit_coach` | 🟢 AI-bewerkt | Gestandaardiseerd trainersoutfit |
| `kit_coach_combined` | 🟣 AI-combined | Coach + logo + sponsor |
| `kit_assistant_upload` | 🔵 Raw | Upload assistent-tenue |
| `kit_assistant` | 🟢 AI-bewerkt | Gestandaardiseerd assistent outfit |
| `kit_assistant_combined` | 🟣 AI-combined | Assistent + logo + sponsor |

**Locatie:**

| Type | Fase | Beschrijving |
|------|------|-------------|
| `location_photo` | 🔵 Upload | Stadion/veld foto |
| `other` | - | Overig |

**Fases legenda:**
- 🔵 **Raw** — Originele upload door gebruiker
- 🟢 **AI-bewerkt** — Gestandaardiseerd door AI (achtergrond verwijderd, vast formaat)
- 🟣 **AI-combined** — Meerdere bewerkte assets gecombineerd door AI

**Constraint:** Één `asset_type` per `BrandProfile` (unique together). Dus een club kan maar één `kit_home` hebben.

---

### 3. MediaItem (Rich Media Laag)

**App:** `src/medialib/`
**Doel:** Verrijkte media met processing, zoekfunctionaliteit, en tags.

| Veld | Type | Beschrijving |
|------|------|-------------|
| `id` | UUID | Primary key |
| `project` | FK → Project | Project-scoped (team/club) |
| `file` | FK → FileAsset | Het fysieke bestand |
| `title` | CharField | Titel van het media-item |
| `description` | TextField | Beschrijving |
| `mime_type` | CharField | MIME type |
| `file_size_bytes` | BigInteger | Bestandsgrootte |
| `width` / `height` | Integer | Afbeeldingsdimensies |
| `duration_seconds` | Decimal | Videoduur |
| `state` | CharField | `raw` → `processing` → `processed` / `error` |
| `extraction_metadata` | JSONField | Automatisch geëxtraheerde data |
| `search_vector` | SearchVector | PostgreSQL full-text search |
| `activity` | FK → Activity | Optionele koppeling aan wedstrijd/training |
| `generation_request` | FK → GenerationRequest | Optionele AI-generatie link |
| `tags` | M2M → MediaTag | Categorisatie |

**States:**

```
raw → processing → processed
                 → error
                 → archived
```

---

### 4. MediaItemRelation (Generic Linking)

**App:** `src/medialib/`
**Doel:** Koppel een MediaItem aan **elk model** in het systeem via Django's GenericForeignKey.

| Veld | Type | Beschrijving |
|------|------|-------------|
| `media_item` | FK → MediaItem | Het media-item |
| `content_type` | FK → ContentType | Type van het doel-object |
| `object_id` | UUID | ID van het doel-object |
| `target` | GenericFK | Het gekoppelde object |
| `relation_type` | CharField | bijv. `profile_photo`, `match_highlight`, `team_photo` |
| `metadata` | JSONField | Extra context per relatie |

---

## Media per Scope-Niveau

### 🏢 Organisation-niveau

> KNVB, Ajax Amsterdam (als organisatie)

**Mechanisme:** `FileAsset.organization = org`

| Use Case | Hoe | Voorbeeld |
|----------|-----|-----------|
| Organisatie-logo | `BrandAsset(profile=org.brand, asset_type="logo_light")` | KNVB logo |
| Watermark | `BrandAsset(profile=org.brand, asset_type="watermark")` | KNVB watermerk |
| Favicon | `BrandAsset(profile=org.brand, asset_type="favicon")` | Browser icoon |

**Query:**
```python
# Alle brand assets van een organisatie
BrandAsset.objects.filter(profile__organisation=org, is_active=True)
```

---

### ⚽ Club-niveau (Project met parent=None)

> AFC Ajax, Feyenoord, PSV

**Mechanisme:** Club = `Project(parent_project=None)` → eigen `BrandProfile`

| Use Case | Hoe | Voorbeeld |
|----------|-----|-----------|
| Club logo | `BrandAsset(profile=club.brand, asset_type="logo_light")` | Ajax-logo |
| Club logo (dark) | `BrandAsset(profile=club.brand, asset_type="logo_dark")` | Wit Ajax-logo |
| Thuistenue | `BrandAsset(profile=club.brand, asset_type="kit_home")` | Rood/wit shirt |
| Uittenue | `BrandAsset(profile=club.brand, asset_type="kit_away")` | Donkerblauw shirt |
| Club media (gallerij) | `MediaItem(project=club)` | Stadion foto, history |

**Query:**
```python
# Club logo ophalen
BrandAsset.objects.get(
    profile__project=club,
    asset_type="logo_light",
    is_active=True
)

# Alle kits van een club
BrandAsset.objects.filter(
    profile__project=club,
    asset_type__startswith="kit_",
    is_active=True
)

# Club media-gallerij
MediaItem.objects.filter(project=club, state="processed")
```

---

### 👥 Team-niveau (Project met parent=Club)

> Ajax 1, Ajax O21, Ajax Vrouwen 1

**Mechanisme:** Team = `Project(parent_project=club)` → eigen `BrandProfile` (optioneel, erft anders van club)

| Use Case | Hoe | Voorbeeld |
|----------|-----|-----------|
| Team logo (override) | `BrandAsset(profile=team.brand, asset_type="logo_light")` | O21 specifiek logo |
| Team kits (override) | `BrandAsset(profile=team.brand, asset_type="kit_home")` | O21 specifieke tenue |
| Teamfoto | `MediaItem(project=team)` + `MediaItemRelation(target=team)` | Groepsfoto |
| Trainingsvideo | `MediaItem(project=team)` | Trainingsfragment |

**Brand Inheritance:** Als een team geen eigen `BrandProfile` heeft, erft het van de parent club via `BrandProfile.get_merged_tokens()`.

**Query:**
```python
# Team brand met fallback naar club
brand = BrandProfile.get_effective_brand(project=team)

# Team-specifieke media
MediaItem.objects.filter(project=team)

# Team media gekoppeld aan het team-object
MediaItemRelation.objects.filter(
    content_type=ContentType.objects.get_for_model(Project),
    object_id=team.id,
    relation_type="team_photo"
)
```

---

### 📅 Season-niveau (Period)

> Seizoen 2024/2025, Seizoen 2025/2026

**Mechanisme:** Season = `Period(parent_period=None, project=team)`

| Use Case | Hoe | Voorbeeld |
|----------|-----|-----------|
| Seizoensfoto | `MediaItem(project=team)` + `MediaItemRelation(target=period)` | Groepsfoto 2024/2025 |
| Seizoens-specifieke kit | Combinatie: `BrandAsset` + `metadata={"season": "2024-2025"}` | Jubileum-tenue |
| Seizoensoverzicht video | `MediaItem(project=team)` + `MediaItemRelation(target=period, relation_type="season_recap")` | Compilatievideo |

**Query:**
```python
# Alle media van een specifiek seizoen
season = Period.objects.get(name="Seizoen 2024/2025", project=team)
MediaItemRelation.objects.filter(
    content_type=ContentType.objects.get_for_model(Period),
    object_id=season.id
).select_related("media_item")

# Seizoensfoto
MediaItemRelation.objects.filter(
    content_type=ContentType.objects.get_for_model(Period),
    object_id=season.id,
    relation_type="team_photo"
)
```

---

### ⚔️ Match-niveau (Activity)

> Ajax - Feyenoord, 2 februari 2025

**Mechanisme:** Match = `Activity(activity_type="match", project=team, period=competition)`

| Use Case | Hoe | Voorbeeld |
|----------|-----|-----------|
| Wedstrijdfoto | `MediaItem(project=team, activity=match)` | Actiefoto's |
| Highlight video | `MediaItem(project=team, activity=match)` | Doelpunten compilatie |
| Match thumbnail | `MediaItem(project=team, activity=match)` + `relation_type="thumbnail"` | Preview-afbeelding |
| Post-match interview | `MediaItem(project=team, activity=match)` + tags: `["interview"]` | Video |

**Let op:** `MediaItem` heeft een directe `activity` FK — geen GenericFK nodig voor de meest voorkomende koppeling.

**Query:**
```python
# Alle media van een wedstrijd (direct)
MediaItem.objects.filter(activity=match, state="processed")

# Alleen highlights
MediaItem.objects.filter(
    activity=match,
    tags__slug="highlight"
)

# Match thumbnail
MediaItemRelation.objects.filter(
    content_type=ContentType.objects.get_for_model(Activity),
    object_id=match.id,
    relation_type="thumbnail"
).first()
```

---

### 👤 User-niveau

> Brian (als ingelogde gebruiker)

**Mechanisme:** `FileAsset.uploaded_by = user` + `MediaItem.created_by = user`

| Use Case | Hoe | Voorbeeld |
|----------|-----|-----------|
| Profielfoto | `MediaItemRelation(target=user, relation_type="profile_photo")` | Avatar |
| Uploads overzicht | `FileAsset.objects.filter(uploaded_by=user)` | Alle uploads van Brian |
| Mijn media | `MediaItem.objects.filter(created_by=user)` | Media aangemaakt door Brian |

**Query:**
```python
# Profielfoto van een user
MediaItemRelation.objects.filter(
    content_type=ContentType.objects.get_for_model(User),
    object_id=user.id,
    relation_type="profile_photo"
).select_related("media_item__file").first()

# Alle uploads van een user
FileAsset.objects.filter(uploaded_by=user, is_deleted=False)
```

---

### 🎽 Membership-niveau (User ↔ Club/Team/Seizoen)

> Dusan Tadic als speler van Ajax 1, seizoen 2024/2025, rugnummer 10

**Mechanisme:** `ProjectMembership(project=team, user=user, period=season)` + `Participation(member=org_membership, period=season)`

| Use Case | Hoe | Voorbeeld |
|----------|-----|-----------|
| Spelerfoto (headshot) | `MediaItemRelation(target=project_membership, relation_type="headshot")` | Portretfoto |
| Actie foto's | `MediaItemRelation(target=project_membership, relation_type="action_shot")` | Spelerfoto's in actie |
| Spelerskaart achtergrond | `MediaItemRelation(target=project_membership, relation_type="card_background")` | Custom achtergrond || **Speler in tenue (fullbody)** | `MediaItemRelation(target=project_membership, relation_type="member_in_tenue")` | AI-gegenereerde fullbody foto |
| **Speler close-up** | `MediaItemRelation(target=project_membership, relation_type="member_closeup")` | AI-gegenereerde close-up foto |
| **Short Intro Video** | `MediaItemRelation(target=project_membership, relation_type="member_intro")` | 🎬 AI-gegenereerde intro video (5-6 sec) |
| **Goal Celebration Video** | `MediaItemRelation(target=project_membership, relation_type="member_goal_celebration")` | 🎬 AI-gegenereerde viering video (5-6 sec) |
**Drie membership-contexten:**

```
┌──────────────────────────────────────────────────────────────┐
│  Membership-User-Club                                        │
│  ProjectMembership(project=club, user=tadic)                 │
│  → Tadic als lid van AFC Ajax (alle seizoenen)               │
├──────────────────────────────────────────────────────────────┤
│  Membership-User-Team                                        │
│  ProjectMembership(project=ajax_1, user=tadic)               │
│  → Tadic als lid van Ajax 1 (specifiek team)                 │
├──────────────────────────────────────────────────────────────┤
│  Membership-User-Season                                      │
│  ProjectMembership(project=ajax_1, user=tadic, period=szn)   │
│  → Tadic in Ajax 1, seizoen 2024/2025                        │
│  → metadata: {shirt_number: 10, position: "CAM"}             │
└──────────────────────────────────────────────────────────────┘
```

**Query:**
```python
# Spelerfoto voor een specifiek seizoen
pm = ProjectMembership.objects.get(
    project=ajax_1,
    user=tadic,
    period=season_2024
)
MediaItemRelation.objects.filter(
    content_type=ContentType.objects.get_for_model(ProjectMembership),
    object_id=pm.id,
    relation_type="headshot"
).select_related("media_item__file").first()

# Alle media van een speler bij een club
pms = ProjectMembership.objects.filter(project=club, user=tadic)
MediaItemRelation.objects.filter(
    content_type=ContentType.objects.get_for_model(ProjectMembership),
    object_id__in=pms.values_list("id", flat=True)
).select_related("media_item")
```

---

## S3 Folder Structuur

De `path_prefix` parameter organiseert bestanden logisch op S3:

```
teamreel-assets-demo/
├── orgs/
│   └── {org_id}/
│       ├── logos/
│       │   ├── org-logo-light.png
│       │   └── org-logo-dark.png
│       └── documents/
│           └── statuten.pdf
├── clubs/
│   └── {club_slug}/
│       ├── logos/
│       │   ├── club-logo.png
│       │   └── club-logo-dark.png
│       └── kits/
│           ├── home/
│           │   └── shirt-front.png
│           ├── away/
│           │   └── shirt-front.png
│           ├── goalkeeper/
│           │   └── shirt-front.png
│           └── training/
│               └── shirt-front.png
├── teams/
│   └── {team_slug}/
│       ├── photos/
│       │   └── team-photo-2024.jpg
│       └── videos/
│           └── training-clip.mp4
├── members/
│   └── {membership_id}/
│       ├── headshot.jpg
│       ├── generated/
│       │   ├── member_in_tenue/
│       │   │   └── fullbody_in_tenue_kit-home_20260210_a1b2c3d4.png
│       │   ├── member_closeup/
│       │   │   └── closeup_in_tenue_kit-home_20260210_e5f6g7h8.png
│       │   ├── member_intro/
│       │   │   └── member_intro_kit-home_style-arms_crossed_20260210_i9j0k1l2.mp4
│       │   └── member_goal_celebration/
│       │       └── member_goal_celebration_kit-home_style-fist_pump_20260210_m3n4o5p6.mp4
│       └── action-shots/
│           ├── goal-vs-feyenoord.jpg
│           └── celebration.jpg
└── matches/
    └── {activity_slug}/
        ├── highlights/
        │   └── goals-compilation.mp4
        ├── photos/
        │   └── team-celebration.jpg
        └── thumbnails/
            └── match-preview.jpg
```

---

## Samenvatting: Welk Model Wanneer?

| Wat wil je opslaan? | Model | Waarom? |
|---------------------|-------|---------|
| **Een bestand uploaden** | `FileAsset` | Altijd de eerste stap |
| **Logo, kit, watermark** | `BrandAsset` → `FileAsset` | Semantisch type + brand-scoped |
| **Foto, video met verwerking** | `MediaItem` → `FileAsset` | Processing, search, tags |
| **Media koppelen aan match** | `MediaItem(activity=match)` | Directe FK (snelste query) |
| **Media koppelen aan seizoen** | `MediaItemRelation(target=period)` | GenericFK (flexibel) |
| **Media koppelen aan speler** | `MediaItemRelation(target=membership)` | GenericFK (flexibel) |
| **Media koppelen aan user** | `MediaItemRelation(target=user)` | GenericFK (flexibel) |
| **Thumbnail genereren** | Celery → `MediaItem.state` | Async processing |
| **Full-text zoeken** | `MediaItem.search_vector` | PostgreSQL GIN index |
| **Video transcoden** | `VideoJob(job_type="transcode")` | FFmpeg async processing |
| **Video thumbnail** | `VideoJob(job_type="thumbnail")` | Frame extraction |
| **Video samenstellen** | `VideoJob(job_type="compose")` | Multi-clip composition |
| **Platform export** | `PlatformExport` | IG/TikTok/YT/X formaten |
| **Video overlay** | `VideoOverlay` | Logo/text/watermark op video |

---

## Video Processing Pipeline (B55)

### Model: VideoJob

**App:** `src/video/`
**Doel:** Async video processing via FFmpeg met Celery.

| Veld | Type | Beschrijving |
|------|------|-------------|
| `id` | UUID | Primary key |
| `project` | FK → Project | Project-scoped |
| `source_file` | FK → FileAsset | Input video |
| `output_file` | FK → FileAsset | Output video (na processing) |
| `job_type` | CharField | `transcode`, `thumbnail`, `compose` |
| `status` | CharField | `pending` → `processing` → `completed` / `failed` |
| `preset` | FK → VideoPreset | Encoding configuratie |
| `progress` | IntegerField | 0-100% voortgang |
| `error_message` | TextField | Foutmelding bij failure |
| `metadata` | JSONField | Extra job parameters |

**Status flow:**
```
pending → processing → completed
                     → failed → (retry) → pending
```

### Model: VideoPreset

| Veld | Type | Beschrijving |
|------|------|-------------|
| `name` | CharField | bijv. `1080p_standard`, `720p_mobile` |
| `codec` | CharField | Video codec (h264, h265) |
| `resolution` | CharField | bijv. `1920x1080` |
| `bitrate` | CharField | bijv. `5000k` |
| `audio_codec` | CharField | Audio codec (aac) |

### Model: PlatformExport

| Veld | Type | Beschrijving |
|------|------|-------------|
| `platform` | CharField | `instagram`, `tiktok`, `youtube`, `twitter` |
| `aspect_ratio` | CharField | `1:1`, `4:5`, `9:16`, `16:9` |
| `max_duration` | IntegerField | Max duur in seconden |
| `max_file_size` | BigIntegerField | Max bestandsgrootte |

### Model: VideoOverlay

| Veld | Type | Beschrijving |
|------|------|-------------|
| `job` | FK → VideoJob | Gekoppelde video job |
| `overlay_type` | CharField | `logo`, `text`, `watermark` |
| `position` | CharField | bijv. `top-right`, `bottom-left` |
| `file` | FK → FileAsset | Overlay bestand (optioneel) |
| `text_content` | CharField | Tekst voor text overlays |
| `opacity` | FloatField | Transparantie (0.0 - 1.0) |

### Celery Queues

| Queue | Prioriteit | Gebruik |
|-------|-----------|---------|
| `video_fast` | Hoog | Thumbnails, korte bewerkingen (<30s) |
| `video_slow` | Normaal | Transcoding, composition (minuten) |

### Video in Frontend (Member Assets)

De video-integratie in de frontend werkt via het **AI-generatie pad**, niet via de VideoJob API:

```
┌─────────────────────────────────────────────────────────────┐
│  Member Detail Page                                          │
│  ┌───────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ Intro Tab  │  │ Celebration   │  │ Assets Tab        │   │
│  │ (🎬 video) │  │ Tab (🎉 video)│  │ (📷 images)       │   │
│  └─────┬─────┘  └──────┬────────┘  └───────────────────┘   │
│        │               │                                     │
│        ▼               ▼                                     │
│  AssetGenerationModal (async polling)                        │
│  ┌─────────────────────────────────────────────┐            │
│  │ 1. Select template (member_intro /           │            │
│  │    member_goal_celebration)                   │            │
│  │ 2. Configure (kit_type × pose/style)         │            │
│  │ 3. Generate → HTTP 202 + task_id             │            │
│  │ 4. Poll status every 5s (max 12.5 min)       │            │
│  │ 5. Preview + Accept                           │            │
│  └─────────────────────────────────────────────┘            │
│        │                                                     │
│        ▼                                                     │
│  metadata.teamreel_assets.videos.intro[kit][pose]            │
│  metadata.teamreel_assets.videos.celebration[kit][style]     │
└─────────────────────────────────────────────────────────────┘
```

**Video Constants:**
| Template | Duur | Ratio | Resolutie | Beschrijving |
|----------|------|-------|-----------|-------------|
| `member_intro` | 6s | 9:16 | 720p | Korte intro video van speler |
| `member_goal_celebration` | 6s | 9:16 | 720p | Doelpunt viering animatie |

---

## AI-Verwerkingspipeline & Inheritance Chain

### Concept: Raw Upload → AI-bewerkt → Gecombineerd

Elk visueel asset doorloopt een **3-staps verwerkingsketen**. De gebruiker uploadt een raw bestand, de AI zet het om in een gestandaardiseerd formaat, en vervolgens worden assets gecombineerd tot een eindproduct.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          CLUB-NIVEAU                                         │
│                                                                              │
│  ┌─────────┐    AI Flow    ┌──────────────┐                                  │
│  │ Logo    ├──────────────►│ Logo bewerkt  │──┐                              │
│  │ (upload) │              └──────────────┘  │                              │
│  └─────────┘                                 │                              │
│                                              │   AI Flow    ┌────────────┐  │
│  ┌─────────┐    AI Flow    ┌──────────────┐  ├─────────────►│ Tenue      │  │
│  │ Tenue   ├──────────────►│ Tenue bewerkt│──┤              │ + Logo     │  │
│  │ (upload) │              └──────────────┘  │              │ + Sponsor  │  │
│  └─────────┘                                 │              │ (combined) │  │
│                                              │              └────────────┘  │
│  ┌─────────┐    AI Flow    ┌──────────────┐  │                              │
│  │ Sponsor ├──────────────►│ Sponsor      │──┘                              │
│  │ (upload) │              │ bewerkt      │                                  │
│  └─────────┘              └──────────────┘                                  │
│                                                                              │
│  × 4 tenue-types: Player, Keeper, Coach, Assistant                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          TEAM-NIVEAU                                         │
│                                                                              │
│  Erft van club:  Tenue bewerkt ──┐                                           │
│  Erft van club:  Logo bewerkt  ──┤   AI Flow    ┌─────────────────────┐      │
│                                  ├─────────────►│ Tenue + Logo        │      │
│  Team-keuze:                     │              │ + Team Sponsor      │      │
│  ┌─────────────────────────┐     │              │ (team combined)     │      │
│  │ Eigen sponsor uploaden  │─────┤              └─────────────────────┘      │
│  │ OF club sponsor erven   │     │                                           │
│  └─────────────────────────┘     │                                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                          MEMBER-NIVEAU (per season)                          │
│                                                                              │
│  Erft van team:   Tenue + Logo + Sponsor (combined) ──┐                      │
│                                                        │  AI Flow            │
│  Erft van user:   Profielfoto ─────────────────────────┤────────────►        │
│                                                        │  ┌───────────────┐  │
│                                                        └──│ Spelerskaart  │  │
│                                                           │ (profiel +    │  │
│                                                           │  tenue + logo │  │
│                                                           │  + sponsor)   │  │
│                                                           └───────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 🏟️ Club-niveau: Uploads & AI-verwerking

Een club (Project met `parent_project=None`) beheert de **basis visuele identiteit**.

#### Wat de gebruiker uploadt:

| Asset | BrandAsset type | Beschrijving |
|-------|----------------|-------------|
| Club logo | `logo_upload` | Raw logo-afbeelding (elke resolutie/formaat) |
| Thuistenue Player | `kit_home_upload` | Foto/afbeelding van het spelersshirt |
| Uittenue Player | `kit_away_upload` | Foto/afbeelding van het uitshirt |
| Derde tenue Player | `kit_third_upload` | Optioneel derde shirt |
| Keeperstenue | `kit_goalkeeper_upload` | Keepers shirt |
| Trainerstenue | `kit_coach_upload` | Trainers outfit |
| Assistent-tenue | `kit_assistant_upload` | Assistent outfit |
| Sponsor afbeelding | `sponsor_logo_upload` | Logo van de hoofdsponsor |
| Locatie afbeelding(en) | `location_photo` | Stadion/veld foto's |

#### Wat de AI-flow produceert:

| AI Output | BrandAsset type | Input | Beschrijving |
|-----------|----------------|-------|-------------|
| Logo bewerkt | `logo_light` | `logo_upload` | Gestandaardiseerd logo (transparante achtergrond, vast formaat) |
| Logo bewerkt (dark) | `logo_dark` | `logo_upload` | Logo variant voor donkere achtergrond |
| Tenue bewerkt (per type) | `kit_home` | `kit_home_upload` | Gestandaardiseerd shirt (vaste hoek, achtergrond verwijderd) |
| Sponsor bewerkt | `sponsor_logo` | `sponsor_logo_upload` | Gestandaardiseerd sponsor-logo |
| **Tenue + Logo + Sponsor** | `kit_home_combined` | logo + kit + sponsor | Compleet tenue-plaatje met logo en sponsor ingeplaatst |

**Per tenue-type (4x)** worden deze stappen herhaald:

```
Player tenue:    kit_home_upload → kit_home → kit_home_combined
Keeper tenue:    kit_goalkeeper_upload → kit_goalkeeper → kit_goalkeeper_combined
Coach tenue:     kit_coach_upload → kit_coach → kit_coach_combined
Assistant tenue: kit_assistant_upload → kit_assistant → kit_assistant_combined
```

**Vermenigvuldig met thuis/uit/derde:**

```
Player thuis:  kit_home_upload → kit_home → kit_home_combined
Player uit:    kit_away_upload → kit_away → kit_away_combined
Player derde:  kit_third_upload → kit_third → kit_third_combined
Keeper thuis:  kit_goalkeeper_home_upload → kit_goalkeeper_home → kit_goalkeeper_home_combined
...etc
```

#### Sponsor op club-niveau:

| Veld | Opslag | Beschrijving |
|------|--------|-------------|
| Sponsor naam | `BrandProfile.metadata.sponsor_name` | "Ziggo" |
| Sponsor logo (raw) | `BrandAsset(asset_type="sponsor_logo_upload")` | Geüpload door gebruiker |
| Sponsor logo (bewerkt) | `BrandAsset(asset_type="sponsor_logo")` | AI-gestandaardiseerd |

---

### 👥 Team-niveau: Sponsor Overerving & Override

Een team (Project met `parent_project=club`) **erft tenue + logo van de club** maar kan een **eigen sponsor** hebben.

#### Inheritance regels:

| Asset | Bron | Override mogelijk? |
|-------|------|-------------------|
| Tenue (alle types) | ← Club BrandProfile | ❌ Nee (altijd van club) |
| Logo | ← Club BrandProfile | ❌ Nee (altijd van club) |
| Sponsor | ← Club OF eigen upload | ✅ Ja |

#### Team sponsor keuze:

```
Team BrandProfile.metadata:
{
    "sponsor_mode": "club"       // Erft sponsor van club
    // OF
    "sponsor_mode": "custom"     // Eigen sponsor
}
```

| Scenario | Actie | Resultaat |
|----------|-------|-----------|
| Sponsor = club | `sponsor_mode: "club"` | Team gebruikt `club.brand.sponsor_logo` |
| Sponsor = eigen | `sponsor_mode: "custom"` + eigen `sponsor_logo_upload` | Team heeft eigen sponsor |

#### AI-flow op team-niveau:

Wanneer een team een eigen sponsor heeft, wordt de **combined output opnieuw gegenereerd**:

```
Input:  Club tenue (bewerkt) + Club logo (bewerkt) + Team sponsor (bewerkt)
Output: Team-specifieke combined tenue (kit_home_combined op team BrandProfile)
```

Als het team de club-sponsor erft, kan het de `kit_home_combined` van de club direct gebruiken.

**Query logica:**
```python
def get_team_combined_kit(team, kit_type="kit_home_combined"):
    """Haal combined kit op: team-specifiek of club fallback."""
    # Probeer eerst team-specifiek
    team_brand = BrandProfile.objects.filter(project=team, is_active=True).first()
    if team_brand:
        team_kit = BrandAsset.objects.filter(
            profile=team_brand, asset_type=kit_type, is_active=True
        ).first()
        if team_kit:
            return team_kit

    # Fallback naar club
    club = team.parent_project
    club_brand = BrandProfile.objects.filter(project=club, is_active=True).first()
    if club_brand:
        return BrandAsset.objects.filter(
            profile=club_brand, asset_type=kit_type, is_active=True
        ).first()

    return None
```

---

### 📅 Season-niveau: Historische Tenue & Sponsor

Voor hetzelfde team kan het tenue en/of de sponsor **per seizoen wijzigen**. Het actieve seizoen synchroniseert altijd met het team-niveau.

#### Hoe seizoensgebonden assets werken:

```
Team: Ajax 1
├── Season 2023/2024
│   ├── Sponsor: Ziggo
│   ├── Thuistenue: Rood/wit classic
│   └── Uittenue: Donkerblauw
│
├── Season 2024/2025 (ACTIEF)    ← Huidige team-niveau assets
│   ├── Sponsor: Ziggo
│   ├── Thuistenue: Rood/wit modern
│   └── Uittenue: Goud/zwart
│
└── Season 2025/2026 (NIEUW)
    ├── Sponsor: Adidas ← GEWIJZIGD
    ├── Thuistenue: Rood/wit retro ← GEWIJZIGD
    └── Uittenue: Marineblauw ← GEWIJZIGD
```

#### Opslag mechanisme:

| Wat | Waar | Beschrijving |
|-----|------|-------------|
| **Actief seizoen** | `BrandAsset` op Team `BrandProfile` | De "huidige" tenue + sponsor |
| **Historische seizoenen** | `BrandAsset` metadata + `MediaItemRelation(target=Period)` | Archief per seizoen |

#### Wanneer een nieuw seizoen wordt aangemaakt:

1. **Kopieer** huidige team assets als startpunt voor het nieuwe seizoen
2. Gebruiker kan assets **wijzigen** (ander tenue, andere sponsor)
3. AI-flow draait opnieuw met de **nieuwe inputs**
4. Als het seizoen **actief** wordt, worden de team-level assets bijgewerkt

```python
# Seizoensgebonden brand assets opslaan
# Via metadata op BrandAsset:
BrandAsset.metadata = {
    "period_id": "uuid-of-season-2024-2025",
    "season_name": "Seizoen 2024/2025",
    "is_season_active": True
}

# OF via MediaItemRelation voor archivering:
MediaItemRelation.objects.create(
    media_item=kit_media_item,
    content_type=ContentType.objects.get_for_model(Period),
    object_id=season.id,
    relation_type="season_kit_home_combined",
    metadata={"kit_type": "home", "role": "player"}
)
```

#### Seizoen-wisseling flow:

```
1. Admin maakt "Season 2025/2026" aan voor Ajax 1
2. Systeem kopieert huidige BrandAssets (tenue, logo, sponsor) als defaults
3. Admin uploadt nieuwe thuistenue → AI flow → kit_home_combined (nieuw)
4. Admin wijzigt sponsor → Adidas logo upload → AI flow → sponsor bewerkt
5. AI flow → Nieuwe combined: tenue + logo + nieuwe sponsor
6. Admin activeert seizoen → Team-level BrandProfile wordt bijgewerkt
7. Oude seizoen-assets blijven bewaard als archief
```

---

### 🎽 Member-niveau: Spelerskaart Generatie

Members (spelers/staf) zijn gekoppeld aan een **specifiek seizoen** via `ProjectMembership(project=team, period=season)`.

#### Inheritance chain voor een member:

```
User                          → Profielfoto (via MediaItemRelation)
  └── ProjectMembership
        ├── period = Season   → Bepaalt welk tenue/sponsor actief is
        └── project = Team    → Erft tenue + logo + sponsor (combined)
```

#### Wat de gebruiker ziet:

**Pagina:** `/{org}/{club}/{team}/{season}/{member_id}?tab=kit`

Voorbeeld: `https://demo.teamreel.app/knvb/ajax/ajax-1/season-2024-2025/4f6cfaf5-...?tab=kit`

| Element | Bron | Beschrijving |
|---------|------|-------------|
| Profielfoto | User → `MediaItemRelation(relation_type="profile_photo")` | Automatisch van user profiel |
| Tenue (bewerkt) | Team ← Club `BrandAsset(kit_home)` | Via inheritance |
| Logo (bewerkt) | Team ← Club `BrandAsset(logo_light)` | Via inheritance |
| Sponsor (bewerkt) | Team `BrandAsset(sponsor_logo)` OF Club fallback | Afhankelijk van `sponsor_mode` |

#### AI-flow voor spelerskaart:

```
Input:
├── Profielfoto (van user profiel, snapshot op dat moment)
├── Tenue combined (van team/club, seizoen-specifiek)
├── Naam + Rugnummer (van ProjectMembership.metadata)
└── Positie (van ProjectMembership.metadata of Participation.data)

AI Processing:
├── Achtergrond verwijderen van profielfoto
├── Profielfoto compositen op tenue-template
├── Naam + nummer overlay toevoegen
└── Gestandaardiseerd formaat (bijv. 800x1200)

Output:
└── Spelerskaart afbeelding → MediaItemRelation(target=ProjectMembership)
    relation_type = "player_card"
```

#### Profielfoto inheritance:

De member **erft** de profielfoto van de User op het moment van generatie. Dit is een **snapshot** — als de user later zijn profielfoto wijzigt, wordt de spelerskaart niet automatisch bijgewerkt (tenzij opnieuw gegenereerd).

```python
# Profielfoto ophalen via user
user = project_membership.user
profile_photo = MediaItemRelation.objects.filter(
    content_type=ContentType.objects.get_for_model(User),
    object_id=user.id,
    relation_type="profile_photo"
).select_related("media_item__file").first()

# Spelerskaart opslaan op membership
MediaItemRelation.objects.update_or_create(
    content_type=ContentType.objects.get_for_model(ProjectMembership),
    object_id=project_membership.id,
    relation_type="player_card",
    defaults={
        "media_item": generated_card_media_item,
        "metadata": {
            "source_profile_photo": str(profile_photo.media_item.file_id),
            "source_kit": str(combined_kit_asset.file_id),
            "generated_at": "2025-02-07T12:00:00Z",
            "shirt_number": project_membership.metadata.get("shirt_number"),
            "position": project_membership.metadata.get("position"),
        }
    }
)
```

---

#### AI-flow voor video's (Short Intro & Goal Celebration):

Video's worden gegenereerd met **Google Veo 3.1** (image-to-video) en opgeslagen op dezelfde granulariteit als fullbody/closeup: onder de `ProjectMembership`.

```
Input:
├── Speler in tenue (fullbody) ← AI-gegenereerde afbeelding als startframe
├── Template (member_intro OF member_goal_celebration)
├── Style variant (arms_crossed, fist_pump, etc.)
└── Kit type (home, away, etc.)

AI Processing (Google Veo 3.1):
├── Image-to-video: fullbody foto als startframe
├── 5-6 seconden animatie volgens prompt
├── 9:16 vertical formaat (720p) voor social media
└── Output: MP4 video

Opslag:
├── FileAsset(mime_type="video/mp4", storage_path="members/{membership_id}/generated/member_intro/...")
├── MediaItem(project=team, mime_type="video/mp4", duration_seconds=6)
└── MediaItemRelation(target=ProjectMembership, relation_type="member_intro" | "member_goal_celebration")
```

**S3 Pad:** `members/{membership_id}/generated/{asset_type}/{filename}.mp4`

**Beschikbare video templates:**

| Template | Stijl Varianten | Beschrijving |
|----------|----------------|-------------|
| `member_intro` | `arms_crossed`, `hand_up`, `thumbs_up` | Korte intro: speler draait, kijkt in camera |
| `member_goal_celebration` | `arms_wide`, `fist_pump`, `point_to_sky`, `slide` | Doelviering: dynamische juichbeweging |

**Query video's ophalen per member:**
```python
# Alle video's van een speler
pm = ProjectMembership.objects.get(project=team, user=tadic, period=season)
pm_ct = ContentType.objects.get_for_model(ProjectMembership)

# Intro video
MediaItemRelation.objects.filter(
    content_type=pm_ct,
    object_id=pm.id,
    relation_type="member_intro"
).select_related("media_item__file").first()

# Goal celebration video
MediaItemRelation.objects.filter(
    content_type=pm_ct,
    object_id=pm.id,
    relation_type="member_goal_celebration"
).select_related("media_item__file").first()

# Alle video's van een speler (intro + celebration)
MediaItemRelation.objects.filter(
    content_type=pm_ct,
    object_id=pm.id,
    relation_type__in=["member_intro", "member_goal_celebration"]
).select_related("media_item__file")
```

**Video's ophalen voor match- en seizoenspagina's:**

Omdat memberships onder een season hangen, en seasons onder een team, zijn video's automatisch beschikbaar op hogere niveaus:

```python
# Alle spelersvideo's van een seizoen (voor seizoenspagina)
season_memberships = ProjectMembership.objects.filter(
    project=team, period=season
)
pm_ct = ContentType.objects.get_for_model(ProjectMembership)
season_videos = MediaItemRelation.objects.filter(
    content_type=pm_ct,
    object_id__in=season_memberships.values_list("id", flat=True),
    relation_type__in=["member_intro", "member_goal_celebration"],
).select_related("media_item__file", "media_item")

# Alle spelersvideo's voor een match (via deelnemende spelers)
# Match → Participation → ProjectMembership
match_participations = Participation.objects.filter(
    activity=match
).select_related("member__user")
match_membership_ids = match_participations.values_list(
    "member__project_memberships__id", flat=True
)
match_videos = MediaItemRelation.objects.filter(
    content_type=pm_ct,
    object_id__in=match_membership_ids,
    relation_type__in=["member_intro", "member_goal_celebration"],
).select_related("media_item__file")
```

---

### Volledige Inheritance Chain (Samenvatting)

```
Organisation (KNVB)
│
├── Club (AFC Ajax)                    ← BrandProfile met:
│   ├── logo_upload → AI → logo_light     (gestandaardiseerd logo)
│   ├── kit_home_upload → AI → kit_home   (gestandaardiseerd tenue)
│   ├── sponsor_logo_upload → AI → sponsor_logo
│   ├── AI → kit_home_combined            (tenue + logo + sponsor)
│   └── location_photo                    (stadion/veld)
│
│   ├── Team (Ajax 1)                  ← Erft tenue + logo van club
│   │   ├── sponsor_mode: "custom"     ← Eigen sponsor OF "club" (erft)
│   │   ├── sponsor_logo_upload (opt)  ← Alleen bij custom
│   │   └── AI → kit_home_combined     ← Met team-specifieke sponsor
│   │
│   │   ├── Season 2024/2025          ← Actief seizoen
│   │   │   ├── Tenue = team-level    ← Sync met actief seizoen
│   │   │   └── Sponsor = team-level  ← Sync met actief seizoen
│   │   │
│   │   │   ├── Member: Dusan Tadic       ← ProjectMembership
│   │   │   │   ├── Profielfoto ← User    ← Snapshot van user profiel
│   │   │   │   ├── Tenue ← Team ← Club  ← Inheritance chain
│   │   │   │   ├── #10, CAM             ← membership.metadata
│   │   │   │   ├── AI → Fullbody in tenue  (afbeelding)
│   │   │   │   ├── AI → Close-up in tenue  (afbeelding)
│   │   │   │   ├── AI → 🎬 Short Intro     (video, 5-6 sec)
│   │   │   │   ├── AI → 🎬 Goal Celebration (video, 5-6 sec)
│   │   │   │   └── AI → Spelerskaart    ← Gecombineerd eindproduct
│   │   │   │
│   │   │   └── Member: Remko Pasveer
│   │   │       ├── Profielfoto ← User
│   │   │       ├── Keeperstenue ← Club  ← Ander tenue-type!
│   │   │       ├── #22, GK
│   │   │       ├── AI → 🎬 Short Intro     (video, 5-6 sec)
│   │   │       └── AI → Spelerskaart
│   │   │
│   │   └── Season 2025/2026          ← Nieuw seizoen
│   │       ├── Tenue = GEWIJZIGD      ← Nieuwe upload + AI flow
│   │       ├── Sponsor = GEWIJZIGD    ← Nieuwe sponsor
│   │       └── Members → Nieuwe spelerskaarten genereren
│   │
│   └── Team (Ajax O21)
│       ├── sponsor_mode: "club"       ← Erft alles van club
│       └── Geen eigen AI-flow nodig   ← Gebruikt club combined
│
└── Club (Feyenoord)                   ← Eigen BrandProfile, eigen keten
    └── ...
```

---

### AI-flow Types (B34 Generative Pipeline)

Elke AI-verwerking is een `GenerationRequest` via het B34 Generative Pipeline systeem:

| Template | Input | Output | Wanneer |
|----------|-------|--------|---------|
| `logo_standardize` | Raw logo upload | Transparant, vast formaat logo | Na logo upload |
| `kit_standardize` | Raw tenue foto | Achtergrond verwijderd, vaste hoek | Na tenue upload |
| `sponsor_standardize` | Raw sponsor logo | Transparant, vast formaat | Na sponsor upload |
| `kit_combine` | Logo + tenue + sponsor (bewerkt) | Gecombineerd tenue-plaatje | Na alle 3 bewerkt || `fullbody_in_tenue` | Profielfoto + tenue combined | Speler in tenue (fullbody, transparant) | Op member kit-pagina |
| `closeup_in_tenue` | Profielfoto + tenue combined | Speler close-up (borstbeeld, transparant) | Op member kit-pagina |
| `member_intro` | Speler in tenue (fullbody) | 🎬 Short intro video (5-6 sec, Veo 3.1) | Op member kit-pagina |
| `member_goal_celebration` | Speler in tenue (fullbody) | 🎬 Goal viering video (5-6 sec, Veo 3.1) | Op member kit-pagina || `player_card_generate` | Profielfoto + combined tenue + naam/nummer | Spelerskaart | Op member kit-pagina |

**Flow in B34 termen:**
```
GenerationTemplate(slug="kit_combine", provider="openai")
  → GenerationRequest(template=..., input_data={logo_id, kit_id, sponsor_id})
    → process_generation_request.delay()  (Celery)
      → GenerationOutput(file_asset=result)
        → BrandAsset(asset_type="kit_home_combined", file=output.file_asset)
```

---

## Frontend API Patronen

### Upload Flow

```
1. POST /api/v1/files/?path_prefix=clubs/ajax/kits/home
   Headers: X-Organization-ID, X-CSRFToken
   Body: FormData { file }
   → Returns: FileAsset { id, storage_path, ... }

2. POST /api/v1/branding/{brand_id}/assets/
   Body: { file: file_asset_id, asset_type: "kit_home" }
   → Returns: BrandAsset { id, file, asset_type, ... }
```

### Query Flow

```
GET /api/v1/branding/{brand_id}/assets/?asset_type=kit_home
→ Returns: BrandAsset met geneste FileAsset (URL)

GET /api/v1/medialib/items/?project={team_id}&activity={match_id}
→ Returns: MediaItems met tags, dimensies, URLs

GET /api/v1/medialib/relations/?target_type=activities.period&target_id={season_id}
→ Returns: Alle media gekoppeld aan een seizoen
```

---

## Architectuur Beslissingen

| Beslissing | Keuze | Reden |
|-----------|-------|-------|
| FileAsset = domme opslag | ✅ | Geen business logica in storage laag |
| BrandAsset voor logo's/kits | ✅ | Semantische types + unique per profiel |
| MediaItem voor rich media | ✅ | Processing pipeline + full-text search |
| MediaItemRelation voor linking | ✅ | GenericFK = koppel aan ALLES |
| Geen FK's op FileAsset naar clubs/teams | ✅ | Voorkomt god-object, circulaire deps |
| S3 path_prefix voor organisatie | ✅ | Logische folder structuur, geen DB impact |
| Brand inheritance (team → club) | ✅ | `get_effective_brand()` + `get_merged_tokens()` |

---

## Gerelateerd: Content Generation Templates

De **content generation laag** (lineup flyers, match updates, multi-sport templates) bouwt voort op deze media-architectuur. Output van templates wordt opgeslagen als `FileAsset` → `MediaItem` → `MediaItemRelation`.

→ Zie [media-templates.md](media-templates.md) voor het volledige template systeem.
