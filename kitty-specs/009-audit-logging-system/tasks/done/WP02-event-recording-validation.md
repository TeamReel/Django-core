---
lane: "done"
agent: "claude"
assignee: "claude"
shell_pid: "45896"
review_status: "approved without changes"
reviewed_by: "claude-sonnet-4.5-reviewer"
reviewer_shell_pid: "45896"
reviewed_at: "2025-11-27T15:09:00Z"
history:
  - date: "2025-11-27"
    action: "created"
    author: "AI Agent"
  - date: "2025-11-27T15:09:00Z"
    action: "moved_to_done"
    author: "claude-sonnet-4.5-reviewer"
    shell_pid: "45896"
    note: "Approved and moved to done lane"
---
# WP02: Event Recording & Validation

```yaml
work_package_id: WP02
feature: 009-audit-logging-system
priority: P1
estimated_subtasks: 5
dependencies: [WP01]
lane: done
assignee: claude
history:
  - date: 2025-11-27
    action: created
    author: AI Agent
  - date: 2025-11-27T15:15:00Z
    action: moved_to_done
    author: claude-sonnet-4.5-reviewer
    shell_pid: 45896
    note: Approved and moved to done lane
```

## Objective

Add comprehensive type hints, implement metadata size validation (10KB limit), automatic IP/user agent capture from requests, and write unit tests for all recording logic including validation and graceful failure paths.

## Context

