# Requirements Checklist: B26 Project-Level Access Control

**Feature Branch**: `038-project-access-control`
**Created**: 2026-01-04
**Status**: Draft

## Purpose

This checklist ensures B26 Project-Level Access Control meets all constitutional requirements, functional specifications, and quality standards before merging to main.

---

## 1. Core Functionality

### 1.1 Permission Model (Option C Hybrid)

- [ ] **PM-001**: Org admins have automatic admin role on all PUBLIC projects
- [ ] **PM-002**: Org members have automatic viewer role on all PUBLIC projects
- [ ] **PM-003**: Explicit ProjectMembership records override org-based defaults
- [ ] **PM-004**: Private projects (`is_private=True`) require explicit membership
- [ ] **PM-005**: Org admins have NO auto-access to private projects
- [ ] **PM-006**: Permission resolution follows documented order (explicit → private check → org admin → org member)
- [ ] **PM-007**: UI displays access source badges: "Admin (via org)" vs "Editor (explicit)"

### 1.2 Internal Member Management

- [ ] **IMM-001**: Project admins can search existing org members by name/email
- [ ] **IMM-002**: Search results are privacy-filtered (org members + shared project history only)
- [ ] **IMM-003**: Adding org member creates ProjectMembership record instantly (no email)
- [ ] **IMM-004**: Added member receives B16 notification "You've been added to [Project]"
- [ ] **IMM-005**: Member list displays: name, email, role, status, actions (edit/remove)
- [ ] **IMM-006**: Search shows "(Already member)" badge for existing members

### 1.3 External Invitations

- [ ] **EXT-001**: Project admins can invite external users via email input
- [ ] **EXT-002**: ProjectInvite record created with UUID4 token, 7-day expiration
- [ ] **EXT-003**: Invite email sent via B16 with project name, inviter, role, accept link
- [ ] **EXT-004**: Accept link format: `/invites/accept/{token}`
- [ ] **EXT-005**: Accept page shows invite details, prompts account creation if needed
- [ ] **EXT-006**: Email mismatch warning if accepting user email ≠ invited email
- [ ] **EXT-007**: Invite status transitions: pending → accepted/cancelled/expired
- [ ] **EXT-008**: Token invalidated after acceptance or cancellation
- [ ] **EXT-009**: External users see ONLY invited projects (no org-wide access)

### 1.4 Role Management

- [ ] **ROLE-001**: Three roles supported: viewer (read), editor (write), admin (manage)
- [ ] **ROLE-002**: Viewer ↔ Editor transitions are instant with notification
- [ ] **ROLE-003**: Editor → Admin requires explicit acceptance (pending promotion)
- [ ] **ROLE-004**: Pending admin promotion shows banner/email to promotee
- [ ] **ROLE-005**: Acceptance updates ProjectMembership.role and logs to B09
- [ ] **ROLE-006**: Demotion requires confirmation modal for self-demotion
- [ ] **ROLE-007**: Last admin protection blocks removal/demotion of sole admin
- [ ] **ROLE-008**: All role changes logged to B09 with actor, timestamp, reason

### 1.5 Private Projects

- [ ] **PRIV-001**: Project creation/settings has "Private Project" toggle
- [ ] **PRIV-002**: Warning shown when toggling: "Org admins will NOT have auto-access"
- [ ] **PRIV-003**: Making public project private shows: "X members will lose access"
- [ ] **PRIV-004**: Private projects are hidden from org admin project lists
- [ ] **PRIV-005**: Direct URL access to private project returns 403 for non-members
- [ ] **PRIV-006**: Explicit invites to private projects work for org admins (downgrade to viewer/editor allowed)

### 1.6 Member Removal

- [ ] **REM-001**: Project admin can remove members via "Remove" button
- [ ] **REM-002**: Confirmation modal shows: "User will lose access. History preserved."
- [ ] **REM-003**: ProjectMembership deleted, user loses immediate access
- [ ] **REM-004**: Removed user's past contributions show "[Name] (no longer member)"
- [ ] **REM-005**: Removed user's profile links disabled, name greyed out
- [ ] **REM-006**: B09 audit log records: actor, removed user, project, timestamp
- [ ] **REM-007**: Removed user sees 403 page if accessing project: "No longer have access"

