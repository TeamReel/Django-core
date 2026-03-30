# B13: API Baseline

**Phase:** 4
**Status:** ✅ Done
**Module ID:** 013
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 13. B13 – API Foundation & Standards

**Doel**: DRF-based API conventions: auth, pagination, error handling, versioning, OpenAPI.

**Status**: ✅ Complete

**Key Features**:
- Django REST Framework baseline
- API versioning (URL-based)
- Pagination (cursor + limit/offset)
- Error handling patterns (standardized error responses)
- OpenAPI schema generation (drf-spectacular)
- CSRF protection for mutating endpoints
- Request/response logging

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: API Foundation & Standards
*Path: [kitty-specs/013-api-foundation-standards/spec.md](../../../../kitty-specs/013-api-foundation-standards/spec.md)*

**Feature Branch**: `013-api-foundation-standards`
**Created**: 2025-11-29
**Status**: Draft
**Input**: User description: "Define a DRF-based API baseline with consistent authentication, pagination, error handling and versioning, exposing core entities in a stable way."

## Clarifications

### Session 2025-11-29

- Q: When a client sends both valid session cookies AND a valid JWT token in the same request, which authentication method should take precedence? → A: JWT token takes precedence (stateless preferred)
- Q: What are the specific rate limit values for authenticated users versus anonymous requests? → A: Auth: 100/min, Anon: 10/min
- Q: What is the exact JSON structure for standardized API responses? → A: Envelope: `{"data": {...}, "status": "success"}` and `{"error": {...}, "status": "error"}`
- Q: How should CORS be configured for different environments? → A: Explicit allowlist per environment (config file/env var)
- Q: When a JWT token is valid but the associated user account has been deactivated/deleted, what should happen? → A: Return 403 Forbidden with "account inactive" message

## User Scenarios & Testing *(mandatory)*

### User Story 1 - API Client Authentication (Priority: P1)

As an API client developer, I need to authenticate my application using either session-based or JWT token authentication so that I can securely access protected resources.

**Why this priority**: Authentication is foundational - without it, no other API functionality is accessible. This is the entry point for all API consumers.

**Independent Test**: Can be fully tested by making authenticated requests to any protected endpoint using both session cookies and JWT tokens, verifying both succeed and that unauthenticated requests are rejected with proper error messages.

**Acceptance Scenarios**:

1. **Given** a valid username and password, **When** I authenticate via the token endpoint, **Then** I receive a JWT token with appropriate expiry and can use it for subsequent API calls
2. **Given** a valid Django session, **When** I make API requests with session cookies, **Then** the requests succeed and maintain state across requests
3. **Given** an invalid or expired token, **When** I attempt an API call, **Then** I receive a 401 Unauthorized response with a clear error message explaining the authentication failure
4. **Given** no authentication credentials, **When** I access a protected endpoint, **Then** I receive a 401 response indicating authentication is required

---

### User Story 2 - Consistent API Response Patterns (Priority: P1)

As an API client developer, I need predictable response formats and error structures so that I can reliably parse API responses and handle errors gracefully.

**Why this priority**: Consistency in response format is critical for client development. Without standardized patterns, every endpoint becomes a custom integration.

**Independent Test**: Can be fully tested by making various API requests (success, validation errors, server errors) and verifying all responses follow the documented structure with consistent field names and error codes.

**Acceptance Scenarios**:

1. **Given** a successful API request, **When** I receive the response, **Then** it follows envelope pattern `{"data": <payload>, "status": "success", "meta": <pagination/timestamp>}`
2. **Given** a validation error, **When** I submit invalid data, **Then** I receive a 400 response with structure `{"error": {"code": "validation_error", "message": "...", "details": {<field>: ["error"]}}, "status": "error"}`
3. **Given** a server error, **When** an unexpected error occurs, **Then** I receive a 500 response with `{"error": {"code": "server_error", "message": "...", "id": "<uuid>"}, "status": "error"}` (no stack traces)
4. **Given** a resource not found, **When** I request a non-existent resource, **Then** I receive a 404 response with `{"error": {"code": "not_found", "message": "..."}, "status": "error"}`

---

### User Story 3 - Paginated Resource Listing (Priority: P1)

As an API client developer, I need to list large datasets with pagination so that I can retrieve data efficiently without overwhelming my application or the server.

**Why this priority**: Without pagination, listing endpoints become unusable with any significant amount of data. This is essential for all list operations.

**Independent Test**: Can be fully tested by requesting a resource list with various page sizes and page numbers, verifying results are paginated correctly with navigation metadata.

