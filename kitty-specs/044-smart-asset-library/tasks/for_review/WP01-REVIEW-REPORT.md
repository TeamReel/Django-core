# WP01 Core Models & API - Code Review Report

**Reviewer**: GitHub Copilot (Claude)
**Date**: 2026-02-02
**Work Package**: WP01 - Core Models & API
**Review Status**: ⚠️ **CHANGES REQUESTED**

---

## Executive Summary

The implementation is **95% complete** with solid fundamentals but requires **1 CRITICAL FIX** and **2 minor improvements** before approval.

**CRITICAL ISSUE**: State enum values mismatch between contract and implementation.

**Recommendation**: Return to `doing` lane → fix state enum → resubmit for approval.

---

## Review Criteria

### ✅ Completeness Check
All 7 subtasks implemented:
- [x] T001: MediaItem model (24 fields)
- [x] T002: MediaTag model (hybrid scope pattern)
- [x] T003: Collection + CollectionMembership models
- [x] T004: MediaItemSerializer with nested tags
- [x] T005: MediaItemViewSet with project scoping
- [x] T006: MediaTagViewSet with scope filtering
- [x] T007: Admin configuration

### ✅ System Integration
- Django checks: **PASS** (0 errors)
- Migrations: **GENERATED** (0001_initial.py)
- App registration: **COMPLETE** (settings + URLs)
- Dependencies: **RESOLVED** (files.FileAsset, projects.Project)

### ❌ Contract Compliance
**CRITICAL MISMATCH DETECTED**:

| Component | Contract (openapi.yaml) | Implementation (models.py) | Status |
|-----------|------------------------|---------------------------|--------|
| State Enum | `raw, processing, processed, error, archived` | `pending, processing, ready, error` | ❌ **FAIL** |
| FK Reference | `storage.FileAsset` | `files.FileAsset` | ✅ **CORRECT** (files is real module) |
| Timestamp Base | `TimeStampedModel` | Direct `created_at/updated_at` | ⚠️ **DEVIATION** (acceptable) |

**Impact**: Frontend and API consumers expecting `raw/processed/archived` states will break. This is a contract violation.

---

## Detailed Findings

### 🔴 CRITICAL: State Enum Mismatch

