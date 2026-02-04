# TeamReel Media Generation Plan

**Last Updated:** 2026-02-02
**Environment:** Railway Production (backend) + S3 (storage) + External APIs (Gemini/FFmpeg)
**Status:** Planning
**Related Docs:**
- [B34 AI Generation Pipeline Spec](../../kitty-specs/043-ai-generation-pipeline/spec.md) - Core-App infrastructure
- [TeamReel Transactions & Wallets](teamreel-transactions-wallets-plan.md) - Credit system integration
- [TeamReel Data Strategy](teamreel-data-strategy.md) - Hierarchy + guiding principles
- [TeamReel Frontend Integration Audit](teamreel-frontend-integration-audit.md) - UI integration status

---

## 📋 Executive Summary

**Doel:** Uitbreiden van TeamReel met vaste "templates" (flows) die automatisch afbeeldingen en video's genereren en bewerken op basis van dynamische input van users.

**Core components:**
1. **Amazon S3** - Centrale opslag voor alle assets (input/output)
2. **Gemini API** - AI image generation met vaste prompts
3. **FFmpeg** - Video rendering engine voor dynamische content

**Integratie met Core-App:** Dit plan sluit direct aan op het **B34 Generative Pipelines** module, met TeamReel-specifieke templates en executors.

---

## 🎯 Use Cases

### Use Case 1: Tenue Ontwerp Genereren

**Beschrijving:** Automatisch een minimalistisch clubtenue-ontwerp maken op basis van referenties.

| Aspect | Details |
|--------|---------|
| **Input** | 3 afbeeldingen: tenue referentie, clublogo, sponsor logo |
| **Process** | Gemini API met vaste prompt template |
| **Output** | 1 minimalistisch tenue-ontwerp (PNG/JPG in S3) |

**Specificaties output:**
- Blauw shirt met wit accent
- Clublogo links op borst
- Sponsor centraal op borst
- Blauwe sokken, blauw broekje
- Strak en minimalistisch (geen schaduwen/details)

**Flow:**
```
[Input Check] → [Gemini Generate] → [S3 Upload] → [Output Ready]
```

### Use Case 2: Lineup Video Genereren

**Beschrijving:** Dynamische video van de opstelling met speler-introvideo's en animaties.

| Aspect | Details |
|--------|---------|
| **Input** | 11 speler-assets (pasfoto + introvideo), achtergrond veld, formatie |
| **Process** | FFmpeg rendering met vaste template |
| **Output** | 1 MP4 video (30-60 sec) in S3 |

**Video structuur:**
1. Achtergrond: voetbalveld (vast asset)
2. Segmenten per linie:
   - **Keeper** (1 speler)
   - **Verdedigers** (4 spelers)
   - **Middenvelders** (3 spelers)
   - **Aanvallers** (3 spelers)
3. Per speler:
   - Introvideo (±5 sec) groot in beeld
   - Animate naar positie op veld (verkleind)
4. Finale: volledige opstelling in beeld

**Flow:**
```
[Validate Assets] → [FFmpeg Compose] → [S3 Upload] → [Output Ready]
```

---

## 🏗️ Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TeamReel Frontend                           │
│  (React/Vite - upload inputs, start jobs, view status & results)   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ REST API
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Django Backend (Railway)                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │ B34 Generative   │  │ B11 Credits      │  │ B22 File Assets │   │
│  │ Pipelines        │  │ System           │  │ (S3 integration)│   │
│  │ - Templates      │  │ - Reserve/Settle │  │ - Presigned URLs│   │
│  │ - Requests       │  │ - Transactions   │  │ - Metadata      │   │
│  │ - Outputs        │  └──────────────────┘  └─────────────────┘   │
│  └────────┬─────────┘                                              │
│           │ Celery Task                                            │
│           ▼                                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Pipeline Executors                               │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  │  │
│  │  │ Gemini Executor │  │ FFmpeg Executor │  │ OpenAI Executor│  │  │
│  │  │ (tenue design)  │  │ (lineup video)  │  │ (text content) │  │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────────────┘  │  │
│  └───────────┼────────────────────┼─────────────────────────────┘  │
└──────────────┼────────────────────┼────────────────────────────────┘
               │                    │
               ▼                    ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │  Gemini API  │    │   FFmpeg     │    │  Amazon S3   │
        │  (Google)    │    │   Worker     │    │  (Storage)   │
        └──────────────┘    └──────────────┘    └──────────────┘
