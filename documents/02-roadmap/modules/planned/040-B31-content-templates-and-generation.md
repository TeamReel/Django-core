# Fase 10: Content Engine Core

## 40. B31 – Content Templates & Generation

**Doel**: Reusable templates voor AI-content generatie met approval workflow en archief.

**Waarom agnostisch**: Content generation workflows zijn universeel - marketing materials, reports, media libraries.

**Wat moet er gebeuren**:
- **ContentTemplate model**: Herbruikbare templates gelinkt aan AI workflows
  - Fields: name, template_type, sport, ai_workflow_id, template_settings (JSON)
  - Template types: pre-match, during-match, post-match, season
  - Sport-specific: Templates kunnen gefilterd worden op sport type
  - Active flag: Enable/disable templates
  - Linked to B32 (Sport Configuration) for sport-specific validation
- **ContentItem model**: Instances van gegenereerde content
  - Fields: template (FK), project (FK), activity (FK optional), status
  - Status choices: queued, generating, completed, approved, rejected
  - Input/output tracking: input_data (JSON), output_file (FK to B22 FileAsset)
  - Ownership: created_by, approved_by, approved_at
  - Integration with B30 (Activities) for match-based content
- **ContentApproval model**: Feedback en approval workflow
  - Fields: content_item (FK), reviewer (FK), status, feedback_text
  - Status choices: pending, approved, rejected, revision_requested
  - Timestamp tracking: reviewed_at
- **Content Library**: Archive van alle gegenereerde content per project
  - Filter by template, period, status, sport
  - Preview thumbnails (via B22 thumbnails)
  - Download/share capabilities
- **Integration**:
  - B22 (Files) voor media storage
  - B17 (Notifications) voor approval alerts
  - B09 (Audit Trail) voor generation tracking
  - B30 (Activities) voor match-based content
  - B32 (Sport Configuration) voor sport-specific templates

**Demo Requirements**:
- 📋 **Content Pages** (`/demo/content/`):
  - **Template Library** (`/templates`):
    - Browse available templates
    - Filter by template_type and sport
    - Preview template settings
    - Active/inactive toggle (admin only)
  - **Content Generator** (`/generate`):
    - Select template
    - Select match/activity (optional)
    - Input data form (dynamic based on template)
    - Queue generation (triggers AI workflow)
    - Real-time status tracking
  - **Content Library** (`/library`):
    - Grid view of generated content
    - Filter by period, template, status
    - Preview with thumbnails
    - Download/share actions
  - **Approval Queue** (`/approve/:id`):
    - Review generated content
    - Approve/reject/request revision
    - Feedback comments
    - Notification on status change
  - **Tests**:
    1. Create ContentTemplate (e.g., "Line-up Video" for football)
    2. Generate ContentItem from template + match
    3. Track status (queued → generating → completed)
    4. Reviewer approves content
    5. Verify content in library with approved status
    6. Download approved content
    7. Check audit log for all actions

**Dependencies**:
- B22 (Files) - DONE
- B30 (Activities) - Planned in Fase 10
- B17 (Notifications) - DONE
- B09 (Audit Trail) - DONE
- B32 (Sport Configuration) - NEW (same fase)

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B31-content-templates-generation

[feature summary]
Reusable templates for AI content generation with approval workflow and content library.

[goals]
- ContentTemplate model: Linked to AI workflows, sport-specific
- ContentItem model: Track generation status, input/output, approvals
- ContentApproval model: Feedback loop with notifications
- Content Library: Archive with filter/preview/download
- Integration with B22 (Files), B30 (Activities), B17 (Notifications)

[demo requirements]
Demo pages: /demo/content/*
- Template library with sport filter
- Content generator with real-time status
- Approval queue with feedback
- Content library with grid view
- Tests: template → generate → approve → library → download
```

**Notes**:
This module is **CRITICAL for TeamReel MVP** - without it, users cannot track or approve AI-generated content.
Templates are sport-aware via B32 Sport Configuration.
