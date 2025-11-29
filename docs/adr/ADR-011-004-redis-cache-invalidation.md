# ADR-011-004: Redis Cache Invalidation Strategy

**Status**: Accepted
**Date**: 2025-11-28
**Decision Makers**: Engineering Team
**Feature**: 011-core-transactions-credits

## Context

The transactions engine computes account balances on-demand by aggregating all transactions (`SUM(amount)`). To avoid database load, we cache balances in Redis with a 60-second TTL.

Cache invalidation is critical: **stale balances can lead to incorrect policy enforcement** (e.g., allowing transactions when balance is actually zero).

### The Problem

When should we invalidate cached balances?

**Option 1: TTL Only (No Active Invalidation)**
- Let cache expire naturally after 60 seconds
- Pro: Simple, no extra code
- Con: Balance can be stale for up to 60 seconds

**Option 2: Invalidate on Write**
- Delete cache key after every transaction write
- Pro: Always fresh balance
- Con: Extra Redis call per transaction

**Option 3: Invalidate + Refresh**
- Delete cache, then immediately recompute and cache new balance
- Pro: Next read is fast (already cached)
- Con: Extra DB query on every write

**Requirements**:
- Balance queries must be fast (< 500ms)
- Policy enforcement requires accurate balance (prepaid blocking)
- High write throughput (100 transactions/sec)
- Multi-tenant isolation (can't invalidate other orgs' caches)

## Decision

**We will use invalidate-on-write with Django signals**, without immediate refresh.

### Implementation

```python
# transactions/signals.py

from django.core.cache import cache
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Transaction)
def invalidate_balance_cache(sender, instance, created, **kwargs):
    """
    Invalidate balance cache after transaction write.

    Deletes:
    - Organization balance cache
    - Project balance cache (if transaction has project)

    Does NOT refresh cache - let next read populate it.
    """
    # Organization balance
    org_cache_key = f"balance:org:{instance.organization_id}"
    cache.delete(org_cache_key)

    # Project balance (if applicable)
    if instance.project_id:
        proj_cache_key = f"balance:proj:{instance.project_id}"
        cache.delete(proj_cache_key)
```

### Cache Keys

```python
# Organization balance
f"balance:org:{organization_id}"

# Project balance
f"balance:proj:{project_id}"
```

**TTL**: 60 seconds

### Why This Approach?

1. **Accuracy**: Next balance read after write gets fresh data
2. **Performance**: Redis DELETE is fast (~0.1ms), no DB query on write path
3. **Simplicity**: Signal handler is 5 lines of code
4. **Isolation**: Only invalidates affected org/project, not global cache

## Consequences

### Positive

- **Correctness**: Balance is never more than 1 transaction out of date
- **Performance**: Write path unchanged (1 Redis DELETE ~0.1ms overhead)
- **Simplicity**: Django signals are well-understood, easy to test
- **Multi-Tenant**: Each org's cache is independent
- **No Stampede**: TTL prevents all caches expiring simultaneously

### Negative

- **Cache Miss After Write**: Next read requires DB query (adds ~10ms)
  - *Mitigation*: Balance reads are 10x more frequent than writes, so 90% of reads still hit cache
  - *Impact*: Acceptable - 10ms is well under 500ms SLA

- **Signal Overhead**: Django signals have small overhead (~0.01ms)
  - *Mitigation*: Negligible compared to transaction write time (~50ms)

- **Potential Inconsistency**: If cache.delete() fails but transaction commits, cache is stale
  - *Mitigation*: Cache has 60s TTL, will expire naturally
  - *Probability*: Redis downtime is rare, cache inconsistency is temporary

### Neutral

- **No Distributed Locking**: Multiple processes can write transactions concurrently without coordination
  - Both work because cache invalidation is idempotent
- **Cache Warm-up**: Cache is populated on first read after invalidation (read-through pattern)

## Alternatives Considered

### 1. TTL Only (No Active Invalidation)

**Implementation**:
```python
# No signal, just cache with TTL
def get_balance(org_id):
    cache_key = f"balance:org:{org_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    balance = compute_balance(org_id)
    cache.set(cache_key, balance, timeout=60)
    return balance
```

**Rejected Because**:
- **Staleness**: Balance can be 60 seconds out of date
- **Policy Enforcement**: Prepaid blocking requires real-time balance
- **Example**: User has $0.50, transaction costs $1.00, balance query returns cached $5.00 → incorrect approval
- **Impact**: Critical - could allow overdrafts when they should be blocked

### 2. Invalidate + Immediate Refresh

**Implementation**:
```python
@receiver(post_save, sender=Transaction)
def invalidate_and_refresh_cache(sender, instance, **kwargs):
    org_cache_key = f"balance:org:{instance.organization_id}"
    cache.delete(org_cache_key)

    # Immediately recompute and cache
    from transactions.services import get_organization_balance
    get_organization_balance(instance.organization_id, use_cache=False)
```

**Rejected Because**:
- **Write Amplification**: Every write triggers a DB read (SUM query)
- **Performance**: Adds ~10ms to write path (doubles transaction time)
- **Unnecessary**: 90% of balances aren't queried immediately after write
- **Concurrency**: If 10 transactions write simultaneously, 10 balance queries run
- **Cost**: 100 transactions/sec → 100 extra DB queries/sec → 6000 queries/min

### 3. Write-Through Cache

**Implementation**:
```python
@receiver(post_save, sender=Transaction)
def update_balance_cache(sender, instance, **kwargs):
    org_cache_key = f"balance:org:{instance.organization_id}"

    # Read current cached balance
    cached_balance = cache.get(org_cache_key)
    if cached_balance is not None:
        # Increment cached balance by new transaction amount
        new_balance = cached_balance + instance.amount
        cache.set(org_cache_key, new_balance, timeout=60)
    # If not cached, do nothing (next read will populate)
```

**Rejected Because**:
- **Race Conditions**: Multiple concurrent writes can corrupt cache
  - Transaction A reads cached 100, adds +50
  - Transaction B reads cached 100, adds -30
  - Final cached balance could be 150 or 70 (both wrong!)
- **Complexity**: Requires distributed locking (Redis WATCH or locks)
- **Fragility**: Cache corruption leads to wrong balances
- **Better Approach**: Invalidate and let read recompute (source of truth is DB)

### 4. Cache Aside with Lock

**Implementation**:
```python
def create_transaction_with_lock(org_id, amount, **kwargs):
    with redis_lock(f"lock:balance:{org_id}"):
        # Create transaction
        txn = Transaction.objects.create(amount=amount, ...)

        # Invalidate cache under lock
        cache.delete(f"balance:org:{org_id}")

    return txn
```

**Rejected Because**:
- **Serialization**: Lock forces transactions to process sequentially
- **Performance**: 100 concurrent writes/sec → all block on lock
- **Complexity**: Requires distributed lock implementation (redlock)
- **Deadlock Risk**: If lock isn't released, all transactions hang
- **Unnecessary**: Invalidation is idempotent, doesn't need lock

### 5. Event-Driven Invalidation (Queue)

**Implementation**:
```python
# Publisher
@receiver(post_save, sender=Transaction)
def publish_transaction_event(sender, instance, **kwargs):
    queue.publish('transaction.created', {
        'organization_id': instance.organization_id,
        'project_id': instance.project_id
    })

# Subscriber
def handle_transaction_created(event):
    cache.delete(f"balance:org:{event['organization_id']}")
```

**Rejected Because**:
- **Complexity**: Requires message queue infrastructure (RabbitMQ, Redis Streams)
- **Latency**: Cache invalidation delayed by queue latency (10-100ms)
- **Failure Modes**: If queue is down, cache never invalidates
- **Overhead**: Queue serialization/deserialization cost
- **Unnecessary**: Direct signal is simpler and faster

## Edge Cases Handled

### Case 1: Concurrent Transactions to Same Organization

**Scenario**: 3 transactions write to org simultaneously.

