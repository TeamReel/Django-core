# B07: Projects / Workspaces

**Phase:** 2
**Status:** ✅ Done
**Module ID:** 007
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 7. B07 – Projects / Workspaces Management

**Doel**: Context containers binnen organisaties voor resources en workflows.

**Status**: ✅ Complete

**Key Features**:
- Project model (belongs to Organization)
- Project memberships
- Project-level context
- Hierarchical structure (User → Organization → Project)
- Foreign key constraints and indexes

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Projects & Workspaces Management
*Path: [kitty-specs/007-projects-workspaces-management/spec.md](../../../../kitty-specs/007-projects-workspaces-management/spec.md)*

**Feature Branch**: `007-projects-workspaces-management`
**Created**: 2025-11-25
**Status**: Draft
**Input**: User description: "Create a reusable project/workspace model that acts as a context container within organisations for resources, configuration and workflows."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Project for Organising Resources (Priority: P1)

An organisation admin needs to create a new project to serve as a context container for grouping related resources and configurations within their organisation.

**Why this priority**: Core functionality that enables all other project-related operations. Without the ability to create projects, no other features can function.

**Independent Test**: Can be fully tested by authenticating as an org admin, creating a project with a name and description, and verifying it appears in the project list. Delivers immediate value by allowing resource organisation.

**Acceptance Scenarios**:

1. **Given** I am logged in as an organisation admin, **When** I create a project with a unique name and optional description, **Then** the project is created successfully and I receive confirmation with the project details
2. **Given** I am logged in as an organisation admin, **When** I attempt to create a project with a duplicate name in the same organisation, **Then** I receive a validation error indicating the name must be unique within the organisation
3. **Given** I am logged in as an organisation admin, **When** I create a project with valid metadata fields, **Then** the creation event is logged in the audit trail with timestamp and creator information
4. **Given** I am logged in as a regular organisation member (not admin), **When** I attempt to create a project, **Then** I receive a permission denied error

---

### User Story 2 - View and List Projects (Priority: P1)

Users need to see which projects exist in their organisation to understand available context containers and select the appropriate one for their work.

**Why this priority**: Essential for users to discover and navigate to projects. Required immediately after project creation capability exists.

**Independent Test**: Can be tested by creating several projects (as admin) and then viewing them as different user roles. Verifies access control and list functionality work correctly.

**Acceptance Scenarios**:

1. **Given** I am a member of an organisation with multiple projects, **When** I request the list of projects, **Then** I see all active projects in the organisation with their names, descriptions, and metadata
2. **Given** I am an organisation admin, **When** I view the project list, **Then** I see all projects including archived ones with clear status indicators
3. **Given** I request a project detail view, **When** the project exists and I have access, **Then** I see complete project information including creation date, creator, last updated timestamp, and archive status
4. **Given** I am not a member of an organisation, **When** I attempt to view its projects, **Then** I receive an access denied error

---

### User Story 3 - Update Project Details (Priority: P2)

Organisation admins need to modify project information as requirements evolve, such as updating descriptions or metadata.

**Why this priority**: Important for maintaining accurate project information over time, but not blocking for initial usage. Can be deployed after creation and viewing work.

**Independent Test**: Can be tested independently by creating a project, then updating its fields and verifying changes persist. Delivers value by allowing project evolution.

**Acceptance Scenarios**:

1. **Given** I am an organisation admin with an existing project, **When** I update the project name or description, **Then** the changes are saved and reflected immediately in all views
2. **Given** I update a project, **When** the changes are saved, **Then** an update event is recorded in the audit log with the changed fields and updater information
3. **Given** I am a regular organisation member, **When** I attempt to update a project, **Then** I receive a permission denied error
4. **Given** I attempt to update a project name, **When** the new name conflicts with another project in the same organisation, **Then** I receive a validation error

---

### User Story 4 - Archive and Restore Projects (Priority: P2)

Organisation admins need to archive projects that are no longer active without permanently deleting them, and restore them if needed later.

**Why this priority**: Important for long-term project lifecycle management, but not required for initial launch. Prevents clutter while preserving history.

**Independent Test**: Can be tested by creating a project, archiving it (verifying it disappears from default lists), then restoring it. Confirms soft deletion works.

**Acceptance Scenarios**:

1. **Given** I am an organisation admin, **When** I archive an active project, **Then** the project is marked as archived and excluded from default project lists
2. **Given** I have an archived project, **When** I restore it, **Then** the project becomes active again and appears in default lists
3. **Given** I archive a project, **When** the archive operation completes, **Then** an archive event is logged with timestamp and actor information
4. **Given** I am a regular organisation member, **When** I attempt to archive or restore a project, **Then** I receive a permission denied error
5. **Given** a project is archived, **When** users attempt to access it directly, **Then** they see a clear indication that it is archived with option to restore (for admins)

---

### User Story 5 - Associate Resources with Projects (Priority: P3)

Developers need a reliable way to link domain entities (like documents, workflows, configurations) to specific projects for proper scoping.

**Why this priority**: Enables the core "context container" purpose, but represents integration work with future features rather than standalone project functionality.

