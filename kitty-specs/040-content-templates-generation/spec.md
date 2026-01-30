# Feature Specification: Content Templates & Generation (B31)

**Feature Branch**: `040-content-templates-generation`
**Created**: 2026-01-29
**Status**: Draft
**Input**: B31 - Reusable templates for AI content generation with approval workflow and content library

## Clarifications

### Session 2026-01-29

- Q: What is the default generation timeout for ContentItems? → A: Configurable per template with 30-minute system default fallback
- Q: What happens when B23 WebSocket is unavailable? → A: Auto-fallback to polling (every 3s with exponential backoff to 15s)
- Q: How long should failed or rejected ContentItems be retained? → A: Configurable per organization via B10 (defaults: failed=30 days, rejected=90 days, approved=indefinite)
- Q: How should the system handle concurrent generation requests for the same template and activity? → A: Warn user but allow (show existing generation with "Generate anyway?" option)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Queue Content Generation from Template (Priority: P1)

A Team Admin selects a content template (e.g., "Line-up Video"), optionally links it to an upcoming match, provides any required input data, and queues the content for generation. They can track the generation status in real-time.

**Why this priority**: Core value proposition - without content generation, the entire module has no purpose. This is the "happy path" that proves the system works.

**Independent Test**: Can be fully tested by selecting a template, filling input form, clicking "Generate", and verifying the content item appears with status "queued" → "generating" → "completed".

**Acceptance Scenarios**:

1. **Given** a Team Admin on the Content Generator page, **When** they select a template and click "Generate", **Then** a new ContentItem is created with status "queued"
2. **Given** a Team Admin selecting a template with an existing in-progress generation for the same activity, **When** they click "Generate", **Then** they see a warning modal with link to existing generation and "Generate Anyway" option
3. **Given** a queued ContentItem, **When** the background job processes it, **Then** the status updates to "generating" and finally "completed"
4. **Given** a completed ContentItem, **When** the generation succeeds, **Then** the output file is stored via B22 Files and linked to the ContentItem
5. **Given** a generation in progress, **When** the user views the Content Generator, **Then** they see real-time status updates (via B23 WebSocket or polling)

---

### User Story 2 - Review and Approve Generated Content (Priority: P1)

A Club Admin or Team Admin reviews generated content in the approval queue, previews it, and approves, rejects, or requests revision with feedback. The content creator receives a notification about the decision.

**Why this priority**: Equal to P1 - approval workflow is essential for quality control. Content without approval has no value in production.

**Independent Test**: Can be tested by navigating to a completed ContentItem, clicking "Approve" or "Reject", adding feedback, and verifying the status change and notification.

**Acceptance Scenarios**:

1. **Given** a completed ContentItem awaiting review, **When** a reviewer opens the approval page, **Then** they see the content preview, metadata, and approval actions
2. **Given** a reviewer on the approval page, **When** they click "Approve", **Then** the ContentItem status changes to "approved" and the creator receives a notification
3. **Given** a reviewer on the approval page, **When** they click "Reject" with feedback, **Then** the ContentItem status changes to "rejected", feedback is stored, and creator is notified
4. **Given** a reviewer on the approval page, **When** they click "Request Revision" with feedback, **Then** the ContentItem status changes to "revision_requested" and creator can re-generate

---

### User Story 3 - Browse and Manage Content Templates (Priority: P2)

A Club Admin or Land Admin browses the template library, filters by template type and sport, previews template settings, and toggles templates active/inactive.

**Why this priority**: Templates must exist before content can be generated, but initial templates can be seeded. Management becomes important as the library grows.

**Independent Test**: Can be tested by navigating to Template Library, filtering by sport, viewing a template's settings, and toggling its active status.

**Acceptance Scenarios**:

1. **Given** a user on the Template Library page, **When** they filter by sport "Football", **Then** only football-related templates are displayed
2. **Given** a user on the Template Library page, **When** they click a template, **Then** they see the template settings and configuration preview
3. **Given** a Club Admin viewing a template, **When** they toggle "Active" off, **Then** the template no longer appears in the Content Generator selection
4. **Given** a Team Admin (non-admin), **When** they view the Template Library, **Then** they can browse but cannot toggle active status

---

### User Story 4 - Browse Content Library and Download Assets (Priority: P2)