**Location**: [src/medialib35/models.py#L13-L17](../../../src/medialib35/models.py)

**Expected** (per contracts/openapi.yaml#L517):
```python
class MediaItemState(models.TextChoices):
    RAW = "raw", "Raw Upload"
    PROCESSING = "processing", "Processing"
    PROCESSED = "processed", "Processed"
    ERROR = "error", "Error"
    ARCHIVED = "archived", "Archived"
```

**Actual**:
```python
class MediaItemState(models.TextChoices):
    PENDING = "pending", "Pending Processing"  # ❌ Should be RAW
    PROCESSING = "processing", "Processing"     # ✅ Correct
    READY = "ready", "Ready"                    # ❌ Should be PROCESSED
    ERROR = "error", "Error"                    # ✅ Correct
    # ❌ Missing ARCHIVED state
```

**Required Fix**:
1. Rename `PENDING → RAW`
2. Rename `READY → PROCESSED`
3. Add `ARCHIVED` state
4. Update default value: `default=MediaItemState.RAW`
5. Regenerate migration (will require data migration if DB has data)

---

### ⚠️ MINOR: App Name Deviation

**Issue**: Spec prescribes `src/assets/` but implementation uses `src/medialib35/`.

**Rationale**: Django `startapp` naming conflicts forced workaround (all attempted names rejected).

**Decision**: ✅ **ACCEPTED** - Documented technical constraint. Update future specs to reflect `medialib35`.

**Action**: None required for WP01. Update `spec.md` in WP09 documentation phase.

---

### ⚠️ MINOR: TimeStampedModel Base Class

**Issue**: Spec example shows `TimeStampedModel` inheritance but implementation uses direct fields.

**Actual Implementation**:
```python
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)
```

**Decision**: ✅ **ACCEPTED** - `TimeStampedModel` doesn't exist in codebase. Direct fields are idiomatic Django.

**Action**: None required.

---

### ✅ STRENGTHS

1. **Proper UUIDs**: All models use UUID primary keys (GDPR-safe, distributed-safe)
2. **Indexes**: Strategic indexes on `(project, -created_at)` and `state` for query performance
3. **Security**: All ViewSets filter by `project__memberships__user` (prevents cross-project leaks)
4. **Hybrid Scope**: MediaTag correctly implements system vs. project tagging (`is_system` + nullable `project`)
5. **Through Table**: CollectionMembership uses `position` field for ordered collections
6. **Admin UX**: Uses `raw_id_fields` to avoid autocomplete registration issues
7. **Code Quality**: Clean imports, proper docstrings, PEP8 compliance

---

## Test Coverage Analysis

**Current State**: `tests.py` contains only placeholder docstring.

**Required** (per Constitution WP09 requirements):
- ≥90% model coverage (T037)
- ≥85% API coverage (T038)

**Status**: ⏭️ **DEFERRED TO WP09** - Test implementation is scheduled for dedicated testing work package.

**Action**: None required for WP01 approval.

---

## Security Review

### ✅ Authorization
All querysets filter by project membership:
```python
.filter(project__memberships__user=self.request.user)
```

### ✅ Sensitive Data
- No plain-text credentials
- File URLs expected to use presigned URLs (B22 responsibility)
- UUID IDs prevent enumeration attacks

### ⚠️ Input Validation
**Future Enhancement** (not blocking): Consider adding validators for:
- `mime_type` format (RFC compliance)
- `file_size_bytes` upper limit (DoS prevention)
- `duration_seconds` range validation

---

## Migration Safety

**Generated Migration**: `0001_initial.py`

**Operations**:
1. Create `medialib_items` table (24 fields)
2. Create `medialib_tags` table (7 fields)
3. Create `medialib_collections` table (7 fields)
4. Create `medialib_collection_membership` table (4 fields)
5. Add indexes (2 per table)
6. Add FK constraints

**Safety Check**: ✅ **SAFE** - Initial migration, no data at risk.

**CRITICAL**: After fixing state enum, a **new migration** will be required:
- If DB is empty: Safe to delete 0001 and regenerate
- If DB has data: Require data migration to rename state values

---

## API Endpoint Verification

**Expected Endpoints** (per contracts/openapi.yaml):

| Endpoint | Method | Implementation | Status |
|----------|--------|----------------|--------|
| `/api/v1/media/items/` | GET, POST | MediaItemViewSet | ✅ |
| `/api/v1/media/items/{id}/` | GET, PATCH, DELETE | MediaItemViewSet | ✅ |
| `/api/v1/media/tags/` | GET, POST | MediaTagViewSet | ✅ |
| `/api/v1/media/tags/{id}/` | GET, PATCH, DELETE | MediaTagViewSet | ✅ |
| `/api/v1/media/collections/` | GET, POST | CollectionViewSet | ✅ |
| `/api/v1/media/collections/{id}/` | GET, PATCH, DELETE | CollectionViewSet | ✅ |
| `/api/v1/media/collections/{id}/items/` | POST, DELETE | add_item, remove_item actions | ✅ |

**Routing**: ✅ Registered in `src/config/urls.py#path("api/v1/media/", ...)`

**Missing Features** (deferred to later WPs):
- `/items/{id}/tags/` - Add/remove tags (WP03 Enhanced Tagging)
- `/items/{id}/relations/` - Context relations (WP06)
- `/items/{id}/thumbnails/` - Thumbnail generation (WP04 Extraction)

---

## Acceptance Criteria

| Criteria | Status | Notes |
|----------|--------|-------|
| Models follow data-model.md | ⚠️ **PARTIAL** | State enum mismatch |
| Django checks pass | ✅ **PASS** | 0 errors |
| Migrations generated | ✅ **PASS** | 0001_initial.py |
| API matches openapi.yaml | ⚠️ **PARTIAL** | State values wrong |
| Project scoping enforced | ✅ **PASS** | All queries filter by membership |
| Admin registered | ✅ **PASS** | 3 models |
| Code committed | ✅ **PASS** | Commit present |

---

## Decision: CHANGES REQUESTED

**Blocking Issue**: State enum contract violation.

**Required Actions**:
1. ✅ **Fix state enum in models.py** (critical)
2. ✅ **Update default value** (critical)
3. ✅ **Regenerate migration** (critical)
4. ✅ **Update task frontmatter** (`lane: doing` → `lane: for_review`)
5. ⏭️ Update spec.md to reflect `medialib35` app name (defer to WP09)

**Estimated Time**: 15 minutes

---

## Recommended Fix

```python
# src/medialib35/models.py (lines 13-17)
class MediaItemState(models.TextChoices):
    RAW = "raw", "Raw Upload"
    PROCESSING = "processing", "Processing"
    PROCESSED = "processed", "Processed"
    ERROR = "error", "Error"
    ARCHIVED = "archived", "Archived"

# Line 41: Update default
state = models.CharField(
    max_length=20, choices=MediaItemState.choices, default=MediaItemState.RAW
)
```

**Then**:
1. Delete `src/medialib35/migrations/0001_initial.py`
2. Run `python manage.py makemigrations medialib35`
3. Verify new migration has correct enum values
4. Commit fix: `git commit -m "fix(B35): Align state enum with API contract"`

---

## Next Steps

1. **Agent**: Return WP01 to `doing` lane
2. **Agent**: Apply state enum fix
3. **Agent**: Regenerate migration
4. **Agent**: Commit changes
5. **Agent**: Move back to `for_review` with comment
6. **Reviewer**: Re-review (expected: APPROVE)
7. **System**: Move to `complete` lane
8. **Next WP**: Begin WP02 (Metadata Extraction)

---

## Appendix: File Manifest

**Created Files**:
- `src/medialib35/__init__.py`
- `src/medialib35/apps.py`
- `src/medialib35/models.py` (152 lines)
- `src/medialib35/serializers.py` (123 lines)
- `src/medialib35/views.py` (174 lines)
- `src/medialib35/admin.py` (52 lines)
- `src/medialib35/urls.py` (14 lines)
- `src/medialib35/tests.py` (placeholder)
- `src/medialib35/migrations/__init__.py`
- `src/medialib35/migrations/0001_initial.py` (⚠️ requires regeneration)

**Modified Files**:
- `src/config/settings/base.py` (added medialib35 to INSTALLED_APPS)
- `src/config/urls.py` (added /api/v1/media/ route)

**Total Lines**: ~500 new lines of production code

---

**Review Signature**: GitHub Copilot (Claude) | 2026-02-02T19:10:00Z