**Acceptance Scenarios**:

1. **Given** a collection with 100 items and default page size of 20, **When** I request the first page, **Then** I receive 20 items plus metadata with total count, next/previous page links, and current page number
2. **Given** I'm on page 2 of results, **When** I request the page, **Then** I receive the correct items for that page and valid navigation links to pages 1 and 3
3. **Given** a custom page size parameter, **When** I request results with a specific page size (up to maximum), **Then** I receive that many items per page
4. **Given** I request a page beyond the available results, **When** I access page 999 of a 3-page result set, **Then** I receive an empty results array with appropriate metadata indicating I'm past the last page

---

### User Story 4 - Core Entity Access (Priority: P2)

As an API client, I need to retrieve and manipulate users, organisations, and projects through standardized endpoints so that I can build applications that work with core platform entities.

**Why this priority**: While authentication and response patterns are foundational, actually accessing business data is why clients use the API. This enables real application functionality.

**Independent Test**: Can be fully tested by performing CRUD operations on each core entity (users, organisations, projects) and verifying permission enforcement through B08 integration.

**Acceptance Scenarios**:

1. **Given** proper permissions, **When** I request a user's details, **Then** I receive their profile information excluding sensitive fields (password hashes, tokens)
2. **Given** I'm a member of an organisation, **When** I request organisation details, **Then** I receive the organisation data and list of members with their roles
3. **Given** I have project access, **When** I list projects, **Then** I see only projects I have permission to view based on B08 hierarchical permissions
4. **Given** I attempt to modify a resource without permission, **When** I make the request, **Then** I receive a 403 Forbidden response explaining what permission is missing
5. **Given** valid permissions and data, **When** I create/update a resource, **Then** the operation succeeds and returns the updated resource representation

---

### User Story 5 - API Rate Limiting (Priority: P2)

As a platform operator, I need to limit API request rates per client so that I can prevent abuse and ensure fair resource allocation across all API consumers.

**Why this priority**: Rate limiting protects system stability but is not required for basic API functionality. It becomes critical as usage scales.

**Independent Test**: Can be fully tested by making rapid successive requests and verifying rate limit enforcement with appropriate headers and error responses.

**Acceptance Scenarios**:

1. **Given** authenticated user with 100 requests/min limit, **When** I make my 50th request, **Then** the response includes headers showing remaining quota (50) and reset time
2. **Given** I've exceeded my rate limit, **When** I attempt another request, **Then** I receive a 429 Too Many Requests response with retry-after header and time until reset
3. **Given** authenticated users (100/min) vs anonymous requests (10/min), **When** I make requests, **Then** my quota is calculated based on my authentication status
4. **Given** my rate limit resets, **When** the reset time arrives, **Then** I can successfully make requests again with full quota restored

---

### User Story 6 - API Versioning and Discovery (Priority: P3)

As an API client developer, I need to discover available API versions and access documentation so that I can understand capabilities, handle deprecations, and plan migrations.

**Why this priority**: Important for long-term API evolution but not critical for initial functionality. Becomes more important as the API matures.

**Independent Test**: Can be fully tested by accessing API root, version endpoints, and documentation to verify version negotiation and deprecation warnings work correctly.

**Acceptance Scenarios**:

1. **Given** I access the API root, **When** I make a GET request to `/api/`, **Then** I receive a list of available API versions with links to documentation and current status (stable, deprecated)
2. **Given** I request a specific API version, **When** I use version prefix `/api/v1/`, **Then** all my requests use that version's contracts and behaviors
3. **Given** I use a deprecated API version, **When** I make requests, **Then** I receive deprecation warning headers indicating sunset date and migration path
4. **Given** I access API documentation, **When** I visit the docs endpoint, **Then** I can browse interactive API documentation (OpenAPI/Swagger) showing all endpoints, parameters, and example responses

---

### Edge Cases

- When JWT token is valid but user account is deactivated/deleted: Return 403 Forbidden with "account inactive" error message
- When both session cookies and JWT tokens are present: JWT token takes precedence; session is ignored
- What happens when pagination parameters are invalid (negative page numbers, page size exceeding maximum)?
- How does the API respond to requests with unsupported API versions?
- What happens when rate limits are hit during a multi-request transaction?
- How does the system handle timezone differences in timestamp fields across requests?
- What happens when filtering/sorting parameters reference non-existent fields?
- How does the API handle very large response payloads that approach HTTP limits?

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Authorization

