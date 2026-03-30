# B26: Project-Level Access Control

**Phase:** 9
**Status:** ✅ Done
**Module ID:** 038
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 38. B26 – Project-Level Access Control (New)

**Doel**: Fijnmazige toegangscontrole per project, los van organisatielidmaatschap.

**Waarom agnostisch**: Essentieel voor samenwerking met externen (freelancers, clients) die niet de hele organisatie mogen zien.

**Wat moet er gebeuren**:
- **ProjectMembership Model**:
  - Koppeling User <-> Project
  - Rollen: 'viewer', 'editor', 'admin' (project-scope)
- **Permission Updates**:
  - Update `IsOrganisationMember` naar `IsProjectMemberOrOrgAdmin`
  - Project-level permissies hebben voorrang op org-level (indien restrictiever)
- **UI Updates**:
  - Project Settings -> Members tab
  - "Invite to Project" flow (email invite)
  - "My Projects" dashboard filter (direct + org-inherited)
- **API Updates**:
  - `GET /api/v1/projects/:id/members`
  - `POST /api/v1/projects/:id/invite`
  - `DELETE /api/v1/projects/:id/members/:user_id`

**Demo Requirements**:
- 🔒 **Project Access Demo** (`/demo/project-access`):
  - Create project
  - Invite external user (not in org)
  - Login as external user -> verify only project access
  - Verify org admin still has access
  - Tests: invite → accept → verify scope → remove access

**Status**: 📋 PLANNED

**Specify Prompt**:
```
/spec-kitty.specify feature=B26-project-access-control

[feature summary]
Implement direct project membership and access control, allowing users to be added to specific projects without organization-wide access.

[goals]
- ProjectMembership model with roles
- Updated permission classes for project-level access
- Invite flow for external project members
- UI for managing project members
- API endpoints for project membership

[demo requirements]
Demo page: /demo/project-access
- Project member management UI
- Invite flow simulation
- Access verification tests
```

---

**Fase 9 Compleet**: 5 modules (B22, B23, B24, B25, B26)
**Volgende**: Fase 10 - Frontend & Visual Development
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Project-Level Access Control
*Path: kitty-specs/038-project-access-control/spec.md*

**Feature ID**: B26
**Module**: #038
**Phase**: Fase 9 - Backend Infrastructure
**Feature Branch**: `038-project-access-control`
**Created**: 2026-01-04
**Status**: Draft
**Input**: User description: "Implement direct project membership and access control, allowing users to be added to specific projects without organization-wide access"

## Clarifications

### Session 2026-01-04

- Q: When a user accepts an invite to become a project admin (requiring explicit acceptance per FR-017), what happens if they decline instead of accepting? → A: Promotion is cancelled, user remains at previous role (viewer/editor)
- Q: The spec mentions "suspicious promotion" alerts when a user is promoted to admin within 24 hours of accepting an invite. What action should the system take when this suspicious activity is detected? → A: Allow promotion but send alert to org admins (guardrails not walls, extensible via B10 feature flags)
- Q: When external users (not in organization) are invited to a project, should they have any visibility of the parent organization? → A: Read-only org info (name, logo) for context - provides professional branding without member enumeration, extensible via B10 feature flag for high-security use cases
- Q: When viewing the permission matrix (User Story 9), what should happen when an org admin clicks to change a role directly from the matrix? → A: Open modal with full member details and actions - balances speed (1 click) with context (full info, audit trail, confirmation), mobile-friendly, extensible via B10 for inline edit option
- Q: When a project admin tries to remove the last admin (including themselves), should there be an escape hatch for legitimate scenarios? → A: Allow with confirmation but auto-assign org admin - provides "guardrails not walls" approach with self-healing fallback, respects organizational hierarchy authority, extensible via B10 for strict mode
- Q: When a project admin tries to remove the last admin (including themselves), should there be an escape hatch for legitimate scenarios? → A: Allow with confirmation but auto-assign org admin - provides "guardrails not walls" approach with self-healing fallback, respects organizational hierarchy authority, extensible via B10 for strict mode

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Internal Team Member Management (Priority: P1)

**As a** project admin
**I want to** add existing organization members to my project with specific roles
**So that** I can quickly assemble internal teams without email friction

**Why this priority**: Core functionality - 80% of project access management is internal teams. This must work first.

**Independent Test**: Create project → search for org member by name → assign role (viewer/editor/admin) → verify instant access. Delivers immediate value for internal collaboration.

**Acceptance Scenarios**:

1. **Given** I am a project admin on "Olympique Lyon" project
   **When** I click "Add Member" and search for "Pierre" (org member)
   **Then** I see Pierre Sage in search results with his email and current org role
   **And** I can select him and assign role (viewer/editor/admin)
   **And** He gets instant access without email confirmation

2. **Given** I search for "Marie" (org member in different project)
   **When** I select her from search results
   **Then** She appears in member list with assigned role
   **And** She receives notification "You've been added to Olympique Lyon"