---

## 2. Security & Rate Limiting

### 2.1 Rate Limits

- [ ] **RL-001**: Default limit: 10 invites per user per day
- [ ] **RL-002**: Admin multiplier: 50 invites per admin per day (via B10 feature flag)
- [ ] **RL-003**: Project limit: max 50 pending invites per project
- [ ] **RL-004**: Rate limit error message shows: "Limit resets at midnight UTC"
- [ ] **RL-005**: Feature flag override allows unlimited invites (logged to B09)
- [ ] **RL-006**: Rate limiting uses B03 decorator (@ratelimit)

### 2.2 Last Admin Protection

- [ ] **LAP-001**: System prevents removal of sole admin
- [ ] **LAP-002**: System prevents demotion of sole admin
- [ ] **LAP-003**: Error message: "Cannot remove last admin. Promote another member first."
- [ ] **LAP-004**: Protection applies to self-removal and removal by others
- [ ] **LAP-005**: B09 audit log records protection trigger events

### 2.3 Suspicious Activity Detection

- [ ] **SAD-001**: Detect user promoted to admin <24h after invite acceptance
- [ ] **SAD-002**: Detect multiple role changes on same user in short period
- [ ] **SAD-003**: Detect mass member removals (>10 in 1 hour)
- [ ] **SAD-004**: B09 audit log records suspicious events with `security.suspicious_*` type
- [ ] **SAD-005**: B16 notifications sent to org admins for suspicious events (if enabled)
- [ ] **SAD-006**: Activity feed highlights suspicious events with warning badge

### 2.4 Privacy & Enumeration Prevention

- [ ] **PRIV-001**: User search filters to: org members OR users with shared project history
- [ ] **PRIV-002**: Search returns max 10 results with LIMIT clause
- [ ] **PRIV-003**: No endpoint exposes full user database
- [ ] **PRIV-004**: External invites use email input (no user picker showing all users)

---

## 3. Integration Requirements

### 3.1 B08 Hierarchical Access Control

- [ ] **B08-001**: `IsProjectMemberOrOrgAdmin` permission class created
- [ ] **B08-002**: Permission class composes with existing `IsOrganisationMember`
- [ ] **B08-003**: No breaking changes to existing permission classes
- [ ] **B08-004**: Permission resolution logic centralized in `access_control.permissions`

### 3.2 B09 Audit Logging

- [ ] **B09-001**: Event types registered: `project.member.*`, `project.invite.*`, `security.suspicious_*`
- [ ] **B09-002**: All membership changes logged with actor, target, project, role, timestamp
- [ ] **B09-003**: Invite tokens hashed in audit logs (only last 6 chars visible)
- [ ] **B09-004**: Activity feed queries B09 audit logs with filtering/pagination

### 3.3 B16 Notifications

- [ ] **B16-001**: Notification types created: member_added, role_changed, invite_sent, invite_accepted
- [ ] **B16-002**: Email templates created for invites and promotions
- [ ] **B16-003**: In-app notifications show in notifications hub (F04)
- [ ] **B16-004**: Email delivery failures queued for retry (B15 Celery)

### 3.4 B10 Feature Flags

- [ ] **B10-001**: Feature flag `notify_external_invites` (default: OFF, scope: org)
- [ ] **B10-002**: Feature flag `protect_project_creator` (optional, default: OFF)
- [ ] **B10-003**: Feature flag `invite_limit_per_user` (default: 10, org override available)
- [ ] **B10-004**: Feature flags documented in settings docs

### 3.5 F01 Design System

- [ ] **F01-001**: Member list table uses F01 Table component
- [ ] **F01-002**: Add Member modal uses F01 Modal component
- [ ] **F01-003**: Tab switcher (Search/Email) uses F01 Tabs component
- [ ] **F01-004**: Role dropdown uses F01 Select component
- [ ] **F01-005**: Confirmation modals use F01 Dialog component
- [ ] **F01-006**: Role badges use F01 Badge component with color variants

---

## 4. User Interface

### 4.1 Member Management Tab

