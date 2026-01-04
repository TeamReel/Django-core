# Implementation Tasks: B26 Project-Level Access Control

**Feature ID**: 038-project-access-control
**Branch**: `feature/038-project-access-control`
**Planning Date**: 2026-01-04
**Implementation Status**: Ready for Development

## Quick Reference

- **Total Work Packages**: 8
- **Total Subtasks**: 47
- **Estimated Duration**: 3-4 weeks (1 developer)
- **MVP Scope**: WP01 + WP02 + WP03 (Foundations + US1 + US2)
- **Parallel Opportunities**: Backend models/serializers/views can be built while frontend components are scaffolded

## Work Package Overview

| ID | Title | Priority | Subtasks | Dependencies | Parallelizable |
|----|-------|----------|----------|--------------|----------------|
| WP01 | Database & Model Foundation | P1 | 6 | None | Partially |
| WP02 | Permission Resolution Service | P1 | 5 | WP01 | No |
| WP03 | Internal Member Management (US1) | P1 | 7 | WP01, WP02 | Partially |
| WP04 | External Invitation System (US2) | P1 | 8 | WP01, WP02 | Partially |
| WP05 | Role Promotion Workflow (US4) | P2 | 6 | WP03, WP04 | Partially |
| WP06 | Private Projects & Override (US3, US5) | P2 | 5 | WP02 | Partially |
| WP07 | Member Removal & Audit (US6) | P2 | 5 | WP03 | No |
| WP08 | Admin UI & Activity Feed (US7, US8, US9) | P3 | 5 | All previous | Partially |

---

## Phase 1: Foundation (Must complete first)

### WP01: Database & Model Foundation

**Goal**: Establish core data models (ProjectMembership, ProjectInvite, ProjectMembershipPromotion) with validation, indexes, and migrations.

**Priority**: P1 (Blocker for all other work)
**Estimated Effort**: 2-3 days
**Independent Test**: Run migrations → seed test data → verify constraints (last admin protection, duplicate prevention) → query performance (<50ms)

**Included Subtasks**:

- [ ] **T001**: Extend `Project` model with `is_private` boolean field (default=False)
  - Add field to `apps/projects/models/project.py`
  - Create migration file: `0002_project_add_is_private.py`
  - Add index on `(organisation, is_private)`
  - Update model `__str__` to show privacy status

- [ ] **T002**: Create `ProjectMembership` model with soft delete [P]
  - Fields: `id` (UUID), `project` (FK), `user` (FK), `role` (choices: viewer/editor/admin), `assignment_reason` (choices: manual/invitation/promotion/org_default), `created_at`, `updated_at`, `deleted_at` (nullable)
  - Unique constraint: `unique_together = [('project', 'user'), where=Q(deleted_at__isnull=True)]`
  - Add indexes: `(project, deleted_at)`, `(user, deleted_at)`, `(project, role, deleted_at)`
  - Add custom manager: `objects = ProjectMembershipManager()` with `active()` queryset method
  - Location: `apps/projects/models/project_membership.py`

- [ ] **T003**: Create `ProjectInvite` model with token-based acceptance
  - Fields: `id` (UUID), `project` (FK), `email` (EmailField), `role` (choices), `token` (CharField, 64 chars, unique, indexed), `status` (choices: pending/accepted/cancelled/expired), `invited_by` (FK User), `created_at`, `expires_at`, `accepted_at` (nullable)
  - Add method: `generate_token()` using `secrets.token_urlsafe(32)`
  - Add method: `is_expired()` checking `expires_at < now()`
  - Add method: `send_invitation_email()` (calls B16 Celery task)
  - Location: `apps/projects/models/project_invite.py`

- [ ] **T004**: Create `ProjectMembershipPromotion` model with approval workflow
  - Fields: `id` (UUID), `project` (FK), `target_user` (FK), `requested_by` (FK User), `from_role` (choices), `to_role` (choices), `status` (choices: pending/accepted/declined/expired/cancelled), `is_suspicious` (boolean), `suspicious_reason` (TextField, nullable), `created_at`, `expires_at`, `resolved_at` (nullable)
  - Add method: `check_suspicious()` detecting <24h org membership
  - Add method: `accept()` updating ProjectMembership + invalidating cache
  - Add method: `decline()` setting status + notification
  - Location: `apps/projects/models/project_membership_promotion.py`