3. **Given** I am a project viewer (not admin)
   **When** I try to access "Add Member" button
   **Then** Button is disabled or shows "Admin access required" tooltip

4. **Given** I search for a user
   **When** That user is already a project member
   **Then** Search results show "(Already member)" badge next to their name

---

### User Story 2 - External Collaborator Invites (Priority: P1)

**As a** project admin
**I want to** invite external users (not in my organization) via email
**So that** freelancers, clients, or contractors can access specific projects without seeing my entire organization

**Why this priority**: Core B26 requirement - enables external collaboration without org-wide access. Critical differentiator from B06/B08.

**Independent Test**: Enter external email → send invite → external user receives email → accepts invite → gets project-only access. Validates core B26 goal.

**Acceptance Scenarios**:

1. **Given** I am project admin on "Olympique Lyon"
   **When** I click "Add Member" → switch to "Invite by Email" tab
   **And** I enter "carlos@scoutingfirm.com" (not in organization)
   **And** I select role "editor" and click "Send Invite"
   **Then** ProjectInvite record is created with status "pending"
   **And** Carlos receives email with accept link (token-based)
   **And** Invite appears in "Pending Invites" tab with "Resend" / "Cancel" buttons

2. **Given** Carlos clicks invite link in email
   **When** He visits `/invites/accept/{token}`
   **Then** He sees invite details (project name, inviter, role)
   **And** If not logged in: prompted to create account with that email
   **And** If logged in with different email: warning "Invited email doesn't match"
   **And** After accept: ProjectMembership created, invite status → "accepted"

3. **Given** Carlos has accepted invite to "Olympique Lyon" project
   **When** He logs in and views project list
   **Then** He sees ONLY "Olympique Lyon" (not other Ligue 1 projects)
   **And** He sees organization name "Ligue 1" and logo for context
   **And** He has NO access to organization settings, member lists, or other projects

4. **Given** I have sent 10 invites today
   **When** I try to send 11th invite
   **Then** Error message "Daily invite limit reached (10/day). Try again tomorrow."

---

### User Story 3 - Hybrid Permission Model (Priority: P1)

**As an** organization admin or member
**I want to** automatically have access to public projects in my organization
**So that** I don't need explicit invites for internal projects
**But** I understand private projects require explicit membership

**Why this priority**: Defines permission resolution logic - foundation for all other features. Must be correct from the start.

**Independent Test**: Create public project → verify org members auto-access. Create private project → verify org admin has NO auto-access. Tests Option C hybrid model.

**Acceptance Scenarios**:

1. **Given** "Olympique Lyon" is a public project in Ligue 1 organization
   **And** Jean Dupont is an org admin
   **When** Jean visits project list
   **Then** He sees "Olympique Lyon" with role badge "Admin (via org)"
   **And** He can access project without explicit ProjectMembership record

2. **Given** Marie Laurent is an org member (not admin)
   **When** She visits "Olympique Lyon" (public project)
   **Then** She has "viewer" role automatically
   **And** No ProjectMembership record exists (permission via org membership)

3. **Given** "Secret Transfer Scouting" is a private project
   **And** Jean Dupont is an org admin
   **When** He visits project list
   **Then** "Secret Transfer Scouting" does NOT appear (no auto-access)
   **And** He must be explicitly invited to gain access

4. **Given** Marie has explicit ProjectMembership as "editor" on "Olympique Lyon"
   **And** She is org member (auto-viewer on public projects)
   **When** System checks her permissions
   **Then** Explicit "editor" role takes precedence over org-based "viewer"

---

### User Story 4 - Role Promotion & Demotion (Priority: P2)

**As a** project admin
**I want to** change member roles (viewer → editor → admin)
**So that** I can adjust permissions as responsibilities change
**With** appropriate safeguards for critical promotions

**Why this priority**: Essential for role lifecycle management. P2 because basic add/remove (P1) must work first.

**Independent Test**: Add member as viewer → promote to editor (instant) → promote to admin (requires acceptance). Tests conditional promotion logic.

**Acceptance Scenarios**:

1. **Given** Pierre is a "viewer" on "Olympique Lyon"
   **When** Project admin changes his role to "editor" in member list dropdown
   **Then** Role updates instantly
   **And** Pierre receives notification "Your role changed to Editor on Olympique Lyon"
   **And** B09 audit log records: "Pierre promoted to editor by [admin_name]"

2. **Given** Pierre is an "editor"
   **When** Project admin promotes him to "admin"
   **Then** ProjectMembershipPromotion record created with status "pending"
   **And** Pierre receives email: "You've been nominated as admin - accept to gain admin privileges"
   **And** Pierre sees banner in project UI: "Admin role pending - click to accept"

3. **Given** Pierre accepts admin promotion
   **When** He clicks "Accept Admin Role"
   **Then** ProjectMembership.role updated to "admin"
   **And** Promotion status → "accepted"
   **And** B09 audit log: "Pierre accepted admin role"