**Independent Test**: Can be tested by creating a project, then associating a test resource with it via foreign key, and verifying the relationship persists correctly.

**Acceptance Scenarios**:

1. **Given** I am developing a feature that creates domain resources, **When** I associate a resource with a project, **Then** the relationship is stored reliably with referential integrity
2. **Given** a resource is associated with a project, **When** I query for project resources, **Then** I can efficiently retrieve all resources belonging to that project
3. **Given** a project is archived, **When** I query for resources, **Then** I can filter to exclude resources from archived projects
4. **Given** I am implementing resource permissions, **When** I check project membership, **Then** I can determine access rights based on organisation membership

---

### Edge Cases

- What happens when an organisation is deleted that contains projects? (Projects should be archived/deleted as part of organisation deletion cascade)
- How does the system handle concurrent updates to the same project? (Last write wins with optimistic locking or database constraints)
- What happens when trying to archive an already archived project? (Operation should be idempotent - no error, no duplicate audit log entry)
- How does the system handle very long project names or descriptions? (Enforce character limits: 200 for name, 2000 for description)
- What happens when a project creator leaves the organisation? (Project remains, audit log preserves creator information even if user is removed)
- Can projects have the same name across different organisations? (Yes - uniqueness is scoped to organisation only)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a Project model linked to organisations via foreign key with cascade delete protection
- **FR-002**: System MUST enforce unique project names within each organisation (case-insensitive uniqueness)
- **FR-003**: System MUST support soft deletion (archive/restore) for projects using is_active flag and archived_at timestamp
- **FR-004**: System MUST allow organisation admins to create, update, archive, and restore projects
- **FR-005**: System MUST allow all organisation members to view active projects within their organisation
- **FR-006**: System MUST record audit events for project creation, updates, archiving, and restoration
- **FR-007**: System MUST validate project names are between 1 and 200 characters
- **FR-008**: System MUST allow optional project descriptions up to 2000 characters
- **FR-009**: System MUST track project creator (user who created it) and creation timestamp
- **FR-010**: System MUST track last modification timestamp and user for update operations
- **FR-011**: System MUST provide a slug field derived from project name for URL-friendly identifiers
- **FR-012**: System MUST prevent regular organisation members from creating, updating, or archiving projects
- **FR-013**: System MUST maintain referential integrity between projects and organisations
- **FR-014**: System MUST support efficient queries for listing projects by organisation
- **FR-015**: System MUST integrate with existing audit logging system (Feature 009) for lifecycle events
- **FR-016**: System MUST expose REST API endpoints for project CRUD operations
- **FR-017**: System MUST support filtering project lists by active/archived status
- **FR-018**: System MUST support pagination for project lists (default 20 items per page)
- **FR-019**: System MUST provide database indexes on organisation foreign key and slug fields
- **FR-020**: System MUST allow future features to establish foreign key relationships to projects

### Key Entities

- **Project/Workspace**: Represents a context container within an organisation for grouping resources and configurations. Key attributes include: name (unique per org), slug (URL-friendly identifier), description (optional), organisation (foreign key), creator (user who created it), is_active (soft deletion flag), created_at (timestamp), updated_at (timestamp), archived_at (timestamp when archived, nullable).

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: Projects/workspaces are a generic multi-tenancy pattern. No domain-specific behavior is included - it's purely a context container that any downstream product can use for scoping resources.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: Creates a new `projects` Django app that depends only on `organisations` and `accounts`. Future features can depend on `projects` by establishing foreign keys. No circular dependencies.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Test Coverage Target**: Minimum 90% coverage for models, managers, views, and serializers. Integration tests for complete CRUD workflows.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Security Notes**: All API endpoints require authentication. Project access is controlled via organisation membership. Audit logs will not contain sensitive project metadata (only event types and IDs).

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Performance Notes**: Project list queries will use `select_related('organisation', 'creator')` to avoid N+1. Pagination with 20 items per page. Database indexes on organisation_id and slug fields.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**API Design**: REST endpoints follow DRF conventions with proper HTTP methods (GET, POST, PATCH, DELETE). Nested routes under organisations: `/api/organisations/{org_id}/projects/`.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Documentation Plan**: README in projects app explaining purpose, model relationships, permission model, and how to extend with foreign keys from other apps.

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Organisation admins can create a project in under 30 seconds with name and description
- **SC-002**: Project lists load in under 1 second for organisations with up to 100 projects
- **SC-003**: All project lifecycle events (create, update, archive, restore) appear in audit logs within 1 second
- **SC-004**: 95% of project CRUD operations complete successfully without errors in production
- **SC-005**: Project API endpoints support pagination for organisations with 1000+ projects without performance degradation
- **SC-006**: Zero security incidents related to unauthorised project access or modification
- **SC-007**: All project queries avoid N+1 patterns as verified by Django Debug Toolbar in development
- **SC-008**: Project name uniqueness validation prevents duplicate names 100% of the time within an organisation
- **SC-009**: Archived projects are excluded from default lists but remain queryable for admins