- [ ] **T005**: Add model validation rules [P]
  - **ProjectMembership**: Validate cannot remove last admin (custom `clean()` method)
  - **ProjectMembership**: Validate user exists in org OR project.is_private (external allowed for private)
  - **ProjectInvite**: Validate email not already member
  - **ProjectMembershipPromotion**: Validate from_role < to_role (only upward promotions)
  - Add validation tests: `tests/unit/apps/projects/test_model_validation.py`

- [ ] **T006**: Register models in Django Admin [P]
  - Add `ProjectMembershipAdmin` with list display, filters (role, deleted_at), search (user email/name)
  - Add `ProjectInviteAdmin` with list display (email, status, expires_at), actions (resend, cancel)
  - Add `ProjectMembershipPromotionAdmin` with list display (target_user, status, is_suspicious)
  - Add readonly fields for audit timestamps
  - Location: `apps/projects/admin.py`

**Implementation Sequence**:
1. Create model files (T001-T004) - can parallelize model creation
2. Run `makemigrations` and review migration files
3. Apply migrations to local database
4. Add validation rules (T005)
5. Register in admin (T006)
6. Seed test data: `python manage.py seed_memberships --count=50`
7. Verify via Django Admin and database queries

**Success Criteria**:
- [ ] All 4 models created and migrated successfully
- [ ] Indexes created (verify with `\d+ project_membership` in psql)
- [ ] Validation prevents last admin removal
- [ ] Django Admin shows all models with correct filters
- [ ] Test data seeding works without errors

**Dependencies**: None (foundation work)

**Risks**:
- Migration conflicts if other branches modify `Project` model (coordinate with team)
- Index performance on large datasets (monitor query plans)

---

### WP02: Permission Resolution Service

**Goal**: Implement 5-step hybrid permission resolver with caching (request-scoped + Redis).

**Priority**: P1 (Blocker for all access checks)
**Estimated Effort**: 2 days
**Independent Test**: Call `get_project_role(user, project)` → verify explicit membership overrides → verify private project enforcement → verify cache hit rate >80% → verify resolution time <50ms p95

**Included Subtasks**:

- [ ] **T007**: Create `PermissionResolutionService` class
  - Method: `get_project_role(user_id, project_id) -> PermissionResult`
  - Implements 5-step resolution: explicit membership → private check → org membership → emergency override → no_access
  - Returns TypedDict: `{"effective_role": str, "source": str, "permissions": List[str]}`
  - Location: `apps/projects/services/permission_resolution.py`

- [ ] **T008**: Implement hybrid caching strategy
  - Request-scoped cache: Use `functools.lru_cache` or request-local dict
  - Redis cache: Key pattern `permissions:user:{user_id}:project:{project_id}`, TTL 300s
  - Cache key generator: `_cache_key(user_id, project_id) -> str`
  - Cache invalidation on: membership create/update/delete, project privacy change
  - Location: `apps/projects/services/cache_service.py`

- [ ] **T009**: Create cache invalidation signals
  - Signal handlers in `apps/projects/signals.py`:
    - `@receiver(post_save, sender=ProjectMembership)` → invalidate user's permissions
    - `@receiver(post_delete, sender=ProjectMembership)` → invalidate user's permissions
    - `@receiver(post_save, sender=Project)` → if `is_private` changed, invalidate all project permissions
  - Bulk invalidation: `invalidate_project_permissions(project_id)` clearing all users

- [ ] **T010**: Add B08 integration for permission checks
  - Extend `AccessControlManager.check_permission(user, permission, project)`
  - Delegates to `PermissionResolutionService.get_project_role()`
  - Maps roles to permissions: viewer → `[projects.view]`, editor → `[projects.view, projects.edit]`, admin → `[projects.view, projects.edit, projects.delete, projects.manage_members]`
  - Location: `apps/access_control/managers.py` (extend existing)

- [ ] **T011**: Add performance instrumentation
  - Prometheus metrics: `permission_resolution_duration_seconds` histogram
  - Prometheus metrics: `permission_cache_hit_rate` gauge
  - Logging: Structured logs with `user_id`, `project_id`, `resolution_time_ms`, `cache_hit`
  - Add middleware: `apps/projects/middleware/permission_metrics.py`