- **FR-001**: System MUST support session-based authentication using Django sessions for web clients
- **FR-002**: System MUST support JWT token-based authentication for stateless clients (mobile, SPA, external services)
- **FR-002a**: When both session cookies and JWT tokens are present in a request, system MUST use JWT token authentication and ignore session cookies
- **FR-003**: System MUST provide token issuance endpoint accepting username/password and returning access token, refresh token, and expiry metadata
- **FR-004**: System MUST provide token refresh endpoint that exchanges valid refresh tokens for new access tokens
- **FR-005**: System MUST validate JWT tokens on every protected endpoint request and reject invalid or expired tokens with 401 response
- **FR-005a**: System MUST validate that the user account associated with a valid JWT token is active; if account is deactivated or deleted, return 403 Forbidden with error message indicating account status
- **FR-006**: System MUST integrate with B08 hierarchical permission system to enforce resource-level access control
- **FR-007**: System MUST include authentication metadata (user ID, authentication method) in all audit events for B09 audit logging integration

#### Response Standardization

- **FR-008**: System MUST return all successful responses with envelope structure: `{"data": <payload>, "status": "success", "meta": <optional_metadata>}`
- **FR-009**: System MUST return all error responses (4xx, 5xx) with envelope structure: `{"error": {"code": "<error_type>", "message": "<human_readable>", "details": <optional_field_errors>, "id": "<optional_trace_id>"}, "status": "error"}`
- **FR-010**: System MUST sanitize error responses to prevent leakage of sensitive implementation details (stack traces, database errors, file paths)
- **FR-011**: System MUST use consistent HTTP status codes: 200 (success), 201 (created), 400 (validation error), 401 (authentication required), 403 (forbidden), 404 (not found), 429 (rate limited), 500 (server error)
- **FR-012**: System MUST include appropriate CORS headers based on environment-specific allowlist configured via CORS_ALLOWED_ORIGINS environment variable or settings file
- **FR-013**: System MUST return timestamps in ISO 8601 format with UTC timezone

#### Pagination

- **FR-014**: System MUST paginate all list endpoints with configurable page size (default 20, maximum 100 items)
- **FR-015**: System MUST include pagination metadata in responses: total count, current page, total pages, page size, next/previous page URLs
- **FR-016**: System MUST support offset-based pagination with `page` and `page_size` query parameters
- **FR-017**: System MUST handle invalid pagination parameters gracefully (negative pages, excessive page size) with 400 error responses
- **FR-018**: System MUST optimize paginated queries to prevent N+1 database queries through proper use of select_related/prefetch_related

#### Core Entity Endpoints

- **FR-019**: System MUST expose user profile endpoints with read and update capabilities
- **FR-020**: System MUST expose organisation listing and detail endpoints with B08 permission integration
- **FR-021**: System MUST expose project listing and detail endpoints respecting hierarchical permissions (organisation → project)
- **FR-022**: System MUST filter user-visible fields based on permission level (e.g., exclude sensitive fields like password hashes, internal IDs, audit metadata)
- **FR-023**: System MUST validate all input data at API boundary using DRF serializers with appropriate field-level validation
- **FR-024**: System MUST support filtering and searching on list endpoints using query parameters (e.g., `?search=term`, `?filter=value`)
- **FR-025**: System MUST support sorting on list endpoints using `ordering` query parameter with ascending/descending options

#### Rate Limiting & Throttling

- **FR-026**: System MUST implement per-user rate limiting building on B06 Redis-based rate limiting infrastructure
- **FR-027**: System MUST apply rate limits of 100 requests per minute for authenticated users and 10 requests per minute for anonymous requests
- **FR-028**: System MUST return rate limit information in response headers: remaining quota, total limit, reset time
- **FR-029**: System MUST return 429 Too Many Requests when rate limits are exceeded with Retry-After header
- **FR-030**: *(Future Enhancement)* System SHOULD allow rate limit configuration per endpoint or endpoint group (e.g., higher limits for read operations, lower for writes); initial implementation will use global rate limits only (100/min authenticated, 10/min anonymous)
- **FR-031**: System MUST track rate limits per IP address for anonymous requests and per user ID for authenticated requests

#### API Versioning & Discovery

- **FR-032**: System MUST implement URL-based versioning with version prefix (e.g., `/api/v1/`)
- **FR-033**: System MUST provide API root endpoint listing available versions with status (stable, deprecated, sunset date)
- **FR-034**: System MAY optionally include API version in response headers (e.g., `X-API-Version: v1`) for client convenience; version is primarily communicated through URL prefix (see FR-032)
- **FR-035**: System MUST provide deprecation warning headers when clients use deprecated API versions
- **FR-036**: System MUST expose OpenAPI/Swagger documentation at `/api/docs/` with interactive API explorer
- **FR-037**: System MUST generate API documentation automatically from DRF serializers and viewsets

