# B06: Organizations

**Phase:** 2
**Status:** ✅ Done
**Module ID:** 006
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 6. B06 – Organization Management (Multi-Tenant)

**Doel**: Domain-neutral organisation model met user memberships en tenant isolation.

**Status**: ✅ Complete

**Key Features**:
- Organization model with unique slugs
- User memberships (many-to-many)
- Organization-level settings
- Tenant isolation patterns
- Organization switching UI foundation

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Organisation Management & Multi-Tenancy
*Path: kitty-specs/006-organisation-management-multi/spec.md*

**Feature Branch**: `006-organisation-management-multi`
**Created**: 2025-11-24
**Status**: Draft
**Input**: User description: "Define a generic organisation module with membership relations and basic management flows"

## Clarifications

### Session 2025-11-24

- Q: How should the system handle soft-deleted organisations and their memberships? → A: Soft-delete hides org from all APIs immediately; superadmins can restore within 30 days, then hard-delete
- Q: Should the system enforce rate limits on creation and invitation operations? → A: Limit users to 5 org creations per day, 20 invitations per hour per org
- Q: What key metrics should the system expose for operational monitoring? → A: Comprehensive: org/membership counts, creation/invitation/role change rates, per-user distribution, permission latency, rate limit hits

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organisation Creation & Initial Setup (Priority: P1)

Any authenticated user creates a new organisation and automatically becomes its first admin, establishing the foundation for multi-tenant operations.

**Why this priority**: Core capability - without the ability to create organisations, no other functionality is possible. This is the entry point for the entire feature.

**Independent Test**: Can be fully tested by authenticating a user, creating an organisation with a name, and verifying the creator has admin membership. Delivers immediate value by establishing an organisation context.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** they provide an organisation name and create it, **Then** a new organisation is created with them as the first admin member
2. **Given** an authenticated user with no existing organisations, **When** they create their first organisation, **Then** they can immediately access and manage it
3. **Given** an authenticated user who is already admin of one organisation, **When** they create a second organisation, **Then** both organisations exist independently with separate memberships

---

### User Story 2 - Member Invitation & Role Assignment (Priority: P2)

Organisation admins invite users to join their organisation and assign them either admin or member roles, enabling team collaboration.

**Why this priority**: Enables collaboration but requires P1 to exist first. Teams need multiple people to be useful, making this the natural second priority.

**Independent Test**: Can be tested by having an admin invite a user (by email or user ID), verifying the invited user gains membership with the specified role, and confirming role-based permissions work correctly.

**Acceptance Scenarios**:

1. **Given** an admin of an organisation, **When** they invite a user as a member, **Then** the user gains member access to that organisation
2. **Given** an admin of an organisation, **When** they invite a user as an admin, **Then** the user gains admin access to that organisation
3. **Given** an admin inviting an already-existing member, **When** they attempt to re-invite, **Then** the system prevents duplicate memberships
4. **Given** a regular member of an organisation, **When** they attempt to invite another user, **Then** the system denies the action

---

### User Story 3 - Membership Management & Role Changes (Priority: P3)

Organisation admins modify member roles or remove members from the organisation, maintaining appropriate access control.

**Why this priority**: Essential for ongoing management but depends on P1 and P2. Organisations can function initially without role changes, but long-term governance requires this.

**Independent Test**: Can be tested by having an admin change a member's role (member ↔ admin) or remove a member entirely, then verifying the membership state and permissions reflect the change.

**Acceptance Scenarios**:

1. **Given** an admin and a member in an organisation, **When** the admin promotes the member to admin, **Then** the member gains admin capabilities
2. **Given** an admin and another admin in an organisation, **When** the admin demotes the other admin to member, **Then** the demoted user loses admin capabilities
3. **Given** an admin and a member in an organisation, **When** the admin removes the member, **Then** the member loses all access to the organisation
4. **Given** the last remaining admin of an organisation, **When** they attempt to remove themselves or downgrade to member, **Then** the system prevents the action (organisations must have at least one admin)

---

### User Story 4 - Organisation Viewing & Context Switching (Priority: P4)

Users view all organisations they belong to and switch between them to access different organisation contexts.

**Why this priority**: Improves user experience for multi-organisation users but isn't critical for core functionality. The system can work with users manually navigating to specific organisations.

**Independent Test**: Can be tested by authenticating a user who belongs to multiple organisations, listing all their organisations with roles, and selecting one to set as the active context.

**Acceptance Scenarios**:

1. **Given** a user who belongs to multiple organisations, **When** they request their organisation list, **Then** all organisations are returned with their role in each
2. **Given** a user viewing their organisations, **When** they select one as their active context, **Then** subsequent operations default to that organisation
3. **Given** a user who is not a member of any organisation, **When** they request their organisation list, **Then** an empty list is returned

---

### User Story 5 - Organisation Profile Management (Priority: P5)

Organisation admins update organisation details such as name, description, and other metadata to keep information current.

**Why this priority**: Nice-to-have for polish but not critical. Organisations can function with just a name initially; detailed profiles enhance professionalism but aren't blocking.

**Independent Test**: Can be tested by having an admin update organisation details, then verifying the changes persist and are visible to all members.

**Acceptance Scenarios**:

1. **Given** an admin of an organisation, **When** they update the organisation name, **Then** the new name is reflected for all members
2. **Given** an admin of an organisation, **When** they add or update a description, **Then** the description is stored and retrievable
3. **Given** a regular member of an organisation, **When** they attempt to update organisation details, **Then** the system denies the action

---

### Edge Cases

- What happens when the last admin tries to leave an organisation? (System prevents this; organisations must have at least one admin)
- How does the system handle inviting a user who doesn't exist yet? (Invitation is created but not delivered; when user eventually registers, they receive pending invitations)
- What happens when an admin transfers ownership but later the new owner becomes inactive? (Any remaining admin can manage; if no admins remain, system flags for superadmin intervention)
- How does system handle concurrent membership changes? (Database constraints and transactions prevent race conditions; last write wins for role changes)
- What happens when a user is removed from an organisation while actively using it? (Current session remains valid but next request requires re-authentication; user is redirected to organisation selection or home)
- How are organisation names validated? (Unique per instance, 3-100 characters, alphanumeric plus spaces/hyphens/underscores)
- What happens when a user hits rate limits for organisation creation or invitations? (System returns 429 Too Many Requests with retry-after timestamp; user must wait before attempting again)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow any authenticated user to create a new organisation by providing a unique name
- **FR-002**: System MUST automatically assign the creator as the first admin member of a newly created organisation
- **FR-003**: System MUST support flat (non-hierarchical) organisation structure where organisations are independent
- **FR-004**: System MUST allow users to be members of multiple organisations simultaneously
- **FR-005**: System MUST enforce two roles per organisation membership: "admin" and "member"
- **FR-006**: Admins MUST be able to invite users to their organisation and assign roles (admin or member)
- **FR-007**: Admins MUST be able to change member roles within their organisation (promote/demote between admin and member)
- **FR-008**: Admins MUST be able to remove members from their organisation
- **FR-009**: Members MUST NOT be able to invite users, change roles, or remove members
- **FR-010**: System MUST prevent removal of the last admin from an organisation (at least one admin required)
- **FR-011**: System MUST prevent admins from removing themselves if they are the sole admin
- **FR-012**: System MUST provide a list of all organisations a user belongs to, including their role in each
- **FR-013**: Admins MUST be able to update organisation details (name, description, metadata)
- **FR-014**: System MUST persist all organisation and membership data durably
- **FR-015**: System MUST integrate with B09-audit-logging to record critical actions (create, delete, role changes, membership changes)
- **FR-016**: System MUST provide REST API endpoints for all organisation and membership operations
- **FR-017**: System MUST provide Django Admin interface for superadmin management of organisations
- **FR-018**: System MUST validate organisation names for uniqueness, length (3-100 chars), and allowed characters
- **FR-019**: System MUST associate each organisation with a creation timestamp and creator reference
- **FR-020**: System MUST associate each membership with join timestamp and inviter reference (if applicable)
- **FR-021**: System MUST support soft-delete of organisations (marking as inactive) that immediately hides them from all user-facing APIs
- **FR-022**: Soft-deleted organisations MUST remain accessible to superadmins for restoration within 30 days
- **FR-023**: System MUST automatically hard-delete soft-deleted organisations after 30 days retention period
- **FR-024**: When an organisation is soft-deleted, all associated memberships MUST also be marked inactive but preserved for audit trail
- **FR-025**: System MUST enforce rate limit of 5 organisation creations per user per 24-hour period
- **FR-026**: System MUST enforce rate limit of 20 member invitations per organisation per hour
- **FR-027**: Rate limit violations MUST return appropriate error responses indicating when the user can retry
- **FR-028**: System MUST expose metrics for: total organisation count, total membership count, active vs inactive organisation ratios
- **FR-029**: System MUST track operational rates for: organisation creation, member invitation, role changes, organisation deletion events
- **FR-030**: System MUST expose distribution metrics for: organisations per user (p50, p95, p99)
- **FR-031**: System MUST measure and expose permission check latency (avg, p95, p99)
- **FR-032**: System MUST track rate limit hit frequency per endpoint to identify abuse patterns