**Implementation Sequence**:
1. Create PermissionResolutionService with 5-step logic (T007)
2. Implement caching layers (T008)
3. Wire cache invalidation signals (T009)
4. Integrate with B08 AccessControlManager (T010)
5. Add instrumentation (T011)
6. Load test: 1000 permission checks, verify <50ms p95 and >80% cache hit rate

**Success Criteria**:
- [ ] Permission resolution returns correct role for all scenarios (explicit, implicit, private, no_access)
- [ ] Cache hit rate >80% after warmup (100 checks)
- [ ] Resolution time <50ms at p95 (measure with `pytest-benchmark`)
- [ ] Cache invalidates correctly (add membership → check cache cleared)
- [ ] Prometheus metrics visible at `/metrics` endpoint

**Dependencies**: WP01 (requires models)

**Risks**:
- Cache invalidation race conditions (use Redis transactions)
- Cache stampede on popular projects (implement cache warming)

---

## Phase 2: Core User Stories (MVP)

### WP03: Internal Member Management (US1)

**Goal**: Project admins can add org members with instant access (no email confirmation).

**Priority**: P1
**Estimated Effort**: 3 days
**Independent Test**: Login as project admin → search org member by name → assign editor role → verify immediate access → verify notification sent

**Included Subtasks**:

- [ ] **T012**: Create `ProjectMembershipSerializer` [P]
  - Fields: `user_id`, `role`, `assignment_reason` (read-only in create)
  - Validation: User must exist, role must be valid choice
  - Validation: User not already member (return 409 if duplicate)
  - Read serializer: Include nested `user` object (id, email, full_name)
  - Location: `apps/projects/serializers/membership_serializer.py`

- [ ] **T013**: Create `ProjectMembershipViewSet` [P]
  - `GET /projects/{id}/members` - List members (paginated, filterable by role)
  - `POST /projects/{id}/members` - Add member (admin only)
  - `GET /projects/{id}/members/{user_id}` - Get specific member
  - `PATCH /projects/{id}/members/{user_id}` - Update role (may trigger promotion)
  - `DELETE /projects/{id}/members/{user_id}` - Remove member (soft delete)
  - Permission check: `@permission_required('projects.manage_members')` for write operations
  - Location: `apps/projects/views/membership_viewset.py`

- [ ] **T014**: Create `MembershipService` for business logic
  - Method: `add_member(project, user, role, added_by)` - Creates ProjectMembership, triggers audit event, invalidates cache
  - Method: `update_member_role(membership, new_role, changed_by)` - Checks if promotion approval needed, updates or creates promotion request
  - Method: `remove_member(membership, removed_by)` - Soft deletes, checks last admin protection
  - Method: `get_searchable_users(project, query)` - Returns org members not already in project
  - Location: `apps/projects/services/membership_service.py`

- [ ] **T015**: Add B09 audit events integration [P]
  - Event: `project.membership.created` (actor, user_id, project_id, role)
  - Event: `project.membership.role_changed` (actor, user_id, project_id, from_role, to_role)
  - Event: `project.membership.deleted` (actor, user_id, project_id, role)
  - Use `AuditLogger.log_event()` from B09
  - Location: `apps/projects/services/membership_service.py` (within methods)

- [ ] **T016**: Add B16 notification triggers [P]
  - Notification: "You've been added to {project_name}" (to added user)
  - Notification: "{user_name} was added to {project_name}" (to project admins)
  - Use Celery task: `send_notification.delay(user_id, template, context)`
  - Location: `apps/projects/services/membership_service.py` (after membership creation)

- [ ] **T017**: Frontend: MemberList component
  - Display members table: avatar, name, email, role, actions (edit role, remove)
  - Filter by role dropdown
  - Search by name/email input
  - "Add Member" button (opens modal)
  - Location: `packages/frontend/src/components/ProjectAccessControl/MemberList.tsx`

- [ ] **T018**: Frontend: AddMemberModal component
  - Search input with debounced API call to `/projects/{id}/searchable-users`
  - Display search results: name, email, "(Already member)" badge
  - Role selector: viewer/editor/admin radio buttons
  - "Add Member" button → POST to `/projects/{id}/members`
  - Success: Close modal, refresh member list, show toast "Member added"
  - Location: `packages/frontend/src/components/ProjectAccessControl/AddMemberModal.tsx`

