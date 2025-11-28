# Research: Settings & Feature Flags System
*Phase 0 Output - Technical Research*

**Feature**: B10 Settings & Feature Flags
**Date**: 2025-01-27
**Status**: In Progress

## Research Questions

### 1. Redis Pub/Sub for Cache Invalidation

**Question**: What is the recommended pattern for Redis pub/sub to coordinate cache invalidation across multiple Django instances?

**Research Areas**:
- Django-redis pub/sub integration patterns
- Channel naming conventions for multi-tenant systems
- Error handling when Redis pub/sub is unavailable
- Message serialization formats (JSON vs MessagePack)
- Latency characteristics of Redis pub/sub (expected propagation time)

**Initial Findings**:
- Django-redis supports pub/sub via `cache.client.get_client().pubsub()`
- Common pattern: publish on model save signal, subscribe in separate listener thread
- Channel naming: `settings:invalidate:{scope_type}:{scope_id}:{key}` for targeted invalidation
- Fallback strategy: TTL-based expiry when pub/sub unavailable

**References**:
- django-redis documentation: https://github.com/jazzband/django-redis
- Redis pub/sub patterns: https://redis.io/topics/pubsub

**Decision Impact**: Determines cache.py implementation architecture and error handling strategy.

---

### 2. Django Nullable Foreign Keys for Global Scope

**Question**: What are the best practices for nullable foreign keys in Django when modeling optional relationships (global scope with scope_id=NULL)?

**Research Areas**:
- Unique constraint behavior with NULL values in PostgreSQL
- Index performance implications of nullable foreign keys
- Django ORM query patterns for NULL FK filtering
- Migration strategies for adding nullable FKs to existing models
- Django Admin behavior with NULL foreign keys

**Initial Findings**:
- PostgreSQL unique constraints treat NULL as distinct (multiple NULL rows allowed)
- Django ORM: `scope_id__isnull=True` for global scope queries
- Composite unique constraint: `UniqueConstraint(fields=['key', 'scope_type', 'scope_id'], name='unique_flag_key_scope')`
- Index recommendation: Partial index excluding NULL for scope-specific queries

**References**:
- Django model field reference: https://docs.djangoproject.com/en/5.1/ref/models/fields/#null
- PostgreSQL NULL semantics: https://www.postgresql.org/docs/current/indexes-partial.html

**Decision Impact**: Determines model field definitions and database index strategy.

---

### 3. Django REST Framework Permission Classes for Scope-Aware Access

**Question**: How to implement scope-aware permissions in DRF that integrate with existing B08 RBAC system?

**Research Areas**:
- Custom DRF permission class patterns
- Integration with Django's permission framework
- Scope extraction from request context (organisation_id, project_id from URL or JWT)
- Permission checking for nested resources (project → organisation → global hierarchy)
- Performance implications of permission checks (database queries per request)

**Initial Findings**:
- Custom permission class: inherit from `permissions.BasePermission`
- Check method: `has_permission()` for list/create, `has_object_permission()` for retrieve/update/delete
- Scope extraction: URL kwargs (`/api/orgs/{org_id}/flags/`) or authenticated user context
- Integration pattern: Call B08 RBAC's `user.has_perm('settings.change_featureflag', obj=organisation)`

**References**:
- DRF permissions: https://www.django-rest-framework.org/api-guide/permissions/
- Django object-level permissions: https://docs.djangoproject.com/en/5.1/topics/auth/customizing/#custom-permissions

**Decision Impact**: Determines permissions.py implementation and API URL structure.

---

### 4. Setting Value Type Validation Patterns

**Question**: What is the recommended approach for storing and validating typed setting values (string, int, bool, JSON) in a single database column?

**Research Areas**:
- Django JSONField vs TextField with type discriminator
- DRF serializer validation for typed values
- Type coercion patterns (string "true" → bool True)
- Default value storage format
- Migration strategy for changing setting types

**Initial Findings**:
- Use `JSONField` for value storage (supports all types natively)
- Separate `value_type` CharField with choices: STRING, INTEGER, BOOLEAN, JSON
- DRF serializer: validate value matches value_type in `validate()` method
- Python API: `get_setting()` returns native Python type based on value_type
- Default values stored in same format (JSONField with type discriminator)

**References**:
- Django JSONField: https://docs.djangoproject.com/en/5.1/ref/models/fields/#jsonfield
- DRF field validation: https://www.django-rest-framework.org/api-guide/serializers/#validation

**Decision Impact**: Determines Setting model schema and serializer validation logic.

---

### 5. Cache Key Namespacing Strategy

**Question**: What is the optimal cache key structure to support separate flag/setting namespaces while maintaining query performance?

**Research Areas**:
- Django cache key generation patterns
- Namespace collision prevention strategies
- Cache key length limits (Redis max key length)
- Query patterns: get by key+scope vs list all for scope
- Cache eviction strategies (LRU vs TTL)

**Initial Findings**:
- Key structure: `settings:flag:{scope_type}:{scope_id}:{key}` and `settings:setting:{scope_type}:{scope_id}:{key}`
- Separate prefixes prevent namespace collision
- Redis key length limit: 512MB (effectively unlimited for practical keys)
- List queries: cache individual items, not collections (avoid stale lists)
- TTL: 5 minutes with pub/sub invalidation for consistency

**References**:
- Django cache framework: https://docs.djangoproject.com/en/5.1/topics/cache/
- Redis key design: https://redis.io/docs/latest/develop/use/keyspace/

**Decision Impact**: Determines cache.py key generation logic and cache backend configuration.

---

### 6. Django Signals for Audit Integration

**Question**: What is the best practice for integrating with B09 audit system using Django signals?

**Research Areas**:
- `post_save` vs `post_init` vs `pre_save` signal timing
- Signal sender specificity (FeatureFlag vs Setting models)
- Bulk operation handling (bulk_create, bulk_update)
- Signal data capture (old vs new values for change tracking)
- Transaction safety (signals within database transactions)

**Initial Findings**:
- Use `post_save` signal for create/update audit events
- Use `post_delete` signal for delete audit events
- Sender: connect separately to `FeatureFlag` and `Setting` models
- Capture: use `created` kwarg to distinguish create vs update
- Old values: query in `pre_save` and pass via thread-local or instance attribute
- Bulk operations: signals do NOT fire for bulk_create/bulk_update (document limitation)

**References**:
- Django signals: https://docs.djangoproject.com/en/5.1/topics/signals/
- B09 audit app integration pattern: `src/audit/signals.py` (if exists)

**Decision Impact**: Determines signal handler implementation in models.py or separate signals.py.

---

## Research Summary

**Total Questions**: 6
**Resolved**: 0
**Blocked**: 0

**Key Technical Decisions Pending**:
1. Redis pub/sub listener architecture (background thread vs Celery task)
2. Partial index strategy for nullable FK queries
3. DRF permission scope extraction method (URL kwargs vs request context)
4. Setting type validation in serializer vs model clean()
5. Cache invalidation scope (single key vs pattern-based bulk invalidation)
6. Audit signal connection location (models.py vs apps.py)

**Next Steps**:
- Validate Redis pub/sub approach with prototype
- Review B08 RBAC integration points in existing codebase
- Document cache key structure in data-model.md
- Define Setting model JSONField schema