```

### Integration Points

| Core-App Module | TeamReel Integration |
|-----------------|---------------------|
| **B34 Generative Pipelines** | Custom templates (TenueDesign, LineupVideo) + custom executors (Gemini, FFmpeg) |
| **B35 Smart Asset Library** | MediaItem metadata, tagging, context relations, collections, search |
| **B11 Credits** | Reserve credits on job submit, settle on completion, refund on failure |
| **B22 File Storage** | S3 integration for all input/output assets (low-level storage) |
| **B15 Celery** | Async job processing (`process_generation_request` task) |
| **B23 WebSocket** | Real-time status updates (optional) |
| **B24 Full-Text Search** | Search assets by title, tags, related entities |
| **B07 Projects** | Template/request scoped to teams (clubs) |

---

## 🏷️ B35 Smart Asset Library Integratie

B35 voegt een **Digital Asset Management (DAM)** laag toe bovenop B22 file storage. Dit is de "slimme" laag die metadata, tagging en relaties beheert.

### Lagen Stack

```
┌─────────────────────────────────────────────────────────────┐
│  B35 Smart Asset Library (DAM)                              │
│  - MediaItem (rich metadata wrapper)                        │
│  - MediaTag (manual + auto + AI-generated)                  │
│  - Context Relations (links to Players, Matches, Clubs)     │
│  - Collections ("Best Goals 2024", "Lineup Videos Q1")      │
│  - Search (B24 full-text integration)                       │
├─────────────────────────────────────────────────────────────┤
│  B22 File Storage (low-level)                               │
│  - FileAsset (binary storage reference)                     │
│  - S3 presigned URLs                                        │
│  - Retention policies                                       │
└─────────────────────────────────────────────────────────────┘
```

### MediaItem Model (wraps B22 FileAsset)

```python
# B35 MediaItem - rich metadata layer
MediaItem(
    id=UUID,
    file=FileAsset,  # FK to B22

    # Rich metadata
    title="Ajax vs PSV Lineup - Speeldag 15",
    description="Officiële opstelling voor de topper",

    # Auto-extracted (images/videos)
    width=1920,
    height=1080,
    duration_seconds=45.0,  # voor video's

    # State management
    state='processed',  # raw | processed | archived

    # Context
    project=Project,  # Club/Team scope
    created_by=User,

    # Timestamps
    created_at=datetime,
    updated_at=datetime
)
```

### MediaTag voor TeamReel Assets

```python
# Tag types
TAG_TYPES = [
    ('manual', 'Manual'),        # User-created
    ('auto', 'Auto-extracted'),  # From filename/metadata
    ('ai_generated', 'AI'),      # From B34 generation context
]

# Voorbeelden TeamReel tags:
MediaTag(name="lineup-video", slug="lineup-video", tag_type="auto")
MediaTag(name="tenue-design", slug="tenue-design", tag_type="auto")
MediaTag(name="ajax", slug="ajax", tag_type="auto")
MediaTag(name="seizoen-2025-26", slug="seizoen-2025-26", tag_type="auto")
MediaTag(name="eredivisie", slug="eredivisie", tag_type="auto")
MediaTag(name="topper", slug="topper", tag_type="manual")  # User added
```

### Context Relations (Generic ForeignKeys)

```python
# Link MediaItem to TeamReel entities
MediaItemRelation(
    media_item=MediaItem,

    # Generic FK to any entity
    content_type=ContentType,  # e.g., Activity, Membership, Project
    object_id=UUID,

    relation_type='features' | 'belongs_to' | 'created_for'
)