**Implementation Sequence**:
1. Backend: Create serializer (T012) and viewset (T013) in parallel
2. Backend: Implement MembershipService (T014) - depends on serializer
3. Backend: Wire audit events (T015) and notifications (T016) in parallel
4. Frontend: Build MemberList (T017) and AddMemberModal (T018) in parallel (can start after API contracts done)
5. Integration test: End-to-end add member flow
6. Manual test: Verify notification email sent via Celery logs

**Success Criteria**:
- [ ] Can add org member via API: `POST /projects/{id}/members {"user_id": "...", "role": "editor"}` → 201 Created
- [ ] Member appears in list immediately
- [ ] Audit event logged with correct actor and context
- [ ] Notification sent to added user (check Celery logs)
- [ ] Frontend modal searches and adds members correctly

**Dependencies**: WP01 (models), WP02 (permission checks)

**Risks**:
- Search performance with large orgs (add pagination, limit results to 50)
- Race condition if user added twice simultaneously (unique constraint handles)

---

### WP04: External Invitation System (US2)

**Goal**: Project admins can invite external users via email with token-based acceptance.

**Priority**: P1
**Estimated Effort**: 3-4 days
**Independent Test**: Send invite to external email → receive email with magic link → accept invite → create account (if needed) → gain project access

**Included Subtasks**:

- [ ] **T019**: Create `ProjectInviteSerializer` [P]
  - Create fields: `email`, `role`
  - Read fields: Add `invited_by` (nested user), `status`, `created_at`, `expires_at`
  - Validation: Email format, role valid, email not already member
  - Location: `apps/projects/serializers/invite_serializer.py`

- [ ] **T020**: Create `ProjectInviteViewSet` [P]
  - `GET /projects/{id}/invitations` - List pending invites (admin only)
  - `POST /projects/{id}/invitations` - Send invite (admin only)
  - `GET /projects/{id}/invitations/{invite_id}` - Get invite details
  - `DELETE /projects/{id}/invitations/{invite_id}` - Cancel invite
  - `GET /invitations/{token}` - Public endpoint: Get invite by token (no auth required)
  - `POST /invitations/{token}` - Accept invite (authenticated user)
  - Rate limit: 20 invites/hour per user (use `@rate_limit` from B03)
  - Location: `apps/projects/views/invite_viewset.py`

- [ ] **T021**: Create `InvitationService` for business logic
  - Method: `send_invitation(project, email, role, invited_by)` - Creates invite, generates token, queues email
  - Method: `accept_invitation(token, accepting_user)` - Validates token, creates membership, updates invite status
  - Method: `cancel_invitation(invite, cancelled_by)` - Sets status to cancelled, logs audit event
  - Method: `check_expired_invitations()` - Cron job to mark expired invites (run daily)
  - Location: `apps/projects/services/invitation_service.py`

- [ ] **T022**: Create invitation email template [P]
  - Subject: "You've been invited to {project_name}"
  - Body: Include project name, inviter name, role, magic link
  - Magic link: `{frontend_url}/accept-invitation/{token}`
  - Expiry warning: "This invitation expires in 7 days"
  - Location: `apps/notifications/templates/emails/project_invitation.html`

- [ ] **T023**: Add B16 Celery task for sending invitations
  - Task: `send_project_invitation_email(invite_id)`
  - Load invite, render template, send via SMTP
  - Retry logic: 3 attempts with exponential backoff
  - Location: `apps/notifications/tasks.py` (extend existing)

- [ ] **T024**: Frontend: InviteMemberModal component (external tab)
  - Email input field with validation
  - Role selector (viewer/editor/admin)
  - "Send Invitation" button → POST `/projects/{id}/invitations`
  - Success: Show success message with expiry info
  - Location: `packages/frontend/src/components/ProjectAccessControl/InviteMemberModal.tsx`

- [ ] **T025**: Frontend: AcceptInvitation page
  - Route: `/accept-invitation/:token`
  - On mount: Fetch invite details GET `/invitations/{token}`
  - Display: Project name, inviter, role, expiry date
  - If not logged in: Show "Login or Sign Up to accept" buttons
  - If logged in with different email: Show warning "Email mismatch"
  - Accept button → POST `/invitations/{token}` → redirect to project
  - Location: `packages/frontend/src/pages/AcceptInvitation.tsx`

