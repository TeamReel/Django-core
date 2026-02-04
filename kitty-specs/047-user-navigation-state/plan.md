# Implementation Plan: User Navigation State (B41)
*Path: [templates/plan-template.md](templates/plan-template.md)*

**Branch**: `047-user-navigation-state` | **Date**: 2026-02-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `.kitty-specs`

## Summary
Implements server-side "Recents" and "Favorites" persistence using Django's `GenericForeignKey` for polymorphic links to any system object.
**Key Features**:
- **Smart Pruning**: Hybrid Cap (Max 50 items + 90 days retention).
- **Secure Access**: "Stale Link" protection filters inaccessible items during read-time without breaking history.
- **Top-Level API**: `/api/v1/navigation/` namespace.

## Technical Context
**Language/Version**: Python 3.12+ (Django Core Standard)
**Primary Dependencies**:
- `Django REST Framework` (API)
- `django.contrib.contenttypes` (Polymorphic Links)
**Storage**: PostgreSQL (Indices on `last_seen_at` and `user_id`)
**Testing**: `pytest` (Coverage > 85%)
**Project Type**: Core Module (`src/core/navigation` or similar)
**Performance Goals**:
- Read < 100ms (P95) for list endpoints.
- Write < 50ms for "log visit".
**Constraints**:
- Strict 50 item cap per user to prevent table bloat.
- Must handle "soft deleted" or "permission revoked" objects gracefully.

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Purpose and Scope
- [x] **Product-Agnostic**: Logic is generic (`content_type` + `path`), no hardcoded "Matches" or "Players".
- [x] **Core Focus**: Navigation history is a cross-cutting concern like Audit Logging.

### II. Architecture
- [x] **Modularity**: New app `navigation` with clear public API. No reverse imports from Core to downstream apps.
- [x] **Dependencies**: Uses standard Django GFK.

### III. Code Quality
- [x] **Standards**: Python 3.12, Type Hints, Black formatting.

### IV. Testing
- [x] **Coverage**: Will include `test_models.py` (>90%) and `test_api.py` (>85%).
- [x] **Performance**: Will test 51st item insertion (pruning) and N+1 verification.

## Phase 0: Research & Discovery
- [x] **Architecture**: Selected `GenericForeignKey` for loose coupling.
- [x] **Performance**: Selected "Batch-Group-Fetch" pattern for permission checks to avoid N+1.
- [x] **Guardrails**: Selected "Hybrid Cap" (Count=50) for storage hygiene.
*Outputs*: `research.md` (Complete)

## Phase 1: Design & Contracts
- [x] **Data Model**: Defined `UserRecent` and `UserFavorite` with `NavigationBase` mixin.
- [x] **API Contract**: Defined OpenAPI spec for `/api/v1/navigation/{recents,favorites}/`.
*Outputs*: `data-model.md`, `contracts/openapi.yaml`, `quickstart.md` (Complete)

## Phase 2: Implementation Steps
1.  **Scaffold App**: Create `src/navigation` (or expected path).
2.  **Models**: Implement `NavigationBase`, `UserRecent`, `UserFavorite`.
3.  **Signals/Services**: Implement `prune_old_recents` logic on save.
4.  **Serializers**: Create `NavigationItemSerializer` with GFK lookup.
5.  **API Views**: Implement `RecentViewSet` and `FavoriteViewSet` with `permission_classes`.
6.  **Tests**: Write units for Pruning (50+1), Permission Checks (Restricted Item), and API.