# Voorbeelden:
# "This lineup video belongs to Match #42"
MediaItemRelation(
    media_item=lineup_video,
    content_type=Activity,
    object_id=match_42_id,
    relation_type='belongs_to'
)

# "This video features Player Pietje"
MediaItemRelation(
    media_item=lineup_video,
    content_type=OrganisationMembership,
    object_id=pietje_membership_id,
    relation_type='features'
)
```

### Collections voor TeamReel

```python
# Group related media
Collection(
    name="Lineup Videos Seizoen 2025/26",
    description="Alle officiële opstellingsvideo's",
    project=ajax_club,  # Scoped to club
    items=[lineup_video_1, lineup_video_2, ...]  # M2M
)

Collection(
    name="Tenue Designs Ajax",
    description="Goedgekeurde tenue-ontwerpen",
    project=ajax_club,
    items=[tenue_home, tenue_away, tenue_third]
)
```

### Auto-Linking B34 → B35

Wanneer B34 content genereert, wordt automatisch een MediaItem aangemaakt:

```python
# In B34 executor (na succesvolle generatie)
async def finalize_output(self, request: GenerationRequest, output_path: str):
    # 1. B22: FileAsset already created
    file_asset = FileAsset.objects.get(storage_path=output_path)

    # 2. B35: Create MediaItem wrapper
    media_item = MediaItem.objects.create(
        file=file_asset,
        title=f"{request.template.name} - {request.created_at}",
        project=request.project,
        created_by=request.user,
        state='processed'
    )

    # 3. Auto-tag based on template
    media_item.tags.add(
        MediaTag.objects.get_or_create(slug=request.template.slug)[0],
        MediaTag.objects.get_or_create(slug=request.project.slug)[0]
    )

    # 4. Auto-link context from input_data
    if 'match_id' in request.input_data:
        MediaItemRelation.objects.create(
            media_item=media_item,
            content_type=ContentType.objects.get_for_model(Activity),
            object_id=request.input_data['match_id'],
            relation_type='belongs_to'
        )

    # 5. Auto-link featured players
    for player in request.input_data.get('players', []):
        MediaItemRelation.objects.create(
            media_item=media_item,
            content_type=ContentType.objects.get_for_model(OrganisationMembership),
            object_id=player['player_id'],
            relation_type='features'
        )
```

### Search & Filter (B24 Integration)

```http
# Zoek alle lineup videos voor Ajax
GET /api/v1/media/items/?tags=lineup-video,ajax&project=<ajax_id>

# Zoek alle media voor een specifieke wedstrijd
GET /api/v1/media/items/?related_to=activity:<match_id>

# Zoek media met een speler
GET /api/v1/media/items/?features=membership:<player_id>

# Full-text search
GET /api/v1/media/items/?search=topper+psv
```

### Thumbnail Generation

B35 genereert automatisch previews:

| Asset Type | Thumbnail Strategy |
|------------|-------------------|
| **Images** | Resize to 200x200, 400x400 variants |
| **Videos** | Extract frame at 50% timestamp |
| **Generated Tenue** | Auto-thumbnail (al image) |
| **Lineup Video** | Frame op 10 sec (volledige opstelling zichtbaar) |

---

## 📁 S3 Asset Structure

### Bucket Organization

```
teamreel-media/
├── inputs/
│   ├── profiles/
│   │   └── {user_id}/
│   │       ├── portrait.jpg
│   │       └── fullbody.jpg
│   ├── players/
│   │   └── {player_id}/
│   │       ├── passport_photo.jpg
│   │       ├── intro_video.mp4
│   │       └── tenue_photo.jpg
│   ├── clubs/
│   │   └── {club_id}/
│   │       ├── logo.png
│   │       ├── sponsor_main.png
│   │       └── background_field.jpg
│   └── templates/
│       └── {template_id}/
│           └── reference_tenue.jpg
│
├── outputs/
│   └── {request_id}/
│       ├── tenue_design_v1.png
│       └── lineup_video.mp4
│
└── temp/
    └── {job_id}/
        └── (intermediate files, auto-cleanup)