- [ ] **T026**: Frontend: PendingInvites tab in MemberList
  - Displays pending invitations table: email, role, sent date, expires date
  - Actions: Resend button (calls `send_invitation_email()` again), Cancel button
  - Location: `packages/frontend/src/components/ProjectAccessControl/PendingInvitesTab.tsx`

**Implementation Sequence**:
1. Backend: Create serializer (T019), viewset (T020), service (T021) in parallel
2. Backend: Create email template (T022) and Celery task (T023)
3. Frontend: Build InviteMemberModal external tab (T024)
4. Frontend: Build AcceptInvitation page (T025)
5. Frontend: Build PendingInvites tab (T026)
6. Integration test: Send invite → check email (use Mailhog in dev) → accept → verify membership created
7. Test expiry: Mock datetime, verify expired invites rejected

**Success Criteria**:
- [ ] Invite sent successfully, email received (check Mailhog in dev)
- [ ] Accept flow works for logged-in and new users
- [ ] Email mismatch warning shown when logged in as different user
- [ ] Expired invites rejected with clear error message
- [ ] Pending invites visible in admin UI with resend/cancel actions

**Dependencies**: WP01 (models), WP02 (permission checks), WP03 (MembershipService for creating membership)

**Risks**:
- Email deliverability in production (configure SPF/DKIM)
- Token security (use cryptographically secure tokens, add rate limiting on accept endpoint)

---

## Phase 3: Advanced Features

### WP05: Role Promotion Workflow (US4)

**Goal**: Admin promotions require target user acceptance (configurable via feature flags).

**Priority**: P2
**Estimated Effort**: 2-3 days
**Independent Test**: Project admin promotes user to admin → notification sent to user → user accepts → role updated → audit events logged

**Included Subtasks**:

- [ ] **T027**: Create `ProjectMembershipPromotionSerializer` [P]
  - Fields: `target_user`, `to_role`, `status`, `is_suspicious`, `suspicious_reason`
  - Read fields: Add `project`, `requested_by`, `from_role`, `created_at`, `expires_at`
  - Location: `apps/projects/serializers/promotion_serializer.py`

- [ ] **T028**: Create `ProjectMembershipPromotionViewSet` [P]
  - `GET /projects/{id}/promotions` - List promotions (filtered by user context: admins see all, users see own)
  - `POST /projects/{id}/promotions` - Request promotion (internal use, triggered by role update)
  - `GET /promotions/{id}` - Get promotion details
  - `POST /promotions/{id}/accept` - Accept promotion (target user only)
  - `POST /promotions/{id}/decline` - Decline promotion (target user only)
  - `DELETE /promotions/{id}/cancel` - Cancel promotion (requester or admin)
  - Location: `apps/projects/views/promotion_viewset.py`

- [ ] **T029**: Create `PromotionService` for business logic
  - Method: `request_promotion(membership, to_role, requested_by)` - Creates promotion request, checks if suspicious, sends notification
  - Method: `accept_promotion(promotion, accepting_user)` - Updates membership role, invalidates cache, logs audit events
  - Method: `decline_promotion(promotion, reason)` - Sets status to declined, notifies requester
  - Method: `check_suspicious_promotion(user, project)` - Returns True if user joined org <24h ago
  - Location: `apps/projects/services/promotion_service.py`

- [ ] **T030**: Add B10 feature flag checks
  - Flag: `project_access_control.require_promotion_approval` (default: True)
  - Flag: `project_access_control.promotion_approval_threshold` (default: "editor")
  - Logic: If user's org role >= threshold, skip approval (immediate promotion)
  - Logic: If flag disabled, always immediate promotion
  - Location: `apps/projects/services/promotion_service.py` (in `request_promotion()`)

- [ ] **T031**: Frontend: PromotionRequestCard component
  - Display promotion details: requester name, from role → to role, suspicious badge
  - Actions: Accept button, Decline button (with optional reason textarea)
  - Location: `packages/frontend/src/components/ProjectAccessControl/PromotionRequestCard.tsx`

- [ ] **T032**: Frontend: Add promotion notifications to notification center
  - Notification: "You've been nominated for admin role in {project_name}"
  - Click notification → navigate to `/projects/{id}/settings/access` → highlights pending promotion
  - Location: Extend `packages/frontend/src/components/Notifications/NotificationCenter.tsx`