- [ ] **UI-001**: Project Settings has "Members" tab
- [ ] **UI-002**: Member list shows: avatar, name, email, role dropdown, remove button
- [ ] **UI-003**: "Add Member" button opens modal with 2 tabs
- [ ] **UI-004**: Tab 1 "Search Users": search input, results list, instant add
- [ ] **UI-005**: Tab 2 "Invite by Email": email input, role selector, send button
- [ ] **UI-006**: Loading states during search, add, invite actions
- [ ] **UI-007**: Success/error toast notifications (F05 integration)

### 4.2 Pending Invites Tab

- [ ] **UI-008**: "Pending Invites" tab next to "Members" tab
- [ ] **UI-009**: Table columns: Email, Role, Invited By, Sent Date, Expires, Status, Actions
- [ ] **UI-010**: Actions: Resend (if not expired), Cancel (if pending)
- [ ] **UI-011**: Accepted invites shown with greyed out actions
- [ ] **UI-012**: Expired invites show "Expired" badge

### 4.3 Invite Acceptance Page

- [ ] **UI-013**: Standalone page at `/invites/accept/{token}`
- [ ] **UI-014**: Shows: project name, inviter name, role, expiration date
- [ ] **UI-015**: If not logged in: "Create account or sign in to accept"
- [ ] **UI-016**: If logged in: "Accept Invite" button
- [ ] **UI-017**: Email mismatch warning if needed
- [ ] **UI-018**: Expired token shows: "This invite has expired. Contact project admin."
- [ ] **UI-019**: Already accepted: "You've already accepted this invite"

### 4.4 Activity Feed

- [ ] **UI-020**: Activity tab/section in project page
- [ ] **UI-021**: Chronological list of membership events
- [ ] **UI-022**: Event format: "[Actor] [action] [target] as [role]" with timestamp
- [ ] **UI-023**: Suspicious events highlighted with ⚠️ badge
- [ ] **UI-024**: Pagination: 20 events per page
- [ ] **UI-025**: Filter options: All events / Members only / Invites only

### 4.5 Permission Matrix

- [ ] **UI-026**: Org Settings → "Access Matrix" page
- [ ] **UI-027**: Grid with users (rows) × projects (columns)
- [ ] **UI-028**: Cells show role badges: Admin, Editor, Viewer, "—" (no access)
- [ ] **UI-029**: Badge variants: solid (explicit), outlined (via org)
- [ ] **UI-030**: External users marked with "External" tag
- [ ] **UI-031**: Click cell → popover with details and quick actions
- [ ] **UI-032**: Virtual scrolling for large organizations (>100 users/projects)

---

## 5. Testing Requirements

### 5.1 Unit Tests (Backend)

- [ ] **UT-001**: Permission resolution logic (15 test cases covering all scenarios)
- [ ] **UT-002**: Rate limiting validation (10 test cases: limits, overrides, resets)
- [ ] **UT-003**: Last admin protection (5 test cases: removal, demotion, self-removal)
- [ ] **UT-004**: Private project permission checks (8 test cases)
- [ ] **UT-005**: Invite token generation and validation (6 test cases)
- [ ] **UT-006**: Role transition validation (10 test cases: instant, acceptance, errors)
- [ ] **UT-007**: User search privacy filter (5 test cases)
- [ ] **UT-008**: Audit log creation for all events (12 test cases)

### 5.2 Integration Tests (Backend)

- [ ] **IT-001**: Full invite flow: send → email → accept → access granted (external user)
- [ ] **IT-002**: Internal member add: search → add → instant access (org member)
- [ ] **IT-003**: Role promotion: editor → admin → pending → accept → granted
- [ ] **IT-004**: Private project: create → verify org admin no access → invite → access
- [ ] **IT-005**: Member removal: remove → verify no access → check audit log
- [ ] **IT-006**: Rate limit enforcement: send 11 invites → verify 11th fails
- [ ] **IT-007**: Suspicious promotion detection: invite → accept → promote <24h → alert
- [ ] **IT-008**: Permission matrix accuracy: compare matrix display vs runtime checks

### 5.3 API Tests (Backend)

