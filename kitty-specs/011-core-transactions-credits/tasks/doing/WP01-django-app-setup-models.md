---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
  - "T009"
  - "T010"
  - "T011"
title: "Django App Setup & Models"
phase: "Phase 0 - Foundation"
lane: "doing"
assignee: ""
agent: "claude"
shell_pid: "17932"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-11-28T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Django App Setup & Models

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

**Goal**: Create transactions Django app with complete data models (UsageEvent, Transaction, BalancePolicy), database migrations with all constraints and indexes, and Django admin configuration.

**Success Criteria**:
- ✅ Migrations run successfully with all tables, indexes, constraints created
- ✅ All models pass unit tests (creation, validation, constraints)
- ✅ Django admin interface accessible for all three models
- ✅ Type hints present on all model methods
- ✅ README.md documents architecture and model relationships

## Context & Constraints

**Upstream Dependencies**:
- B05 (User model from accounts app)
- B06 (Organisation model from organisations app)
- B07 (Project model from projects app)

**Key Architecture Decisions** (from plan.md):
1. **Single-Ledger Approach**: Transaction model uses signed amounts (positive=add, negative=subtract)
2. **Immutable Records**: UsageEvent and Transaction never updated/deleted after creation
3. **Computed Balance**: No stored balance field (calculated via SUM aggregation)
4. **Financial Precision**: NUMERIC(14,4) for all amounts (no float)
5. **Idempotency**: Optional for UsageEvent, required for Transaction

**Constitution Alignment**:
- Principle II: Single Responsibility (new app for billing)
- Principle III: Type hints, Python 3.12+, no dead code
- Principle IV: Model unit tests required
- Principle VI: Partial indexes for performance

**Reference Documents**:
- Implementation plan: `kitty-specs/011-core-transactions-credits/plan.md`
- Data model spec: `kitty-specs/011-core-transactions-credits/data-model.md` (if exists)
- Constitution: `.kittify/memory/constitution.md`

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create transactions Django app structure

**Purpose**: Initialize Django app with proper directory structure.

**Steps**:
1. Run from project root: `cd src; python manage.py startapp transactions`
2. Create subdirectories:
   ```
   src/transactions/
   ├── api/           (create directory)
   ├── management/
   │   └── commands/  (create directory)
   └── tests/         (create directory)
   ```
3. Create `__init__.py` in api/ directory
4. Update `src/transactions/apps.py` with proper app configuration

**Files**:
- `src/transactions/__init__.py`
- `src/transactions/apps.py`
- `src/transactions/api/__init__.py`
- `src/transactions/management/commands/__init__.py`
- `src/transactions/tests/__init__.py`

**Parallel?**: No (foundational)

---

### Subtask T002 – Define UsageEvent model

**Purpose**: Create immutable usage event log with JSONB metadata.

**Steps**:
1. In `src/transactions/models.py`, import required modules:
   ```python
   import uuid
   from decimal import Decimal
   from django.db import models
   from django.contrib.postgres.fields import ArrayField
   from django.core.validators import MinValueValidator
   from accounts.models import User
   from organisations.models import Organisation
   from projects.models import Project
   ```

2. Define UsageEvent model:
   ```python
   class UsageEvent(models.Model):
       """Immutable record of a billable action."""
       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
       event_type = models.CharField(max_length=100, db_index=True)
       user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='usage_events')
       organization = models.ForeignKey(Organisation, on_delete=models.PROTECT, related_name='usage_events')
       project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name='usage_events', null=True, blank=True)
       metadata = models.JSONField(default=dict, blank=True)
       timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
       idempotency_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)
       created_at = models.DateTimeField(auto_now_add=True)

       class Meta:
           ordering = ['-timestamp']
           indexes = [
               models.Index(fields=['organization', '-timestamp'], name='usevt_org_ts_idx'),
               models.Index(fields=['project', '-timestamp'], name='usevt_proj_ts_idx', condition=models.Q(project__isnull=False)),
               models.Index(fields=['event_type', '-timestamp'], name='usevt_type_ts_idx'),
           ]
           constraints = [
               models.UniqueConstraint(
                   fields=['idempotency_key'],
                   name='usevt_idem_unique',
                   condition=models.Q(idempotency_key__isnull=False)
               ),
               models.CheckConstraint(
                   check=models.Q(project__organization_id=models.F('organization_id')) | models.Q(project__isnull=True),
                   name='usevt_proj_org_match'
               ),
           ]

       def __str__(self) -> str:
           return f"{self.event_type} - {self.organization} - {self.timestamp}"
   ```

3. Add GIN index for metadata JSONB (will be in migration):
   - Note: GIN indexes need `CREATE INDEX CONCURRENTLY` which requires custom migration

**Files**: `src/transactions/models.py`

**Notes**:
- idempotency_key is nullable (client manages deduplication)
- metadata uses JSONField (no validation in core - product-agnostic)
- Partial unique index on idempotency_key (WHERE NOT NULL)
- CheckConstraint ensures project belongs to organization

---

### Subtask T003 – Define Transaction model

**Purpose**: Create financial ledger with signed decimal amounts and idempotency enforcement.

**Steps**:
1. Add SourceTypeChoices enum in models.py:
   ```python
   class SourceTypeChoices(models.TextChoices):
       USAGE_EVENT = 'usage_event', 'Usage Event'
       ADJUSTMENT = 'adjustment', 'Adjustment'
       EXTERNAL_BILLING = 'external_billing', 'External Billing'
   ```

2. Define Transaction model:
   ```python
   class Transaction(models.Model):
       """Financial ledger entry (single-ledger with signed amounts)."""
       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
       amount = models.DecimalField(max_digits=14, decimal_places=4)
       organization = models.ForeignKey(Organisation, on_delete=models.PROTECT, related_name='transactions')
       project = models.ForeignKey(Project, on_delete=models.PROTECT, related_name='transactions', null=True, blank=True)
       source_type = models.CharField(max_length=50, choices=SourceTypeChoices.choices, db_index=True)
       usage_event = models.ForeignKey('UsageEvent', on_delete=models.PROTECT, related_name='transactions', null=True, blank=True)
       external_reference_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
       timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
       created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_transactions')
       idempotency_key = models.CharField(max_length=255, unique=True)
       notes = models.TextField(blank=True)
       created_at = models.DateTimeField(auto_now_add=True)

       class Meta:
           ordering = ['-timestamp']
           indexes = [
               models.Index(fields=['organization', '-timestamp'], name='txn_org_ts_idx'),
               models.Index(fields=['project', '-timestamp'], name='txn_proj_ts_idx', condition=models.Q(project__isnull=False)),
               models.Index(fields=['source_type', '-timestamp'], name='txn_src_ts_idx'),
           ]
           constraints = [
               models.CheckConstraint(
                   check=~models.Q(amount=Decimal('0')),
                   name='txn_amount_nonzero'
               ),
               models.CheckConstraint(
                   check=models.Q(project__organization_id=models.F('organization_id')) | models.Q(project__isnull=True),
                   name='txn_proj_org_match'
               ),
               models.CheckConstraint(
                   check=(
                       models.Q(source_type=SourceTypeChoices.USAGE_EVENT, usage_event__isnull=False) |
                       ~models.Q(source_type=SourceTypeChoices.USAGE_EVENT)
                   ),
                   name='txn_usage_evt_src_match'
               ),
           ]

       def __str__(self) -> str:
           return f"{self.amount} - {self.organization} - {self.timestamp}"
   ```

**Files**: `src/transactions/models.py`

**Notes**:
- amount uses DecimalField (not FloatField) for financial precision
- idempotency_key is required (NOT NULL, unique)
- CHECK constraints enforce: amount != 0, project belongs to org, source_type validation
- Separate FK fields (usage_event_id, external_reference_id) for type safety

---

### Subtask T004 – Define BalancePolicy model

**Purpose**: Create configuration model for prepaid/postpaid enforcement rules.

**Steps**:
1. Add EnforcementModeChoices enum:
   ```python
   class EnforcementModeChoices(models.TextChoices):
       BLOCK = 'block', 'Block'
       WARN = 'warn', 'Warn'
       ALLOW = 'allow', 'Allow'
   ```