**Specification**: [spec.md](../../spec.md) - User Story 1 (Functional Requirement FR-003: Metadata size validation)
**Planning**: [plan.md](../../plan.md) - Constitution Principle III (Code Quality - type hints mandatory)
**Clarifications**: [spec.md](../../spec.md#clarifications) - Session 2025-11-27, Q1: Metadata >10KB should raise ValueError, not truncate

**Key Requirements**:
- **Type Safety**: All audit module code must type-check with mypy + django-stubs
- **Metadata Validation**: Reject events with >10KB metadata (serialize to JSON, measure bytes)
- **Auto-Capture**: Extract IP from `request.META['REMOTE_ADDR']`, user agent from `HTTP_USER_AGENT`
- **Graceful Failure**: Database errors must not break application flow
- **Test Coverage**: >95% coverage for api.py, >85% overall

## Detailed Guidance

### T011: Add Comprehensive Type Hints

**Goal**: Add type annotations to all audit module code using Python 3.12+ syntax and django-stubs.

**Files to Annotate**:
1. `src/audit/api.py` - AuditLog.record() signature
2. `src/audit/registry.py` - All functions and dataclass
3. `src/audit/models.py` - Model methods and properties

**Implementation Example** (api.py):
```python
from typing import Any, Dict, Optional
from django.contrib.auth.models import AbstractBaseUser
from django.http import HttpRequest

from audit.models import AuditEvent

def record(
    self,
    event_type: str,
    user: Optional[AbstractBaseUser] = None,
    organization: Optional[Any] = None,  # Use Any to avoid circular import
    project: Optional[Any] = None,
    metadata: Optional[Dict[str, Any]] = None,
    request: Optional[HttpRequest] = None
) -> Optional[AuditEvent]:
    ...
```

**Type Checking Command**:
```bash
mypy src/audit/ --strict
```

**Common Issues**:
- Django models: Use `from typing import TYPE_CHECKING` and conditional imports for circular refs
- JSONField: Type as `Dict[str, Any]` not `dict`
- Optional return: audit_log.record() returns `Optional[AuditEvent]` due to graceful failure

**Files Modified**:
- `src/audit/api.py`
- `src/audit/registry.py`
- `src/audit/models.py` (if adding methods)

**Validation**:
- `mypy src/audit/` exits with status 0
- No type errors or warnings

---

### T012: Implement Metadata Size Validation

**Goal**: Validate metadata size before database write, raise ValueError if exceeds 10KB.

**Implementation** (in `audit/api.py` within `audit_log.record()`):
```python
def record(self, event_type: str, ..., metadata: Optional[Dict[str, Any]] = None, ...) -> Optional[AuditEvent]:
    metadata = metadata or {}

    # ... event type validation ...

    # Metadata size validation
    metadata_json = json.dumps(metadata, ensure_ascii=False)  # Unicode-aware
    metadata_size_bytes = len(metadata_json.encode('utf-8'))
    metadata_size_kb = metadata_size_bytes / 1024

    if metadata_size_kb > 10:
        raise ValueError(
            f"Metadata size {metadata_size_kb:.2f}KB exceeds 10KB limit. "
            f"Reduce metadata or store large data elsewhere."
        )

    # ... rest of recording logic ...
```

**Why serialize to JSON?**: Database stores as JSON, so measure JSON size not Python dict memory size. This matches actual storage.

**Edge Cases**:
- Unicode characters: Use `ensure_ascii=False` and `encode('utf-8')` for accurate byte count
- Large arrays: `metadata={'logs': [...]* 1000}` should fail validation
- Large strings: `metadata={'description': 'x' * 20000}` should fail

**Files Modified**:
- `src/audit/api.py`

**Validation**:
- Record event with 9KB metadata: succeeds
- Record event with 11KB metadata: raises ValueError with clear message

---

### T013: Implement Automatic IP/User Agent Capture

**Goal**: Extract IP and user agent from HttpRequest and add to metadata automatically.

**Implementation** (in `audit/api.py` within `audit_log.record()`):
```python
def record(
    self,
    event_type: str,
    ...,
    metadata: Optional[Dict[str, Any]] = None,
    request: Optional[HttpRequest] = None
) -> Optional[AuditEvent]:
    metadata = metadata or {}

    # ... validation ...

    # Auto-capture IP and user agent from request (if provided)
    if request:
        # Use setdefault to preserve explicit metadata values
        metadata.setdefault('ip', request.META.get('REMOTE_ADDR'))
        metadata.setdefault('user_agent', request.META.get('HTTP_USER_AGENT'))

    # ... database write ...
```

**Why setdefault?**: Allows explicit override - caller can pass `metadata={'ip': '10.0.0.1'}` and it won't be overwritten.

**Edge Cases**:
- Request without REMOTE_ADDR: Sets metadata['ip'] = None (acceptable)
- Request without HTTP_USER_AGENT: Sets metadata['user_agent'] = None (acceptable)
- No request parameter: metadata unchanged (audit calls outside HTTP context OK)

**Files Modified**:
- `src/audit/api.py`

**Validation**:
- Record event with request: metadata contains 'ip' and 'user_agent'
- Record event without request: no 'ip' or 'user_agent' keys
- Record event with explicit ip: uses explicit value, not request value

---

### T014: Write Unit Tests for Success Cases [P]

**Goal**: Test all successful audit_log.record() scenarios.

**Implementation** (create `tests/audit/test_api.py`):
```python
import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory

from audit.api import audit_log
from audit.models import AuditEvent
from audit.registry import register_event_type

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123'
    )


@pytest.fixture
def organization(db):
    from organisations.models import Organisation
    return Organisation.objects.create(name='Test Org')


@pytest.fixture
def project(db, organization):
    from projects.models import Project
    return Project.objects.create(
        name='Test Project',
        organization=organization
    )


@pytest.fixture(autouse=True)
def register_test_event_type():
    """Register test event type for all tests."""
    register_event_type('test.event', 'test', 'Test event')


class TestAuditLogRecordSuccess:
    """Test successful audit event recording."""

    def test_record_minimal_event(self, db):
        """Can record event with only event_type."""
        event = audit_log.record('test.event')

        assert event is not None
        assert event.event_type == 'test.event'
        assert event.user is None
        assert event.organization is None
        assert event.project is None
        assert event.metadata == {}

    def test_record_with_user(self, user):
        """Can record event with user."""
        event = audit_log.record('test.event', user=user)

        assert event.user == user

    def test_record_with_organization(self, organization):
        """Can record event with organization context."""
        event = audit_log.record('test.event', organization=organization)

        assert event.organization == organization

    def test_record_with_project(self, project):
        """Can record event with project context."""
        event = audit_log.record('test.event', project=project)

        assert event.project == project

    def test_record_with_metadata(self, db):
        """Can record event with metadata."""
        metadata = {'action': 'create', 'resource_id': '123'}
        event = audit_log.record('test.event', metadata=metadata)

        assert event.metadata == metadata

    def test_record_with_request(self, db):
        """Auto-captures IP and user agent from request."""
        factory = RequestFactory()
        request = factory.get('/', REMOTE_ADDR='192.168.1.100')
        request.META['HTTP_USER_AGENT'] = 'TestBot/1.0'

        event = audit_log.record('test.event', request=request)

        assert event.metadata['ip'] == '192.168.1.100'
        assert event.metadata['user_agent'] == 'TestBot/1.0'

    def test_record_with_request_preserves_explicit_ip(self, db):
        """Explicit IP in metadata not overwritten by request."""
        factory = RequestFactory()
        request = factory.get('/', REMOTE_ADDR='192.168.1.100')

        event = audit_log.record(
            'test.event',
            metadata={'ip': '10.0.0.1'},  # Explicit override
            request=request
        )

        assert event.metadata['ip'] == '10.0.0.1'  # Preserved

    def test_record_with_all_fields(self, user, organization, project):
        """Can record event with all fields."""
        factory = RequestFactory()
        request = factory.get('/', REMOTE_ADDR='192.168.1.100')
        metadata = {'action': 'create'}

        event = audit_log.record(
            'test.event',
            user=user,
            organization=organization,
            project=project,
            metadata=metadata,
            request=request
        )

        assert event.event_type == 'test.event'
        assert event.user == user
        assert event.organization == organization
        assert event.project == project
        assert event.metadata['action'] == 'create'
        assert event.metadata['ip'] == '192.168.1.100'

    def test_record_increments_prometheus_counter(self, db, mocker):
        """Recording event increments Prometheus counter."""
        mock_counter = mocker.patch('audit.api.audit_events_recorded_total')

        audit_log.record('test.event')

        mock_counter.labels.assert_called_once_with(event_type='test.event')
        mock_counter.labels.return_value.inc.assert_called_once()

    def test_event_persisted_to_database(self, db):
        """Recorded event persists to database."""
        event = audit_log.record('test.event', metadata={'test': True})

        # Retrieve from database
        db_event = AuditEvent.objects.get(id=event.id)
        assert db_event.event_type == 'test.event'
        assert db_event.metadata['test'] is True
```

**Test Organization**:
- One test class per logical area
- Use descriptive test names: `test_record_with_user` not `test_user`
- Use pytest fixtures for common setup (user, organization, project)

**Files Created**:
- `tests/audit/test_api.py`

**Validation**:
- `pytest tests/audit/test_api.py::TestAuditLogRecordSuccess -v`
- All tests pass

---

### T015: Write Unit Tests for Validation & Failure [P]

**Goal**: Test validation errors (unregistered event type, metadata too large) and graceful failure (database unavailable).

**Implementation** (add to `tests/audit/test_api.py`):
```python
class TestAuditLogValidation:
    """Test audit event validation."""

    def test_unregistered_event_type_raises_error(self, db):
        """Recording unregistered event type raises ValueError."""
        with pytest.raises(ValueError, match="not registered"):
            audit_log.record('unregistered.event')

    def test_metadata_too_large_raises_error(self, db):
        """Metadata >10KB raises ValueError."""
        # Create metadata slightly over 10KB
        large_metadata = {'data': 'x' * 11000}

        with pytest.raises(ValueError, match="exceeds 10KB limit"):
            audit_log.record('test.event', metadata=large_metadata)

    def test_metadata_size_error_message_shows_actual_size(self, db):
        """ValueError message includes actual metadata size."""
        large_metadata = {'data': 'x' * 15000}

        with pytest.raises(ValueError, match=r"\d+\.\d+KB exceeds 10KB"):
            audit_log.record('test.event', metadata=large_metadata)

    def test_metadata_exactly_10kb_succeeds(self, db):
        """Metadata exactly 10KB is allowed."""
        # Calibrate to exactly 10KB
        # JSON overhead: '{"data":"' + ... + '"}' = 11 bytes
        # Target: 10240 bytes total
        data_size = 10240 - 11  # Subtract JSON overhead
        metadata = {'data': 'x' * data_size}

        event = audit_log.record('test.event', metadata=metadata)
        assert event is not None

    def test_unicode_metadata_size_calculated_correctly(self, db):
        """Metadata size accounts for UTF-8 encoding."""
        # Unicode characters take more bytes than characters
        # '你好' = 2 chars, 6 bytes in UTF-8
        large_unicode = {'text': '你好' * 2000}  # ~12KB

        with pytest.raises(ValueError, match="exceeds 10KB limit"):
            audit_log.record('test.event', metadata=large_unicode)


class TestAuditLogGracefulFailure:
    """Test graceful failure when database unavailable."""

    def test_database_error_returns_none(self, db, mocker):
        """Database error returns None instead of raising."""
        # Mock AuditEvent.objects.create to raise exception
        mocker.patch(
            'audit.models.AuditEvent.objects.create',
            side_effect=Exception("Database connection lost")
        )

        event = audit_log.record('test.event')

        assert event is None  # Graceful failure

    def test_database_error_emits_signal(self, db, mocker):
        """Database error emits audit_record_failed signal."""
        from audit.signals import audit_record_failed

        # Mock database error
        mocker.patch(
            'audit.models.AuditEvent.objects.create',
            side_effect=Exception("Database error")
        )

        # Mock signal handler
        handler = mocker.Mock()
        audit_record_failed.connect(handler)

        audit_log.record('test.event')

        # Verify signal emitted
        handler.assert_called_once()
        call_kwargs = handler.call_args.kwargs
        assert call_kwargs['event_type'] == 'test.event'
        assert isinstance(call_kwargs['exception'], Exception)

    def test_database_error_increments_failure_counter(self, db, mocker):
        """Database error increments audit_failures_total metric."""
        mocker.patch(
            'audit.models.AuditEvent.objects.create',
            side_effect=Exception("Database error")
        )
        mock_counter = mocker.patch('audit.api.audit_failures_total')

        audit_log.record('test.event')

        mock_counter.labels.assert_called_once_with(
            event_type='test.event',
            error_type='Exception'
        )
        mock_counter.labels.return_value.inc.assert_called_once()

    def test_database_error_logs_exception(self, db, mocker, caplog):
        """Database error logs exception details."""
        mocker.patch(
            'audit.models.AuditEvent.objects.create',
            side_effect=Exception("Database error")
        )

        audit_log.record('test.event')

        assert "Failed to record audit event" in caplog.text
        assert "test.event" in caplog.text
```

**Mocking Strategy**:
- Use `pytest-mock` fixture (`mocker`) for patching
- Mock at lowest level (AuditEvent.objects.create) to test graceful failure
- Mock Prometheus counters to verify increment without actual metric writes

**Files Modified**:
- `tests/audit/test_api.py`

**Validation**:
- `pytest tests/audit/test_api.py -v`
- Coverage: `pytest tests/audit/test_api.py --cov=src/audit/api --cov-report=term-missing`
- Should show >95% coverage for api.py

---

## Test Strategy

**Test Coverage Goals**:
- `src/audit/api.py`: 100% (critical path)
- `src/audit/registry.py`: >90% (tested in T014/T015 indirectly, dedicated tests can be added)
- Overall audit module: >85%

**Test Categories**:
1. **Success Cases** (T014): All valid recording scenarios
2. **Validation Errors** (T015): Unregistered types, oversized metadata
3. **Graceful Failure** (T015): Database errors, signal emission, metric increment

**Test Execution**:
```bash
# Run all audit tests
pytest tests/audit/ -v

# Run with coverage
pytest tests/audit/ --cov=src/audit --cov-report=term-missing

# Run fast (skip slow integration tests)
pytest tests/audit/ -m "not slow"
```

## Definition of Done

- [ ] All 5 subtasks completed (T011-T015)
- [ ] Type checking passes: `mypy src/audit/ --strict` exits with status 0
- [ ] All type hints use Python 3.12+ syntax (no legacy `typing.List`, use `list` instead)
- [ ] Metadata validation implemented:
  - Recording with 9KB metadata: succeeds
  - Recording with 11KB metadata: raises ValueError
  - Error message includes actual size
- [ ] IP/user agent auto-capture implemented:
  - Recording with request: metadata has 'ip' and 'user_agent'
  - Recording without request: no auto-capture
  - Explicit metadata values not overwritten
- [ ] All unit tests pass: `pytest tests/audit/test_api.py -v`
- [ ] Test coverage >95% for api.py: `pytest tests/audit/test_api.py --cov=src/audit/api`
- [ ] No linting errors: `ruff check src/audit/ tests/audit/`
- [ ] No formatting issues: `black --check src/audit/ tests/audit/`

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| mypy errors on Django ORM patterns | Medium | Use django-stubs, add `# type: ignore` with justification if needed |
| Metadata size edge cases (Unicode) | Low | Use `encode('utf-8')` for accurate byte count |
| Test fixtures conflict with existing test data | Medium | Use pytest fixtures with `db` marker, isolate test database |

## Reviewer Guidance

**What to verify**:
1. **Type Hints**: All functions have complete type annotations
2. **Metadata Validation**: Serializes to JSON before measuring (not dict size)
3. **Auto-Capture Logic**: Uses `setdefault` to preserve explicit values
4. **Test Coverage**: Tests cover all branches (success, validation errors, graceful failure)
5. **Graceful Failure**: Database errors caught, logged, signal emitted, metric incremented

**What to test**:
1. Run `mypy src/audit/` - should exit cleanly
2. Run `pytest tests/audit/test_api.py -v` - all tests pass
3. Test oversized metadata manually:
   ```python
   from audit.api import audit_log
   audit_log.record('test.event', metadata={'data': 'x' * 15000})
   # Should raise ValueError
   ```
4. Check coverage: `pytest tests/audit/ --cov=src/audit/api --cov-report=html`
   - Open htmlcov/index.html, verify api.py >95%

**Red flags**:
- Type errors requiring many `# type: ignore` comments (indicates design issue)
- Tests that mock too much (e.g., mocking entire AuditEvent model)
- Validation using dict size instead of JSON byte size
- Graceful failure that swallows exceptions without logging

## Activity Log

- 2025-11-27T14:10:29Z – claude – shell_pid=45896 – lane=doing – Started WP02 implementation
- 2025-11-27T14:14:52Z – claude – shell_pid=45896 – lane=for_review – Ready for review
- 2025-11-27T15:15:00Z – claude-sonnet-4.5-reviewer – shell_pid=45896 – lane=done – Code review approved and moved to done lane