```

### Database Metadata (FileAsset model)

```python
# Alleen metadata in DB, geen binary data
FileAsset(
    id=UUID,
    owner=User,
    project=Project,  # Team/Club scope
    asset_type='profile_photo' | 'intro_video' | 'club_logo' | 'generated_output',
    storage_path='inputs/players/{player_id}/passport_photo.jpg',
    content_type='image/jpeg',
    file_size=125000,
    metadata={
        'original_filename': 'john_doe_photo.jpg',
        'dimensions': {'width': 800, 'height': 600},
        'duration_seconds': 5.2  # voor video's
    },
    created_at=datetime,
    expires_at=datetime | None  # retention policy
)
```

---

## 🔧 Template Definitions

### Template 1: Tenue Ontwerp

```python
# In B34 GenerationTemplate
GenerationTemplate(
    name="Tenue Ontwerp Genereren",
    slug="tenue-design-v1",
    version="1.0.0",

    input_schema={
        "type": "object",
        "properties": {
            "tenue_reference_asset_id": {"type": "string", "format": "uuid"},
            "club_logo_asset_id": {"type": "string", "format": "uuid"},
            "sponsor_logo_asset_id": {"type": "string", "format": "uuid"},
            "primary_color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
            "secondary_color": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"}
        },
        "required": ["tenue_reference_asset_id", "club_logo_asset_id"]
    },

    pipeline_config={
        "provider": "gemini",
        "model": "gemini-2.0-flash-exp-image-generation",
        "steps": [
            {"name": "validate_inputs", "type": "check"},
            {"name": "generate_design", "type": "generate"}
        ],
        "output_format": "image/png",
        "max_retries": 3
    },

    prompt_template="""
    Create a minimalist football kit design based on the reference image.

    Requirements:
    - Primary color: {primary_color}
    - Secondary color: {secondary_color}
    - Club logo placement: left chest
    - Sponsor logo placement: center chest
    - Style: clean, flat, no shadows, no textures
    - Include: shirt, shorts, socks
    - Aspect ratio: 3:4 (portrait)

    Reference tenue style: [IMAGE:tenue_reference]
    Club logo to place: [IMAGE:club_logo]
    Sponsor logo to place: [IMAGE:sponsor_logo]
    """,

    estimated_cost=15,  # credits per generation
    retention_days=365,  # keep outputs 1 year
    is_active=True
)
```

### Template 2: Lineup Video

```python
GenerationTemplate(
    name="Lineup Video Genereren",
    slug="lineup-video-v1",
    version="1.0.0",

    input_schema={
        "type": "object",
        "properties": {
            "match_id": {"type": "string", "format": "uuid"},
            "formation": {"type": "string", "enum": ["4-3-3", "4-4-2", "3-5-2", "4-2-3-1"]},
            "players": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "player_id": {"type": "string", "format": "uuid"},
                        "position": {"type": "string"},
                        "passport_photo_asset_id": {"type": "string", "format": "uuid"},
                        "intro_video_asset_id": {"type": "string", "format": "uuid"}
                    },
                    "required": ["player_id", "position", "passport_photo_asset_id"]
                },
                "minItems": 11,
                "maxItems": 11
            },
            "background_asset_id": {"type": "string", "format": "uuid"}
        },
        "required": ["match_id", "formation", "players"]
    },

    pipeline_config={
        "provider": "ffmpeg",
        "executor_class": "teamreel.executors.LineupVideoExecutor",
        "steps": [
            {"name": "validate_assets", "type": "check"},
            {"name": "prepare_segments", "type": "prepare"},
            {"name": "render_video", "type": "render"},
            {"name": "upload_output", "type": "finalize"}
        ],
        "output_format": "video/mp4",
        "video_settings": {
            "resolution": "1920x1080",
            "fps": 30,
            "codec": "h264",
            "bitrate": "5M"
        },
        "max_retries": 2
    },

    estimated_cost=50,  # credits per video (higher due to compute)
    retention_days=180,  # keep videos 6 months
    is_active=True
)
```

---

## 🔌 Custom Executors

### Gemini Executor (nieuw voor TeamReel)

```python
# teamreel/executors/gemini.py
from src.generative.executors.base import BasePipelineExecutor