**Implementation Sequence**:
1. Backend: Create serializer (T027), viewset (T028), service (T029) in parallel
2. Backend: Wire feature flag checks (T030)
3. Frontend: Build PromotionRequestCard (T031)
4. Frontend: Add notifications (T032)
5. Integration test: Request promotion → verify notification → accept → verify role updated
6. Test suspicious detection: Create user, add to org, invite to project, promote within 24h → verify alert sent

**Success Criteria**:
- [ ] Promotion requires acceptance when feature flag enabled
- [ ] Suspicious promotions flagged and alert sent to org admins
- [ ] Decline flow works with optional reason
- [ ] Feature flag disables approval when needed (downstream customization)

**Dependencies**: WP03 (MembershipService), WP04 (InvitationService for suspicious check)

**Risks**:
- Notification delivery failures (add retry logic)
- User confusion about approval process (add clear UI messaging)

---

### WP06: Private Projects & Override (US3, US5)

**Goal**: Enforce private project access rules with emergency override for org admins.

**Priority**: P2
**Estimated Effort**: 2 days
**Independent Test**: Mark project private → verify org admins lose auto-access → org admin uses override → verify audit event logged

**Included Subtasks**:

- [x] **T033**: Update PermissionResolutionService for private projects
  - Step 2 in resolution: If `project.is_private` and no explicit membership, return "no_access"
  - Exception: If user is org admin AND override flag enabled, allow access with `source="emergency_override"`
  - Location: `apps/projects/services/permission_resolution.py` (extend existing)

- [x] **T034**: Add emergency override audit logging
  - Event: `project.private_access_override` (actor, project_id, reason)
  - Log whenever org admin accesses private project without explicit membership
  - Add rate limiting: Max 5 overrides per day per admin (prevent abuse)
  - Location: `apps/projects/services/permission_resolution.py`

- [x] **T035**: Add B10 feature flag for override
  - Flag: `project_access_control.org_admin_override` (default: True)
  - Flag: `project_access_control.private_projects` (default: True)
  - Location: Check in `PermissionResolutionService.get_project_role()`

- [x] **T036**: Frontend: Add "Make Private" toggle in project settings
  - Settings page: `/projects/{id}/settings/general`
  - Toggle switch with warning modal: "Org members will lose automatic access. {X} users affected."
  - Show affected user count before confirmation
  - Location: `packages/frontend/src/pages/ProjectSettings/GeneralTab.tsx`

- [x] **T037**: Frontend: Show override badge when accessing via emergency override
  - Banner at top of project: "You are accessing this private project via admin override. This action is audited."
  - Link to audit log entry
  - Location: `packages/frontend/src/components/ProjectLayout.tsx` (conditional render)

**Implementation Sequence**:
1. Backend: Update permission resolver for private logic (T033)
2. Backend: Add override audit logging (T034)
3. Backend: Wire feature flags (T035)
4. Frontend: Add privacy toggle with warning (T036)
5. Frontend: Add override banner (T037)
6. Test: Mark project private → verify access denied → verify override works → verify audit logged

**Success Criteria**:
- [ ] Private projects enforce explicit membership only
- [ ] Org admins can override with audit trail
- [ ] Warning shown before making project private
- [ ] Feature flags allow disabling override (strict mode)

**Dependencies**: WP02 (PermissionResolutionService)

**Risks**:
- Audit log storage growth (implement log rotation)
- Override abuse (monitor override frequency, add alerts)

---

### WP07: Member Removal & Audit (US6)

**Goal**: Soft delete members with audit trail and last admin protection.

**Priority**: P2
**Estimated Effort**: 1-2 days
**Independent Test**: Remove member → verify soft deleted (deleted_at set) → verify audit event → try to remove last admin → verify blocked

**Included Subtasks**:

- [ ] **T038**: Update `MembershipService.remove_member()` with last admin check
  - Count active admins: `ProjectMembership.objects.filter(project=project, role='admin', deleted_at__isnull=True).count()`
  - If count <= 1 and removing last admin: Auto-assign org admin OR raise ValidationError (per clarification)
  - Set `deleted_at = now()` (soft delete)
  - Invalidate permission cache for user
  - Location: `apps/projects/services/membership_service.py` (extend T014 method)

