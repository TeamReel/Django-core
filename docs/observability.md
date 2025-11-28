# Observability Guide: Transactions & Credits Engine

**Feature**: 011-core-transactions-credits
**Last Updated**: 2025-11-28

## Overview

The transactions engine provides comprehensive observability through:
- **Prometheus metrics** for performance monitoring
- **Structured logging** with JSON format support
- **Health check endpoint** for service validation

This guide explains how to monitor, troubleshoot, and operate the transactions service in production.

---

## Prometheus Metrics

The transactions engine exposes 6 custom Prometheus metrics for monitoring transaction writes, balance queries, policy violations, and cache performance.

### Transaction Write Metrics

#### `transaction_writes_total` (Counter)

Total number of transaction writes.

**Labels**:
- `organization_id`: Organization UUID
- `source_type`: Transaction source (usage_event, external_billing, adjustment, purchase, refund)

**Example**:
```promql
# Total transactions per organization
sum by (organization_id) (transaction_writes_total)

# Transaction rate (last 5 minutes)
rate(transaction_writes_total[5m])

# Transactions by source type
sum by (source_type) (transaction_writes_total)
```

#### `transaction_write_latency_seconds` (Histogram)

Distribution of transaction write latency.

**Labels**:
- `source_type`: Transaction source type

**Buckets**: `[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]`

**Example**:
```promql
# 95th percentile write latency
histogram_quantile(0.95, sum(rate(transaction_write_latency_seconds_bucket[5m])) by (le))

# Average write latency by source type
rate(transaction_write_latency_seconds_sum[5m]) / rate(transaction_write_latency_seconds_count[5m])

# Slow writes (>100ms)
histogram_quantile(0.99, sum(rate(transaction_write_latency_seconds_bucket[5m])) by (le)) > 0.1
```

---

### Balance Query Metrics

#### `balance_queries_total` (Counter)

Total number of balance queries.

**Labels**:
- `scope`: Query scope (organization or project)

**Example**:
```promql
# Query rate by scope
rate(balance_queries_total[5m])

# Organization balance queries
balance_queries_total{scope="organization"}
```

#### `balance_query_latency_seconds` (Histogram)

Distribution of balance query latency.

**Labels**:
- `scope`: Query scope (organization or project)
- `cache_hit`: Cache hit status (true or false)

**Buckets**: `[0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]`

**Example**:
```promql
# 99th percentile query latency (cache misses only)
histogram_quantile(0.99, sum(rate(balance_query_latency_seconds_bucket{cache_hit="false"}[5m])) by (le))

# Average cache hit latency
rate(balance_query_latency_seconds_sum{cache_hit="true"}[5m]) / rate(balance_query_latency_seconds_count{cache_hit="true"}[5m])

# Compare cache hit vs miss latency
histogram_quantile(0.50, sum(rate(balance_query_latency_seconds_bucket[5m])) by (le, cache_hit))
```

---

### Policy Enforcement Metrics

#### `policy_violations_total` (Counter)

Total number of policy violations.

**Labels**:
- `enforcement_mode`: Policy mode (block, allow, warn)
- `violation_type`: Type of violation (insufficient_balance)

**Example**:
```promql
# Blocked transactions due to insufficient balance
policy_violations_total{enforcement_mode="block", violation_type="insufficient_balance"}

# Policy violation rate
rate(policy_violations_total[5m])

# Violations by enforcement mode
sum by (enforcement_mode) (policy_violations_total)
```

---

### Cache Performance Metrics

#### `cache_hits_total` (Counter)

Total number of cache hits.

**Labels**:
- `cache_key_prefix`: Cache key prefix (balance:org or balance:proj)

**Example**:
```promql
# Total cache hits
sum(cache_hits_total)

# Cache hits by key prefix
sum by (cache_key_prefix) (cache_hits_total)

# Cache hit rate
rate(cache_hits_total[5m])
```

#### `cache_misses_total` (Counter)

Total number of cache misses.

**Labels**:
- `cache_key_prefix`: Cache key prefix (balance:org or balance:proj)

**Example**:
```promql
# Total cache misses
sum(cache_misses_total)

# Cache miss rate
rate(cache_misses_total[5m])

# Cache hit ratio (percentage)
100 * sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
```