class GeminiImageExecutor(BasePipelineExecutor):
    """Executor for Gemini image generation (tenue designs)."""

    provider = "gemini"

    async def validate_inputs(self, input_data: dict) -> dict:
        """Step 1: Validate all input assets exist and are accessible."""
        # Check S3 assets exist
        # Validate image formats/sizes
        # Return validation result

    async def generate(self, input_data: dict, context: dict) -> dict:
        """Step 2: Call Gemini API with prepared prompt."""
        # Fetch input images from S3
        # Prepare multimodal prompt
        # Call Gemini API
        # Return generated image bytes

    async def execute(self, request: 'GenerationRequest') -> 'GenerationOutput':
        """Main execution flow."""
        # Step 1: Validate
        validation = await self.validate_inputs(request.input_data)
        if not validation['valid']:
            raise PermanentError(validation['errors'])

        # Step 2: Generate
        result = await self.generate(request.input_data, request.context)

        # Step 3: Upload to S3
        output_path = await self.upload_output(result['image_bytes'], request)

        return GenerationOutput(
            request=request,
            output_type='image',
            storage_path=output_path,
            metadata={'dimensions': result['dimensions']}
        )
```

### FFmpeg Executor (nieuw voor TeamReel)

```python
# teamreel/executors/ffmpeg.py
from src.generative.executors.base import BasePipelineExecutor

class LineupVideoExecutor(BasePipelineExecutor):
    """Executor for lineup video rendering via FFmpeg."""

    provider = "ffmpeg"

    async def validate_assets(self, input_data: dict) -> dict:
        """Check all player assets (photos + videos) exist."""

    async def prepare_segments(self, input_data: dict) -> list:
        """Prepare video segments for each line (GK, DEF, MID, FWD)."""
        formation = input_data['formation']
        players = input_data['players']

        segments = []
        # Group players by line based on formation
        # Download assets from S3 to temp folder
        # Prepare FFmpeg filter graphs
        return segments

    async def render_video(self, segments: list, settings: dict) -> bytes:
        """Execute FFmpeg to compose final video."""
        # Build FFmpeg command
        # Execute with progress tracking
        # Return video bytes

    async def execute(self, request: 'GenerationRequest') -> 'GenerationOutput':
        """Main execution flow."""
        # Validate → Prepare → Render → Upload
```

---

## 💰 Credit Costs

| Template | Estimated Cost | Rationale |
|----------|----------------|-----------|
| Tenue Design | 15 credits | Gemini API call + S3 storage |
| Lineup Video | 50 credits | Compute-intensive FFmpeg rendering |

**Credit flow:**
1. User submits job → 15/50 credits **reserved**
2. Job processes → actual cost tracked
3. Job completes → credits **settled** at actual cost
4. Job fails → credits **refunded** in full

---

## 🚀 API Endpoints

### Upload Input Assets

```http
POST /api/v1/media/assets/
Content-Type: multipart/form-data

file: <binary>
asset_type: "profile_photo" | "intro_video" | "club_logo"
project_id: <uuid>  # team/club scope
metadata: {"player_id": "<uuid>"}
```

### Submit Generation Request

```http
POST /api/v1/generative/requests/
Content-Type: application/json