4. **Given** Pierre declines admin promotion
   **When** He clicks "Decline Admin Role"
   **Then** Promotion is cancelled immediately
   **And** Pierre remains at previous role (editor)
   **And** B09 audit log: "Pierre declined admin role"
   **And** Notification sent to project admin who initiated promotion

5. **Given** Project has 2 admins (Pierre, Marie)
   **When** Pierre tries to demote Marie to viewer
   **And** Marie is the last admin
   **Then** Error: "Cannot remove last admin. Promote another member first."
   **And** No changes applied

6. **Given** Pierre is project admin
   **When** He tries to demote himself
   **Then** Warning modal: "You will lose admin privileges. Confirm?"
   **And** After confirmation: role changed, audit logged

---

### User Story 5 - Private Project Override (Priority: P2)

**As a** project creator
**I want to** mark my project as "private"
**So that** even organization admins need explicit invitation
**For** sensitive projects (stealth launches, acquisitions, confidential R&D)

**Why this priority**: Enables true project autonomy. P2 because public projects (P1) cover 80% of use cases.

**Independent Test**: Create private project → verify org admin has NO access → invite org admin explicitly → verify access granted. Tests private flag override logic.

**Acceptance Scenarios**:

1. **Given** I am creating a new project "Secret Transfer Scouting"
   **When** I toggle "Private Project" switch in creation form
   **And** I submit the form
   **Then** Project.is_private = True
   **And** Warning displayed: "Org admins will NOT have automatic access to this project"

2. **Given** "Secret Transfer Scouting" is private
   **And** Jean Dupont is org admin
   **When** Jean visits project list
   **Then** "Secret Transfer Scouting" does NOT appear
   **And** Jean receives 403 if he tries to access /projects/{id} directly

3. **Given** "Secret Transfer Scouting" is private
   **When** Project admin invites Jean (org admin) explicitly as "viewer"
   **And** Jean accepts invite
   **Then** Jean has "viewer" access ONLY (not auto-admin)
   **And** Explicit ProjectMembership overrides org admin status

4. **Given** "Olympique Lyon" is currently public with 10 org members accessing it
   **When** Project admin toggles "Private Project" switch
   **Then** Warning modal: "5 org members will lose access. Only explicit members will remain. Continue?"
   **And** After confirmation: org-based access removed, only explicit ProjectMemberships remain

---

### User Story 6 - Member Removal & Audit Trail (Priority: P2)

**As a** project admin
**I want to** remove members from the project
**So that** I can revoke access when people leave the team
**While** preserving audit history of their contributions

**Why this priority**: Essential for access lifecycle. P2 because addition flows (P1) must work first before removal is needed.

**Independent Test**: Add member → create some project activity (simulated) → remove member → verify no access but history preserved. Tests audit trail requirement.

**Acceptance Scenarios**:

1. **Given** Carlos is a project member who created 3 issues
   **When** Project admin clicks "Remove" button next to Carlos in member list
   **Then** Confirmation modal: "Carlos will lose access. His past contributions will remain. Continue?"
   **And** After confirmation: ProjectMembership deleted
   **And** B09 audit log: "Carlos removed from project by [admin_name]"

2. **Given** Carlos has been removed
   **When** Viewing issue history
   **Then** Issues show "Created by Carlos (no longer member)"
   **And** Carlos name is greyed out, no profile link
   **And** Tooltip: "This user is no longer a project member"

3. **Given** Carlos tries to access project after removal
   **When** He visits /projects/{olympique-lyon}
   **Then** 403 Forbidden page
   **And** Message: "You no longer have access to this project"

4. **Given** Project has 1 admin (Marie)
   **When** Marie tries to remove herself
   **Then** Confirmation modal shows:
   - Warning: "You are the last admin. An organization admin will be automatically assigned to maintain project governance."
   - Dropdown: "Select org admin to take over: [list of org admins]"
   - Actions: "Cancel" / "Confirm & Remove"
   **And** After confirmation:
   - Selected org admin is assigned as project admin (explicit ProjectMembership created)
   - Marie is removed
   - Both users receive notifications
   - Audit log records: "Last admin removed, [org_admin] auto-assigned as fallback"

---

### User Story 7 - Pending Invites Management (Priority: P3)

**As a** project admin
**I want to** see and manage all pending invites
**So that** I can resend expired invites or cancel mistakes

**Why this priority**: Quality-of-life feature. P3 because basic invite flow (P2) must work first.

**Independent Test**: Send 3 invites → view pending tab → resend one → cancel one → verify actions logged. Tests enhanced invite management.

**Acceptance Scenarios**:

1. **Given** I have sent 3 email invites (2 pending, 1 accepted)
   **When** I navigate to "Members" → "Pending Invites" tab
   **Then** I see table with columns: Email, Role, Invited By, Sent Date, Expires, Actions
   **And** Accepted invite shows status "Accepted" with greyed out actions

