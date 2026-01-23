# Data Model: Core Transactions & Credits Engine

**Feature**: 011-core-transactions-credits
**Last Updated**: 2025-11-28
**Status**: Research Phase

## Overview

This document defines the entities, attributes, relationships, and constraints for the transaction and credits tracking system. The data model supports multi-tenant isolation at organization and project levels, with a single-ledger approach using signed amounts.

---

## Entity Definitions

### 1. UsageEvent

**Purpose**: Immutable log of billable or trackable actions (e.g., "user ran AI analysis")

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL, DEFAULT uuid4() | Primary identifier |
| `event_type` | VARCHAR(100) | NOT NULL, INDEX | Event category (e.g., "ai_inference", "storage_gb_hour") |
| `user_id` | UUID | FK(User.id), NOT NULL, INDEX | User who triggered the event |
| `organization_id` | UUID | FK(Organisation.id), NOT NULL, INDEX | Organization context |
| `project_id` | UUID | FK(Project.id), NULL, INDEX | Optional project context |
| `metadata` | JSONB | NOT NULL, DEFAULT '{}' | Arbitrary event metadata (model name, duration, etc.) |
| `timestamp` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW(), INDEX | When event occurred |
| `idempotency_key` | VARCHAR(255) | NULL, UNIQUE (partial) | Optional deduplication key (client-provided) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |

**Indexes**:
- `idx_usage_events_org` ON `organization_id` (for balance queries)
- `idx_usage_events_project` ON `project_id` WHERE `project_id IS NOT NULL` (partial index)
- `idx_usage_events_timestamp` ON `timestamp` (for date range queries)
- `idx_usage_events_idempotency` ON `idempotency_key` WHERE `idempotency_key IS NOT NULL` (unique, partial)
- `idx_usage_events_metadata` ON `metadata` USING GIN (for metadata queries)

**Constraints**:
- `CHECK (project_id IS NULL OR organization_id = (SELECT organization_id FROM projects WHERE id = project_id))` - Ensures project belongs to organization

**Immutability**: Once created, UsageEvent records are never updated or deleted (audit trail)

**Django Model Mapping**:
```python
class UsageEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=100, db_index=True)
    user = models.ForeignKey('accounts.User', on_delete=models.PROTECT)
    organization = models.ForeignKey('organisations.Organisation', on_delete=models.PROTECT)
    project = models.ForeignKey('projects.Project', on_delete=models.PROTECT, null=True, blank=True)
    metadata = models.JSONField(default=dict)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    idempotency_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'usage_events'
        constraints = [
            models.UniqueConstraint(
                fields=['idempotency_key'],
                condition=Q(idempotency_key__isnull=False),
                name='unique_usage_event_idempotency_key'
            )
        ]
        indexes = [
            models.Index(fields=['organization', 'timestamp']),
            GinIndex(fields=['metadata']),
        ]
```

---

### 2. Transaction

**Purpose**: Financial ledger entry representing credit amount changes (positive = increase, negative = decrease)

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL, DEFAULT uuid4() | Primary identifier |
| `amount` | NUMERIC(14, 4) | NOT NULL | Signed amount in credits (+/-9,999,999,999.9999) |
| `organization_id` | UUID | FK(Organisation.id), NOT NULL, INDEX | Organization owning this transaction |
| `project_id` | UUID | FK(Project.id), NULL, INDEX | Optional project context |
| `source_type` | VARCHAR(50) | NOT NULL | Source category: 'usage_event', 'adjustment', 'external_billing' |
| `usage_event_id` | UUID | FK(UsageEvent.id), NULL | Link to usage event (if source_type='usage_event') |
| `external_reference_id` | VARCHAR(255) | NULL | External system identifier (if source_type='external_billing') |
| `timestamp` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW(), INDEX | When transaction occurred |
| `created_by_id` | UUID | FK(User.id), NOT NULL | User who created transaction |
| `idempotency_key` | VARCHAR(255) | NOT NULL, UNIQUE | Deduplication key (required for financial safety) |
| `notes` | TEXT | NULL | Optional human-readable description |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |

**Indexes**:
- `idx_transactions_org_timestamp` ON `(organization_id, timestamp)` (for balance + history queries)
- `idx_transactions_project_timestamp` ON `(project_id, timestamp)` WHERE `project_id IS NOT NULL` (partial)
- `idx_transactions_idempotency` ON `idempotency_key` (unique)
- `idx_transactions_source` ON `(source_type, usage_event_id)` (for audit queries)

**Constraints**:
- `CHECK (source_type = 'usage_event' AND usage_event_id IS NOT NULL) OR (source_type != 'usage_event')` - Ensures usage_event_id present when source_type requires it
- `CHECK (project_id IS NULL OR organization_id = (SELECT organization_id FROM projects WHERE id = project_id))` - Ensures project belongs to organization
- `CHECK (amount != 0)` - Disallow zero-amount transactions (no-op)