{
  "template_slug": "tenue-design-v1",
  "project_id": "<club_uuid>",
  "input_data": {
    "tenue_reference_asset_id": "<uuid>",
    "club_logo_asset_id": "<uuid>",
    "sponsor_logo_asset_id": "<uuid>",
    "primary_color": "#003399",
    "secondary_color": "#FFFFFF"
  }
}

Response:
{
  "id": "<request_uuid>",
  "status": "pending",
  "estimated_cost": 15,
  "credits_reserved": 15
}
```

### Check Job Status

```http
GET /api/v1/generative/requests/<request_id>/

Response:
{
  "id": "<request_uuid>",
  "status": "completed",
  "output": {
    "id": "<output_uuid>",
    "output_type": "image",
    "presigned_url": "https://s3.../outputs/...",
    "expires_at": "2026-02-03T12:00:00Z"
  },
  "actual_cost": 12,
  "processing_time_ms": 4500
}
```

---

## 📋 Implementation Phases

### Phase 1: S3 + Asset Management (Week 1)
- [ ] Configure S3 bucket met correcte CORS/permissions
- [ ] Extend B22 FileAsset model voor TeamReel asset types
- [ ] Build asset upload API endpoints
- [ ] Frontend: asset upload components

### Phase 2: B35 Smart Asset Library (Week 2)
- [ ] Implement MediaItem model (wraps B22 FileAsset)
- [ ] Implement MediaTag model + M2M relation
- [ ] Implement MediaItemRelation (generic FK to entities)
- [ ] Implement Collection model
- [ ] Build MediaItem ViewSet + filters
- [ ] Thumbnail generation (images + video frame extraction)
- [ ] B24 search integration

### Phase 3: Gemini Integration (Week 3)
- [ ] Implement GeminiImageExecutor
- [ ] Create "Tenue Design" template
- [ ] Auto-link generated output to B35 MediaItem
- [ ] Test image generation flow end-to-end
- [ ] Frontend: tenue generator UI

### Phase 4: FFmpeg Pipeline (Week 4-5)
- [ ] Setup FFmpeg worker (container/Lambda)
- [ ] Implement LineupVideoExecutor
- [ ] Create "Lineup Video" template
- [ ] Auto-link to B35 with player relations
- [ ] Test video generation flow
- [ ] Frontend: lineup video generator UI

### Phase 5: Polish & Production (Week 6)
- [ ] Error handling en retry logic
- [ ] Cost tracking en optimization
- [ ] WebSocket status updates
- [ ] Collection management UI
- [ ] Documentation en user guides

---

## ⚠️ Risico's & Mitigaties

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Gemini API costs escalate | Budget | Set max daily/monthly limits; use caching for repeated requests |
| FFmpeg rendering too slow | UX | Use dedicated worker; implement progress tracking; consider cloud GPU |
| S3 egress costs | Budget | Use CloudFront CDN; set sensible retention policies |
| Large video uploads fail | UX | Implement chunked uploads; add resume capability |

---

## ✅ Past dit in de webapp?

**Ja, deze workflow past perfect in je bestaande architectuur:**

1. **B34 Generative Pipelines** biedt al de infrastructuur voor:
   - Template management (versioning, input validation)
   - Async job processing (Celery)
   - Credit reserve/settle (B11 integratie)
   - Output storage (B22 integratie)

2. **Extensie via custom executors:**
   - `GeminiImageExecutor` - nieuw te bouwen voor image generation
   - `LineupVideoExecutor` - nieuw te bouwen voor FFmpeg rendering
   - Beide registreren in de executor registry

3. **Geen wijzigingen nodig aan core:**
   - Alleen TeamReel-specifieke templates en executors toevoegen
   - S3 configuratie in environment variables
   - Frontend components voor upload/status/results

**Aanbeveling:** Begin met Phase 1 (S3 setup) en Phase 2 (Gemini voor tenue's) als MVP. FFmpeg video rendering is complexer en kan later.