2. **Given** Invite to carlos@scoutingfirm.com sent 5 days ago
   **When** I click "Resend" button
   **Then** New email sent with fresh token
   **And** "Last Sent" timestamp updates
   **And** Toast notification: "Invite resent to carlos@scoutingfirm.com"

3. **Given** Invite to wrong.email@example.com sent by mistake
   **When** I click "Cancel" button
   **Then** Confirmation modal: "Cancel invite to wrong.email@example.com?"
   **And** After confirmation: invite status → "cancelled"
   **And** Token invalidated (acceptance link no longer works)

4. **Given** Invite expires after 7 days
   **When** 7 days pass since invite sent
   **Then** Invite status auto-changes to "expired"
   **And** Acceptance link shows "This invite has expired. Contact project admin."

---

### User Story 8 - Activity Feed & Audit Visibility (Priority: P3)

**As a** project admin or member
**I want to** see recent membership changes in an activity feed
**So that** I can track who joined, who was promoted, who left

**Why this priority**: Transparency and security monitoring. P3 because functional access control (P1-P2) takes precedence.

**Independent Test**: Perform 5 membership actions (add, promote, remove, invite, accept) → view activity feed → verify all actions visible with timestamps. Tests B09 audit log integration.

**Acceptance Scenarios**:

1. **Given** I am on project "Olympique Lyon" page
   **When** I click "Activity" tab (or sidebar section)
   **Then** I see chronological feed of membership events:
   - "Pierre Sage added Marie Laurent as Editor" (2 hours ago)
   - "Carlos Silva accepted invite as Viewer" (1 day ago)
   - "Pierre Sage promoted Jean to Admin (pending acceptance)" (2 days ago)