## Dependencies *(mandatory)*

### Upstream Dependencies

- **Feature 005 (Core Accounts & Authentication)**: Required for user identity, authentication, and tracking project creators
- **Feature 006 (Organisation Management & Multi-Tenancy)**: Required for organisation model, membership relationships, and permission checks
- **Feature 009 (Audit Logging)**: Required for recording project lifecycle events in audit trail

### Downstream Dependencies

- **Feature 003 (Frontend Context Switching)**: Will consume project data to provide UI context switching between projects
- **Future Features**: Any domain-specific features that need to scope resources to projects (documents, workflows, configurations, etc.) will establish foreign keys to the Project model

## Assumptions *(mandatory)*

1. **Organisation membership determines project access**: Users inherit project access from their organisation membership role. No separate project-level permission system is needed initially.
2. **Flat project structure**: Projects do not nest within each other. Each project belongs directly to one organisation.
3. **Slug generation**: Project slugs are auto-generated from names using Django's slugify utility with collision handling (append numbers if needed).
4. **Audit logging integration exists**: Feature 009 provides a working audit logging system that can be integrated via Django signals.
5. **No project-specific quotas**: Project count limits or storage quotas are not enforced by this feature (deferred to Feature 011 if needed).
6. **Soft deletion only**: Hard deletion of projects is not supported. Archived projects remain in the database indefinitely unless manually cleaned via admin tools.
7. **Creator immutability**: The project creator field is set once at creation and never changes, even if the user leaves the organisation.
8. **REST API only**: This feature provides API endpoints only. Frontend implementation is handled separately (Feature 003).
9. **English-only for MVP**: Project names and descriptions accept Unicode but no specific i18n/l10n is implemented beyond database storage.
10. **Standard pagination**: Default page size of 20 items is sufficient for initial launch. Custom page sizes can be supported later if needed.

## Out of Scope *(mandatory)*

- Project management features (tasks, sprints, timelines, milestones, Gantt charts)
- Project templates or cloning functionality
- Project-specific billing, quotas, or cost allocation
- Project-level permission/role system (separate from organisation membership)
- Project hierarchies or nested sub-projects
- External integrations (GitHub, Jira, Slack) linked to projects
- Project dashboards, analytics, or reporting
- Project-specific workflows or approval processes
- Bulk project operations (mass archive, mass update)
- Project tags, categories, or custom metadata fields beyond name/description
- Project search or filtering beyond active/archived status
- Frontend navigation or UI components (handled in Feature 003)
- Project activity feeds or timeline views
- Project collaboration features (comments, mentions, notifications)
- Project versioning or history tracking beyond audit logs

## Risks & Mitigations *(optional)*

### Risk 1: Circular Dependency with Future Features
**Risk**: If multiple future features both depend on projects and projects needs to reference them, circular dependencies could emerge.

**Mitigation**: Projects module remains agnostic - it never imports from downstream features. Other features establish foreign keys TO projects. Use Django's string-based foreign key references if forward declarations are needed.

### Risk 2: Performance Degradation at Scale
**Risk**: Organisations with thousands of projects could experience slow list queries or UI performance issues.

**Mitigation**: Implement database indexes on organisation_id and slug. Use pagination aggressively (20 items per page). Add select_related() for common joins. Monitor query performance in production with database query logging.

### Risk 3: Name Uniqueness Conflicts
**Risk**: Race conditions during concurrent project creation could violate unique name constraints.

**Mitigation**: Database-level UNIQUE constraint on (organisation_id, slug) prevents duplicates. API returns clear validation errors with retry guidance when conflicts occur.

### Risk 4: Audit Log Volume
**Risk**: High-frequency project updates could generate excessive audit log entries affecting storage and query performance.

**Mitigation**: Audit logs are designed for lifecycle events only (create, archive, restore) - not every field update. Consider log rotation policies in Feature 009 if volume becomes an issue.

### Risk 5: Archived Project Confusion
**Risk**: Users might not understand why certain projects don't appear in lists or how to restore them.

**Mitigation**: API responses clearly indicate archive status. Admin users can explicitly filter for archived projects. Restoration is a simple API call with clear success feedback.

## Glossary *(optional)*

- **Project**: A context container within an organisation used to group related resources, configurations, and workflows. Also referred to as "workspace" interchangeably.
- **Workspace**: Synonym for project - represents the same entity. The terms can be used based on downstream product preferences.
- **Archive**: Soft deletion operation that marks a project as inactive without removing it from the database. Archived projects can be restored.
- **Context Container**: An organisational unit that provides scoping for resources and operations, allowing features to operate within a specific bounded context.
- **Slug**: A URL-friendly version of the project name (lowercase, hyphenated) used in API endpoints and URLs.
- **Organisation Admin**: A user with admin or owner role in an organisation who has permission to create, update, and archive projects.
- **Soft Deletion**: A deletion pattern where records are marked as inactive (is_active=False) rather than removed from the database, allowing restoration.
- **Referential Integrity**: Database constraint ensuring foreign key relationships remain valid (e.g., projects always link to valid organisations).