**Immutability**: Once created, Transaction records are never updated or deleted (audit trail)

**Django Model Mapping**:
```python
class Transaction(models.Model):
    SOURCE_TYPE_CHOICES = [
        ('usage_event', 'Usage Event'),
        ('adjustment', 'Manual Adjustment'),
        ('external_billing', 'External Billing System'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    amount = models.DecimalField(max_digits=14, decimal_places=4)
    organization = models.ForeignKey('organisations.Organisation', on_delete=models.PROTECT)
    project = models.ForeignKey('projects.Project', on_delete=models.PROTECT, null=True, blank=True)
    source_type = models.CharField(max_length=50, choices=SOURCE_TYPE_CHOICES)
    usage_event = models.ForeignKey('UsageEvent', on_delete=models.PROTECT, null=True, blank=True)
    external_reference_id = models.CharField(max_length=255, null=True, blank=True)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT)
    idempotency_key = models.CharField(max_length=255, unique=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'transactions'
        indexes = [
            models.Index(fields=['organization', 'timestamp']),
            models.Index(fields=['source_type', 'usage_event']),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(amount__ne=0),
                name='transaction_amount_nonzero'
            )
        ]
```

---

### 3. BalancePolicy

**Purpose**: Configuration defining billing rules (prepaid vs postpaid, warning thresholds)

**Attributes**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, NOT NULL, DEFAULT uuid4() | Primary identifier |
| `organization_id` | UUID | FK(Organisation.id), NOT NULL, INDEX, UNIQUE (conditional) | Organization this policy applies to |
| `project_id` | UUID | FK(Project.id), NULL, INDEX, UNIQUE (conditional) | Optional project override |
| `allow_negative` | BOOLEAN | NOT NULL, DEFAULT FALSE | Whether balance can go negative |
| `warn_threshold` | NUMERIC(14, 4) | NULL | Balance level to trigger warnings (e.g., 10.0000 credits) |
| `enforcement_mode` | VARCHAR(20) | NOT NULL, DEFAULT 'block' | Action when policy violated: 'block', 'warn', 'allow' |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last modification time |

**Indexes**:
- `idx_balance_policy_org` ON `organization_id` WHERE `project_id IS NULL` (org-level policies)
- `idx_balance_policy_project` ON `project_id` WHERE `project_id IS NOT NULL` (project-level policies)

**Constraints**:
- `UNIQUE (organization_id, project_id)` - One policy per org/project combination
- `CHECK (enforcement_mode IN ('block', 'warn', 'allow'))` - Valid enforcement modes
- `CHECK (warn_threshold IS NULL OR warn_threshold >= 0)` - Threshold must be non-negative

**Mutability**: Can be updated by administrators (historical transactions not affected)

**Django Model Mapping**:
```python
class BalancePolicy(models.Model):
    ENFORCEMENT_MODE_CHOICES = [
        ('block', 'Block Transaction'),
        ('warn', 'Warn But Allow'),
        ('allow', 'Allow Without Warning'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey('organisations.Organisation', on_delete=models.CASCADE)
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, null=True, blank=True)
    allow_negative = models.BooleanField(default=False)
    warn_threshold = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    enforcement_mode = models.CharField(max_length=20, choices=ENFORCEMENT_MODE_CHOICES, default='block')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'balance_policies'
        unique_together = [('organization', 'project')]
        indexes = [
            models.Index(fields=['organization'], condition=Q(project__isnull=True)),
        ]
```

---

### 4. Balance (Computed Aggregate)

**Purpose**: Computed view of current balance state (not stored as table)

**Attributes**:

| Field | Type | Description |
|-------|------|-------------|
| `current_balance` | NUMERIC(14, 4) | SUM(amount) from transactions |
| `total_positive_amounts` | NUMERIC(14, 4) | SUM(amount WHERE amount > 0) |
| `total_negative_amounts` | NUMERIC(14, 4) | SUM(amount WHERE amount < 0) |
| `transaction_count` | INTEGER | COUNT(*) from transactions |
| `last_updated` | TIMESTAMPTZ | MAX(timestamp) from transactions |

**Computation**:
```sql
-- Organization balance
SELECT
    organization_id,
    COALESCE(SUM(amount), 0) AS current_balance,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_positive_amounts,
    COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) AS total_negative_amounts,
    COUNT(*) AS transaction_count,
    MAX(timestamp) AS last_updated
FROM transactions
WHERE organization_id = :org_id
GROUP BY organization_id;

-- Project balance
SELECT
    project_id,
    COALESCE(SUM(amount), 0) AS current_balance,
    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS total_positive_amounts,
    COALESCE(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END), 0) AS total_negative_amounts,
    COUNT(*) AS transaction_count,
    MAX(timestamp) AS last_updated
FROM transactions
WHERE project_id = :proj_id
GROUP BY project_id;
```

