# Implementation Plan: B26 Project-Level Access Control
*Path: [kitty-specs/038-project-access-control/plan.md](kitty-specs/038-project-access-control/plan.md)*

**Branch**: `feature/038-project-access-control` | **Date**: 2026-01-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/kitty-specs/038-project-access-control/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `.kittify/templates/commands/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

Implement explicit project membership management alongside organization-based implicit access. Users can invite other members to specific projects, assign roles (viewer/editor/admin), and promote users requiring admin acceptance above configured threshold. Private projects enforce explicit membership only. Integrates with B08 (hierarchical permissions), B09 (audit logging), B10 (feature flags for extensibility), B16 (notifications), and F01 (UI components). Permission resolution uses hybrid caching (request-scoped + Redis with event-driven invalidation). Rate limiting handled via B03 decorators. Emergency override model allows organization admins to access private projects.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Python 3.12+
**Primary Dependencies**: Django 5.x, Django REST Framework 3.x, Redis 7.x (caching), Celery 5.x (background tasks)
**Storage**: PostgreSQL 16 (primary database), Redis (cache layer for permission resolution)
**Testing**: pytest 8.x, pytest-django, factory_boy (test fixtures), pytest-cov (coverage), Faker (realistic test data)
**Target Platform**: Linux server (Railway deployment), Windows/macOS development
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**: Permission resolution <50ms (p95), cache hit rate >80%, API response time <200ms (p95)
**Constraints**: Zero-downtime deployment required, OWASP ASVS V4.0 Level 2 compliance, support 1000+ members per organization, backward compatibility with existing B08 permission system
**Scale/Scope**: 10,000+ organizations, 100,000+ projects, 1,000,000+ users, 20 API endpoints, 4 Django models, 60 tests (90% backend coverage, 85% frontend coverage)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

<!--
  Verify implementation plan complies with Django Core-App Constitution.
  Reference: .kittify/memory/constitution.md

  Mark each check as:
  ✅ PASS - Compliant
  ⚠️ NEEDS REVIEW - Potential issue requiring justification
  ❌ VIOLATION - Non-compliant (must be resolved or justified)
-->

### I. Purpose and Scope
- [x] **Product-Agnostic**: ✅ PASS - No product-specific logic. Uses "projects" terminology. Demo uses football leagues/teams but core models remain generic. Extension points via B10 feature flags.
- [x] **Core Focus**: ✅ PASS - Project membership is core concern alongside organizations. Aligns with B08 (accounts/orgs), extends project access model.
- [x] **Downstream Extension**: ✅ PASS - 7 feature flags documented (`project_access_control.enabled`, `.require_invitation`, `.require_promotion_approval`, `.promotion_approval_threshold`, `.external_user_discovery`, `.private_projects`, `.org_admin_override`) for product customization.

### II. Architecture and Modularity
- [x] **Single Responsibility**: ✅ PASS - Project membership logic isolated to `apps/projects/` Django app. Clear separation: ProjectMembership (access), ProjectInvite (onboarding), ProjectMembershipPromotion (elevation).
- [x] **Stable APIs**: ✅ PASS - REST endpoints follow DRF conventions. Versioning via `Accept: application/vnd.core-app.v1+json` (future). Deprecation strategy documented.
- [x] **Minimal Dependencies**: ✅ PASS - No new external dependencies. Uses existing: Django 5.x, DRF, Redis, Celery, B08/B09/B10/B16 internal modules.
- [x] **No Circular Deps**: ✅ PASS - Dependency graph: B26 → B08 (permissions) → B09 (audit) → B10 (flags) → B16 (notifications). No backward dependencies.
- [x] **No Downstream Imports**: ✅ PASS - Core does not import from products. Extension via signals, feature flags, and override hooks only.

### III. Code Quality and Style
- [x] **Python 3.12+**: ✅ PASS - Baseline version 3.12+. Uses structural pattern matching, Self type hints, ParamSpec.
- [x] **Type Hints**: ✅ PASS - All public methods typed. Models use Django-stubs annotations. Services return TypedDicts for cache entries.
- [x] **Black Formatting**: ✅ PASS - Pre-commit hook configured. CI enforces Black formatting.
- [x] **Ruff Linting**: ✅ PASS - Ruff primary linter. 0 violations in plan. Config: line-length=100, select=["E", "F", "I", "N", "W", "UP"].
- [x] **No Dead Code**: ✅ PASS - Implementation removes existing mock permissions. No deprecated patterns carried forward.
- [x] **Readable Code**: ✅ PASS - Functions <50 lines. Services follow single responsibility. Permission resolution split into 5 steps (see research.md).
- [x] **Curated Dependencies**: ✅ PASS - Zero new dependencies added. Reuses existing stack (Django, DRF, Redis).

### IV. Testing Strategy
- [x] **pytest + pytest-django**: ✅ PASS - Testing framework standardized on pytest-django. Fixtures use factory_boy for realistic data.
- [x] **Test Coverage**: ✅ PASS - 60 tests planned across 5 categories (unit/integration/permission/security/regression). 90% backend, 85% frontend targets.
- [x] **Regression Tests**: ✅ PASS - Each edge case (23 documented in spec) will have corresponding regression test. Bug fixes require test-first approach.
- [x] **Deterministic**: ✅ PASS - No time-dependent tests (uses freezegun for expiry checks). No randomness. Database isolation via pytest-django transactions.
- [x] **Coverage Thresholds**: ✅ PASS - Backend 90% (pytest-cov), frontend 85% (Vitest). CI enforces thresholds. Critical paths (permission resolution) require 100%.
- [x] **Integration Tests**: ✅ PASS - Key flows covered: invite flow (send → accept → verify access), promotion flow (request → approve → elevate), search flow (discover → invite), private project enforcement.

### V. Security and Privacy
- [x] **Secure Defaults**: ✅ PASS - Private projects disabled by default (require feature flag). Promotion approval required for admin elevation. CSRF protection via DRF.
- [x] **DEBUG Off**: ✅ PASS - DEBUG=False in Railway deployment. Enforced via environment checks.
- [x] **No Secrets**: ✅ PASS - No secrets in code. Invitation tokens generated via `secrets.token_urlsafe(32)`. Redis connection via DATABASE_URL env var.
- [x] **Dependency Scanning**: ✅ PASS - Dependabot configured. CI runs safety check on requirements. No new dependencies = no new vulnerabilities.
- [x] **Centralized Auth**: ✅ PASS - Uses B08 `AccessControlManager.check_permission()`. No custom auth logic. Integrates with existing JWT/session auth.
- [x] **No Sensitive Logging**: ✅ PASS - Audit logs sanitize PII. Invitation tokens never logged. User search results filtered by permission checks.

### VI. Performance and Reliability
- [x] **No N+1 Queries**: ✅ PASS - Permission resolution uses `select_related('organization', 'project__organization')`. Batch membership checks via `prefetch_related('members')`. 12 indexes documented (see data-model.md).
- [x] **Pagination**: ✅ PASS - All list endpoints use DRF `PageNumberPagination` (default 25, max 100). Member lists, invitation lists, promotion requests paginated.
- [x] **Explicit Caching**: ✅ PASS - Hybrid strategy documented: request-scoped (in-memory for single request), Redis (300s TTL, event-driven invalidation). Cache hit rate >80% target.
- [x] **Structured Logging**: ✅ PASS - Uses Python `logging` module with structured context: `logger.info("membership_created", extra={"project_id": ..., "user_id": ..., "role": ...})`.
- [x] **Health Checks**: ✅ PASS - `/health/` endpoint extended with membership system checks: database connectivity, Redis cache, Celery queue depth.
- [x] **Metrics Hooks**: ✅ PASS - Observability via B09 audit events: `project.membership.created`, `project.membership.role_changed`, `project.invite.sent`. Prometheus metrics for permission resolution time.
- [x] **Graceful Degradation**: ✅ PASS - Cache miss falls back to database. Redis failure degrades to request-scoped cache only. Notification failures logged but don't block membership operations.

### VII. UX and API Design
- [x] **DRF Required**: ✅ PASS - All endpoints use Django REST Framework. Serializers for ProjectMembership, ProjectInvite, ProjectMembershipPromotion.
- [x] **Consistent Responses**: ✅ PASS - Standard envelope: `{"data": {...}, "meta": {"pagination": ...}, "errors": []}`. Error codes follow RFC 7807 Problem Details.
- [x] **Versioning Strategy**: ✅ PASS - Breaking changes handled via Accept header versioning. Current: v1 (implicit). Deprecation notices 6 months before removal.
- [x] **Clear Errors**: ✅ PASS - Error messages user-safe: "You do not have permission to add members to this project." Internal details (stack traces) only in DEBUG mode. No PII in error responses.
- [x] **Boundary Validation**: ✅ PASS - All validation in DRF serializers: email format (ProjectInviteSerializer), role choices (ProjectMembershipSerializer), expiry dates (future only).

### VIII. Developer Experience and Tooling
- [x] **Easy Setup**: ✅ PASS - Local setup via `docker-compose.local.yml`. Seeding commands: `python manage.py seed_memberships --projects=5 --members-per-project=10`. Documentation in quickstart.md (Phase 1 deliverable).
- [x] **Mandatory Tools**: ✅ PASS - Black, Ruff, mypy, pytest configured in pre-commit hooks. CI runs all checks. Failures block merge.
- [x] **Pre-commit Hooks**: ✅ PASS - `.pre-commit-config.yaml` includes: black, ruff, mypy, trailing-whitespace, end-of-file-fixer. Hooks match CI exactly.
- [x] **Type Checking**: ✅ PASS - mypy runs cleanly with `--strict` mode on core modules. Django models use django-stubs. Return types annotated for all services.
- [x] **Task Scripts**: ✅ PASS - Common operations scripted: `scripts/seed_memberships.py`, `scripts/invalidate_permission_cache.py`, `scripts/check_suspicious_promotions.py`.
- [x] **Developer Docs**: ✅ PASS - Setup documented in `docs/getting-started/project-access.md`. Extension guide in `docs/guides/extending-project-access.md` (Phase 1 deliverable).

### IX. Branching and Git Workflow
- [x] **Feature Branch**: ✅ PASS - Work occurs on `feature/038-project-access-control` branch. Already checked out.
- [x] **Linked to Spec**: ✅ PASS - PR will reference `kitty-specs/038-project-access-control/spec.md` and `plan.md`. GitHub PR template auto-populates spec link.
- [x] **Focused PRs**: ✅ PASS - Single feature (project membership). No unrelated changes. Estimated 2000-3000 LOC (models + serializers + views + tests).
- [x] **main Stable**: ✅ PASS - No direct commits to main. Merge via PR with 2 required approvals. CI must pass (tests, coverage, linting).

### X. CI/CD and Quality Gates
- [x] **CI Checks**: ✅ PASS - GitHub Actions workflow: Black, Ruff, mypy, pytest, coverage (90% backend, 85% frontend). Railway auto-deploy on main.
- [x] **Merge Gates**: ✅ PASS - All CI checks must pass. 2 approvals required. Branch must be up-to-date with main. No merge commits (squash only).
- [x] **Scripted Deployment**: ✅ PASS - Railway deployment automated via `railway.json` config. Database migrations run automatically. Zero-downtime via health checks.

### XI. Documentation and Knowledge Sharing
- [x] **In-Repo Docs**: ✅ PASS - Documentation in `docs/` directory. MkDocs configuration in `mkdocs.yml`. Deployed to Railway alongside app.
- [x] **App README**: ✅ PASS - `src/apps/projects/README.md` exists. Will be updated with membership model details, permission resolution flow, extension points.
- [x] **Getting Started**: ✅ PASS - `docs/getting-started/project-access.md` will document: setup, seeding, testing, common workflows.
- [x] **Extension Guide**: ✅ PASS - `docs/guides/extending-project-access.md` planned (Phase 1). Covers: custom roles, invitation workflows, permission checks, feature flag usage.
- [x] **Spec Sync**: ✅ PASS - Spec updated with clarifications (Session 2026-01-04). Plan references spec. Implementation will update spec with any deviations.
- [x] **ADR Required**: ✅ PASS - ADR-026 created: "Project-Level Access Control Architecture". Documents: hybrid caching decision, separate promotion model, emergency override pattern.

### XII. Constitution Evolution
- [x] **No Constitution Changes**: ✅ PASS - No constitution amendments required. Feature aligns with existing principles (product-agnostic, modular, secure by default).
- [x] **Template Updates**: ✅ PASS - No template changes required. Uses existing Django model, DRF serializer, pytest patterns.

### Violations Requiring Justification

*No violations detected. All constitution principles satisfied.*

**Constitution Check Status**: ✅ PASS

## Project Structure

### Documentation (this feature)

```
kitty-specs/038-project-access-control/
├── plan.md              # This file (/spec-kitty.plan command output)
├── spec.md              # Feature specification (52 FRs, 9 user stories)
├── research/
│   ├── research.md      # Phase 0 output: 5 technical decisions documented
│   └── data-model.md    # Phase 0 output: Entity schemas, validation, state machines
├── contracts/           # Phase 1 output: OpenAPI specifications (20 endpoints planned)
├── quickstart.md        # Phase 1 output: Developer setup and testing guide
└── tasks.md             # Phase 2 output (/spec-kitty.tasks command - NOT created yet)
```

### Source Code (repository root)

```
# Web application structure (Django backend + React frontend)
src/
├── apps/
│   └── projects/        # Django app for project management (existing, to be extended)
│       ├── models/
│       │   ├── project.py                      # Extended with is_private field
│       │   ├── project_membership.py           # NEW: Explicit membership model
│       │   ├── project_invite.py               # NEW: Invitation workflow
│       │   └── project_membership_promotion.py # NEW: Role elevation with approval
│       ├── serializers/
│       │   ├── membership_serializer.py        # NEW: ProjectMembership CRUD
│       │   ├── invite_serializer.py            # NEW: Invitation flow
│       │   └── promotion_serializer.py         # NEW: Promotion requests
│       ├── views/
│       │   ├── membership_viewset.py           # NEW: Member management endpoints
│       │   ├── invite_viewset.py               # NEW: Invitation endpoints
│       │   └── promotion_viewset.py            # NEW: Promotion approval endpoints
│       ├── services/
│       │   ├── permission_resolution.py        # NEW: 5-step permission resolver
│       │   ├── invitation_service.py           # NEW: Token generation, email dispatch
│       │   ├── promotion_service.py            # NEW: Approval workflow, notifications
│       │   └── cache_service.py                # NEW: Hybrid caching (request + Redis)
│       ├── signals.py                          # NEW: Event-driven cache invalidation
│       ├── admin.py                            # Extended with new models
│       ├── urls.py                             # Extended with membership routes
│       └── README.md                           # Updated with membership docs
│   ├── security/        # B03 Security Baseline (existing, unchanged)
│   │   └── decorators.py                       # rate_limit decorator (reused)
│   ├── access_control/  # B08 Hierarchical Access Control (existing, extended)
│   │   ├── managers.py                         # AccessControlManager (extended)
│   │   └── models.py                           # Permission model (reused)
│   ├── audit/           # B09 Audit Logging (existing, extended)
│   │   └── signals.py                          # Audit event dispatcher (extended)
│   ├── feature_flags/   # B10 Feature Flags (existing, extended)
│   │   └── models.py                           # FeatureFlag model (7 new flags)
│   └── notifications/   # B16 Notifications (existing, extended)
│       └── tasks.py                            # Celery tasks (invitation/promotion emails)
└── core/
    └── settings.py                             # Extended with B26 feature flags

