# F10b: Demo Production Database & Seed Data

**Phase:** 8
**Status:** ✅ Done
**Module ID:** 032
**Category:** Frontend

## Links
*   [Source Code](../../../../src)

## Description
This module defines the seed data for the Demo Shell. It populates the database with a realistic "Football League" scenario to demonstrate the platform's capabilities.

## Data Model: Football Leagues

The demo uses the Core-App's generic models (`Organization`, `Project`) mapped to a specific domain:

| Core Concept | Demo Concept | Example |
| :--- | :--- | :--- |
| **Organization** | **Football Club** | "Ajax", "Feyenoord", "PSV" |
| **Project** | **Team** | "Ajax 1", "Jong Ajax", "Ajax U18" |
| **User** | **Member** | "John de Wolf" (Trainer), "Piet Schrijvers" (Admin) |
| **File (B22)** | **Player Photo** | `profile_pic.jpg` |
| **Metadata (JSON)** | **Season Data** | `{"season": "2023/2024", "league": "Eredivisie"}` |

### Extended Domain Models (The "20%")

To support the full scenario (Matches, Lineups), the Demo Shell (`F10`) introduces specific models that link to the Core:

1.  **Player**: Linked to a `Project` (Team).
2.  **Match**: Links two `Projects` (Home Team vs Away Team).
3.  **Lineup**: Links `Players` to a `Match`.
4.  **Season**: A grouping entity (or just a tag on Projects).

## Seed Data Requirements

The `seed_demo_data` command must generate:

1.  **5 Football Clubs** (Organizations):
    *   Real names (e.g., "FC Amsterdam", "Rotterdam United").
    *   Realistic settings (branding colors, logos).

2.  **20 Teams** (Projects):
    *   Distributed across clubs (e.g., "First Team", "Reserves", "U19").
    *   Assigned to specific Seasons via metadata.

3.  **50 Users** (Members):
    *   Roles: Club Admin, Team Manager, Player, Fan.
    *   Realistic names (no Lorem Ipsum).

4.  **100 Matches** (Domain Data):
    *   Past matches (with scores).
    *   Future matches (scheduled).

5.  **Activity**:
    *   Audit logs for "Match Scheduled", "Player Transferred".
    *   Notifications for "Match Starting Soon".

## Implementation Note

The Core-App does **not** contain `Match` or `Player` models in its `backend/core` apps. These are defined in `backend/demo_football` (a dedicated app for the demo) to illustrate how to build *on top* of the platform without polluting the core.
2. **Given** seed data is generated, **When** developer logs in as `admin@demo.djangocore.app`, **Then** they see 5 organizations with realistic names, member counts, and credit balances
3. **Given** demo is running, **When** developer switches to `user@demo.djangocore.app`, **Then** they see TechCorp organization with 15 projects and appropriate member-level permissions
4. **Given** demo database exists, **When** developer re-runs `docker-compose --profile demo up`, **Then** seed command is idempotent (no duplicates, <5s check time)

---

### User Story 2 - Product Owner Demo Presentation (Priority: P1)

A non-technical Product Owner needs to demonstrate all 30 implemented modules to stakeholders using pre-configured demo accounts without technical setup.

**Why this priority**: This directly serves the strategic stakeholder who needs visual proof that features work. Without realistic demo data, the platform appears empty or broken.

**Independent Test**: Product Owner receives demo URL → logs in with demo accounts → navigates through 5 organizations, 80 projects, audit logs, notifications → shows realistic activity across all modules → stakeholders gain confidence in platform completeness.

**Acceptance Scenarios**:

1. **Given** demo is running, **When** Product Owner logs in as `manager@demo.djangocore.app`, **Then** they see DataLab Enterprise with 8 team members, 30 projects, and 5000 credits
2. **Given** logged in as manager, **When** Product Owner navigates to audit logs, **Then** they see 200-300 realistic events (logins, project creations, credit purchases) distributed over last 30 days
3. **Given** viewing projects, **When** Product Owner opens a project, **Then** they see team members with varied roles, recent activity, and permission-based UI (can invite users)
4. **Given** viewing credits dashboard, **When** Product Owner switches to MarketingHub, **Then** they see low-balance alert (200 credits) and transaction history

---

### User Story 3 - Integration Testing with Realistic Data (Priority: P2)

A developer writes end-to-end tests that verify multi-tenancy, permissions, and audit logging work correctly across different user roles and organizations.