**Caching Strategy** (optional, for performance):
- Redis key: `balance:org:{org_id}` or `balance:proj:{proj_id}`
- TTL: 60 seconds
- Invalidation: On transaction write to same org/project
- Cache miss: Compute from database, store in Redis

**Django Service Layer**:
```python
def get_organization_balance(org_id: UUID) -> dict:
    """Compute current balance for organization."""
    cache_key = f"balance:org:{org_id}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    result = Transaction.objects.filter(organization_id=org_id).aggregate(
        current_balance=Coalesce(Sum('amount'), Decimal('0')),
        total_positive=Coalesce(Sum('amount', filter=Q(amount__gt=0)), Decimal('0')),
        total_negative=Coalesce(Sum('amount', filter=Q(amount__lt=0)), Decimal('0')),
        count=Count('id'),
        last_updated=Max('timestamp'),
    )

    cache.set(cache_key, result, timeout=60)
    return result
```

---

## Entity Relationships

### Diagram

```
┌─────────────────┐         ┌─────────────────┐
│  Organisation   │◄────────│  BalancePolicy  │
│  (B06)          │  1:0..1 │                 │
└────────┬────────┘         └─────────────────┘
         │                           ▲
         │ 1:N                       │ 0..1:1
         ▼                           │
┌─────────────────┐         ┌─────────────────┐
│  Project (B07)  │◄────────│  BalancePolicy  │
│                 │  1:0..1 │                 │
└────────┬────────┘         └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│  UsageEvent     │
│                 │
└────────┬────────┘
         │
         │ 1:N (optional link)
         ▼
┌─────────────────┐
│  Transaction    │
│                 │
└─────────────────┘
         │
         │ N:1
         ▼
┌─────────────────┐
│  User (B05)     │
│  (created_by)   │
└─────────────────┘
```

### Relationship Details

1. **Organisation → Transaction** (1:N, required)
   - Each transaction belongs to exactly one organization
   - Organization cannot be deleted if transactions exist (PROTECT)
   - Multi-tenant isolation: Users can only query transactions for their organizations

2. **Project → Transaction** (1:N, optional)
   - Transactions can optionally be scoped to a project
   - Project cannot be deleted if transactions exist (PROTECT)
   - Project balance is computed independently from organization balance

3. **Organisation → BalancePolicy** (1:0..1)
   - Each organization can have zero or one policy
   - Default policy: allow_negative=False, enforcement_mode='block'
   - If no policy exists, use system defaults

4. **Project → BalancePolicy** (1:0..1)
   - Each project can have zero or one policy override
   - Project policy takes precedence over organization policy
   - If no project policy, inherit from organization policy