A team member browses all generated content for their project in a grid view, filters by period/template/status, previews thumbnails, and downloads approved content.

**Why this priority**: The content library provides long-term value as the archive grows. Essential for finding and reusing generated assets.

**Independent Test**: Can be tested by navigating to Content Library, applying filters, clicking a content item to preview, and downloading the file.

**Acceptance Scenarios**:

1. **Given** a user on the Content Library page, **When** they view the grid, **Then** they see thumbnails of all generated content for their project
2. **Given** a user on the Content Library page, **When** they filter by status "approved", **Then** only approved content is displayed
3. **Given** a user viewing a content item, **When** they click "Download", **Then** the output file is downloaded via B22 Files
4. **Given** a user viewing an approved content item, **When** they click "Share", **Then** a shareable link is generated (if sharing is enabled)

---

### User Story 5 - Audit Trail for Content Generation (Priority: P3)

An admin reviews the complete audit trail for any content item, seeing who created it, when it was generated, who approved/rejected it, and all status changes.

**Why this priority**: Important for compliance and debugging, but not blocking for core functionality.

**Independent Test**: Can be tested by viewing a ContentItem's detail page and clicking "View History" to see all logged events.

**Acceptance Scenarios**:

1. **Given** a ContentItem with history, **When** an admin views the audit trail, **Then** they see all status changes with timestamps and actors
2. **Given** a rejected ContentItem, **When** an admin views the audit trail, **Then** they see the rejection reason and reviewer feedback

---

### Edge Cases

- What happens when content generation fails? → ContentItem status becomes "failed" with error message in metadata; creator is notified; retry option available
- What happens when B23 WebSocket is unavailable? → System automatically falls back to HTTP polling with exponential backoff; user experience is seamless
- What happens to old failed/rejected content? → Soft-deleted after retention period (org-configurable: 30 days for failed, 90 days for rejected); metadata preserved for audit
- What happens when user queues duplicate generation (same template+activity)? → System shows warning with link to existing in-progress generation; user can choose to proceed anyway or cancel
- What happens when the linked activity (match) is deleted? → ContentItem remains but shows "Activity deleted" warning; content is still accessible
- What happens when a template is deactivated while content is generating? → Generation completes normally; only new generations are blocked
- How does the system handle large file outputs? → Outputs are stored via B22 with chunked upload; thumbnails generated asynchronously
- What happens if a reviewer tries to approve their own content? → System allows self-approval (configurable via feature flag); audit trail records it

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create ContentTemplates with name, type, sport, and settings
- **FR-002**: System MUST support template types: pre-match, during-match, post-match, season, custom
- **FR-003**: System MUST filter templates by sport type (linked to B32 Sport Configuration)
- **FR-004**: System MUST allow templates to be toggled active/inactive
- **FR-005**: System MUST create ContentItems from templates with optional activity link
- **FR-006**: System MUST track ContentItem status: queued, generating, completed, failed, approved, rejected, revision_requested
- **FR-007**: System MUST store input data as JSON on ContentItem
- **FR-008**: System MUST link output files to B22 FileAsset
- **FR-009**: System MUST trigger background job (B15 Tasks) when content is queued with template-specific timeout (default: 30 minutes via B10 Feature Flag)
- **FR-010**: System MUST provide real-time status updates via B23 WebSocket with automatic fallback to polling (3s interval with exponential backoff to 15s) if WebSocket unavailable
  - *Note: Fallback is client-side; triggered by connection timeout or handshake failure. See plan.md for implementation details.*
- **FR-011**: System MUST create ContentApproval records for review workflow
- **FR-012**: System MUST support approval statuses: pending, approved, rejected, revision_requested
- **FR-013**: System MUST store reviewer feedback text on ContentApproval
- **FR-014**: System MUST send notifications (B17) on status changes
- **FR-015**: System MUST log all actions to audit trail (B09)
- **FR-016**: System MUST provide Content Library with grid view and filtering
- **FR-017**: System MUST display thumbnails via B22 thumbnail generation
- **FR-018**: System MUST allow download of approved content files
- **FR-019**: System MUST support configurable retention policies per organization (via B10) for failed and rejected content with soft-delete mechanism
- **FR-020**: System MUST run scheduled cleanup task (B15) to soft-delete expired ContentItems based on retention policy
- **FR-021**: System MUST detect existing in-progress generations (queued/generating status) for same template+activity and warn user with option to proceed

