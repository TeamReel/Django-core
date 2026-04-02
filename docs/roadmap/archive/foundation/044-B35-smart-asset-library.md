# B35: Smart Asset Library

**Phase:** 10
**Status:** 📋 Planned
**Module ID:** 044
**Category:** Backend

## Links
*   [Project Vision](../../../PROJECT_VISION.md)
*   [Source Code](../../../../src) (When implemented)

## Description

## 44. B35 – Smart Asset Library

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

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)
- No frontend/demo page required per Constitution
- Frontend integration is downstream product responsibility

**Status**: 🛫 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B35-smart-asset-library

[feature summary]
Digital Asset Management - rich metadata, tagging, context relations, smart search.

[goals]
- MediaItem model (wraps B22 File with metadata)
- MediaTag system (manual + auto)
- Context relations (link to Members, Activities, Projects)
- Collection management
- Search & filter (B24 integration)
- Thumbnail generation
- Auto-link B34 generated content

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
- Collection manager
- Bulk actions
- Tests: upload → tag → link → search
```