- [ ] **API-001**: `GET /api/v1/projects/{id}/members` (200, pagination, filtering)
- [ ] **API-002**: `POST /api/v1/projects/{id}/members` (201, validation errors)
- [ ] **API-003**: `POST /api/v1/projects/{id}/invite` (201, rate limit 429, validation 400)
- [ ] **API-004**: `PATCH /api/v1/projects/{id}/members/{user_id}` (200, last admin 403)
- [ ] **API-005**: `DELETE /api/v1/projects/{id}/members/{user_id}` (204, last admin 403)
- [ ] **API-006**: `GET /api/v1/projects/{id}/invites` (200, pending only)
- [ ] **API-007**: `POST /api/v1/projects/{id}/invites/{invite_id}/resend` (200, expired 400)
- [ ] **API-008**: `DELETE /api/v1/projects/{id}/invites/{invite_id}` (204)
- [ ] **API-009**: `POST /api/v1/invites/accept/{token}` (200, expired 400, invalid 404)
- [ ] **API-010**: Permission tests: viewer can't add members (403), admin can (200)

### 5.4 Frontend Tests (React)

- [ ] **FE-001**: Member list renders correctly with pagination
- [ ] **FE-002**: Add Member modal opens/closes, tab switching works
- [ ] **FE-003**: User search debounced (300ms), displays results
- [ ] **FE-004**: Email invite form validation (email format, role required)
- [ ] **FE-005**: Role dropdown updates correctly, triggers API call
- [ ] **FE-006**: Remove button shows confirmation modal, deletes member
- [ ] **FE-007**: Pending invites tab filters and displays correctly
- [ ] **FE-008**: Invite acceptance page renders, submit works
- [ ] **FE-009**: Activity feed loads paginated events
- [ ] **FE-010**: Permission matrix renders grid, cell click shows popover
- [ ] **FE-011**: Toast notifications show on success/error
- [ ] **FE-012**: Loading states display during async operations

### 5.5 E2E Tests (Cypress/Playwright)

- [ ] **E2E-001**: User Story 1: Internal member management (search, add, verify access)
- [ ] **E2E-002**: User Story 2: External invite flow (send, accept, verify isolation)
- [ ] **E2E-003**: User Story 3: Hybrid permissions (public auto-access, private no access)
- [ ] **E2E-004**: User Story 4: Role promotion (instant + acceptance flows)
- [ ] **E2E-005**: User Story 5: Private project override (create, verify org admin blocked)
- [ ] **E2E-006**: User Story 6: Member removal (remove, verify no access, check history)
- [ ] **E2E-007**: User Story 7: Pending invites (resend, cancel)
- [ ] **E2E-008**: User Story 8: Activity feed (verify events display)
- [ ] **E2E-009**: User Story 9: Permission matrix (view, click cell, quick actions)

### 5.6 Coverage Targets

- [ ] **COV-001**: Backend models: ≥95% line coverage
- [ ] **COV-002**: Backend views/serializers: ≥90% line coverage
- [ ] **COV-003**: Backend permission classes: 100% branch coverage (critical path)
- [ ] **COV-004**: Frontend components: ≥85% line coverage
- [ ] **COV-005**: Frontend hooks/utils: ≥90% line coverage
- [ ] **COV-006**: Overall backend: ≥90% (constitutional requirement)
- [ ] **COV-007**: Overall frontend: ≥85% (constitutional requirement)

---

## 6. Performance Requirements

- [ ] **PERF-001**: Permission resolution completes in <50ms per request
- [ ] **PERF-002**: Member list query uses `select_related` (no N+1)
- [ ] **PERF-003**: User search indexed on email/name fields, returns in <100ms
- [ ] **PERF-004**: Activity feed paginated (20 per page), loads in <200ms
- [ ] **PERF-005**: Permission matrix uses virtual scrolling for >100 users
- [ ] **PERF-006**: Invite email send queued via B15 Celery (async, no blocking)
- [ ] **PERF-007**: Audit log writes batched if >10 events/second
- [ ] **PERF-008**: Permission checks cached per request (avoid repeated DB queries)

---

## 7. Documentation

