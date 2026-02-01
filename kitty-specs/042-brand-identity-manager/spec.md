# Feature Specification: Brand Identity Manager

**Feature Branch**: `042-brand-identity-manager`
**Created**: 2026-02-01
**Status**: Draft
**Input**: User description: "B33 brand identity manager - centralized brand tokens and assets as data for org/project with merge inheritance"

## Clarifications

### Session 2026-02-01

- Q: Who can modify brand profiles at each level? → A: Org admins can modify both org AND all project brands (cascade control). Project admins can only modify their own project brand.
- Q: Should non-color token values be validated? → A: Length limits only (max 255 chars). No format validation - frontend responsibility for rendering correctness.
- Q: When an asset is replaced, what happens to the old file? → A: Keep old file (orphaned) - B22 handles cleanup via its retention/archival policy. B33 only updates the FK reference.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Organisation Admin Sets Up Brand Profile (Priority: P1)

An organisation administrator creates a brand profile for their organisation, defining the visual identity that will be inherited by all projects (teams/clubs) within the organisation.

**Why this priority**: Foundation for all brand management - without an org-level brand profile, there's nothing to inherit or override.

**Independent Test**: Can be fully tested by creating an org brand profile via API and verifying tokens are stored and retrievable.

**Acceptance Scenarios**:

1. **Given** an authenticated org admin, **When** they create a brand profile with name and tokens, **Then** the profile is saved and associated with their organisation
2. **Given** an org brand profile exists, **When** the admin adds design tokens (colors, fonts), **Then** tokens are stored with their key, value, and type
3. **Given** an org brand profile exists, **When** the admin uploads brand assets (logo, watermark), **Then** assets are stored linked to the profile via file storage (B22)

---

### User Story 2 - Project Inherits Organisation Brand (Priority: P1)

A project (team/club) within an organisation automatically inherits the organisation's brand tokens and assets when no project-specific brand is defined.

**Why this priority**: Core inheritance mechanism - enables federation-to-club brand cascade without manual duplication.

**Independent Test**: Can be tested by creating org brand, creating project without brand, and verifying project returns org's brand tokens via API.

**Acceptance Scenarios**:

1. **Given** an org has a brand profile with tokens, **When** a project requests its brand tokens and has no own profile, **Then** the org's tokens are returned
2. **Given** an org has brand assets, **When** a project requests its brand assets and has no own profile, **Then** the org's assets are returned
3. **Given** an org has a brand profile, **When** a new project is created, **Then** no duplicate brand data is created - inheritance is resolved at query time

---

### User Story 3 - Project Overrides Specific Brand Tokens (Priority: P2)

A project admin creates a project-level brand profile that overrides specific tokens while inheriting the rest from the organisation.

**Why this priority**: Enables clubs to customize their identity while maintaining federation compliance elements.

**Independent Test**: Can be tested by setting org tokens, setting project override tokens, and verifying merged result via API.

**Acceptance Scenarios**:

1. **Given** an org has tokens {primary_color: #FF6600, font_heading: Roboto}, **When** a project sets {primary_color: #D2122E}, **Then** the merged result is {primary_color: #D2122E, font_heading: Roboto}
2. **Given** a project has override tokens, **When** the org updates an inherited token, **Then** the project still sees the merged result with its overrides preserved
3. **Given** a project has override tokens, **When** the project removes an override, **Then** that token falls back to the org value

---

### User Story 4 - AI Content Generation Consumes Brand Tokens (Priority: P2)

The content generation system (B34) retrieves a complete set of brand tokens for a project to use in AI-generated content.

**Why this priority**: Primary consumer of brand data - enables branded content generation without hardcoded values.

**Independent Test**: Can be tested by calling the token API endpoint and verifying all well-known keys are present in response.

**Acceptance Scenarios**:

1. **Given** a project with inherited and override tokens, **When** the token API is called, **Then** a complete merged token set is returned as key-value pairs
2. **Given** a project has brand assets, **When** the token API is called with assets included, **Then** asset URLs are included in the response
3. **Given** well-known token keys are defined, **When** the token API is called, **Then** missing well-known keys return null rather than being omitted

---

### User Story 5 - Admin Manages Brand Assets (Priority: P3)

An admin uploads, replaces, and removes brand assets (logos, watermarks, fonts) associated with a brand profile.

**Why this priority**: Asset management is important but less frequently used than token management.

**Independent Test**: Can be tested by uploading assets via API and verifying they are stored and retrievable.

**Acceptance Scenarios**:

1. **Given** a brand profile exists, **When** admin uploads a logo with type "logo_light", **Then** the asset is stored and linked to the profile
2. **Given** a logo_light asset exists, **When** admin uploads a new logo_light, **Then** the old asset is replaced (not duplicated)
3. **Given** brand assets exist, **When** admin deletes an asset, **Then** the asset link is removed (file cleanup follows B22 policy)

---

### Edge Cases

- What happens when an organisation has no brand profile? → Projects return empty token set with well-known keys as null
- What happens when a project's organisation is changed? → Brand inheritance re-evaluates to new org's brand
- How does system handle circular inheritance? → Not possible by design: org→project is single level, no project-to-project inheritance
- What happens when a brand profile is deactivated? → Tokens return empty, assets return null, but data is preserved for reactivation
- What happens when B22 file storage is unavailable? → Asset URLs return null, tokens still work (graceful degradation)
- What happens to the old file when an asset is replaced? → Old file remains in B22 storage as orphaned file; B22's retention policy handles cleanup (archival/deletion) independently of B33

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow creating a BrandProfile linked to an organisation
- **FR-002**: System MUST allow creating a BrandProfile linked to a project (for overrides)
- **FR-003**: System MUST store DesignTokens as key-value pairs with type classification (color, font, spacing, other)
- **FR-004**: System MUST define well-known token keys: primary_color, secondary_color, accent_color, font_heading, font_body, border_radius
- **FR-005**: System MUST allow custom token keys beyond the well-known set
- **FR-006**: System MUST validate color tokens as valid hex codes (#RRGGBB or #RGB)
- **FR-007**: System MUST validate all token values have length between 1 and 255 characters
- **FR-008**: System MUST implement merge inheritance: project tokens override org tokens, unspecified tokens inherit from org
- **FR-009**: System MUST return complete merged token set via API endpoint
- **FR-010**: System MUST store BrandAssets linked to BrandProfile and B22 File
- **FR-011**: System MUST support asset types: logo_light, logo_dark, watermark, favicon, font_file
- **FR-012**: System MUST enforce one asset per type per profile (replace on re-upload by updating FK reference; old file remains in B22 for cleanup via B22 retention policy)
- **FR-013**: System MUST support is_active flag on BrandProfile for soft-disable
- **FR-014**: System MUST provide REST API endpoints for CRUD operations on all entities
- **FR-015**: System MUST paginate token and asset list responses

### Key Entities

- **BrandProfile**: Container for brand identity, linked to organisation (required) or project (optional for overrides). Key attributes: name, is_active, organisation, project
- **DesignToken**: Individual style value. Key attributes: key, value, type (color/font/spacing/other), profile (FK), is_well_known (computed)
- **BrandAsset**: Visual asset linked to file storage. Key attributes: asset_type, profile (FK), file (FK to B22), alt_text

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
- [x] Coverage targets defined
- [x] Integration tests planned for key flows

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

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

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Organisation admins can create and configure a brand profile in under 5 minutes
- **SC-002**: Project brand token retrieval (merged) completes in under 100ms for 95% of requests
- **SC-003**: Content generation system can retrieve complete brand context in a single API call
- **SC-004**: 100% of well-known token keys are present in API response (null if not set)
- **SC-005**: Brand inheritance correctly resolves for projects without own profile (verified by automated tests)
- **SC-006**: Asset upload/replace operations complete successfully with proper file storage integration

## Assumptions

- B22 File Storage module is available and functional
- B06 Organisation and B07 Project modules provide the FK targets
- Permission system (existing) will be used for access control with cascade permissions: organisation admins can modify both org-level and all child project brands; project admins can only modify their own project brand
- Well-known token keys are a fixed set defined in code, not user-configurable