### Permission Requirements

- **FR-022**: Team Admins MUST be able to create content and manage team-level templates
- **FR-023**: Club Admins MUST be able to approve content and manage club-level templates
- **FR-024**: Land Admins MUST be able to manage all templates and override approvals
- **FR-025**: Team Members MUST be able to view content library (read-only)
- **FR-026**: Permissions MUST integrate with existing B08 Hierarchical Access Control

### Key Entities

- **ContentTemplate**: Reusable template definition with name, type (enum), sport (string), ai_workflow_id (string), template_settings (JSON), timeout_minutes (integer nullable, default NULL uses system default of 30), is_active (boolean), organisation (FK), project (FK optional)
- **ContentItem**: Generated content instance with template (FK), project (FK), activity (FK optional), status (enum), input_data (JSON), output_file (FK to FileAsset), created_by (FK), error_message (text optional), deleted_at (datetime nullable for soft-delete)
- **ContentApproval**: Review record with content_item (FK), reviewer (FK), status (enum), feedback_text (text), reviewed_at (datetime)

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products (marketing, reports, media libraries)
- [x] Extension points documented: ai_workflow_id allows any external AI system; template_settings is flexible JSON

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering: models → serializers → views → tasks
- [x] No circular dependencies: B31 depends on B22, B15, B17, B09; none depend on B31
- [x] Extension point: B34 (Generative Pipelines) will consume ContentItems via background tasks

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in models, serializers, and service layer
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage target: 80% for models and views
- [x] Integration tests planned for: template → generate → approve flow

### Security & Privacy (Principle V)
- [x] Secure defaults maintained; file access via B22 ACL
- [x] No secrets in code; AI workflow credentials via env vars
- [x] Authorization via B08 hierarchical permissions
- [x] No sensitive data logged; only status and IDs in audit trail

### Performance & Reliability (Principle VI)
- [x] No N+1 queries: use select_related for template, project, activity
- [x] Pagination implemented for Content Library grid
- [x] Structured logging for generation jobs
- [x] Graceful degradation: failed generations are logged and retryable

### API Design (Principle VII)
- [x] DRF standards followed with ModelViewSets
- [x] Consistent response format with status, data, errors
- [x] No breaking changes; new endpoints only
- [x] Validation in serializers for template settings and input data

### Documentation (Principle XI)
- [x] Feature documentation: API endpoints, template configuration guide
- [x] Extension guide: how to add new template types
- [x] No major ADR needed; follows existing patterns

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can queue content generation in under 30 seconds (select template, fill form, submit)
- **SC-002**: Content generation status updates are visible within 5 seconds of state change
- **SC-003**: Reviewers can complete approval workflow in under 60 seconds per item
- **SC-004**: Content Library loads within 2 seconds for up to 1000 items per project
- **SC-005**: 95% of content items reach "completed" or "failed" status within their configured timeout (per-template or 30-minute default)
- **SC-006**: All status changes are auditable with actor, timestamp, and context

### Demo Validation Criteria

**Note**: Demo UI pages are out of scope for B31 (backend module). Frontend integration will be handled in a separate F-module.

- **DV-001**: Backend API supports complete flow: create template → generate content → approve → download
- **DV-002**: API supports filtering by sport in template list endpoint
- **DV-003**: API provides status endpoint for real-time polling
- **DV-004**: Notification integration working (B17 triggers on approval/rejection)
- **DV-005**: Audit trail logged correctly (B09 integration)

## Assumptions

- **A-001**: B30 (Activities) will be implemented before or alongside B31 for activity linking
- **A-002**: B32 (Sport Configuration) provides sport type identifiers for filtering
- **A-003**: Actual AI generation logic lives in B34 (Generative Pipelines); B31 only tracks status
- **A-004**: Initial templates will be seeded via migrations or admin; no self-service template creation in MVP
- **A-005**: Self-approval is allowed by default but can be disabled via B10 Feature Flag
- **A-006**: Default retention policy: failed content 30 days, rejected content 90 days, approved content indefinite (configurable per org via B10)