packages/
└── frontend/
    └── src/
        ├── components/
        │   └── ProjectAccessControl/           # NEW: UI components (via F01)
        │       ├── MemberList.tsx              # Member table with actions
        │       ├── InviteMemberModal.tsx       # Invitation form
        │       ├── PromotionRequestCard.tsx    # Admin approval UI
        │       └── PermissionMatrix.tsx        # Role capabilities display
        ├── services/
        │   └── projectMembershipService.ts     # NEW: API client (20 endpoints)
        └── hooks/
            └── useProjectMembers.ts            # NEW: React Query hooks

tests/
├── unit/
│   └── apps/
│       └── projects/
│           ├── test_models.py                  # NEW: 15 tests (validation, state transitions)
│           ├── test_serializers.py             # NEW: 10 tests (boundary validation)
│           └── test_services.py                # NEW: 15 tests (permission resolution, caching)
├── integration/
│   └── test_membership_flows.py                # NEW: 10 tests (invite, promote, search)
└── contract/
    └── test_membership_api.py                  # NEW: 10 tests (OpenAPI compliance)
```

**Structure Decision**: Web application structure selected. Django backend extends existing `apps/projects/` app with 4 new models, 3 viewsets, 4 services. React frontend adds ProjectAccessControl component tree in `packages/frontend/`. Testing follows existing pytest-django (backend) + Vitest (frontend) patterns. No new Django apps created—maintains single responsibility of projects app.

## Complexity Tracking

*No violations detected—section included for reference only.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

**Complexity Assessment**: Feature follows "Guardrails not walls" philosophy from PROJECT_VISION.md. Hybrid permission model (explicit + implicit) adds complexity but enables product flexibility. Separate ProjectMembershipPromotion entity adds model overhead but prevents audit log gaps and enables sophisticated approval workflows. All complexity justified by extensibility requirements (7 feature flags enable downstream customization without core modifications).