### 7.1 User Documentation

- [ ] **DOC-001**: User guide created: "Managing Project Members" (with screenshots)
- [ ] **DOC-002**: User guide section: "Inviting External Collaborators"
- [ ] **DOC-003**: User guide section: "Understanding Project Roles"
- [ ] **DOC-004**: User guide section: "Private vs Public Projects"
- [ ] **DOC-005**: FAQ: "Why can't I see a project?" (private project explanation)
- [ ] **DOC-006**: FAQ: "Why does admin promotion require acceptance?"

### 7.2 Admin Documentation

- [ ] **DOC-007**: Admin guide: "Understanding Permission Resolution" (decision tree)
- [ ] **DOC-008**: Admin guide: "Security Best Practices for Project Access"
- [ ] **DOC-009**: Admin guide: "Configuring Rate Limits and Notifications"
- [ ] **DOC-010**: Admin guide: "Auditing Project Access Changes"

### 7.3 Developer Documentation

- [ ] **DOC-011**: API reference: OpenAPI spec for all new endpoints
- [ ] **DOC-012**: Extension guide: "Customizing Project Roles"
- [ ] **DOC-013**: Extension guide: "Custom Invite Email Templates"
- [ ] **DOC-014**: ADR-026: "Hybrid Permission Model for Project Access"
- [ ] **DOC-015**: ADR-027: "Conditional Admin Promotion with Acceptance Flow"
- [ ] **DOC-016**: Code comments in permission resolution logic (complex conditionals)

---

## 8. Demo Requirements

### 8.1 Demo Page `/demo/project-access`

- [ ] **DEMO-001**: Demo page accessible at `/demo/project-access`
- [ ] **DEMO-002**: Page intro explains B26 features and demo scenario
- [ ] **DEMO-003**: "Football League" scenario: Ligue 1, Olympique Lyon, PSG, Secret Transfer project
- [ ] **DEMO-004**: Demo data seeder created (management command or fixture)
- [ ] **DEMO-005**: Pre-populated users: Pierre (admin), Jean (org admin), Marie (member), Carlos (external), Anna (external)
- [ ] **DEMO-006**: Pre-populated projects: Lyon (public), PSG (public), Secret Transfer (private)
- [ ] **DEMO-007**: Interactive demo: buttons to trigger each user story
- [ ] **DEMO-008**: Success/failure messages displayed for each action
- [ ] **DEMO-009**: "Reset Demo" button to restore initial state

### 8.2 Demo Validation