- [ ] **T039**: Add B09 audit event for removal
  - Event: `project.membership.deleted` (actor, user_id, project_id, former_role)
  - Include reason field (optional, for UI to capture)
  - Location: `apps/projects/services/membership_service.py`

- [ ] **T040**: Frontend: Add "Remove Member" action with confirmation
  - Member list row: "..." menu → "Remove Member" option
  - Confirmation modal: "Remove {user_name} from {project_name}? They will lose all access."
  - If last admin: Show warning "This is the last admin. An org admin will be auto-assigned."
  - Location: `packages/frontend/src/components/ProjectAccessControl/MemberList.tsx`

- [ ] **T041**: Frontend: Add audit log viewer tab
  - Tab: "Activity" in project settings
  - Display recent membership changes: added, removed, role changed
  - Filters: Event type, date range, user
  - Location: `packages/frontend/src/pages/ProjectSettings/ActivityTab.tsx`

- [ ] **T042**: Add management command to cleanup old soft deletes
  - Command: `python manage.py cleanup_deleted_memberships --days=90`
  - Hard delete memberships where `deleted_at < 90 days ago`
  - Add cron job to run monthly
  - Location: `apps/projects/management/commands/cleanup_deleted_memberships.py`

**Implementation Sequence**:
1. Backend: Update remove method with protections (T038)
2. Backend: Wire audit event (T039)
3. Frontend: Add remove action with confirmation (T040)
4. Frontend: Add activity tab (T041)
5. Backend: Create cleanup command (T042)
6. Test: Remove member → verify soft delete → verify audit logged → test last admin protection

**Success Criteria**:
- [ ] Cannot remove last admin (validation error or auto-assign)
- [ ] Soft delete preserves data for audit purposes
- [ ] Audit log visible in UI with filters
- [ ] Cleanup command removes old deleted records

**Dependencies**: WP03 (MembershipService)

**Risks**:
- Data retention compliance (document retention policy)
- Last admin edge case if all admins deleted simultaneously (unique constraint prevents)

---

## Phase 4: Polish & Admin UX

### WP08: Admin UI & Activity Feed (US7, US8, US9)

**Goal**: Complete admin experience with pending invites management, activity feed, and permission matrix view.

**Priority**: P3 (Nice to have, not MVP)
**Estimated Effort**: 2-3 days
**Independent Test**: View permission matrix modal → see all roles and capabilities → change role inline → verify update

**Included Subtasks**:

- [ ] **T043**: Frontend: Permission matrix modal component
  - Grid view: Rows = users, Columns = capabilities (view, edit, delete, manage members)
  - Checkboxes indicate granted permissions (read-only visualization)
  - Click user row → opens full member details modal (per clarification)
  - Location: `packages/frontend/src/components/ProjectAccessControl/PermissionMatrix.tsx`

- [ ] **T044**: Frontend: Activity feed component
  - Timeline view of recent events (last 30 days)
  - Events: Member added, role changed, member removed, invite sent, promotion requested
  - Each event: Actor avatar, action description, timestamp, "View Details" link
  - Infinite scroll pagination
  - Location: `packages/frontend/src/components/ProjectAccessControl/ActivityFeed.tsx`

- [ ] **T045**: Frontend: Resend invite functionality
  - Pending invites tab: "Resend" button
  - Action: Call existing `send_invitation_email()` with same invite
  - Show success toast: "Invitation resent to {email}"
  - Rate limit: 3 resends per invite
  - Location: `packages/frontend/src/components/ProjectAccessControl/PendingInvitesTab.tsx`

- [ ] **T046**: Add analytics dashboard endpoint
  - Endpoint: `GET /projects/{id}/membership-stats`
  - Returns: Total members, breakdown by role, pending invites count, promotions count
  - Use for dashboard widget: "Project Access Overview"
  - Location: `apps/projects/views/analytics_viewset.py`

- [ ] **T047**: Add comprehensive tests
  - Unit tests: Models (15 tests), Serializers (10 tests), Services (15 tests)
  - Integration tests: Full workflows (10 tests) - invite flow, promotion flow, removal flow
  - Contract tests: OpenAPI compliance (10 tests)
  - Permission tests: Access control (10 tests) - verify roles enforce correctly
  - Target: 90% backend coverage, 85% frontend coverage
  - Location: `tests/unit/apps/projects/`, `tests/integration/`, `tests/contract/`