**Why this priority**: Realistic seed data makes E2E tests meaningful. Tests can verify edge cases (low credits, archived projects, different roles) without creating complex test fixtures.

**Independent Test**: Developer writes Playwright test → uses seed data (e.g., "verify DataLab has 8 members") → runs test against demo database → test passes with realistic data → same test works in CI.

**Acceptance Scenarios**:

1. **Given** seed data is loaded, **When** E2E test logs in as `viewer@demo.djangocore.app`, **Then** test can verify read-only access (no edit buttons, API mutations fail with 403)
2. **Given** test switches context to TechCorp, **When** test lists projects, **Then** exactly 15 projects appear (predictable for assertions)
3. **Given** test queries audit log, **When** filtering by event type "login", **Then** multiple login events exist across different users and dates
4. **Given** test checks credits, **When** viewing MarketingHub, **Then** low-credit alert is visible (200 < 500 threshold)

---

### User Story 4 - Database Reset & Refresh (Priority: P2)

A developer has corrupted demo data during testing and needs to quickly reset to a clean state without losing their local development environment.

**Why this priority**: During development, data corruption is common. Fast reset capability prevents developers from wasting time manually cleaning up or rebuilding containers.

**Independent Test**: Developer runs `python manage.py reset_demo_data --force` → database is wiped → seed data regenerates in <30s → demo accounts work again → no container restart needed.

**Acceptance Scenarios**:

1. **Given** corrupted demo data, **When** developer runs `reset_demo_data --force`, **Then** all demo data is deleted and recreated in <30 seconds
2. **Given** reset completes, **When** developer logs in again, **Then** all 5 organizations, 20 users, and 80 projects are restored to original state
3. **Given** reset is running, **When** command encounters existing data, **Then** clear warnings are shown before deletion (safety check)
4. **Given** reset fails mid-way, **When** developer re-runs command, **Then** command is idempotent and completes successfully

---

### User Story 5 - SQLite Fallback for Lightweight Dev (Priority: P3)

A developer on a low-resource machine wants to run the demo without Docker/PostgreSQL overhead for quick frontend development.

**Why this priority**: Nice-to-have for convenience. Most developers will use PostgreSQL (primary target), but SQLite fallback helps with CI speed and resource-constrained environments.

**Independent Test**: Developer sets `DEMO_DATABASE=sqlite` → runs `python manage.py migrate && python manage.py seed_demo_data` → frontend works with SQLite backend → no PostgreSQL container needed.

**Acceptance Scenarios**:

1. **Given** `DEMO_DATABASE=sqlite` is set, **When** developer runs seed command, **Then** SQLite database is created with same seed data
2. **Given** SQLite mode, **When** developer queries organizations, **Then** same 5 organizations appear as in PostgreSQL mode
3. **Given** SQLite database, **When** running E2E tests, **Then** tests pass (compatibility verified)
4. **Given** SQLite startup, **When** measuring performance, **Then** startup time is <30 seconds (faster than PostgreSQL)

---

### User Story 6 - Data Integrity Validation (Priority: P3)

A developer suspects seed data has issues (orphaned records, negative credits, missing permissions) and needs automated validation.

**Why this priority**: Prevents production-like bugs in demo. Validation ensures seed data integrity matches real-world constraints.

**Independent Test**: Developer runs `python manage.py validate_demo_data` → command checks constraints → outputs report with any issues found → developer fixes seed data generator.

**Acceptance Scenarios**:

1. **Given** seed data is loaded, **When** developer runs `validate_demo_data`, **Then** all organizations have at least 1 admin user
2. **Given** validation runs, **When** checking credits, **Then** no negative balances are found
3. **Given** validation checks permissions, **When** verifying project access, **Then** all projects have valid role assignments
4. **Given** validation finds issues, **When** report is generated, **Then** specific problems are listed with affected records (e.g., "Project 42 has no admin")

---

### Edge Cases