2. Define BalancePolicy model:
   ```python
   class BalancePolicy(models.Model):
       """Configuration for billing policy enforcement (prepaid vs postpaid)."""
       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
       organization = models.ForeignKey(Organisation, on_delete=models.CASCADE, related_name='balance_policies')
       project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='balance_policies', null=True, blank=True)
       allow_negative = models.BooleanField(default=False, help_text="Can balance go negative? False=prepaid, True=postpaid")
       warn_threshold = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True, help_text="Balance level to trigger warnings")
       enforcement_mode = models.CharField(max_length=20, choices=EnforcementModeChoices.choices, default=EnforcementModeChoices.BLOCK)
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)

       class Meta:
           verbose_name_plural = 'Balance policies'
           indexes = [
               models.Index(fields=['organization'], name='balpol_org_idx', condition=models.Q(project__isnull=True)),
               models.Index(fields=['project'], name='balpol_proj_idx', condition=models.Q(project__isnull=False)),
           ]
           constraints = [
               models.UniqueConstraint(
                   fields=['organization', 'project'],
                   name='balpol_org_proj_unique'
               ),
               models.CheckConstraint(
                   check=models.Q(project__organization_id=models.F('organization_id')) | models.Q(project__isnull=True),
                   name='balpol_proj_org_match'
               ),
           ]

       def __str__(self) -> str:
           scope = f"Project {self.project}" if self.project else f"Org {self.organization}"
           return f"Policy for {scope}: {self.enforcement_mode}"
   ```

**Files**: `src/transactions/models.py`

**Notes**:
- allow_negative=False means prepaid (blocks at zero)
- enforcement_mode determines action: block (403), warn (log), allow (pass through)
- unique(organization, project) ensures one policy per scope
- CASCADE on delete (if org/project deleted, policy goes with it)

---

### Subtask T005 – Add model Meta classes

**Purpose**: Ensure proper ordering, indexes, and constraints are defined.

**Files**: `src/transactions/models.py`

**Notes**: Already handled in T002-T004. Verify all Meta classes include:
- ordering (for consistent query results)
- indexes (for query performance)
- constraints (for data integrity)

---

### Subtask T006 – Create custom model managers

**Purpose**: Add custom QuerySet managers for common queries.

**Steps**:
1. In `src/transactions/managers.py`, create managers:
   ```python
   from django.db import models
   from django.db.models import Sum, Q
   from decimal import Decimal

   class UsageEventQuerySet(models.QuerySet):
       def for_organization(self, organization_id):
           return self.filter(organization_id=organization_id)

       def for_project(self, project_id):
           return self.filter(project_id=project_id)

       def unbilled(self):
           """Events not linked to any transaction."""
           return self.filter(transactions__isnull=True)

       def by_event_type(self, event_type):
           return self.filter(event_type=event_type)

   class UsageEventManager(models.Manager):
       def get_queryset(self):
           return UsageEventQuerySet(self.model, using=self._db)

       def for_organization(self, organization_id):
           return self.get_queryset().for_organization(organization_id)

       def for_project(self, project_id):
           return self.get_queryset().for_project(project_id)

       def unbilled(self):
           return self.get_queryset().unbilled()

   class TransactionQuerySet(models.QuerySet):
       def for_organization(self, organization_id):
           return self.filter(organization_id=organization_id)

       def for_project(self, project_id):
           return self.filter(project_id=project_id)

       def compute_balance(self):
           """Compute current balance for filtered transactions."""
           result = self.aggregate(
               balance=Sum('amount'),
               positive_sum=Sum('amount', filter=Q(amount__gt=0)),
               negative_sum=Sum('amount', filter=Q(amount__lt=0)),
               count=models.Count('id')
           )
           return {
               'current_balance': result['balance'] or Decimal('0'),
               'total_positive_amounts': result['positive_sum'] or Decimal('0'),
               'total_negative_amounts': result['negative_sum'] or Decimal('0'),
               'transaction_count': result['count'],
           }

   class TransactionManager(models.Manager):
       def get_queryset(self):
           return TransactionQuerySet(self.model, using=self._db)

       def for_organization(self, organization_id):
           return self.get_queryset().for_organization(organization_id)

       def for_project(self, project_id):
           return self.get_queryset().for_project(project_id)
   ```

2. Update models to use managers:
   ```python
   # In UsageEvent model
   objects = UsageEventManager()

   # In Transaction model
   objects = TransactionManager()
   ```

**Files**: `src/transactions/managers.py`, `src/transactions/models.py`

---

### Subtask T007 – Create migration 0001_initial.py

**Purpose**: Generate initial migration with all tables, indexes, constraints.