5. **UsageEvent → Transaction** (1:N, optional link)
   - One usage event can generate multiple transactions (e.g., usage + tax charge)
   - Transaction can reference usage event via `usage_event_id` FK
   - If transaction.source_type='usage_event', `usage_event_id` must be NOT NULL
   - Cascade behavior: If usage event deleted (shouldn't happen), transactions remain (PROTECT)

6. **User → Transaction** (1:N, created_by)
   - Each transaction records which user created it (audit trail)
   - User cannot be deleted if transactions exist (PROTECT)

7. **User → UsageEvent** (1:N, user)
   - Each usage event records which user triggered the action
   - User cannot be deleted if usage events exist (PROTECT)

---

## Data Integrity Rules

### Idempotency Guarantees

1. **Usage Events**:
   - If `idempotency_key` provided: Duplicate key → return existing event (409 Conflict or 200 with existing record)
   - If `idempotency_key` NULL: No duplicate detection, allow multiple identical events

2. **Transactions**:
   - `idempotency_key` is REQUIRED (NOT NULL)
   - Duplicate key → reject with 409 Conflict + existing transaction details
   - Idempotency keys expire after 7 days (cleanup job)

### Multi-Tenant Isolation

1. **Query Filtering**:
   - All queries MUST filter by organization_id (never expose cross-org data)
   - Project queries MUST verify project belongs to organization
   - ORM-level enforcement: Use custom managers with default filters

2. **Permission Checks**:
   - User must have access to organization before querying balance/transactions
   - Leverage B08 hierarchical access control for permission checks

### Immutability Enforcement

1. **UsageEvent & Transaction**:
   - No UPDATE operations allowed (application-level enforcement)
   - No DELETE operations allowed (soft delete via status field if needed)
   - Django model: Override `save()` to raise exception on update

2. **BalancePolicy**:
   - UPDATE allowed (mutable configuration)
   - Historical transactions not affected by policy changes

### Concurrency Control

1. **Transaction Writes**:
   - Lock organization or project row during balance calculation + transaction creation
   - Django ORM: `Organization.objects.select_for_update().get(id=org_id)`
   - Lock released on transaction commit/rollback

2. **Idempotency Key Checks**:
   - Use database UNIQUE constraint (atomic check + insert)
   - Handle IntegrityError → return existing record or 409 Conflict

---

## Storage Estimates

### Assumptions
- 1,000 organizations
- Average 10 projects per organization
- 1,000 transactions per organization per month
- 5,000 usage events per organization per month

### Table Sizes (1 year)

| Table | Rows | Row Size | Total Size |
|-------|------|----------|------------|
| `usage_events` | 60M | ~500 bytes | ~30 GB |
| `transactions` | 12M | ~300 bytes | ~3.6 GB |
| `balance_policies` | 11K | ~200 bytes | ~2.2 MB |
| **Total** | | | **~34 GB** |

### Index Sizes (estimated 30% overhead)

- Indexes: ~10 GB
- **Grand Total**: ~44 GB (first year)

### Growth Rate

- ~3.6 GB/month for moderate usage
- ~43 GB/year
- Archive strategy needed after 2-3 years

---

## Migration Strategy

### Initial Schema

1. Create tables: `usage_events`, `transactions`, `balance_policies`
2. Add foreign keys to `Organisation`, `Project`, `User`
3. Create indexes (can be done concurrently: `CREATE INDEX CONCURRENTLY`)
4. Add constraints (CHECK, UNIQUE)

### Data Migration (if existing billing data)

1. **Import historical transactions**:
   - Map legacy billing records to `transactions` table
   - Generate idempotency keys: `hash(legacy_id + "migration")`
   - Set `source_type='external_billing'`, `external_reference_id=legacy_id`

2. **Import historical usage events** (optional):
   - If legacy usage logs exist, import to `usage_events`
   - Set `idempotency_key=NULL` (no deduplication for historical data)

### Rollback Strategy

- Migrations are reversible (Django migrations support `operations.RunSQL` with reverse)
- No data loss: Tables can be dropped if feature disabled

---

## Performance Optimization

### Query Patterns

1. **Balance Calculation** (hot path):
   - Query: `SUM(amount) WHERE organization_id = X`
   - Index: `(organization_id, timestamp)` - B-tree, covers query
   - Optimization: Cache result in Redis (60s TTL)

2. **Transaction History** (common):
   - Query: `SELECT * WHERE organization_id = X ORDER BY timestamp DESC LIMIT 50`
   - Index: `(organization_id, timestamp)` - supports ORDER BY + LIMIT
   - Pagination: Use cursor-based (timestamp + id) for large datasets

3. **Unbilled Usage Events** (audit query):
   - Query: `SELECT * FROM usage_events WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE usage_event_id = usage_events.id)`
   - Index: `transactions(usage_event_id)` - supports EXISTS subquery
   - Optimization: Materialize view for periodic reporting

### Partitioning Strategy (future, if needed)

- **Partition by timestamp** (monthly or yearly)
- Benefits: Faster queries on recent data, easier archival
- Tradeoff: Query complexity increases for date ranges spanning partitions

---

## Security Considerations

### Sensitive Data

- **Financial amounts**: Mask in logs (`amount=***` instead of actual value)
- **Idempotency keys**: Hash before logging (prevent replay attacks)
- **User PII**: Usage event metadata may contain names, emails → encrypt at rest

### Audit Trail

- Every transaction has `created_by` (who) and `timestamp` (when)
- Integration with B09 audit logging: Log transaction creation, policy changes, balance queries
- Immutability ensures tamper-proof ledger

### Access Control

- Multi-tenant isolation: Never expose cross-org data
- Permission checks: User must have `view_transactions` permission for organization
- Admin-only: Policy changes, manual adjustments (source_type='adjustment')

---

## Open Questions

1. **GenericForeignKey vs separate FK fields**: Decision pending (see research.md Q1)
2. **Balance caching implementation**: Redis Pub/Sub or short TTL? (see research.md Q2)
3. **Streaming export**: Needed for >1M transactions? (see research.md Q4)
4. **Metadata schema validation**: Enforce JSON schema or allow arbitrary? (see research.md Q5)

---

## Next Steps

1. ✅ Data model documented - Ready for implementation planning
2. 🔄 Create Django models in `transactions/models.py`
3. 🔄 Write database migrations
4. 🔄 Implement service layer (balance calculation, transaction creation)
5. 🔄 Add API endpoints (DRF serializers, views)
6. 🔄 Write tests (model, service, API, integration)