**Behavior**:
```
T0: Org balance = 100 (cached)
T1: Write txn +50, invalidate cache
T2: Write txn -30, invalidate cache  (cache already empty)
T3: Write txn +20, invalidate cache  (cache already empty)
T4: Read balance → cache miss → compute from DB → cache result
```

**Result**: Correct. Multiple invalidations are idempotent.

### Case 2: Read Immediately After Write

**Scenario**: Client writes transaction, then immediately queries balance.

**Behavior**:
```
T0: Write txn +50, invalidate cache
T1: Read balance → cache miss → DB query (10ms) → cache result
T2: Next read → cache hit (fast)
```

**Result**: Slight delay on first read (acceptable), subsequent reads fast.

### Case 3: Cache Delete Fails

**Scenario**: Redis is down or connection times out during cache.delete().

**Behavior**:
- Transaction commits successfully
- Cache delete fails (exception logged)
- Cached balance is now stale

**Mitigation**:
- **TTL**: Cache expires in 60 seconds, then recomputed correctly
- **Graceful Degradation**: Balance queries still work (hit DB if cache miss)
- **Monitoring**: Alert on cache failures (Prometheus metric)

**Impact**: Temporary staleness (max 60 sec) is acceptable

### Case 4: Signal Handler Fails

**Scenario**: Exception in signal handler (bug in code).

**Behavior**:
- Django signals don't block transaction commit
- Transaction commits even if signal fails
- Cache not invalidated

**Mitigation**:
- **Exception Handling**: Wrap signal handler in try/except, log errors
- **TTL**: Cache still expires naturally
- **Testing**: Signal handlers have unit tests

## Performance Analysis

### Write Path Overhead

**Before Caching**:
- Transaction write: ~50ms (DB insert + index updates)

**After Caching**:
- Transaction write: ~50ms
- Cache invalidation: ~0.1ms (Redis DELETE)
- **Total**: ~50.1ms (0.2% overhead)

**Conclusion**: Negligible impact on write performance.

### Read Path Performance

**Cache Hit (90% of reads)**:
- Redis GET: ~1ms
- **Total**: ~1ms

**Cache Miss (10% of reads)**:
- Redis GET miss: ~1ms
- DB query (SUM): ~10ms
- Redis SET: ~1ms
- **Total**: ~12ms

**Weighted Average**: 0.9 * 1ms + 0.1 * 12ms = 2.1ms

**Without Cache**: Every read = 10ms

**Improvement**: 5x faster average read time.

## Monitoring

### Metrics to Track

```python
# Cache effectiveness
balance_cache_hits_total  # Counter
balance_cache_misses_total  # Counter

# Invalidation frequency
balance_cache_invalidations_total  # Counter

# Failure modes
balance_cache_errors_total  # Counter (failed deletes)
```

### Alerts

```yaml
# High cache miss rate (should be ~10%)
- alert: HighBalanceCacheMissRate
  expr: rate(balance_cache_misses_total[5m]) > 0.3

# Cache failures
- alert: BalanceCacheErrors
  expr: rate(balance_cache_errors_total[5m]) > 0
```

## Related Decisions

- **ADR-011-002**: Computed Balance (this caching strategy depends on computed balance)
- **Django Signals**: https://docs.djangoproject.com/en/5.1/topics/signals/
- **Redis in Django**: https://docs.djangoproject.com/en/5.1/topics/cache/

## Future Considerations

If write throughput grows beyond 1000 transactions/sec:

1. **Read Replicas**: Route balance queries to read-only DB replica
2. **Longer TTL**: Increase cache TTL to 300s (if 60s staleness acceptable)
3. **Pre-warming**: Eagerly refresh cache for high-traffic organizations
4. **Partitioning**: Cache different orgs on different Redis instances

## References

- Martin Fowler on Cache Invalidation: https://martinfowler.com/bliki/TwoHardThings.html
- Redis Best Practices: https://redis.io/docs/manual/patterns/
- Django Signals: https://docs.djangoproject.com/en/5.1/topics/signals/

## Review History

- 2025-11-28: Initial decision (claude-assistant)