**Steps**:
1. Run: `python manage.py makemigrations transactions`
2. Review generated migration file
3. Verify it includes:
   - CreateModel for UsageEvent, Transaction, BalancePolicy
   - All indexes (including partial indexes)
   - All constraints (unique, check)
   - Foreign key relationships
4. For GIN index on metadata, create separate migration 0002:
   ```python
   # migrations/0002_add_gin_index.py
   from django.contrib.postgres.operations import AddIndexConcurrently
   from django.db import migrations, models
   from django.contrib.postgres.indexes import GinIndex

   class Migration(migrations.Migration):
       atomic = False  # Required for CONCURRENTLY

       dependencies = [
           ('transactions', '0001_initial'),
       ]

       operations = [
           AddIndexConcurrently(
               model_name='usageevent',
               index=GinIndex(fields=['metadata'], name='usevt_metadata_gin_idx'),
           ),
       ]
   ```

**Files**:
- `src/transactions/migrations/0001_initial.py`
- `src/transactions/migrations/0002_add_gin_index.py`

**Notes**: Test migrations by running: `python manage.py migrate transactions`

---

### Subtask T008 – Configure Django admin

**Purpose**: Enable admin interface for model management.

**Steps**:
1. In `src/transactions/admin.py`:
   ```python
   from django.contrib import admin
   from .models import UsageEvent, Transaction, BalancePolicy

   @admin.register(UsageEvent)
   class UsageEventAdmin(admin.ModelAdmin):
       list_display = ['id', 'event_type', 'organization', 'project', 'timestamp', 'user']
       list_filter = ['event_type', 'timestamp', 'organization']
       search_fields = ['id', 'idempotency_key', 'organization__name']
       readonly_fields = ['id', 'timestamp', 'created_at']
       date_hierarchy = 'timestamp'
       ordering = ['-timestamp']

       def has_delete_permission(self, request, obj=None):
           return False  # Immutable

       def has_change_permission(self, request, obj=None):
           return False  # Immutable

   @admin.register(Transaction)
   class TransactionAdmin(admin.ModelAdmin):
       list_display = ['id', 'amount', 'organization', 'project', 'source_type', 'timestamp', 'created_by']
       list_filter = ['source_type', 'timestamp', 'organization']
       search_fields = ['id', 'idempotency_key', 'organization__name', 'external_reference_id']
       readonly_fields = ['id', 'timestamp', 'created_at']
       date_hierarchy = 'timestamp'
       ordering = ['-timestamp']

       def has_delete_permission(self, request, obj=None):
           return False  # Immutable

       def has_change_permission(self, request, obj=None):
           return False  # Immutable

   @admin.register(BalancePolicy)
   class BalancePolicyAdmin(admin.ModelAdmin):
       list_display = ['id', 'organization', 'project', 'allow_negative', 'enforcement_mode', 'updated_at']
       list_filter = ['allow_negative', 'enforcement_mode', 'updated_at']
       search_fields = ['organization__name', 'project__name']
       readonly_fields = ['id', 'created_at', 'updated_at']
   ```

**Files**: `src/transactions/admin.py`

**Parallel?**: Yes (can be done while T009 tests are being written)

---

### Subtask T009 – Write unit tests for models

**Purpose**: Validate model creation, validation, constraints.

