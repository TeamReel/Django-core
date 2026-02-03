# ADR 045-02: Fail-Safe Error Handling for Hierarchies

**Date**: 2026-02-03
**Status**: Accepted
**Context**: Feature 045 - Hierarchical Search Navigation

## Problem Statement

Hierarchy generation can fail for many reasons:
- Resolver implementation has a bug
- Database connection timeout
- Permission check exception
- Configuration error (missing resolver, invalid settings)

We need to decide: Should a hierarchy error cause the entire search to fail, or should we handle it gracefully and return search results anyway?

## Options Considered

### Option 1: Fail-Fast (Fail-Safe Alternative)
If hierarchy generation fails, return HTTP 500 error:
```python
# Pseudocode
try:
    hierarchy = build_hierarchy(anchor, request)
except Exception:
    return {"error": "Hierarchy generation failed"}, 500  # Search fails
```

**Pros**:
- Forces resolver implementations to be bulletproof
- Clear error visibility to developers
- Problems are caught immediately in development

**Cons**:
- Search API becomes unreliable (dependent on optional feature)
- One bad resolver breaks all global search
- Cannot safely roll out hierarchy to production without perfect implementations
- Bad user experience (can't search at all if hierarchy fails)

### Option 2: Fail-Safe (✓ CHOSEN)
If hierarchy generation fails, log error and return `hierarchy: null`:
```python
# Pseudocode
hierarchy = None
try:
    hierarchy = build_hierarchy(anchor, request)
except Exception as e:
    logger.error(f"Hierarchy error: {e}", exc_info=True)
    # Continue - search results are still returned
```

**Pros**:
- Search API is highly resilient (hierarchy is optional)
- Gradual rollout is safe (can enable for beta users without risk)
- Production stability is prioritized
- Errors are still logged for debugging and monitoring
- User can still accomplish primary goal (find content)

**Cons**:
- Silent failures may mask issues (mitigated by logging/monitoring)
- Users don't see error messages for hierarchy problems
- Developers might not notice bugs if not monitoring logs

## Decision

**We chose Option 2: Fail-Safe Error Handling**

When hierarchy generation fails:
1. Catch exception with broad try/except
2. Log with full traceback (for debugging)
3. Return `hierarchy: null` in API response
4. Ensure search results are returned successfully

## Rationale

### Search is Critical, Hierarchy is Not
- Users can find content without hierarchy
- Search is a primary function; hierarchy is a discovery aid
- Cannot afford to break search for one flaky resolver

### Production Stability First
- SaaS products must prioritize uptime
- Better to have degraded feature than failed service
- Monitoring and logging mitigate the risks of silent failures

### Gradual Rollout
- Can enable hierarchy for percentage of users without risk
- Can disable per-model if specific resolver is buggy
- Can A/B test without affecting search reliability

### Safety Net for Deployments
- New resolver bugs can be deployed and caught by monitoring
- Don't need to wait for perfect implementation
- Can iterate safely in production

## Implementation

### Error Handling in SearchAPIView

```python
# src/search/api/views.py
def get_hierarchy(self, request, search_entry):
    """Get hierarchy for search entry (fail-safe)."""
    try:
        # Build hierarchy (may fail)
        return self.resolve_hierarchy(search_entry)
    except Exception as e:
        # Log but don't raise
        logger.exception(
            "Hierarchy generation failed for %s",
            search_entry.content_type,
            extra={
                "search_entry_id": search_entry.id,
                "user_id": request.user.id,
                "query": request.query_params.get("q"),
            },
        )
        return None  # Fail-safe: return null hierarchy
```

### Error Logging Strategy
```python
# Comprehensive logging for debugging
logger.error(
    "Hierarchy resolution failed",
    exc_info=True,  # Include full traceback
    extra={
        "resolver_class": resolver.__class__.__name__,
        "content_type": entry.content_type,
        "user_id": request.user.id,
        "is_staff": request.user.is_staff,
    },
)
```

### Monitoring & Alerts
- Monitor error rates in Sentry
- Alert if hierarchy error rate >5%
- Alert if specific resolver has >10 errors per hour
- Alert if average hierarchy generation time >100ms

### Resolver Best Practices
Even though we fail safe, resolvers should:
1. Log exceptions with context
2. Validate input data
3. Handle permission errors gracefully
4. Use database transaction isolation

```python
def get_children(self, instance):
    try:
        # Fetch children
        children = instance.children.all()
        # Process...
    except Exception as e:
        # Log but don't raise (parent will handle)
        logger.warning(
            "Error fetching children for %s",
            instance,
            exc_info=True,
        )
        return []  # Return empty list rather than raising
```

## Consequences

### Positive
✓ Search API is highly resilient and reliable
✓ Safe gradual rollout (can enable for beta without risk)
✓ Errors are logged for observability and debugging
✓ Users can still search even if hierarchy is broken
✓ Encourages iterative implementation (don't need perfection)
✓ Production stability prioritized over feature completeness
✓ Easy to toggle hierarchy per model if resolver is problematic

### Negative
✗ Silent failures may not be noticed without monitoring
✗ Users don't see specific error messages
✗ Developers need discipline to check logs and monitoring
✗ May encourage lazy error handling in resolvers

## Mitigation Strategies

### For Silent Failures
1. Comprehensive logging with context
2. Alerting on error rate thresholds
3. Dashboard showing hierarchy health
4. Regular log review in team meetings

### For User Communication
1. Admin dashboard shows when hierarchy is unavailable
2. Developers can check error logs
3. Users see search results (primary function works)

### For Developer Discipline
1. Code review checklist for resolvers
2. Mandatory error handling tests
3. Staging environment with monitoring
4. Runbook for troubleshooting hierarchy issues

## Alternative Approaches

### Option 1: Per-Model Fail-Fast Toggle
```python
SEARCH_HIERARCHY_STRICT_MODELS = [
    'organisations.Organisation',  # Must not fail
]
# Others default to fail-safe
```
**Rejected**: Added complexity without much benefit. Better to monitor and disable if needed.

### Option 3: Partial Hierarchy Return
```python
{
    "hierarchy": {
        "error": "Node limit exceeded",
        "tree": [partial tree that fits within limits]
    }
}
```
**Rejected**: Confusing to users. Either return full hierarchy or none.

## Related Decisions

- **ADR 045-01**: Stateful resolvers pattern for permission checks
- **Feature 045**: Specification section 3.6 (Error Handling)

## Testing

### Unit Tests
```python
def test_hierarchy_error_doesnt_break_search(mocker):
    # Mock resolver to raise exception
    mocker.patch.object(
        Resolver, 'get_children',
        side_effect=Exception('Database timeout')
    )

    response = search_api(request)

    # Search should succeed
    assert response.status_code == 200
    assert response.json()['results'] is not None
    # Hierarchy should be null
    assert response.json()['hierarchy'] is None
```

### Integration Tests
```python
def test_bad_resolver_logged(mocker, caplog):
    # Mock resolver with exception
    mocker.patch(..., side_effect=ValueError('Bad data'))

    search_api(request)

    # Exception should be logged
    assert 'Hierarchy generation failed' in caplog.text
    assert 'ValueError' in caplog.text
```

### Monitoring Tests
```python
# Use pytest-sentry or similar
def test_hierarchy_errors_sent_to_sentry(mocker):
    sentry_mock = mocker.patch('sentry_sdk.capture_exception')

    # Trigger hierarchy error
    search_api_with_broken_resolver(request)

    # Should be captured
    sentry_mock.assert_called()
```

## References

- **Specification**: Feature 045 section 3.6
- **Error Logging**: `src/search/api/views.py` - `get_hierarchy` method
- **Monitoring**: Sentry integration, logging configuration
