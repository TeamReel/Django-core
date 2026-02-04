# Feature Specification: User Navigation State (047)

*Path: [templates/spec-template.md](templates/spec-template.md)*

**Feature Branch**: `047-user-navigation-state`
**Created**: 2026-02-04
**Status**: Draft
**Input**: User description: "Server-backed recents & favorites (user navigation state) with safe defaults, limits, and frontend sync."

## 1. Executive Summary

A server-backed productivity system for Recents and Favorites that synchronizes user navigation state across devices while ensuring data privacy, security, and consistent limits. This feature replaces client-only storage (localStorage) with a reliable backend source-of-truth, resolving stale links and preventing cross-tenant data leakage.

### Goals
1. **Cross-device continuity**: Enable users to access their recent items and saved favorites seamlessly from any device.
2. **Privacy & Security**: Ensure no data about inaccessible resources (stale recents, revoked permissions) is leaked to the client.
3. **Data Hygiene**: Enforce strict limits and retention policies to prevent "digital hoarding" and performance degradation.
4. **Resiliency**: Provide robust data synchronization that prevents conflicts between multiple open tabs or devices.

### Non-Goals
- **Frontend UI Components**: The visual presentation (dropdowns, lists, stars) is out of scope; this is a backend-only state provider.
- **Complex Sync protocols**: No websockets or real-time conflict resolution (CRDTs); a simple "last-write-wins" or "merge-on-load" strategy suffices.
- **Public/Shared Lists**: All data is strictly private to the individual user.

---

## 2. User Scenarios

### User Story 1: The Multi-Device User (Priority: P1)
**Actor**: Team Manager
**Flow**:
1. User logs in on their phone (Device A) and navigates to "Team Rocket > Match Analysis".
2. User later logs in on their desktop (Device B).
3. User opens the "Recents" menu on desktop.
**Outcome**: "Match Analysis" appears at the top of the list, resolving correctly to the current resource.

**Independent Test**: Can create item on session A, see it on session B.

**Acceptance Scenarios**:
1. **Given** User has visited "Page X" on mobile, **When** they login on desktop, **Then** "Page X" is listed in recents.
2. **Given** User visits new page on desktop, **When** they refresh mobile, **Then** new page appears in recents history.

### User Story 2: The Stale Link Protection (Priority: P1)
**Actor**: Club Administrator
**Precondition**: User Alice has "Project X" in her favorites list.
**Flow**:
1. User Alice's access to "Project X" is revoked by an admin.
2. Alice refreshes her dashboard which loads favorites from the server.
**Outcome**: "Project X" is marked as unavailable (e.g., "Restricted Item") in the favorites list, preserving the slot but preventing access and leaking no insensitive details.

## Clarifications

### Session 2026-02-04
- Q: To filter inaccessible items without leaking data or confusing users, how should we handle objects that fail the permission check? → A: Return them but marked as `is_accessible: false` (allows showing "Access Revoked" UI), with the label sanitized to "Restricted Item" to prevent data leakage.
- Q: How should we manage storage limits for "Recents" to prevent data bloat? → A: Use a **Hybrid Cap**: Enforce both a time limit (e.g., 90 days) AND a strict quantity limit (e.g., 50 items). FIFO behavior deletes the oldest item when the cap is reached.

**Independent Test**: Revoke permission to an object, verify it returns with `is_unresolved=True` and sanitized label.

**Acceptance Scenarios**:
1. **Given** User has favorite pointing to Project A, **When** user loses permission to Project A, **Then** Project A is returned with `is_accessible: False` and label "Restricted Item".
2. **Given** User re-gains access, **When** user refreshes list, **Then** Project A works again with original label.

### User Story 3: Digital Hygiene (Guardrails) (Priority: P2)
**Actor**: Power User
**Flow**:
1. User actively navigates through 200 different pages in one session.
2. The user checks their Recents history.
**Outcome**: Ideally, only the most recent N items (e.g., 50) are retained. The server automatically pruned the oldest entries, keeping the list performant and relevant.

**Independent Test**: Create 51 items, verify count is 50.

**Acceptance Scenarios**:
1. **Given** User has 50 items (max limit), **When** adding 51st item, **Then** the oldest item is deleted.
2. **Given** User visits item #25 again, **When** checking list, **Then** item #25 moves to position #1 (updated timestamp).

### Edge Cases
- **Deleted Content**: Target object is permanently deleted from DB. (Should be handled same as permission lost - filtered out).
- **Invalid URL**: Client sends malformed or absolute URL path. (Should be rejected by validator).
- **Concurrent Updates**: Two devices save recents at exact same millisecond. (Last write wins, database handles standard concurrency).

---

## 3. Functional Requirements

### 3.1 Recents Management
- **FR3.1.1**: The system MUST store a history of recently visited navigation targets for each user.
- **FR3.1.2**: Each entry MUST identify the target resource (if applicable) and a fallback title/path.
- **FR3.1.3**: Adding an existing recent item MUST bump it to the top (update timestamp) rather than creating a duplicate.
- **FR3.1.4**: The system MUST enforce a configurable maximum number of recent items per user (e.g., 50).

### 3.2 Favorites Management
- **FR3.2.1**: Users MUST be able to explicitly save (star) and unsave specific navigation targets.
- **FR3.2.2**: Favorites MUST be persistent until explicitly removed by the user.
- **FR3.2.3**: Favorites MUST support custom sorting or default to "date added".

### 3.3 Security & Privacy Resolvers
- **FR3.3.1**: When retrieving navigation state, the system MUST verify the user's current access rights to the underlying resources.
- **FR3.3.2**: Items linking to resources the user can no longer access MUST be included in the response but marked as `is_accessible: False` and have their labels sanitized (e.g., "Restricted Item").
- **FR3.3.3**: Navigation data MUST allow a configurable retention period (e.g., 90 days) AND a configurable quantity limit (e.g., max 50 items). When the limit is reached, the oldest item is removed (FIFO).

### 3.4 Data Integrity
- **FR3.4.1**: Stored paths MUST undergo validation to prevent storage of malicious URLs or absolute external links.
- **FR3.4.2**: Stored labels/titles MUST be length-limited to prevent storage abuse.

### Key Entities
- **UserRecent**: `(user, kind, target_type?, target_id?, label, path, last_seen_at, count?)`
- **UserFavorite**: `(user, kind, target_type?, target_id?, label, path, created_at)`

---

## 4. Success Criteria

### Quantitative Metrics
- **SC-001**: Fetching a user's filtered recents list (e.g., 50 items) takes less than 150ms on average (p95).
- **SC-002**: Database size per user remains bounded (e.g., max 50 recents + 100 favorites rows per user).
- **SC-003**: 100% of responses served to the client contain only safe, accessible links (no information leakage).

### Qualitative Metrics
- **SC-004**: Users report that "Recents" accurately reflects their actual workflow.
- **SC-005**: Developer Experience: Frontend teams can integrate the synchronization logic with standard `fetch` patterns.

## 5. Assumptions & Constraints

### Assumptions
- The application uses a standard authentication system to identify the current user.
- Most "Recents" targets map to database entities (Projects, Teams, Matches) that support permission checks.
- A "last-write-wins" policy is acceptable for concurrent updates to the recents list from multiple devices.

### Constraints
- **Backend Only**: No changes to the frontend codebase or demo pages.
- **Permissions**: Must leverage the existing permission system (e.g., standard Django permissions or ACLs) without duplicating logic.
- **Storage**: Must use the primary relational database; no specialized high-speed storage (Redis/turn-key) required for MVP.

---

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined (85%)
- [x] Integration tests planned for key flows

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged (labels sanitized)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved
