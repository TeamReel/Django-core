# Test 34: Cache Layer & Patterns

**Status:** READY TO RUN
**Spec Reference:** kitty-specs/037-cache-layer-patterns/spec.md
**Page:** `/demo/performance`

## Test Overview

This test validates the Redis cache layer infrastructure with circuit breaker resilience, decorator patterns, tag-based invalidation, metrics collection, and the performance dashboard.

## Quick Access

**Direct URL:** `/demo/performance`
**Navigation:** Demo Shell → Platform → Cache Performance

## Prerequisites

```bash
# Ensure Redis is running
docker ps | grep redis

# Run metrics collection task (first time)
python manage.py shell -c "from observability.tasks import collect_system_metrics; collect_system_metrics()"

# Check cache configuration
python manage.py shell -c "from django.core.cache import caches; print(list(caches))"
# Expected: ['default', 'sessions', 'locks']
```

## Test Scenarios

### Scenario 1: View Cache Performance Dashboard (Admin)

**Test as:** Admin user
**Expected behaviour:**
- Dashboard loads at `/demo/performance`
- 5 metric cards display: Hit Ratio, Hits, Misses, Memory Used, Total Keys
- Historical line chart shows cache metrics over time
- "Clear All Cache" button visible
- "Run Benchmark" button visible

**Success criteria:**
- ✅ All 5 stat cards render with real-time data
- ✅ Hit ratio displayed as percentage badge (green/yellow/red)
- ✅ Memory formatted in human-readable units (MB/GB)
- ✅ Line chart shows dual Y-axis (hit ratio % left, memory MB right)
- ✅ Chart displays historical data points with timestamps
- ✅ No console errors

**Manual Steps:**
1. Login as admin user
2. Navigate to `/demo/performance`
3. Verify all metrics display
4. Hover over chart to see tooltip with values
5. Check that timestamps are formatted correctly

---

### Scenario 2: Cache Clearing Action

**Test as:** Admin user
**Expected behaviour:**
- "Clear All Cache" button triggers confirmation
- After confirmation, cache is flushed
- Success alert displays
- Metrics update to show zero hits/misses

**Success criteria:**
- ✅ Confirmation dialog appears before clearing
- ✅ POST request to `/api/v1/system/cache/clear` succeeds
- ✅ Success message displays: "Cache cleared successfully"
- ✅ Metrics refresh automatically
- ✅ Total keys drops to near zero

**Manual Steps:**
1. Click "Clear All Cache" button
2. Confirm the action in dialog
3. Wait for success message
4. Verify metrics update
5. Check Redis: `docker exec redis redis-cli DBSIZE`

---

### Scenario 3: Cache Benchmark Test

**Test as:** Admin user
**Expected behaviour:**
- "Run Benchmark" button executes cache vs no-cache test
- Benchmark measures lookup time difference
- Results display speedup factor (e.g., "10.5x faster")
- Speedup highlighted in green badge

**Success criteria:**
- ✅ POST request to `/api/v1/system/cache/benchmark` succeeds
- ✅ Benchmark results display: uncached time, cached time, speedup
- ✅ Speedup factor > 1.0 (cached should be faster)
- ✅ Alert shows results in human-readable format
- ✅ No timeout errors (benchmark completes in <5 seconds)

**Manual Steps:**
1. Click "Run Benchmark" button
2. Wait for benchmark to complete
3. Verify results appear in alert
4. Note speedup factor (should be >5x typically)
5. Run benchmark multiple times to verify consistency

---

### Scenario 4: Circuit Breaker Resilience (Unplug Test)

**Test as:** Admin or Developer
**Expected behaviour:**
- When Redis stops, app continues running without crash
- Circuit breaker opens after 5 failures
- API endpoints return gracefully (fallback to DB)
- After Redis restarts, circuit auto-recovers

**Success criteria:**
- ✅ App does NOT crash when Redis is stopped
- ✅ API requests return 200 (with fallback data)
- ✅ Performance dashboard shows circuit breaker state
- ✅ After 30s timeout, circuit transitions to HALF_OPEN
- ✅ Circuit closes automatically when Redis is back