**Steps**:
1. Create `src/transactions/tests/test_models.py`:
   ```python
   import pytest
   from decimal import Decimal
   from django.db import IntegrityError
   from transactions.models import UsageEvent, Transaction, BalancePolicy, SourceTypeChoices, EnforcementModeChoices
   from accounts.models import User
   from organisations.models import Organisation
   from projects.models import Project

   @pytest.mark.django_db
   class TestUsageEvent:
       def test_create_usage_event(self, user, organization, project):
           event = UsageEvent.objects.create(
               event_type='ai_inference',
               user=user,
               organization=organization,
               project=project,
               metadata={'tokens': 1500}
           )
           assert event.id is not None
           assert event.event_type == 'ai_inference'
           assert event.metadata == {'tokens': 1500}

       def test_idempotency_key_uniqueness(self, user, organization):
           UsageEvent.objects.create(
               event_type='test',
               user=user,
               organization=organization,
               idempotency_key='key123'
           )
           with pytest.raises(IntegrityError):
               UsageEvent.objects.create(
                   event_type='test',
                   user=user,
                   organization=organization,
                   idempotency_key='key123'
               )

       def test_project_organization_mismatch_constraint(self, user, organization):
           other_org = Organisation.objects.create(name='Other Org')
           other_project = Project.objects.create(name='Other Project', organization=other_org)

           with pytest.raises(IntegrityError):
               UsageEvent.objects.create(
                   event_type='test',
                   user=user,
                   organization=organization,
                   project=other_project  # Wrong org
               )

   @pytest.mark.django_db
   class TestTransaction:
       def test_create_transaction(self, user, organization):
           txn = Transaction.objects.create(
               amount=Decimal('100.0000'),
               organization=organization,
               source_type=SourceTypeChoices.EXTERNAL_BILLING,
               created_by=user,
               idempotency_key='txn123'
           )
           assert txn.id is not None
           assert txn.amount == Decimal('100.0000')

       def test_amount_cannot_be_zero(self, user, organization):
           with pytest.raises(IntegrityError):
               Transaction.objects.create(
                   amount=Decimal('0'),
                   organization=organization,
                   source_type=SourceTypeChoices.ADJUSTMENT,
                   created_by=user,
                   idempotency_key='txn-zero'
               )

       def test_idempotency_key_required(self, user, organization):
           with pytest.raises(IntegrityError):
               Transaction.objects.create(
                   amount=Decimal('10.0000'),
                   organization=organization,
                   source_type=SourceTypeChoices.ADJUSTMENT,
                   created_by=user,
                   idempotency_key=None
               )

       def test_balance_calculation_via_manager(self, user, organization):
           Transaction.objects.create(
               amount=Decimal('100.0000'),
               organization=organization,
               source_type=SourceTypeChoices.EXTERNAL_BILLING,
               created_by=user,
               idempotency_key='txn1'
           )
           Transaction.objects.create(
               amount=Decimal('-25.0000'),
               organization=organization,
               source_type=SourceTypeChoices.USAGE_EVENT,
               created_by=user,
               idempotency_key='txn2'
           )

           balance_data = Transaction.objects.for_organization(organization.id).compute_balance()
           assert balance_data['current_balance'] == Decimal('75.0000')
           assert balance_data['total_positive_amounts'] == Decimal('100.0000')
           assert balance_data['total_negative_amounts'] == Decimal('-25.0000')
           assert balance_data['transaction_count'] == 2

   @pytest.mark.django_db
   class TestBalancePolicy:
       def test_create_policy(self, organization):
           policy = BalancePolicy.objects.create(
               organization=organization,
               allow_negative=False,
               enforcement_mode=EnforcementModeChoices.BLOCK
           )
           assert policy.id is not None
           assert policy.allow_negative is False

       def test_unique_org_project_constraint(self, organization, project):
           BalancePolicy.objects.create(
               organization=organization,
               project=project,
               allow_negative=True,
               enforcement_mode=EnforcementModeChoices.WARN
           )

           with pytest.raises(IntegrityError):
               BalancePolicy.objects.create(
                   organization=organization,
                   project=project,  # Duplicate
                   allow_negative=False,
                   enforcement_mode=EnforcementModeChoices.BLOCK
               )
   ```

2. Create pytest fixtures in `conftest.py` or `tests/fixtures.py`:
   ```python
   import pytest
   from accounts.models import User
   from organisations.models import Organisation
   from projects.models import Project

   @pytest.fixture
   def user(db):
       return User.objects.create_user(
           email='test@example.com',
           password='testpass123'
       )

   @pytest.fixture
   def organization(db):
       return Organisation.objects.create(name='Test Org')

   @pytest.fixture
   def project(db, organization):
       return Project.objects.create(
           name='Test Project',
           organization=organization
       )
   ```

**Files**: `src/transactions/tests/test_models.py`, `tests/fixtures.py`

**Parallel?**: Yes (can write tests while admin is being configured)

---

### Subtask T010 – Add transactions to INSTALLED_APPS

**Purpose**: Register Django app in settings.

**Steps**:
1. Edit `src/config/settings/base.py`:
   ```python
   INSTALLED_APPS = [
       # ... existing apps
       'transactions.apps.TransactionsConfig',
   ]
   ```

**Files**: `src/config/settings/base.py`

---

### Subtask T011 – Create transactions README.md

**Purpose**: Document architecture, models, and relationships.

