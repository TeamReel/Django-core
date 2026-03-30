# Phase 10: Content Engine Core (239-244)

**Focus**: Generic event planning, content templates, sport configuration, brand identity, AI content generation, and smart media library

---

## [B30: Generic Activities & Periods](../modules/done/039-B30-generic-activities.md)

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
- **Integration**: Audit trail (B09), notifications (B16), exports (B38)

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

## [B31: Content Templates & Generation](../modules/backlog/240-B31-content-templates-and-generation/index.md)

**Doel**: Reusable templates for AI-generated content with approval workflow and content library/archive.

**Waarom agnostisch**: Content generation with approval is universeel - match reports, marketing materials, invoices, newsletters all need templates + review.

**Wat moet er gebeuren**:
- **ContentTemplate model**: Reusable templates
  - Fields: name, template_type, sport (FK optional), ai_workflow_id, prompt_template
  - Template types: match_report, lineup_graphic, highlight_video, newsletter
  - Linked to B32 (Sport Configuration) for sport-specific validation
- **ContentItem model**: Generated content instances
  - Fields: template (FK), status, input_data (JSON), generated_output (JSON/text)
  - Status: draft, pending_approval, approved, rejected, archived
  - Foreign keys: activity (B30), project, creator
- **ContentApproval model**: Approval workflow
  - Fields: content_item (FK), approver (FK user), status, feedback, approved_at
  - Multi-stage approval support (coach approves → admin publishes)
- **Content Archive**: Historical content storage
  - Filter by date range, template type, approval status
  - Bulk operations (archive old items, export approved content)
- **Integration**:
  - B22 (Files) - DONE
  - B30 (Activities) - Planned in Fase 10
  - B17 (Notifications) - DONE
  - B09 (Audit Trail) - DONE
  - B32 (Sport Configuration) - NEW (same fase)

**Demo Requirements**:
- 📝 **Content Templates** (`/demo/content/templates`): Create/edit templates
- 🚀 **Generate Content** (`/demo/content/generate`): Select template → fill inputs → generate
- 📚 **Content Library** (`/demo/content/library`): View all generated items, filter by status
- ✅ **Approve Content** (`/demo/content/approve`): Review pending items, provide feedback

**Status**: 🚧 ROADMAP

---

## [B32: Sport Configuration & Templates](../modules/backlog/241-B32-sport-configuration-and-templates/index.md)

**Doel**: Sport-specific configuration for team sizes, positions, lineup requirements, and outfit variants.

**Waarom agnostisch**: Sports configuration is universeel - football, handball, basketball, futsal all have different rules that need to be data-driven.

**Wat moet er gebeuren**:
- **Sport model**: Core sport definitions
  - Fields: name, slug, federation, description
  - Examples: "Football" (11 players), "Handball" (7 players), "Basketball" (5 players)
- **SportConfiguration model**: Sport-specific rules
  - Fields: sport (FK), team_size_min, team_size_max, positions (JSON), lineup_rules (JSON)
  - Positions example (football): ["Goalkeeper", "Defender", "Midfielder", "Forward"]
  - Lineup rules: {"required_positions": {"Goalkeeper": 1}, "substitutes_max": 7}
  - Outfit variants: ["home_kit", "away_kit", "goalkeeper_kit"]
- **OutfitConfiguration model**: Team outfit/kit details per project
  - Fields: project (FK), sport_config (FK), variant, colors (JSON), sponsor_position, number_font
  - Colors: {"primary": "#FF0000", "secondary": "#FFFFFF", "accent": "#000000"}
  - Sponsor position: "chest", "sleeve", "back"
- **Validation helpers**: Ensure lineup compliance
  - Validate team size (min 7, max 11 for football)
  - Validate required positions (must have 1 GK for football)
  - Validate outfit completeness (home + away kit required)
- **Integration**:
  - B07 (Projects) - Projects have sport type
  - B30 (Activities) - Match activities use sport config for lineups
  - B31 (Content Templates) - Templates filtered by sport

**Demo Requirements**:
- 🏅 **Sport Configuration** (`/demo/sport-config/sports`): Manage sports and their configs
- 👕 **Outfit Manager** (`/demo/sport-config/outfits`): Configure team outfits per project
- 📋 **Position Templates** (`/demo/sport-config/positions`): Define position requirements
- ✅ **Validate Lineup** (`/demo/sport-config/validate`): Test lineup validation rules

**Status**: 🚧 ROADMAP

---

## [B33: Brand Identity Manager](../modules/backlog/242-B33-brand-identity-manager/index.md)

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
- **Integration**: B22 (file storage), B34 (AI uses brand tokens), B06/B07 (org/project)

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

## [B34: Generative Pipelines](../modules/backlog/243-B34-generative-pipelines/index.md)

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
- **Integration**: B15 (tasks), B11 (credits), B33 (brand tokens), B35 (output storage)

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

## [B35: Smart Asset Library](../modules/backlog/244-B35-smart-asset-library/index.md)

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
- **Integration**: B22 (storage), B30 (activities), B34 (generated content auto-linked), B24 (search)

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

- [ ] All 6 modules (B30-B35) operational
- [ ] Demo pages accessible at `/demo/activities`, `/demo/content/*`, `/demo/sport-config/*`, `/demo/brand`, `/demo/pipelines`, `/demo/library`
- [ ] Generic event planning (periods, activities, participation) working
- [ ] Content templates & approval workflow operational
- [ ] Sport-specific configuration (team sizes, positions, outfits) working
- [ ] Brand identity system (profiles, tokens, assets) operational
- [ ] AI content generation pipeline (templates, requests, outputs) functional
- [ ] Smart media library (items, tags, collections, search) operational
- [ ] Integration between all modules verified (B34 uses B33 tokens, B35 links B34 outputs, B32 validates sport rules, etc.)
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
- Fase 12 (Workflows & Payments) - B38 exports use activity data
- Fase 13 (Advanced UI) - F11 ops console monitors generation jobs
- Fase 16 (ML/AI Platform) - D13-D15 use B32 pipeline infrastructure

---

## Implementation Notes

**Module Order:**
1. **B30 (Activities)** - Foundation for event planning
2. **B32 (Sport Configuration)** - Needed for sport-specific validation
3. **B31 (Content Templates)** - Uses B30 activities and B32 sport config
4. **B33 (Brand Identity)** - Needed by B34 for branded content
5. **B35 (Smart Library)** - Can be developed in parallel with B34
6. **B34 (Generative Pipelines)** - Last, integrates with B31, B33, and B35

**Key Integrations:**
- B31 content templates are filtered by sport (via B32)
- B34 generation jobs deduct from B11 credits
- B34 uses B33 brand tokens to generate branded content
- B34 outputs auto-save to B35 media library
- B35 media items link back to B30 activities (e.g., "Match highlight video")
- B30 activities can trigger B31/B34 generation (e.g., "Auto-generate match report after match ends")

**Demo Strategy:**
- Each module has standalone demo page
- Cross-module workflow: Create period → Schedule activity → Select sport config → Generate content (B34) → Store in library (B35) → Link to activity (B30)
- Show complete "Sports Team Content Pipeline" or "Marketing Campaign Workflow" as integration demo