**Manual Steps:**
1. Open `/demo/performance` dashboard
2. Stop Redis: `docker stop redis` (or `docker compose stop redis`)
3. Refresh dashboard or trigger API calls
4. Verify app remains functional (no 500 errors)
5. Check logs for circuit breaker messages: "Circuit breaker OPEN"
6. Start Redis: `docker start redis` (or `docker compose start redis`)
7. Wait 30 seconds for circuit to test and close
8. Verify cache metrics resume normal operation

**Expected Log Messages:**
```
Circuit breaker opened for cache operations after 5 consecutive failures
Circuit breaker testing connection (HALF_OPEN state)
Circuit breaker closed - Redis connection restored
```

---

### Scenario 5: Cache Decorators in Action

**Test as:** Developer
**Expected behaviour:**
- `@cache_result` decorator caches function results
- `@cache_invalidate` decorator clears tagged cache entries
- Tag-based invalidation works across multiple keys

**Success criteria:**
- ✅ First call executes function (cache miss)
- ✅ Second call returns cached result (cache hit)
- ✅ Cache invalidation clears tagged entries
- ✅ Hit ratio increases with repeated calls

**Manual Steps:**
1. Open Django shell: `python manage.py shell`
2. Test cache decorator:
```python
from core.cache.decorators import cache_result, invalidate_tags

# Define a test function with cache decorator
@cache_result(key="test:user:{user_id}", ttl=300, tags=["users"])
def get_user_data(user_id):
    print(f"Executing expensive query for user {user_id}")
    return {"id": user_id, "name": f"User {user_id}"}

# First call - cache miss (prints message)
result1 = get_user_data(123)

# Second call - cache hit (no print)
result2 = get_user_data(123)

# Verify both return same data
assert result1 == result2

# Invalidate by tag
invalidate_tags(["users"])

# Third call - cache miss again (prints message)
result3 = get_user_data(123)
```

3. Monitor Redis keys: `docker exec redis redis-cli KEYS "test:*"`
4. Check tag sets: `docker exec redis redis-cli SMEMBERS "tag:users"`

---

### Scenario 6: Metrics Collection & Retention

**Test as:** Admin or Developer
**Expected behaviour:**
- Celery Beat collects metrics every 10 minutes
- SystemMetric model stores historical data
- 7-day retention policy auto-deletes old data
- API returns both realtime and historical metrics

**Success criteria:**
- ✅ SystemMetric records created every 10 minutes
- ✅ GET `/api/v1/system/cache/metrics` returns realtime + history
- ✅ Historical data spans up to 7 days
- ✅ Old records auto-deleted after 7 days

**Manual Steps:**
1. Check Celery Beat schedule:
```bash
python manage.py shell -c "from django_celery_beat.models import PeriodicTask; print(PeriodicTask.objects.filter(name__icontains='cache').values('name', 'enabled', 'interval'))"
```

2. Manually trigger metrics collection:
```bash
python manage.py shell -c "from observability.tasks import collect_system_metrics; collect_system_metrics()"
```

3. Verify SystemMetric records:
```bash
python manage.py shell -c "from observability.models import SystemMetric; print(f'Total metrics: {SystemMetric.objects.count()}'); print(SystemMetric.objects.latest('timestamp'))"
```

4. Test retention cleanup:
```bash
python manage.py shell -c "from observability.models import SystemMetric; deleted = SystemMetric.cleanup_old_metrics(days=7); print(f'Deleted {deleted} old records')"
```

5. Verify API response includes history:
```bash
curl -X GET http://localhost:8000/api/v1/system/cache/metrics -H "Authorization: Bearer YOUR_TOKEN" | jq '.historical_data | length'
```

---

### Scenario 7: Permission Enforcement

**Test as:** Non-admin user (Coach/Player)
**Expected behaviour:**
- Cache performance dashboard restricted to admins
- Cache management APIs return 403 Forbidden
- Metrics API read-only for non-admins