2. **Given** I am a viewer (not admin)
   **When** I view activity feed
   **Then** I see membership changes but NOT sensitive details (e.g., removed user's reason)

3. **Given** Suspicious activity: user promoted to admin 30 minutes after invite
   **When** Org admin views activity feed
   **Then** Event is highlighted with ⚠️ warning badge
   **And** Tooltip: "Quick promotion detected - review for security"

---

### User Story 9 - Permission Matrix View (Priority: P3)

**As an** organization admin
**I want to** see a matrix of all users × all projects with their roles
**So that** I can audit access patterns across the organization

**Why this priority**: Advanced admin tooling. P3 because per-project management (P1-P2) is primary workflow.

**Independent Test**: Create 3 projects, add 4 users with mixed roles → view permission matrix → verify accurate role display including "(via org)" badges. Tests cross-project visibility.

**Acceptance Scenarios**:

1. **Given** I am org admin for Ligue 1
   **When** I navigate to Organization Settings → "Access Matrix"
   **Then** I see table with:
   - Rows: All users (org members + external collaborators)
   - Columns: All projects
   - Cells: Role badges (Admin, Editor, Viewer, or "—" for no access)

2. **Given** Marie has explicit "Editor" role on Lyon, auto "Viewer" on PSG (org member)
   **When** Viewing permission matrix
   **Then** Lyon cell shows "Editor" badge
   **And** PSG cell shows "Viewer (via org)" badge in lighter color

3. **Given** Carlos is external collaborator (only Lyon access)
   **When** Viewing matrix
   **Then** Carlos row shows "Editor" for Lyon, "—" for all other projects
   **And** Row is marked with "External" tag

4. **Given** I click on a cell (e.g., Marie × Lyon = Editor)
   **When** Cell is clicked
   **Then** Modal opens with:
   - Header: "Manage Marie Laurent on Olympique Lyon"
   - Current role: "Editor (explicit)" with assignment date and assignor
   - Role dropdown: Viewer / Editor / Admin
   - Recent activity: Last 3 membership events for this user on this project
   - Actions: "Change Role" button, "Remove Access" link
   - Keyboard shortcuts: Cmd+S to save, Cmd+→ for next user (bulk operation support)
   **And** After save: modal closes, matrix cell updates, toast confirmation shown

---

### Edge Cases

**Invite Edge Cases:**
- What happens when user is invited to project while already having org-level access? → Explicit invite creates ProjectMembership, explicit role takes precedence
- What happens when invite email matches existing org member? → System detects and suggests "Add directly" instead of email invite
- What happens when external user creates account with different email than invited? → Accept page shows warning "Email mismatch", requires support intervention or re-invite
- What happens when invite token is reused after acceptance? → 400 error "This invite has already been accepted"
- What happens when external user views project details? → Sees project + read-only org info (name, logo) but NO member list, NO settings, NO other projects

**Permission Edge Cases:**
- What happens when org admin is explicitly demoted on private project, then project becomes public? → Org admin regains admin access automatically
- What happens when last admin tries to leave project? → Confirmation modal shown, org admin auto-assigned as fallback after confirmation
- What happens when last admin is removed and multiple org admins exist? → Confirmation modal shows dropdown to select which org admin takes over (defaults to primary org admin)
- What happens when last admin is removed from private project? → Org admin receives explicit ProjectMembership (respects organizational hierarchy authority even for private projects)
- What happens when user declines admin promotion? → Promotion cancelled immediately, user remains at previous role, audit logged, initiating admin notified
- What happens when user accepts admin promotion after being removed from project? → Promotion is invalidated, shows "This promotion is no longer valid"
- What happens when project is transferred to different organization? → All external ProjectMemberships remain, org-based access re-evaluated for new org

**Rate Limiting Edge Cases:**
- What happens when admin hits daily invite limit? → Error message with "Limit resets at midnight UTC" timestamp
- What happens when pending invite count exceeds project limit (50)? → Must cancel/accept old invites before sending new ones
- What happens when org has custom feature flag override for unlimited invites? → Rate limit bypassed, B09 audit log notes "unlimited via feature flag"

**Audit Trail Edge Cases:**
- What happens when removed user's account is fully deleted (GDPR)? → History shows "[Deleted User]" placeholder, audit logs retained
- What happens when member role changes multiple times in quick succession? → Each change logged separately with sub-second timestamps
- What happens when private project becomes public with 100 org members gaining auto-access? → Single audit event "Project visibility changed to public (100 members gained access)"

## Requirements *(mandatory)*

### Functional Requirements

**Core Access Control:**

- **FR-001**: System MUST support three project roles: "viewer" (read-only), "editor" (read-write), and "admin" (full management including member access)
- **FR-002**: System MUST implement hybrid permission model where:
  - Organization admins automatically have "admin" role on all public projects
  - Organization members automatically have "viewer" role on all public projects
  - Explicit ProjectMembership records override organization-based defaults
  - Private projects (`is_private=True`) require explicit membership (no org-based auto-access)
- **FR-003**: System MUST allow project admins to add existing organization members via user search (instant access, no email required)
- **FR-004**: System MUST allow project admins to invite external users (not in organization) via email with token-based acceptance flow
- **FR-005**: System MUST filter user search results to prevent user enumeration: only show organization members OR users with shared project history
- **FR-006**: System MUST support private projects where organization admins do NOT have automatic access
- **FR-007**: System MUST display clear role indicators showing access source: explicit membership vs org-based auto-access (e.g., "Admin (via org)")

**Invitation System:**

- **FR-008**: System MUST generate secure invite tokens (UUID4 or similar) with 7-day expiration
- **FR-009**: System MUST send invitation emails containing: project name, inviter name, role, acceptance link, expiration date
- **FR-010**: System MUST create user accounts for external invitees if they don't exist, using invited email address
- **FR-011**: System MUST validate that accepting user's email matches invited email (warn if mismatch)
- **FR-012**: System MUST track invite status: pending, accepted, cancelled, expired
- **FR-013**: System MUST allow project admins to view pending invites, resend invites, and cancel invites
- **FR-014**: System MUST invalidate invite tokens after acceptance or cancellation
- **FR-015**: System MUST auto-expire invites after 7 days and prevent acceptance of expired tokens
- **FR-016**: System MUST provide external collaborators (non-org members) with read-only organization context: name and logo only
- **FR-017**: System MUST prevent external collaborators from accessing: organization member lists, organization settings, projects they are not explicitly invited to
- **FR-018**: System MUST support feature flag `hide_org_branding_external` (default: OFF) to disable org visibility for external users in high-security scenarios

**Role Management:**

- **FR-019**: System MUST allow project admins to promote members between viewer, editor, and admin roles
- **FR-020**: System MUST enforce conditional promotion logic:
  - Viewer ↔ Editor transitions are instant with notification
  - Editor → Admin transitions require explicit acceptance from the promoted user
  - Admin promotion can be declined, resulting in immediate cancellation and return to previous role
- **FR-021**: System MUST send promotion notification emails and in-app notifications (via B16 Notifications)
- **FR-022**: System MUST display pending admin promotions in UI with "Accept" / "Decline" actions
- **FR-023**: System MUST allow project admins to demote members, with validation rules:
  - Cannot remove the last admin from a project
  - Require confirmation modal for admin self-demotion
- **FR-024**: System MUST allow project admins to remove members from projects
- **FR-025**: System MUST preserve removed members in audit history as "[Name] (no longer member)"
- **FR-026**: System MUST revoke all project access immediately upon member removal (session invalidation if active)
- **FR-027**: System MUST notify initiating admin when promoted user declines admin role

**Security & Rate Limiting:**

- **FR-028**: System MUST enforce rate limits on invitations:
  - Default: 10 invites per user per day
  - Admin multiplier: 50 invites per admin per day (via feature flag)
  - Project limit: Max 50 pending invites per project
- **FR-029**: System MUST enforce last admin protection with organizational fallback:
  - When last admin attempts removal/demotion: show confirmation modal with warning
  - Allow removal after confirmation with automatic assignment of organization admin as fallback
  - If multiple org admins exist: present dropdown to select which org admin takes over (default: primary org admin)
  - Create explicit ProjectMembership for assigned org admin (even on private projects - respects organizational hierarchy authority)
  - Send notifications to removed admin and newly assigned org admin
  - Audit log event: `project.last_admin_removed_with_fallback`
- **FR-030**: System MUST support strict mode for last admin protection via B10 feature flag `strict_last_admin_protection` (default: OFF) - when enabled, blocks removal without fallback assignment
- **FR-031**: System MUST log suspicious activity (B09 Audit Logging):
  - User promoted to admin within 24 hours of invite acceptance
  - Multiple quick role changes on same user
  - Mass member removals (>10 in 1 hour)
- **FR-032**: System MUST send real-time alert notifications to org admins when suspicious activity is detected (B16 Notifications integration)
- **FR-033**: System MUST allow suspicious promotions to proceed (non-blocking) but log and alert for admin review ("guardrails not walls" approach)
- **FR-034**: System MUST support optional blocking mode for suspicious promotions via B10 feature flag `require_approval_suspicious_promotions` (default: OFF, downstream products can opt-in)
- **FR-035**: System MUST support opt-in org admin notifications for external invites via feature flag (`notify_external_invites`, default: OFF)
- **FR-036**: System MUST audit log ALL membership changes (add, remove, promote, demote, invite sent, invite accepted, invite declined, promotion declined, suspicious activity detected, last admin removed with fallback) via B09

**Permission Resolution Logic:**

- **FR-037**: System MUST implement permission resolution order:
  1. Check explicit ProjectMembership (highest priority)
  2. If private project AND no explicit membership: deny access
  3. If public project AND user is org admin: grant admin role
  4. If public project AND user is org member: grant viewer role
  5. Else: deny access
- **FR-038**: System MUST re-evaluate org-based permissions when project visibility changes (public ↔ private)
- **FR-039**: System MUST display warning when making project private: "X org members will lose auto-access. Only explicit members will remain."
- **FR-040**: System MUST allow explicit ProjectMembership roles to override org admin status on private projects
- **FR-041**: System MUST respect organizational hierarchy authority: org admins can be assigned as fallback admins even on private projects (creates explicit ProjectMembership)

**Audit & Transparency:**

- **FR-042**: System MUST integrate with B09 Audit Logging for ALL security-relevant events:
  - `project.member.added`, `project.member.removed`, `project.member.role_changed`
  - `project.invite.sent`, `project.invite.accepted`, `project.invite.cancelled`, `project.invite.declined`
  - `project.promotion.accepted`, `project.promotion.declined`
  - `project.visibility_changed` (public ↔ private)
  - `security.suspicious_promotion`, `security.last_admin_protection_triggered`
  - `project.last_admin_removed_with_fallback` (includes removed admin and assigned org admin)
- **FR-043**: System MUST display activity feed showing recent membership changes with timestamps, actors, and actions
- **FR-044**: System MUST highlight suspicious events in activity feed with warning badges (⚠️) and "Review" action links
- **FR-045**: System MUST provide permission matrix view for organization admins showing all users × projects with role indicators
- **FR-046**: System MUST open modal when matrix cell is clicked, containing: current role details, role change dropdown, recent activity (last 3 events), change/remove actions, keyboard shortcuts for bulk operations
- **FR-047**: System MUST support optional inline edit mode for permission matrix via B10 feature flag `matrix_inline_edit` (default: OFF, modal is default)

**Integration Requirements:**

- **FR-048**: System MUST integrate with B08 Hierarchical Access Control for permission class composition
- **FR-049**: System MUST integrate with B16 Notifications for role change notifications, invite emails, suspicious activity alerts, and last admin fallback assignments
- **FR-050**: System MUST integrate with B10 Feature Flags for rate limit overrides, org notification preferences, optional suspicious promotion blocking, external user org visibility control, matrix inline edit mode, and strict last admin protection
- **FR-051**: System MUST integrate with B03 Security Baseline for rate limiting decorators and CSRF protection
- **FR-052**: System MUST use F01 Design System components for all UI elements (modals, tables, badges, dropdowns, keyboard shortcut handlers)

### Key Entities *(include if feature involves data)*

**ProjectMembership**:
- Represents explicit project access (overrides org-based access)
- Attributes: user (FK), project (FK), role (viewer/editor/admin), created_at, created_by (FK)
- Unique constraint: (user, project)
- Cascades: Delete on project deletion, nullify on user deletion (preserve audit trail with "[Deleted User]")

**ProjectInvite**:
- Represents pending email invitation to external users
- Attributes: email, project (FK), role, invited_by (FK), token (UUID), status (pending/accepted/cancelled/expired), created_at, expires_at, accepted_at
- Token: Secure UUID4, indexed for fast lookup
- Expiration: Auto-expires 7 days after creation (background task or lazy check)

**Project** (existing entity extension):
- New attribute: `is_private` (Boolean, default=False)
- Private flag determines permission resolution logic (org auto-access disabled)

**AuditLog** (B09 integration):
- Event types: `project.member.*`, `project.invite.*`, `project.visibility_changed`, `security.suspicious_*`
- Metadata: actor, target_user, project, role, reason (for removals), timestamp

**User Search Privacy Filter**:
- Virtual entity (query logic, not model)
- Returns users matching: `organisations=project.organisation` OR `shared_project_history_with=requesting_user`
- Prevents enumeration of entire user database

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
  - Football leagues, CRM systems, project management tools all need project-level access
  - External collaborator pattern applies to freelancers, clients, contractors, scouts, etc.
- [x] Extension points are clearly documented if product-specific behavior is needed
  - Feature flags (B10) allow product-specific rate limits and notification preferences
  - Role names (viewer/editor/admin) are generic and mappable to domain terms

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
  - ProjectMembership model extends `projects` app (B07)
  - Permission resolution integrates with `access_control` app (B08)
  - Audit logging delegates to `audit` app (B09)
  - Notifications delegate to `notifications` app (B16)
- [x] No circular dependencies introduced
  - `projects` depends on `users`, `organisations`, `access_control` (existing dependencies)
  - No new circular imports created
- [x] Extension points are stable and documented
  - `IsProjectMemberOrOrgAdmin` permission class is composable
  - User search filter function is overridable via settings
  - Invite email template is customizable

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
  - Type hints on all new models, views, serializers
  - `from __future__ import annotations` for forward references
- [x] Type hints will be used in core modules
  - Example: `def get_project_role(user: User, project: Project) -> str | None`
- [x] Code will be formatted with Black and linted with Ruff
  - CI will enforce formatting before merge

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
  - Unit tests: Permission resolution logic (15 test cases)
  - Integration tests: Invite flow end-to-end (8 test cases)
  - API tests: All endpoints with role-based access (20 test cases)
  - Edge case tests: Rate limiting, last admin protection, private project logic (12 test cases)
- [x] Coverage targets defined
  - Target: ≥90% for backend (models, views, serializers, permission classes)
  - Target: ≥85% for frontend (React components, invite acceptance page)
- [x] Integration tests planned for key flows
  - Full invite flow: send → email → accept → access verification
  - Permission resolution: org admin + private project scenarios
  - Role promotion: instant vs acceptance required

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
  - Invite acceptance page has CSRF protection
  - Token-based invite links use secure UUID4
- [x] No secrets in code; env vars/secret managers documented
  - Email SMTP settings via environment variables (existing B16 integration)
- [x] Authentication/authorization handled through centralized mechanisms
  - All API endpoints use DRF permission classes
  - Permission resolution centralizes in `access_control.permissions` module
- [x] No sensitive data will be logged
  - Audit logs record user IDs and emails (not passwords, tokens)
  - Invite tokens are hashed in audit logs (only last 6 chars visible)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
  - Member list view uses `select_related('user', 'project', 'created_by')`
  - User search uses indexed fields (email, name) with LIMIT 10
  - Permission resolution caches org membership checks per request
- [x] Pagination implemented for unbounded responses
  - Member list paginated (50 per page)
  - Activity feed paginated (20 per page)
  - Permission matrix uses virtual scrolling for large organizations
- [x] Structured logging and metrics hooks included
  - Log invite send success/failure rates
  - Metrics: `project_invites_sent_total`, `project_members_added_total`, `suspicious_promotions_total`
- [x] Graceful degradation strategy defined for failure scenarios
  - Email service down: Queue invites for retry (B15 Celery integration)
  - Rate limit service down: Fallback to in-memory counter (per-process)
  - Audit log service down: Log to stderr, continue operation

### API Design (Principle VII)
- [x] DRF standards followed
  - Endpoints: `GET /api/v1/projects/{id}/members`, `POST /api/v1/projects/{id}/invite`, `DELETE /api/v1/projects/{id}/members/{user_id}`
  - Nested routes under `/projects` resource
- [x] API responses are consistent and documented
  - Standard format: `{"data": [...], "meta": {"count": 10, "page": 1}}`
  - Error format: `{"error": "message", "code": "RATE_LIMIT_EXCEEDED"}`
- [x] Breaking changes use versioning or deprecation paths
  - Future role expansion (e.g., "guest" role) will be backward-compatible
  - Deprecated fields will have 3-month sunset period
- [x] Validation occurs at boundary (serializers/forms)
  - ProjectInviteSerializer validates email format, role choices, rate limits
  - ProjectMembershipSerializer validates role transitions, last admin protection

### Documentation (Principle XI)
- [x] Feature documentation plan included
  - User guide: "Managing Project Members" (screenshots, invite flow walkthrough)
  - Admin guide: "Understanding Permission Resolution" (decision tree diagram)
  - API reference: OpenAPI spec for new endpoints
- [x] Extension guide updates identified if applicable
  - Extension guide section: "Customizing Project Roles" (how to add custom roles)
  - Extension guide section: "Custom Invite Email Templates" (override default template)
- [x] ADR planned if major architectural decision involved
  - ADR-026: "Hybrid Permission Model for Project Access" (rationale for Option C)
  - ADR-027: "Conditional Admin Promotion with Acceptance Flow" (security vs friction trade-off)

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Project admins can add internal team members (org members) via search in under 10 seconds (search → select → assign role → instant access)
- **SC-002**: External collaborators can accept invite and gain project access in under 2 minutes (email → click link → accept → access granted)
- **SC-003**: System handles 1000 concurrent projects with mixed public/private settings without performance degradation (permission resolution < 50ms per request)
- **SC-004**: 95% of role promotions (viewer/editor) complete instantly with notification, 100% of admin promotions require explicit acceptance
- **SC-005**: Zero unauthorized access incidents: external collaborators cannot access organization-wide resources, only invited projects
- **SC-006**: Private project confidentiality maintained: 100% of tests confirm org admins have NO auto-access to private projects
- **SC-007**: Audit trail completeness: 100% of membership changes logged in B09 with actor, timestamp, and action details
- **SC-008**: Rate limiting effectiveness: Zero spam incidents with >50 invites from single user (10/day limit enforced)
- **SC-009**: Last admin protection: Zero projects left without admins (validation blocks removal of sole admin)
- **SC-010**: User search privacy: Zero full user database enumerations (search results limited to org members + shared history)
- **SC-011**: Invite acceptance rate: ≥80% of invites accepted within 7 days (tracked via ProjectInvite.status)
- **SC-012**: Activity feed visibility: 100% of membership changes visible in activity feed within 5 seconds of action
- **SC-013**: Permission matrix accuracy: 100% alignment between matrix display and actual runtime permissions (automated test)
- **SC-014**: Demo page completeness: All 9 user stories demonstrable in `/demo/project-access` with realistic Football League scenario
- **SC-015**: Integration stability: Zero breaking changes to existing B08 permission classes (backward compatibility maintained)

### Demo Validation Checklist

**Scenario 1: Internal Team Assembly (Football League)**
- [ ] Pierre Sage (project admin) searches for "Marie" → sees org member result
- [ ] Pierre assigns Marie as "editor" on Olympique Lyon → instant access
- [ ] Marie logs in → sees Olympique Lyon in project list → can edit resources

**Scenario 2: External Scout Invitation**
- [ ] Pierre invites "carlos@scoutingfirm.com" as "viewer" → invite sent
- [ ] Carlos receives email → clicks link → accepts invite → account created
- [ ] Carlos logs in → sees ONLY Olympique Lyon (not other Ligue 1 projects)
- [ ] Carlos cannot access organization settings

**Scenario 3: Private Project Confidentiality**
- [ ] Pierre creates "Secret Transfer Scouting" project with `is_private=True`
- [ ] Jean Dupont (org admin) views project list → does NOT see private project
- [ ] Pierre explicitly invites Jean as "viewer" → Jean accepts
- [ ] Jean has viewer access only (not auto-admin) → verified in permission checks

**Scenario 4: Conditional Admin Promotion**
- [ ] Pierre promotes Marie from "editor" to "admin" → promotion pending
- [ ] Marie receives email notification → sees "Accept Admin Role" banner in UI
- [ ] Marie accepts → role updated to admin → can now manage members

**Scenario 5: Last Admin Protection**
- [ ] Pierre (sole admin) tries to remove himself → error "Cannot remove last admin"
- [ ] Pierre promotes Marie to admin → Marie accepts
- [ ] Now Pierre can remove himself (2 admins exist)

**Scenario 6: Activity Feed & Audit**
- [ ] View activity feed → shows all actions from scenarios 1-5
- [ ] Suspicious promotion (Carlos promoted to admin <24h after invite) → warning badge
- [ ] All events have timestamps, actors, and action descriptions

**Scenario 7: Pending Invites Management**
- [ ] Pierre views "Pending Invites" tab → sees carlos@scoutingfirm.com (accepted)
- [ ] Pierre resends expired invite → new email sent
- [ ] Pierre cancels wrong invite → token invalidated

**Scenario 8: Permission Matrix**
- [ ] Org admin views Access Matrix → sees grid of users × projects
- [ ] Marie row shows: Lyon="Editor", PSG="Viewer (via org)"
- [ ] Carlos row shows: Lyon="Viewer", all others="—" (no access)

**Scenario 9: Rate Limiting**
- [ ] Pierre sends 10 invites → successful
- [ ] Pierre tries 11th invite → error "Daily limit reached (10/day)"
- [ ] Next day (UTC midnight) → limit reset, can send more invites
