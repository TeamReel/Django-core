# Phase 10: Content Engine Core (039-042)

**Focus**: Generic event planning, brand identity, AI content generation, and smart media library

---

## [B30: Generic Activities & Periods](../modules/planned/039-B30-generic-activities.md)

**Doel**: Generic event & resource planning - time-bound cycles (seasons/quarters) en activities (matches/meetings) zonder domain lock-in.

**Waarom agnostisch**: Event planning is universeel - sports seasons, fiscal quarters, project sprints, meeting schedules.

**Wat moet er gebeuren**:
- **Period model**: Time-bound cycles
  - Fields: name, start_date, end_date, description
  - Foreign key: organisation
  - Examples: "Season 2023/2024", "Q1 2024", "Sprint 5"
- **Activity model**: Specific events within projects
  - Fields: title, activity_type, start_time, end_time, location, data (JSON)
  - Foreign keys: project, period (optional)
  - Activity types: configurable (match, meeting, training)
- **Participation model**: Track attendance
  - Fields: role, status, notes
  - Foreign keys: activity, member
  - Roles: configurable (starter, substitute, attendee)
  - Status: present, absent, excused
- **Calendar views**: Monthly/weekly activity display
- **Integration**: Audit trail (B09), notifications (B16), exports (B29)

**Demo Requirements**:
- 📅 **Activities Page** (`/demo/activities`):
  - Period management (create, edit, list)
  - Activity calendar view (monthly/weekly)
  - Activity list (filter by period/type/date)
  - Activity detail (participants, outcomes)
  - Add participants (select members, assign roles)
  - Outcome recording (flexible JSON editor)
  - Tests: create period → schedule activity → add participants → record outcome

**Status**: 🚧 ROADMAP

---

## [B31: Brand Identity Manager](../modules/planned/040-B31-brand-identity-manager.md)

**Doel**: Centralized brand identity management - logos, colors, design tokens als data (niet hardcoded), ondersteunt white-labeling en AI-driven content generation.

**Waarom agnostisch**: Brand identity is universeel - corporate branding, team colors, product styles, marketing themes.

**Wat moet er gebeuren**:
- **BrandProfile model**: Brand configuration per organisation/project
  - Fields: name, is_active
  - Foreign keys: organisation, project (optional)
  - Inheritance: project can inherit org brand or override
- **DesignToken model**: Style values as data
  - Fields: key, value, type (color/font/spacing)
  - Examples: primary_color=#FF0000, font_heading=Roboto, border_radius=8px
- **BrandAsset model**: Logo and visual files
  - Fields: asset_type (logo/watermark/font)
  - Foreign keys: profile, file (B22)
  - Types: logo_light, logo_dark, watermark
- **Token API**: Frontend consumption
  - Endpoint returns complete token set
  - Frontend applies styles dynamically
- **Integration**: B22 (file storage), B32 (AI uses brand tokens), B06/B07 (org/project)

**Demo Requirements**:
- 🎨 **Brand Manager** (`/demo/brand`):
  - Brand profile editor (name, active toggle)
  - Design token list (add/edit key-value pairs)
  - Color picker (for color tokens)
  - Asset uploader (logos, watermarks)
  - Preview panel (shows applied brand)
  - Project inheritance toggle (use org brand vs custom)
  - Tests: create brand → set colors → upload logo → preview → apply to project

**Status**: 🚧 ROADMAP

---

## [B32: Generative Pipelines](../modules/planned/041-B32-generative-pipelines.md)

**Doel**: AI content generation factory - manages generation requests (jobs), routes naar appropriate pipelines (LangGraph/n8n/OpenAI), handles async execution.

**Waarom agnostisch**: Content generation is universeel - images, videos, documents, reports. The "what" changes, the "how" (job lifecycle) stays consistent.

**Wat moet er gebeuren**:
- **GenerationTemplate model**: Defines content types
  - Fields: name, slug, version, input_schema (JSON Schema), pipeline_config (JSON)
  - Examples: "Match Report Instagram", "Invoice PDF", "Marketing Email"
  - Input schema: Validates required data
  - Pipeline config: {"provider": "langgraph", "flow_id": "match-story-v1"}
- **GenerationRequest model**: Job lifecycle
  - Fields: template (FK), status (pending/processing/completed/failed), input_data (JSON), requester (FK user), project (FK)
  - Timestamps: created_at, started_at, completed_at
  - Metadata: cost (tokens/credits), error_message
- **GenerationOutput model**: Results
  - Fields: request (FK), file (FK to B22/B33), text_content, metadata (JSON)
  - Types: image, video, text, json
- **Pipeline routing**: Select execution engine
  - LangGraph (complex agents)
  - n8n (workflow automation)
  - Direct OpenAI API (simple completions)
- **Async execution**: B15 Celery integration
  - Submit job → queue task → process → store output
  - Real-time status updates (via B23 WebSocket)
- **Credit deduction**: B11 integration
  - Deduct credits on submit or completion
  - Refund on failure (configurable)
- **Integration**: B15 (tasks), B11 (credits), B31 (brand tokens), B33 (output storage)