---

## Structured Logging

The transactions engine uses Python's standard logging with structured context for easy parsing and filtering.

### Log Format

**Development**:
```
2025-11-28 12:00:00,123 INFO transactions.services: transaction.created {"transaction_id": "...", "organization_id": "...", "amount": "100.00"}
```

**Production** (JSON):
```json
{
  "timestamp": "2025-11-28T12:00:00.123Z",
  "level": "INFO",
  "logger": "transactions.services",
  "message": "transaction.created",
  "transaction_id": "uuid-here",
  "organization_id": "uuid-here",
  "project_id": "uuid-here",
  "amount": "100.0000",
  "source_type": "usage_event",
  "latency_seconds": 0.052
}
```

### Log Events

#### `transaction.created`

Emitted when a transaction is successfully created.

**Context**:
- `transaction_id`: Transaction UUID
- `organization_id`: Organization UUID
- `project_id`: Project ID (if applicable)
- `amount`: Transaction amount (Decimal as string)
- `source_type`: Source type
- `latency_seconds`: Write latency

**Example**:
```python
logger.info("transaction.created", extra={
    "transaction_id": str(txn.id),
    "organization_id": str(organization.id),
    "amount": str(txn.amount),
})
```

#### `transaction.policy_violation`

Emitted when a transaction is blocked by policy enforcement.

**Context**:
- `organization_id`: Organization UUID
- `project_id`: Project ID (if applicable)
- `current_balance`: Current balance
- `requested_amount`: Requested transaction amount
- `enforcement_mode`: Policy enforcement mode

**Level**: `WARNING`

**Example**:
```python
logger.warning("transaction.policy_violation", extra={
    "organization_id": str(organization.id),
    "current_balance": str(current_balance),
    "enforcement_mode": "block",
})
```

#### `balance.query.cache_hit`

Emitted when a balance query is served from Redis cache.

**Context**:
- `organization_id` or `project_id`: Scope identifier
- `scope`: Query scope (organization or project)
- `latency_seconds`: Query latency

**Level**: `DEBUG`

#### `balance.query.computed`

Emitted when a balance is computed from the database (cache miss).

**Context**:
- `organization_id` or `project_id`: Scope identifier
- `scope`: Query scope (organization or project)
- `current_balance`: Computed balance
- `latency_seconds`: Query latency

**Level**: `DEBUG`

---

## Health Check Endpoint

**URL**: `/api/v1/transactions/health/`

**Method**: `GET`

**Authentication**: None (public endpoint)

### Response Format

**Healthy** (200 OK):
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "cache": true,
    "balance_calculation": true
  }
}
```

**Unhealthy** (503 Service Unavailable):
```json
{
  "status": "unhealthy",
  "checks": {
    "database": true,
    "cache": false,
    "balance_calculation": false
  },
  "errors": [
    "Cache connection failed: Connection refused",
    "Balance calculation failed: ..."
  ]
}
```

### Health Checks

1. **Database**: Executes `SELECT 1` query to verify PostgreSQL connection
2. **Cache**: Performs Redis `get/set` test with a temporary key
3. **Balance Calculation**: Computes balance for a sample organization (if any exist)

### Usage

**Kubernetes Liveness Probe**:
```yaml
livenessProbe:
  httpGet:
    path: /api/v1/transactions/health/
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Monitoring Script**:
```bash
#!/bin/bash
HEALTH_URL="https://api.example.com/api/v1/transactions/health/"

response=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

if [ "$response" -eq 200 ]; then
  echo "✓ Transactions service is healthy"
  exit 0
else
  echo "✗ Transactions service is unhealthy (HTTP $response)"
  exit 1
fi
```

---

## Monitoring Dashboard

### Recommended Grafana Panels

#### 1. Transaction Throughput

```promql
# Transactions per second
sum(rate(transaction_writes_total[5m]))

# By source type
sum by (source_type) (rate(transaction_writes_total[5m]))
```

#### 2. Write Latency Percentiles

