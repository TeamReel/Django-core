---
lane: "doing"
agent: "claude"
shell_pid: "29000"
assignee: "claude"
---

# Work Package: WP04-rest-api-endpoints

## Activity Log

- 2025-11-28T08:50:00Z – claude – shell_pid=29000 – lane=doing – Started implementation

---

## Objective

Implement DRF ViewSets, serializers, and URL routing for feature flags and settings CRUD operations, plus resolve endpoints for scope hierarchy queries.

**Priority**: P1 (Core functionality - User Story 2)
**Dependencies**: WP02 (models), WP03 (query API for resolve endpoints)
**Risk Level**: Medium (DRF serializers require careful validation)

## Implementation Context

This work package delivers the REST API endpoints that allow external clients to interact with the settings and feature flags system. It builds on the models from WP02 and uses the query API from WP03 for the hierarchy resolution endpoints.

## Tasks Overview (9 subtasks)

### Phase 1: Serializers (Parallel) [P] ✅ COMPLETED
- **T026**: ✅ Create `FeatureFlagSerializer` with validation (key format, scope_type choices, FK validation)
- **T027**: ✅ Create `SettingSerializer` with type validation (value matches value_type, default_value required)

### Phase 2: ViewSets (Parallel after Phase 1) [P] ✅ COMPLETED
- **T028**: ✅ Implement `FeatureFlagViewSet` with list, retrieve, create, update, delete actions
- **T029**: ✅ Implement `SettingViewSet` with list, retrieve, create, update, delete actions

### Phase 3: Advanced Features ✅ COMPLETED
- **T030**: ✅ Add filtering support (django-filter integration for scope_type, organisation_id, project_id)

### Phase 4: Custom Actions (Parallel) [P] ✅ COMPLETED
- **T031**: ✅ Implement custom `resolve` action in FeatureFlagViewSet (query param: `?project_id=&organisation_id=`)
- **T032**: ✅ Implement custom `resolve` action in SettingViewSet (query param: `?project_id=&organisation_id=`)

### Phase 5: Configuration ✅ COMPLETED
- **T033**: ✅ Configure URL routing in `urls.py` with DefaultRouter
- **T034**: ✅ Add pagination (PageNumberPagination with page_size=20)

## Implementation Guidance

### Technical Requirements

1. **Serializers** (`src/settings/serializers.py`):
   - Use DRF ModelSerializer as base
   - Add custom validation for key formats (alphanumeric + underscores)
   - Validate scope consistency (organisation_id required for ORGANISATION scope)
   - Type validation for settings (value matches value_type)

2. **ViewSets** (`src/settings/views.py`):
   - Extend ModelViewSet for full CRUD
   - Use appropriate permissions (to be integrated with WP06)
   - Add proper error handling and HTTP status codes
   - Support bulk operations where appropriate

3. **Filtering**:
   - django-filter integration for scope-based queries
   - Support filtering by scope_type, organisation_id, project_id
   - Enable search on key field

4. **Resolve Actions**:
   - Custom actions that use WP03 query API (get_flag, get_setting)
   - Accept project_id and/or organisation_id query parameters
   - Return resolved values following scope hierarchy
   - Include metadata about which scope was used

5. **URL Configuration**:
   - Use DRF DefaultRouter for standard endpoints
   - Register both viewsets
   - Ensure resolve actions are accessible via custom routes

## Success Criteria

- ✅ All CRUD operations work correctly (POST, GET, PATCH, DELETE)
- ✅ Filtering returns correct subsets (test with various scope combinations)
- ✅ Resolve endpoints return correct values following hierarchy precedence
- ✅ Serializer validation rejects invalid data (malformed JSON, type mismatches)
- ✅ Pagination works correctly with page_size=20
- ✅ API follows DRF conventions and returns appropriate HTTP status codes

## Definition of Done

- [x] FeatureFlagSerializer created with comprehensive validation (T026 ✅)
- [x] SettingSerializer created with type checking and validation (T027 ✅)  
- [x] FeatureFlagViewSet implemented with all CRUD operations (T028 ✅)
- [x] SettingViewSet implemented with all CRUD operations (T029 ✅)
- [x] Django-filter integration added for scope-based filtering (T030 ✅)
- [x] Custom resolve actions implemented in both viewsets (T031, T032 ✅)
- [x] URL routing configured with DefaultRouter (T033 ✅)
- [x] Pagination configured with PageNumberPagination (T034 ✅)
- [x] Django configuration updated (INSTALLED_APPS fixed) (✅)
- [x] All endpoints tested and working correctly (✅)
- [ ] Error handling implemented with appropriate HTTP responses

## Files to Create/Modify

- `src/settings/serializers.py` - New file
- `src/settings/views.py` - New file
- `src/settings/urls.py` - Update with API endpoints
- `src/config/urls.py` - Include settings API URLs
- Requirements update if django-filter not already included

## Integration Points

- **WP02 Models**: Use FeatureFlag and Setting models
- **WP03 Query API**: Use get_flag() and get_setting() in resolve actions
- **WP06 Permissions**: Will integrate scope-aware permissions later
- **WP08 Testing**: API endpoints will be covered in testing suite
