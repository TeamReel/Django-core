# Data Model: Cache Layer & Patterns

## Entities

### SystemMetric
*Stores historical snapshots of system performance metrics.*

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `timestamp` | DateTime | Index | When the snapshot was taken |
| `metric_type` | String | Choices: `cache_hits`, `cache_misses`, `memory_used`, `total_keys` | The type of metric |
| `value` | Float | | The value of the metric |
| `metadata` | JSON | Default: `{}` | Extra context (e.g., specific cache alias) |

## Decorators

### `@cache_result(key_pattern=None, ttl=None, tags=None)`
*Caches the result of a function call.*

- **key_pattern**: String (optional). Format string using function args (e.g., `"user:{user_id}"`). If None, auto-hash args.
- **ttl**: Integer (optional). Time to live in seconds.
- **tags**: List[String] (optional). List of tags to associate with this key.

### `@cache_invalidate(tags=None)`
*Invalidates cache keys associated with tags after function execution.*

- **tags**: List[String]. List of tags to invalidate.

## Circuit Breaker State Machine

- **State: CLOSED**
    - Normal operation. Calls go to Redis.
    - Failure -> Increment failure count.
    - If failure count > Threshold -> Transition to OPEN.
- **State: OPEN**
    - Redis is down. Calls go to Fallback (DB).
    - Timer starts.
    - If Timer > Timeout -> Transition to HALF-OPEN.
- **State: HALF-OPEN**
    - Tentative state. Allow 1 request to Redis.
    - Success -> Transition to CLOSED (Reset failure count).
    - Failure -> Transition to OPEN (Reset timer).