**Demo Requirements**:
- 🤖 **AI Studio** (`/demo/pipelines`):
  - Template selector (dropdown: Match Report, Line-up Video, etc.)
  - Dynamic form builder (generates inputs from template.input_schema)
  - Generate button (submits GenerationRequest)
  - Job status tracker (pending → processing → completed with progress %)
  - Output preview (image/video player, text display)
  - Download button (when completed)
  - Job history (list of past generations with retry option)
  - Tests: select template → fill inputs → generate → track status → view output

**Status**: 🛫 ROADMAP

---

## [B33: Smart Asset Library](../modules/planned/042-B33-smart-asset-library.md)

**Doel**: Digital Asset Management (DAM) - extends B22 file management met semantic metadata, tagging, en relaties ("video belongs to Match X, features Player Y").

**Waarom agnostisch**: Media organization is universeel - sports highlights, marketing assets, product photos, document archives all need smart tagging and search.

**Wat moet er gebeuren**:
- **MediaItem model**: Rich metadata wrapper around B22 File
  - Fields: title, description, width, height, duration (for video), state (raw/processed/archived)
  - Foreign keys: file (B22), project, created_by
  - Auto-extract metadata: EXIF (photos), duration (videos), mime type
- **MediaTag model**: Manual + auto-generated tags
  - Fields: name, slug, tag_type (manual/auto/ai_generated)
  - M2M: Many tags per MediaItem
  - Examples: #goal, #celebration, #season-23-24, #player-pietje
  - Auto-tagging: Extract from filename, analyze with AI (future)
- **Context relations**: Link media to entities
  - Generic ForeignKeys to: Member (OrganisationMembership), Activity (B30), Project
  - Example: "This video belongs to Match #42, features Player Pietje, uploaded by Coach Jan"
- **Collection model**: Group related items
  - Fields: name, description
  - M2M: Many MediaItems per Collection
  - Use cases: "Best Goals 2024", "Marketing Campaign Q1"
- **Search & filter**: B24 full-text search integration
  - Search by: title, tags, related entities, date range
  - Filters: media type, project, creator, date
- **Thumbnail generation**: Auto-generate previews
  - Images: Resize to 200x200, 400x400 variants
  - Videos: Extract frame at 50% timestamp
- **Integration**: B22 (storage), B30 (activities), B32 (generated content auto-linked), B24 (search)

**Demo Requirements**:
- 📚 **Media Library** (`/demo/library`):
  - Grid view (thumbnails with overlay info)
  - List view (table with metadata)
  - Upload button (with drag-drop zone)
  - Search bar (instant search across titles, tags)
  - Filter sidebar (by type, project, date, tag)
  - Media detail modal (full metadata, edit tags, add relations)
  - Collection manager (create, add items, view)
  - Bulk actions (tag multiple, add to collection, delete)
  - Tests: upload → tag → link to activity → search → find item

**Status**: 🛫 ROADMAP

---

## Phase Completion Criteria

- [ ] All 4 modules (B30-B33) operational
- [ ] Demo pages accessible at `/demo/activities`, `/demo/brand`, `/demo/pipelines`, `/demo/library`
- [ ] Generic event planning (periods, activities, participation) working
- [ ] Brand identity system (profiles, tokens, assets) operational
- [ ] AI content generation pipeline (templates, requests, outputs) functional
- [ ] Smart media library (items, tags, collections, search) operational
- [ ] Integration between all modules verified (B32 uses B31 tokens, B33 links B32 outputs, etc.)
- [ ] Tests passing for all demo workflows

---

## Dependencies

**Required from previous phases:**
- B06 (Organisations) - For period/brand ownership
- B07 (Projects) - For activities and media
- B08 (Memberships) - For participation tracking
- B09 (Audit) - For change tracking
- B11 (Credits) - For generation cost tracking
- B15 (Tasks) - For async generation
- B16 (Notifications) - For activity reminders
- B22 (Files) - For brand assets and media storage
- B23 (Real-time) - For generation progress updates
- B24 (Search) - For media library search

**Enables future phases:**
- Fase 11 (Frontend & Visual Dev) - F08 data viz can show activity calendars
- Fase 12 (Workflows & Payments) - B29 exports use activity data
- Fase 13 (Advanced UI) - F11 ops console monitors generation jobs
- Fase 16 (ML/AI Platform) - D13-D15 use B32 pipeline infrastructure

---

## Implementation Notes

**Module Order:**
1. **B30 (Activities)** - Foundation for event planning
2. **B31 (Brand Identity)** - Needed by B32 for branded content
3. **B33 (Smart Library)** - Can be developed in parallel with B32
4. **B32 (Generative Pipelines)** - Last, integrates with B31 and B33

**Key Integrations:**
- B32 generation jobs deduct from B11 credits
- B32 uses B31 brand tokens to generate branded content
- B32 outputs auto-save to B33 media library
- B33 media items link back to B30 activities (e.g., "Match highlight video")
- B30 activities can trigger B32 generation (e.g., "Auto-generate match report after match ends")

**Demo Strategy:**
- Each module has standalone demo page
- Cross-module workflow: Create period → Schedule activity → Generate content (B32) → Store in library (B33) → Link to activity (B30)
- Show complete "Sports Team Content Pipeline" or "Marketing Campaign Workflow" as integration demo