### Key Entities

- **Organisation**: Represents an independent organisational unit. Key attributes include unique name, optional description, creation timestamp, creator reference, active/inactive status. No parent/child relationships.
- **Membership**: Represents the many-to-many relationship between users and organisations. Key attributes include user reference, organisation reference, role (admin or member), join timestamp, invited_by reference. Enforces uniqueness constraint on (user, organisation) pairs.
- **User**: Existing entity from B05-core-accounts. Referenced by memberships and organisations as creator/inviter.

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: Organisation structure is completely generic with no domain-specific attributes. Products can extend organisations via foreign keys or additional apps.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: New `organisations` app depends only on `accounts` (B05) and optionally integrates with `audit` (B09). No reverse dependencies.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Coverage Target**: >90% for models, managers, views, serializers; 100% for permission logic.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Security Considerations**: All endpoints require authentication. Admin-only actions verified via membership role checks. Audit logs capture membership changes without logging sensitive details.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Performance Plan**: Use `select_related('user', 'organisation')` on membership queries. Paginate organisation lists and member lists. Index on (user, organisation) for membership lookups.

**Observability**: Expose comprehensive metrics including total counts, operational rates (creation/invitation/changes), per-user distribution percentiles, permission check latency, and rate limit violations for monitoring system health and detecting abuse patterns.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Documentation Plan**: README in organisations app explaining data model, role semantics, and extension patterns. ADR for flat vs hierarchical decision.

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new organisation in under 30 seconds from authentication
- **SC-002**: Admins can add a new member to an organisation in under 15 seconds
- **SC-003**: System supports at least 10,000 organisations with 100,000 total memberships without performance degradation
- **SC-004**: Organisation listing returns results in under 200ms for users with up to 100 organisation memberships
- **SC-005**: All organisation and membership state changes are recorded in audit logs within 1 second
- **SC-006**: 100% of permission checks correctly enforce admin vs member capabilities (zero false positives in access control)
- **SC-007**: Users can successfully switch between organisations and access org-scoped resources without errors
- **SC-008**: API documentation allows external developers to integrate organisation context into new modules without consulting implementation code

## Assumptions *(mandatory)*

1. **User Identity**: Assumes B05-core-accounts is fully implemented with stable User model and authentication
2. **Audit Integration**: Assumes B09-audit-logging provides a stable interface for recording events (if not yet available, implement logging hooks that can be wired later)
3. **Invitation Mechanism**: Initially assumes invitations are immediate (user must already exist); future enhancement may add email-based invitations for non-existent users
4. **Organisation Deletion**: Soft-deleted organisations are hidden from all APIs immediately; superadmins can restore within 30 days; after 30 days, organisations are permanently hard-deleted along with associated memberships
5. **Resource Association**: Assumes downstream modules will add foreign keys to Organisation for multi-tenant resources; this module provides the foundation but doesn't enforce resource association patterns
6. **Single Active Context**: Assumes UI/frontend will manage "active organisation" selection; backend APIs operate on explicit organisation parameters, not implicit context
7. **No Billing Integration**: Organisations have no concept of payment status, subscription, or limits; such features would be added by downstream product apps
8. **Scalability Baseline**: Designed for up to 100,000 organisations and 1,000,000 memberships; extreme scale (millions of orgs) may require sharding or architectural changes

## Dependencies *(mandatory)*

- **B05-core-accounts**: Required. Provides User model and authentication system.
- **B09-audit-logging**: Optional but recommended. Used for recording critical organisation/membership events.
- **Django REST Framework**: Required for API implementation.
- **PostgreSQL**: Required for database constraints and indexing strategy.

## Out of Scope *(mandatory)*

- Hierarchical or nested organisations (departments, subsidiaries, parent/child relationships)
- Organisation-specific billing, subscriptions, or payment processing
- Custom roles beyond admin/member (e.g., flexible permission systems, custom role creation)
- Organisation-level settings or configuration management
- Invitation workflows for users who don't exist (email invitations with signup)
- Organisation discovery or public organisation directories
- Organisation transfer between users (ownership can be transferred by adding new admin and old admin leaving)
- Detailed HR structures (reporting lines, job titles, org charts)
- Domain-specific attributes (industry, size, location, etc.)
- Organisation branding or visual customization
- Resource-level access control (ACLs for specific objects within an organisation)