- **What happens when seed data already exists?** Command checks for existing demo organizations (by name match) and skips creation (idempotent behavior). Logs "Demo data already exists, skipping."
- **How does system handle database connection failure?** Seed command fails fast with clear error message ("PostgreSQL connection failed at localhost:5432"). Suggests checking Docker containers.
- **What if seed data generation times out (<30s target)?** Command uses batch inserts and bulk_create to meet performance targets. Logs progress (e.g., "Created 5/5 orgs, 10/20 users...").
- **How are timestamps distributed realistically?** Audit events, transactions, notifications use randomized timestamps within last 30 days, seeded with fixed random seed (deterministic but realistic).
- **What if user manually deletes a demo organization?** Validation command detects missing organizations and warns. Re-running seed command recreates only missing data.
- **How does system handle SQLite vs PostgreSQL differences?** Seed data generator uses Django ORM abstractions (no raw SQL), ensuring cross-database compatibility.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide PostgreSQL as primary database with connection pooling configuration ready (pgbouncer-compatible settings)
- **FR-002**: System MUST support SQLite fallback via `DEMO_DATABASE` environment variable for lightweight development
- **FR-003**: System MUST create exactly 5 organizations with fixed names and characteristics (TechCorp, DataLab, MarketingHub, OpenSource Collective, AI Research Inc)
- **FR-004**: System MUST create exactly 20 users distributed across organizations (3 superusers, 10 org admins, 7 members/viewers)
- **FR-005**: System MUST provide 4 pre-configured demo accounts with known credentials (admin@/user@/manager@/viewer@demo.djangocore.app, password: Demo2024!)
- **FR-006**: System MUST generate exactly 80 projects distributed across organizations (15 for TechCorp, 30 for DataLab, 10 for MarketingHub, 5 for OpenSource, 20 for AI Research)
- **FR-007**: System MUST create 200-300 audit events with realistic event types (authentication, CRUD, financial, security) distributed over last 30 days; total count is sampled in that range per run using seeded randomness
- **FR-008**: System MUST generate transaction history for each organization over the last 30 days with varied types (purchases, usage, refunds) and credit balances matching organization tier; timestamps follow the same seeded randomness approach
- **FR-009**: System MUST create notifications with 5-10 unread per demo account (seeded range) and 50+ read per organization; types vary (system, org, project)
- **FR-010**: System MUST set feature flags appropriately per organization (enabled for premium orgs, disabled for trial). Tiers are fixed as: Premium → DataLab, AI Research Inc; Trial → TechCorp, MarketingHub, OpenSource Collective.
- **FR-011**: System MUST create user preferences for each user (language, theme, notification settings, timezone)
- **FR-012**: System MUST generate file metadata placeholders (no actual file uploads) ready for B22 module
- **FR-013**: Seed command MUST be idempotent (checks existing data by organization name, skips if found, no duplicates)
- **FR-014**: Seed command MUST complete in <30 seconds for performance target compliance
- **FR-015**: Seed command MUST use semi-random timestamps (fixed structure, varied dates within last 30 days using seeded randomness for reproducibility)
- **FR-016**: Reset command MUST require explicit `--force` flag before deleting data (safety confirmation)
- **FR-017**: Reset command MUST wipe all demo data and regenerate in single operation (<60s total)
- **FR-018**: Validate command MUST check organization integrity (each org has ≥1 admin)
- **FR-019**: Validate command MUST check credit integrity (no negative balances)
- **FR-020**: Validate command MUST check permission integrity (all projects have valid role assignments)
- **FR-021**: Validate command MUST output detailed report with any issues found (specific records listed)
- **FR-022**: System MUST provide Docker Compose `demo` profile (PostgreSQL + Redis + Django + Frontend, <60s startup)
- **FR-023**: System MUST provide Docker Compose `demo-lite` profile (SQLite + Redis + Django + Frontend, <30s startup)
- **FR-024**: System MUST support `DEMO_AUTO_SEED=true` environment variable for automatic seeding on container startup
- **FR-025**: Seed data MUST be realistic (no Lorem Ipsum). Names MUST come from curated lists (organization/project/user) to ensure plausibility.
- **FR-026**: System MUST log seed progress to console (e.g., "Created 5 orgs, 20 users, 80 projects")
- **FR-027**: System MUST use existing B01-B21 models without schema changes (no migrations)
- **FR-028**: System MUST work with both PostgreSQL and SQLite using Django ORM abstractions (no database-specific raw SQL)

### Key Entities