**Steps**:
1. Create `src/transactions/README.md` with sections:
   - Overview (single-ledger approach, computed balance)
   - Models (UsageEvent, Transaction, BalancePolicy)
   - Relationships (FKs, constraints)
   - Key Concepts (credits, idempotency, enforcement modes)
   - Usage Examples (link to quickstart.md)

**Files**: `src/transactions/README.md`

**Template**:
```markdown
# Transactions & Credits Engine

## Overview
Generic ledger for tracking usage events, balances, and billable activities.

## Architecture
- **Single-Ledger**: Transactions use signed amounts (positive=add, negative=subtract)
- **Computed Balance**: Balance calculated via SUM (no stored field)
- **Immutable Records**: UsageEvent and Transaction never updated

## Models

### UsageEvent
Immutable log of billable actions.
- Fields: event_type, user, organization, project, metadata (JSONB), idempotency_key
- Indexes: org+timestamp, metadata GIN, partial unique on idempotency_key

### Transaction
Financial ledger entry with NUMERIC(14,4) precision.
- Fields: amount, organization, project, source_type, idempotency_key (required)
- Constraints: amount != 0, project belongs to org

### BalancePolicy
Enforcement rules (prepaid vs postpaid).
- Fields: allow_negative, warn_threshold, enforcement_mode (block/warn/allow)
- Unique: (organization, project)

## Relationships
- Organisation (1) → Transaction (N)
- Project (1) → Transaction (N)
- UsageEvent (1) → Transaction (N) via source_type='usage_event'

## See Also
- Integration guide: `kitty-specs/011-core-transactions-credits/quickstart.md`
- Implementation plan: `kitty-specs/011-core-transactions-credits/plan.md`
```

---

## Test Strategy

**Unit Tests** (T009):
- Model creation with valid data
- Constraint violations (amount=0, duplicate idempotency keys)
- Manager methods (for_organization, compute_balance)
- Foreign key constraints

**Command to Run**:
```bash
cd src
pytest transactions/tests/test_models.py -v
```

**Coverage Target**: 100% for models (all fields, constraints, methods tested)

---

## Risks & Mitigations

1. **Migration Errors**:
   - Risk: Partial indexes not supported in old Django versions
   - Mitigation: Requires Django 3.2+ (already baseline)

2. **GIN Index Creation**:
   - Risk: CREATE INDEX CONCURRENTLY requires atomic=False
   - Mitigation: Separate migration (0002) with atomic=False

3. **CheckConstraint on Decimal Zero**:
   - Risk: Decimal('0') vs 0 comparison
   - Mitigation: Use `~models.Q(amount=Decimal('0'))`

4. **Project-Organization Mismatch**:
   - Risk: Data integrity if constraint not enforced
   - Mitigation: Database CHECK constraint + application validation

---

## Definition of Done Checklist

- [ ] T001: Django app structure created
- [ ] T002: UsageEvent model defined with all fields, indexes, constraints
- [ ] T003: Transaction model defined with NUMERIC precision, idempotency
- [ ] T004: BalancePolicy model defined with enforcement modes
- [ ] T005: Meta classes verified (ordering, indexes, constraints)
- [ ] T006: Custom managers created (for_organization, compute_balance)
- [ ] T007: Migrations generated and tested
- [ ] T008: Django admin configured (read-only for immutable models)
- [ ] T009: Unit tests pass with 100% model coverage
- [ ] T010: App registered in INSTALLED_APPS
- [ ] T011: README.md documents architecture
- [ ] Migrations run successfully: `python manage.py migrate transactions`
- [ ] Admin accessible: http://localhost:8000/admin/transactions/
- [ ] Tests pass: `pytest transactions/tests/test_models.py`

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. Migrations create all tables without errors
2. All constraints enforced (amount != 0, unique idempotency, project-org match)
3. Partial indexes created correctly
4. Django admin shows models (read-only for UsageEvent/Transaction)
5. Unit tests achieve 100% coverage on models
6. Type hints present on all model methods
7. README documents architecture clearly

**Verify**:
- Run migrations on fresh database
- Try creating invalid records (should fail with IntegrityError)
- Check admin interface loads all three models
- Run tests: `pytest transactions/tests/ -v --cov=transactions.models`

---

## Activity Log

- 2025-11-28T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-11-28T17:32:04Z – claude – shell_pid=17932 – lane=doing – Started implementation - Django app setup and models