**Success criteria:**
- ✅ Non-admin redirected or sees 403 at `/demo/performance`
- ✅ POST `/api/v1/system/cache/clear` returns 403
- ✅ POST `/api/v1/system/cache/benchmark` returns 403
- ✅ GET `/api/v1/system/cache/metrics` accessible (read-only)

**Manual Steps:**
1. Logout and login as non-admin user (Coach role)
2. Try to access `/demo/performance`
3. Verify permission denied
4. Use curl to test API permissions:
```bash
# Should return 403
curl -X POST http://localhost:8000/api/v1/system/cache/clear \
  -H "Authorization: Bearer NON_ADMIN_TOKEN"

# Should return 200 (read-only)
curl -X GET http://localhost:8000/api/v1/system/cache/metrics \
  -H "Authorization: Bearer NON_ADMIN_TOKEN"
```

---

## Edge Cases & Error Scenarios

### Edge Case 1: Empty Historical Data
- **Condition:** No SystemMetric records exist yet
- **Expected:** Dashboard shows "No historical data available" message
- **Test:** Fresh database, before first metrics collection

### Edge Case 2: Redis Connection Timeout
- **Condition:** Redis slow or network issues
- **Expected:** Circuit breaker opens, graceful fallback
- **Test:** Use `tc` (traffic control) to add latency to Redis port

### Edge Case 3: Cache Key Collision
- **Condition:** Multiple functions use same cache key
- **Expected:** Last write wins, TTL honored
- **Test:** Manually test with duplicate keys in decorators

### Edge Case 4: Large Dataset Benchmark
- **Condition:** Benchmark with 10,000+ records
- **Expected:** Speedup >10x, no timeout
- **Test:** Modify benchmark endpoint to use larger dataset

---

## Performance Benchmarks

**Acceptable Performance:**
- Dashboard load: <500ms
- Cache hit lookup: <5ms
- Cache miss + compute: <50ms
- Benchmark execution: <5 seconds
- Metrics API response: <200ms
- Circuit breaker detection: <1 second (5 failures)

**Cache Hit Ratio Targets:**
- Initial (cold cache): 0%
- After warmup: >70%
- Production steady state: >85%

---

## Troubleshooting

### Issue: Dashboard shows "Loading..." forever
**Solution:**
1. Check Redis is running: `docker ps | grep redis`
2. Check API endpoint: `curl http://localhost:8000/api/v1/system/cache/metrics`
3. Check browser console for errors
4. Verify admin permissions

### Issue: No historical data in chart
**Solution:**
1. Manually run: `python manage.py shell -c "from observability.tasks import collect_system_metrics; collect_system_metrics()"`
2. Check SystemMetric table: `python manage.py shell -c "from observability.models import SystemMetric; print(SystemMetric.objects.count())"`
3. Verify Celery Beat is running: `celery -A config beat --loglevel=info`

### Issue: Circuit breaker not opening
**Solution:**
1. Check circuit breaker threshold (default: 5 failures)
2. Verify Redis actually stopped: `docker ps | grep redis`
3. Check logs for circuit breaker messages
4. Ensure using CacheService, not raw django cache

### Issue: Cache not invalidating by tags
**Solution:**
1. Check tag sets in Redis: `docker exec redis redis-cli KEYS "tag:*"`
2. Verify decorator includes `tags=["your_tag"]`
3. Call `invalidate_tags(["your_tag"])` explicitly
4. Check Redis logs for SMEMBERS/SREM operations

---

## Success Summary

**Test Completion Checklist:**
- [ ] Scenario 1: Dashboard displays all metrics
- [ ] Scenario 2: Cache clearing works
- [ ] Scenario 3: Benchmark shows speedup
- [ ] Scenario 4: Circuit breaker resilience verified
- [ ] Scenario 5: Cache decorators functional
- [ ] Scenario 6: Metrics collection working
- [ ] Scenario 7: Permissions enforced

**Overall Status:**
- [ ] PASS - All scenarios successful
- [ ] PASS WITH NOTES - Minor issues documented below
- [ ] FAIL - Blocking issues found

**Notes:**
```
[Add any observations, performance numbers, or issues here]
```

**Tested By:** _________________
**Date:** _________________
**Environment:** _________________