- [ ] **DEMO-010**: All 9 user stories executable via demo page
- [ ] **DEMO-011**: Demo can run multiple times without errors (idempotent)
- [ ] **DEMO-012**: Demo data isolated (uses test org, doesn't pollute production)
- [ ] **DEMO-013**: Demo documented in `docs/demo/project-access.md`

---

## 9. Constitutional Compliance

### 9.1 Product-Agnostic (Principle I)

- [ ] **CONST-001**: No football-specific logic in models/views (scenario is demo-only)
- [ ] **CONST-002**: Role names (viewer/editor/admin) are generic
- [ ] **CONST-003**: Feature works for any domain (CRM, project management, e-commerce)
- [ ] **CONST-004**: Extension points documented for custom roles

### 9.2 Architecture (Principle II)

- [ ] **CONST-005**: No circular dependencies introduced
- [ ] **CONST-006**: ProjectMembership in `projects` app (correct layering)
- [ ] **CONST-007**: Permission classes in `access_control` app
- [ ] **CONST-008**: Audit events in `audit` app

### 9.3 Code Quality (Principle III)

- [ ] **CONST-009**: Python 3.12+ type hints on all new code
- [ ] **CONST-010**: Black formatting enforced in CI
- [ ] **CONST-011**: Ruff linting passes with zero errors
- [ ] **CONST-012**: No `# type: ignore` without justification comment

### 9.4 Testing (Principle IV)

- [ ] **CONST-013**: ≥90% backend test coverage achieved
- [ ] **CONST-014**: ≥85% frontend test coverage achieved
- [ ] **CONST-015**: Zero flaky tests (all tests pass 10/10 times)
- [ ] **CONST-016**: Integration tests cover all critical paths

### 9.5 Security (Principle V)

- [ ] **CONST-017**: No secrets in code (email SMTP uses env vars)
- [ ] **CONST-018**: CSRF protection on invite acceptance page
- [ ] **CONST-019**: Invite tokens are cryptographically secure (UUID4)
- [ ] **CONST-020**: No sensitive data in logs (tokens hashed, passwords excluded)
- [ ] **CONST-021**: Security review completed (manual check for enumeration, XSS, injection)

### 9.6 Performance (Principle VI)

- [ ] **CONST-022**: No N+1 queries (verified via Django Debug Toolbar)
- [ ] **CONST-023**: All list endpoints paginated
- [ ] **CONST-024**: Database indexes on foreign keys and search fields
- [ ] **CONST-025**: Metrics instrumented (invite send rate, permission check latency)

### 9.7 API Design (Principle VII)

- [ ] **CONST-026**: DRF standards followed (viewsets, serializers, routers)
- [ ] **CONST-027**: Consistent error responses (code + message format)
- [ ] **CONST-028**: API versioned (`/api/v1/`)
- [ ] **CONST-029**: Validation at boundary (serializers, not views)

---

## 10. Acceptance Criteria

### 10.1 Feature Completeness

- [ ] **ACC-001**: All 9 user stories implemented and testable
- [ ] **ACC-002**: All 42 functional requirements (FR-001 to FR-042) satisfied
- [ ] **ACC-003**: All 15 success criteria (SC-001 to SC-015) measurable and achieved
- [ ] **ACC-004**: Demo page fully functional with Football League scenario
- [ ] **ACC-005**: All edge cases handled (invite, permission, audit edge cases)

### 10.2 Quality Gates

- [ ] **ACC-006**: All unit tests passing (≥90% coverage)
- [ ] **ACC-007**: All integration tests passing
- [ ] **ACC-008**: All E2E tests passing (9 user story flows)
- [ ] **ACC-009**: No linting errors (Ruff, Black, ESLint, Prettier)
- [ ] **ACC-010**: No type errors (mypy for Python, TypeScript checks)
- [ ] **ACC-011**: Security scan passing (no high/critical vulnerabilities)
- [ ] **ACC-012**: Performance benchmarks met (permission resolution <50ms)

### 10.3 Integration Stability

- [ ] **ACC-013**: No breaking changes to existing B08 permission classes
- [ ] **ACC-014**: Existing tests still pass (regression suite green)
- [ ] **ACC-015**: Migration runs cleanly on staging environment
- [ ] **ACC-016**: Rollback plan documented (migration reversal steps)

### 10.4 Documentation

- [ ] **ACC-017**: User guide complete and reviewed
- [ ] **ACC-018**: API reference generated and published
- [ ] **ACC-019**: ADRs written and approved
- [ ] **ACC-020**: Demo documented in project docs

### 10.5 Review & Approval

- [ ] **ACC-021**: Code review completed by 2+ developers
- [ ] **ACC-022**: Security review completed
- [ ] **ACC-023**: UX review completed (UI components, flows)
- [ ] **ACC-024**: Product owner approval received
- [ ] **ACC-025**: Constitutional compliance verified

---

## 11. Sign-off

**Specification Author**: GitHub Copilot
**Date**: 2026-01-04

**Review Status**:
- [ ] Technical Review Passed
- [ ] Security Review Passed
- [ ] UX Review Passed
- [ ] Product Review Passed
- [ ] Constitutional Review Passed

**Merge Authorization**:
- [ ] All checklist items completed
- [ ] All tests passing
- [ ] Documentation published
- [ ] Demo validated
- [ ] Ready for `/spec-kitty.merge`

---

## Notes

**Deviations from Template**: None

**Known Limitations**:
- Email delivery depends on external SMTP service (B16)
- Permission matrix virtual scrolling requires frontend optimization for >1000 projects

**Future Enhancements** (out of scope for B26):
- Custom role definitions (e.g., "guest", "billing admin")
- Bulk member import from CSV
- SCIM integration for SSO-based provisioning
- Role expiration (time-limited access)