**Implementation Sequence**:
1. Frontend: Build permission matrix modal (T043)
2. Frontend: Build activity feed (T044)
3. Frontend: Add resend functionality (T045)
4. Backend: Add analytics endpoint (T046)
5. Testing: Comprehensive test suite (T047) - parallelize by category

**Success Criteria**:
- [ ] Permission matrix displays correctly with proper role mappings
- [ ] Activity feed shows recent events with correct filtering
- [ ] Resend invite works with rate limiting
- [ ] Analytics dashboard shows accurate membership stats
- [ ] Test coverage meets targets (90% backend, 85% frontend)

**Dependencies**: All previous work packages (integrates everything)

**Risks**:
- Performance with large activity feeds (paginate, index audit events)
- Test maintenance burden (use factories, avoid brittle tests)

---

## Implementation Notes

### Parallelization Strategy

**Can work in parallel**:
- **WP01 models**: Different developers can create different models simultaneously
- **WP03 + WP04**: Backend and frontend can work in parallel (use API contracts as interface)
- **WP05 + WP06**: Independent features, no shared code
- **Frontend components**: All UI components can be built in parallel once APIs are stable

**Must be sequential**:
- WP02 depends on WP01 (needs models)
- WP03/WP04 depend on WP01 + WP02 (needs models and permission checks)
- WP07 depends on WP03 (extends MembershipService)
- WP08 depends on all previous (integration work)

### Testing Strategy

**Note**: Tests are included in WP08 (T047) as comprehensive end-of-implementation validation. This aligns with TDD principles but concentrates test writing after core functionality is stable.

**Coverage Targets**:
- Backend: 90% (critical: models, services, permission resolution)
- Frontend: 85% (critical: member management, invitation flow)

**Test Categories**:
1. **Unit tests** (40 tests): Models, serializers, services in isolation
2. **Integration tests** (10 tests): Complete workflows end-to-end
3. **Contract tests** (10 tests): OpenAPI compliance verification
4. **Permission tests** (10 tests): Access control enforcement

### Deployment Checklist

Before merging to main:
- [ ] All migrations applied to Railway production database
- [ ] Feature flags configured in production Django Admin
- [ ] Email templates tested with production SMTP
- [ ] Redis cache configured and health checked
- [ ] Celery workers running with correct queues
- [ ] Monitoring dashboards configured (Prometheus/Grafana)
- [ ] Performance targets validated (<50ms permission resolution, >80% cache hit rate)
- [ ] Security audit completed (OWASP ASVS checklist)
- [ ] Documentation updated (API docs, admin guides)

---

## Task Prompt Files

Each work package has a detailed prompt file in `tasks/planned/` directory:

- [WP01-database-model-foundation.md](tasks/planned/WP01-database-model-foundation.md)
- [WP02-permission-resolution-service.md](tasks/planned/WP02-permission-resolution-service.md)
- [WP03-internal-member-management.md](tasks/planned/WP03-internal-member-management.md)
- [WP04-external-invitation-system.md](tasks/planned/WP04-external-invitation-system.md)
- [WP05-role-promotion-workflow.md](tasks/planned/WP05-role-promotion-workflow.md)
- [WP06-private-projects-override.md](tasks/planned/WP06-private-projects-override.md)
- [WP07-member-removal-audit.md](tasks/planned/WP07-member-removal-audit.md)
- [WP08-admin-ui-activity-feed.md](tasks/planned/WP08-admin-ui-activity-feed.md)

---

## Progress Tracking

Use this checklist to track work package completion:

- [ ] **WP01**: Database & Model Foundation (6 subtasks)
- [ ] **WP02**: Permission Resolution Service (5 subtasks)
- [ ] **WP03**: Internal Member Management (7 subtasks)
- [X] **WP04**: External Invitation System (8 subtasks)
- [ ] **WP05**: Role Promotion Workflow (6 subtasks)
- [ ] **WP06**: Private Projects & Override (5 subtasks)
- [ ] **WP07**: Member Removal & Audit (5 subtasks)
- [ ] **WP08**: Admin UI & Activity Feed (5 subtasks)

**Current Status**: Ready for Implementation
**Next Command**: `/spec-kitty.implement WP01` (start with foundation)