#### Integration & Extension

- **FR-038**: System MUST integrate with B03 security baseline for secure defaults (CSRF protection, security headers)
- **FR-039**: System MUST integrate with B09 audit logging to record all API access attempts, authentication events, and permission denials
- **FR-040**: System MUST provide extension points for custom authentication backends without modifying core code
- **FR-041**: System MUST provide base serializer and viewset classes that enforce standards for extension by product-specific APIs
- **FR-042**: System MUST provide middleware hooks for custom request/response processing (logging, monitoring, transformation)

### Key Entities *(mandatory)*

This feature primarily **exposes existing entities** from B05/B06/B07 rather than creating new ones:

- **User** (from B05): User accounts with profile information; API exposes read/update of profile fields excluding sensitive data (password, tokens)
- **Organisation** (from B06): Multi-tenant organisation containers; API exposes listing, detail, member management with B08 permission checks
- **Project** (from B07): Project workspaces within organisations; API exposes listing, detail with hierarchical permission inheritance
- **API Token** (new): JWT access and refresh tokens for stateless authentication; short-lived access tokens (15 min) and longer-lived refresh tokens (7 days)
- **Rate Limit Quota** (new): Per-user or per-IP rate limit tracking; stored in Redis with expiry matching rate limit windows

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Justification**: This is a pure infrastructure feature providing standardized API patterns. All endpoints expose core entities that any product can use. Extension points are provided through base classes and middleware hooks.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Justification**: API layer sits cleanly above existing apps (accounts, organisations, projects) without modifying their core logic. Uses DRF's serializer/viewset pattern for clean separation.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Justification**: Follows existing project standards for code quality and typing.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

**Justification**: Will include unit tests for serializers/viewsets, integration tests for authentication flows, and API contract tests for response formats.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Justification**: Builds on B03 security baseline. JWT secrets configured via environment variables. All authentication goes through DRF authentication classes. Error responses sanitized to prevent information leakage.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Justification**: Pagination is mandatory for all list endpoints. Query optimization through select_related/prefetch_related documented. Rate limiting prevents resource exhaustion. Errors fail safely with appropriate status codes.

### API Design (Principle VII)
- [x] DRF standards followed
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Justification**: This feature IS the standardized API design foundation. Establishes patterns all future APIs must follow.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Justification**: Will include API documentation (OpenAPI), developer guide for extending the API, and ADR for authentication strategy and versioning approach.

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: API clients can successfully authenticate using either session or JWT token authentication with 100% success rate for valid credentials
- **SC-002**: All API responses follow standardized format with zero format inconsistencies across endpoints
- **SC-003**: API documentation is complete and accurate, enabling developers to integrate without additional support for core endpoints
- **SC-004**: Pagination performs efficiently with response times under 200ms for pages of up to 100 items
- **SC-005**: Rate limiting successfully prevents abuse while allowing 99.9% of legitimate requests to succeed
- **SC-006**: API clients can discover all available endpoints and their contracts through interactive documentation
- **SC-007**: Permission enforcement correctly restricts access to resources based on B08 hierarchical permissions with zero unauthorized access incidents
- **SC-008**: API error responses provide clear, actionable information enabling client developers to resolve issues without backend team involvement in 90% of cases
- **SC-009**: Token refresh flow allows clients to maintain persistent sessions without reauthentication for up to 7 days
- **SC-010**: System handles 1000 concurrent API requests without degradation in response time or error rate increase

## Dependencies & Assumptions *(mandatory)*

### Dependencies

- **B03 - Core Security Baseline**: Provides secure defaults, CSRF protection, security headers
- **B05 - Core Accounts & Authentication**: Provides User model and authentication backends
- **B06 - Organisation Management**: Provides Organisation model and multi-tenancy foundation
- **B07 - Projects & Workspaces**: Provides Project model
- **B08 - Hierarchical Access Control**: Provides permission evaluation and role-based access
- **B09 - Audit Logging System**: Receives audit events for all API access

### Assumptions