- **Organisation**: Represents demo companies (TechCorp, DataLab, etc.) with name, credit balance, member count
- **User**: Demo users with email, password, role (superuser/admin/member/viewer), associated organizations
- **Project**: Demo projects with name, description, status, organization relationship, team members
- **Transaction**: Credit purchases, usage, refunds with amount, type, timestamp, organization relationship
- **AuditEvent**: Activity logs with event type, user, organization, timestamp, metadata (existing B09 model)
- **Notification**: In-app and email notifications with type, recipient, read status, timestamp (existing B16 model)
- **FeatureFlag**: Organization-scoped feature toggles with flag name, enabled status, org relationship (existing B10 model)
- **UserPreference**: Per-user settings with language, theme, notification preferences, timezone (existing B12 model)
- **FileMetadata**: Placeholder records for future B22 integration with filename, size, MIME type, upload date

## Constitution Alignment

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products (any product can use demo seed data as template)
- [x] Extension points are clearly documented (seed data can be customized via environment variables)

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering (management commands in appropriate Django apps)
- [x] No circular dependencies introduced (seed command imports from apps, not vice versa)
- [x] Extension points are stable (other modules can add their own seed data via post-seed hooks)

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in seed data generators
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest tests for seed command (idempotency, performance, data integrity)
- [x] Coverage targets: 80%+ for management commands
- [x] Integration tests verify E2E workflow (seed → validate → reset)

### Security & Privacy (Principle V)
- [x] Secure defaults maintained (demo passwords use Django password hashing, not plaintext)
- [x] No secrets in code (demo credentials documented in separate file, not hardcoded strings)
- [x] Authentication handled through existing B05 module
- [x] No sensitive data in seed logs (passwords never logged, only usernames)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (bulk_create used for users, projects, audit events)
- [x] Seed command optimized for <30s target with progress logging
- [x] Structured logging included (JSON format for parsing)
- [x] Graceful degradation: if PostgreSQL unavailable, SQLite fallback documented

### API Design (Principle VII)
- [x] Management commands follow Django conventions (--force flag, --verbose flag)
- [x] Exit codes used appropriately (0 success, 1 failure)
- [x] Output format consistent (JSON structured logs when --json flag used)

### Documentation (Principle XI)
- [x] Feature documentation planned (README in demo directory, Docker Compose comments)
- [x] Extension guide updates identified (adding seed data for new modules 034-070)
- [x] ADR not required (straightforward database seeding, follows Django conventions)

**Violations Requiring Justification**: None

## Success Criteria

### Measurable Outcomes

- **SC-001**: Developers can start a fully functional demo with realistic data in under 60 seconds from repository clone
- **SC-002**: Seed data generation completes in under 30 seconds regardless of database backend (PostgreSQL or SQLite)
- **SC-003**: 100% of E2E tests pass using demo seed data (predictable structure with exactly 80 projects enables reliable assertions)
- **SC-004**: Product Owners can demonstrate all 30 modules with realistic activity data without technical assistance
- **SC-005**: Demo database size remains under 50MB with all seed data (efficient for CI/testing)
- **SC-006**: Seed command is idempotent (running multiple times produces no duplicates, completes in <5s when data exists)
- **SC-007**: Validation command detects 100% of integrity issues (missing admins, negative credits, orphaned permissions)
- **SC-008**: Reset command completes full wipe + reseed in under 60 seconds
- **SC-009**: All 4 demo accounts (admin, user, manager, viewer) can successfully authenticate and access appropriate resources
- **SC-010**: 90% of developers successfully run demo on first attempt without consulting documentation (intuitive Docker Compose profiles)

## Assumptions

1. **Database backends**: PostgreSQL 14+ and SQLite 3.35+ are sufficient (no exotic features required)
2. **Random seed**: Using Python's random module; audit event count is sampled 200-300 per run. Set `DEMO_RANDOM_SEED` (e.g., 42) for deterministic runs; unset for semi-random defaults.
3. **Performance targets**: <30s seed generation assumes SSDs and modern hardware (2020+); HDDs may take 45-60s
4. **Docker resources**: Demo profile assumes 4GB RAM minimum for PostgreSQL + Django + Frontend
5. **Lite profile use case**: SQLite mode is for local dev/CI only, not production-like testing (lacks concurrent access features)
6. **Data retention**: Seed data represents "last 30 days" of activity; older data not necessary for demo purposes
7. **File placeholders**: B22 module (future) will add actual file upload functionality; seed data only creates metadata records
8. **Hosted demo**: Deployment to demo.djangocore.app is optional future work, not part of initial implementation
9. **Internationalization**: Seed data uses English for names/descriptions; translations via Django i18n framework (existing B04)
10. **Credit thresholds**: Low-balance alert triggers at <500 credits (business logic assumption, can be configured via B10 feature flags)