```promql
# 50th, 95th, 99th percentiles
histogram_quantile(0.50, sum(rate(transaction_write_latency_seconds_bucket[5m])) by (le))
histogram_quantile(0.95, sum(rate(transaction_write_latency_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(transaction_write_latency_seconds_bucket[5m])) by (le))
```

#### 3. Cache Hit Ratio

```promql
# Cache hit percentage
100 * sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))
```

#### 4. Policy Violations

```promql
# Violations per minute
sum(rate(policy_violations_total[1m])) * 60
```

#### 5. Balance Query Latency

```promql
# Compare cache hit vs miss latency
histogram_quantile(0.95, sum(rate(balance_query_latency_seconds_bucket[5m])) by (le, cache_hit))
```

---

## Alerting Rules

### Critical Alerts

**High Write Latency**:
```yaml
- alert: TransactionWriteLatencyHigh
  expr: |
    histogram_quantile(0.95, sum(rate(transaction_write_latency_seconds_bucket[5m])) by (le)) > 0.5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "95th percentile transaction write latency > 500ms"
```

**Low Cache Hit Rate**:
```yaml
- alert: TransactionCacheHitRateLow
  expr: |
    100 * sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m]))) < 80
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Balance cache hit rate below 80%"
```

**Health Check Failing**:
```yaml
- alert: TransactionsServiceUnhealthy
  expr: |
    probe_success{job="transactions_health"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Transactions service health check failing"
```

**High Policy Violation Rate**:
```yaml
- alert: PolicyViolationRateHigh
  expr: |
    sum(rate(policy_violations_total[5m])) > 10
  for: 5m
  labels:
    severity: info
  annotations:
    summary: "High rate of policy violations (>10/sec)"
```

---

## Troubleshooting

### Problem: High Write Latency

**Symptoms**:
- `transaction_write_latency_seconds` p95 > 500ms
- Slow API responses for transaction creation

**Diagnosis**:
```promql
# Check latency by source type
histogram_quantile(0.95, sum(rate(transaction_write_latency_seconds_bucket[5m])) by (le, source_type))

# Check if specific organizations are slow
sum by (organization_id) (rate(transaction_write_latency_seconds_sum[5m]))
```

**Common Causes**:
1. Database lock contention (SELECT FOR UPDATE)
2. Large transaction history (slow balance computation)
3. Redis unavailable (cache invalidation timeout)

**Solutions**:
- Add database indexes on `(organization_id, timestamp)`
- Partition transactions table by timestamp
- Increase Redis timeout or use async invalidation

---

### Problem: Low Cache Hit Rate

**Symptoms**:
- Cache hit ratio < 80%
- Balance queries taking 10-50ms instead of 1-2ms

**Diagnosis**:
```promql
# Cache hit ratio
100 * sum(rate(cache_hits_total[5m])) / (sum(rate(cache_hits_total[5m])) + sum(rate(cache_misses_total[5m])))

# Cache misses by prefix
sum by (cache_key_prefix) (rate(cache_misses_total[5m]))
```

**Common Causes**:
1. High transaction write rate (frequent cache invalidation)
2. Redis memory eviction (TTL + LRU eviction)
3. Multiple app instances with separate Redis connections

**Solutions**:
- Increase cache TTL from 60s to 300s (if staleness acceptable)
- Use Redis Cluster for high availability
- Implement write-through caching for high-traffic orgs

---

### Problem: Health Check Failures

**Symptoms**:
- `/api/v1/transactions/health/` returns 503
- Kubernetes pod restarts frequently

**Diagnosis**:
```bash
# Check health endpoint
curl -v https://api.example.com/api/v1/transactions/health/

# Check logs
kubectl logs -n prod deployment/transactions-api --tail=100
```

**Common Causes**:
1. PostgreSQL connection pool exhausted
2. Redis connection timeout
3. No sample organizations for balance calculation test

**Solutions**:
- Increase database connection pool size
- Tune Redis connection timeout settings
- Make balance calculation check optional

---

## See Also

- [Architecture Decision Records](../docs/adr/)
- [Billing Integration Guide](../docs/billing-integration.md)
- [API Documentation](../src/transactions/README.md)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Structured Logging with Django](https://django-structlog.readthedocs.io/)