- Django REST Framework 3.14+ will be used as the API framework
- djangorestframework-simplejwt will be used as the JWT authentication library (see research.md Q1)
- Redis is available for rate limiting (provided by B06 infrastructure)
- PostgreSQL is the database backend supporting efficient pagination queries
- JWT tokens will use HS256 signing algorithm with secrets stored as environment variables
- API will use UTC timezone for all timestamps
- Maximum page size limit of 100 items is sufficient for all use cases
- Rate limits of 100 requests/min (authenticated) and 10 requests/min (anonymous) provide adequate throughput while preventing abuse
- Token expiry defaults (15 min access, 7 day refresh) are appropriate for security/UX balance
- API versioning will start at v1 with no legacy versions to support initially
- CORS allowed origins will be configured per environment via CORS_ALLOWED_ORIGINS environment variable (comma-separated list)
- English is the default language for error messages with i18n support deferred to future enhancement

## Out of Scope *(mandatory)*

The following are explicitly excluded from this feature:

- **GraphQL API**: Only REST API is in scope; GraphQL can be added as separate feature if needed
- **WebSocket/Real-time APIs**: Only HTTP request/response pattern; real-time features require separate implementation
- **Client SDK Generation**: API provides OpenAPI spec but auto-generated client libraries are not included
- **Advanced Filtering DSL**: Only basic filtering by field equality; complex query languages like JSON:API filters or GraphQL-style queries are out of scope
- **Bulk Operations**: Creating/updating multiple resources in single request not included in initial version
- **File Upload/Download Endpoints**: Binary file handling requires separate feature design
- **Webhooks**: Outbound event notifications to client systems not included
- **API Analytics Dashboard**: Usage metrics and analytics require separate observability feature
- **Custom Serialization Formats**: Only JSON supported; XML, MessagePack, etc. not included
- **API Gateway Integration**: Direct Django app serving API; integration with API gateway (Kong, Tyk) not included
- **OAuth2 Provider**: JWT tokens only; full OAuth2 server with authorization grants not in scope
- **API Monetization**: Usage tracking for billing, quota management beyond rate limiting not included

## Risks & Mitigations *(optional)*

### Technical Risks

**Risk**: JWT secret compromise could allow token forgery
- **Impact**: High - attackers could impersonate any user
- **Mitigation**: Store JWT secrets in secure secret management (environment variables minimum, vault/secrets manager preferred); implement token rotation strategy; monitor for unusual authentication patterns

**Risk**: N+1 query problems on list endpoints with relationships
- **Impact**: Medium - performance degradation at scale
- **Mitigation**: Mandatory use of select_related/prefetch_related in serializers; include query count monitoring in development; performance tests for paginated endpoints

**Risk**: Rate limiting could block legitimate users during traffic spikes
- **Impact**: Medium - poor user experience during high usage
- **Mitigation**: Implement exponential backoff headers; provide burst allowance above sustained rate; monitor rate limit hit rates and adjust thresholds

**Risk**: API versioning strategy limits flexibility for breaking changes
- **Impact**: Medium - may force maintaining old versions longer than desired
- **Mitigation**: Document deprecation policy upfront (minimum 6 months notice); provide migration guides; use feature flags for gradual rollout of changes

### Operational Risks

**Risk**: Documentation becomes outdated as API evolves
- **Impact**: Medium - increased support burden, slower client development
- **Mitigation**: Auto-generate docs from code (OpenAPI from serializers); include doc updates in PR review checklist; version docs alongside API versions

**Risk**: Insufficient monitoring of API usage patterns
- **Impact**: Low - harder to detect abuse or performance issues
- **Mitigation**: Integrate with existing Prometheus metrics from B06; add API-specific metrics (response times, error rates by endpoint, authentication failures)

## Notes & Open Questions *(optional)*

### Design Decisions

- **Authentication Strategy**: Chose JWT tokens over OAuth2 for simplicity while maintaining statelessness. OAuth2 can be added later if external client authorization is needed.
- **Versioning Approach**: URL-based versioning (e.g., `/api/v1/`) chosen over header-based for visibility and ease of use. Clients can clearly see which version they're using.
- **Pagination Style**: Offset-based pagination chosen for simplicity and predictability. Cursor-based pagination can be added later if needed for large datasets.

### Future Enhancements

- Cursor-based pagination for very large datasets where offset performance degrades
- GraphQL endpoint as alternative API style for clients needing flexible queries
- Batch/bulk operations for efficiency when creating/updating multiple resources
- Webhook subscriptions for real-time event notifications
- Advanced filtering using JSON:API filter syntax or OData-style queries
- API usage analytics dashboard for monitoring and optimization
- Client SDK generation from OpenAPI spec (Python, JavaScript, etc.)
- OAuth2 provider capabilities for third-party client authorization
- Field-level permissions for fine-grained access control
- API request replay capability for debugging and testing
- Multi-region API deployment with geo-routing
