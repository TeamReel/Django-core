# Python API Contract: Audit Logging
*Path: [kitty-specs/009-audit-logging-system/contracts/python-api.md](kitty-specs/009-audit-logging-system/contracts/python-api.md)*

**Feature**: Audit Logging System
**Date**: 2025-11-27

## Overview

The audit logging system exposes a Python API (not REST API in MVP) for recording and managing audit events. This contract defines the public interface that all consumers (B08, B03, downstream products) depend on.

---

## Module: `audit.api`

### Function: `audit_log.record()`

**Purpose**: Record a single audit event

**Signature**:
```python
def record(
    event_type: str,
    user: Optional[User] = None,
    organization: Optional[Organization] = None,
    project: Optional[Project] = None,
    metadata: Optional[dict[str, Any]] = None,
    *,
    request: Optional[HttpRequest] = None,
) -> Optional[AuditEvent]:
    """
    Record an audit event.

    Args:
        event_type: Dot-notation event type (e.g., "auth.login", "permission.granted")
        user: User who performed the action (None for system events)
        organization: Organization context (None for system or cross-org events)
        project: Project context (None for org-level or system events)
        metadata: Event-specific structured data (max 10KB serialized JSON)
        request: HttpRequest object for automatic IP/user agent capture

    Returns:
        AuditEvent instance if successful, None if recording failed (graceful degradation)

    Raises:
        ValueError: If event_type is unregistered or metadata exceeds size limit
        TypeError: If arguments are wrong type

    Examples:
        >>> from audit.api import audit_log
        >>> audit_log.record("auth.login", user=user, metadata={"ip": "192.168.1.1"})
        <AuditEvent: auth.login at 2025-11-27 10:30:00>

        >>> audit_log.record("permission.granted", user=admin, metadata={
        ...     "target_user_id": 456,
        ...     "permission": "projects.create_project"
        ... })
        <AuditEvent: permission.granted at 2025-11-27 10:31:00>
    ```
    """
```

**Behavior**:
- **Validation**: Checks event_type registration, metadata size before persistence
- **Automatic Fields**: Sets `created_at` automatically (Django `auto_now_add`)
- **Request Context**: If `request` provided, extracts IP and user agent to metadata
- **Graceful Failure**: Catches all exceptions, logs to Django logger, emits signal and metric, returns None
- **Thread Safety**: Safe to call from multiple threads/requests concurrently

**Error Handling**:
```python
# Raises ValueError immediately (caller must handle):
audit_log.record("invalid_event")  # Unregistered event type
audit_log.record("auth.login", metadata={"huge": "x" * 100000})  # > 10KB

# Returns None on failure (graceful degradation):
audit_log.record("auth.login", user=user)  # Database unavailable
# ^ Logs error, emits audit_record_failed signal, increments metric
```

---

## Module: `audit.registry`

### Function: `register_event_type()`

**Purpose**: Register a new event type for validation

**Signature**:
```python
def register_event_type(
    event_type: str,
    description: str,
    required_metadata: Optional[list[str]] = None,
    optional_metadata: Optional[list[str]] = None,
) -> None:
    """
    Register an event type in the global registry.

    Args:
        event_type: Dot-notation type (e.g., "auth.login", "billing.payment_received")
        description: Human-readable description for documentation
        required_metadata: List of required metadata keys
        optional_metadata: List of optional metadata keys

    Raises:
        ValueError: If event_type format invalid or already registered

    Examples:
        >>> from audit.registry import register_event_type
        >>> register_event_type(
        ...     "auth.login",
        ...     description="User authenticated successfully",
        ...     required_metadata=["ip", "user_agent"],
        ...     optional_metadata=["method"]
        ... )
    ```
    """
```

**Behavior**:
- **Format Validation**: Checks `^[a-z0-9_]+\.[a-z0-9_]+$` regex
- **Uniqueness**: Raises ValueError if type already registered
- **Thread Safety**: Uses lock for concurrent registration during app startup
- **Idempotency**: Not idempotent - duplicate registration raises error

### Function: `list_event_types()`

**Purpose**: Get all registered event types

**Signature**:
```python
def list_event_types() -> dict[str, EventTypeMetadata]:
    """
    Get all registered event types.

    Returns:
        Dictionary mapping event_type to EventTypeMetadata

    Examples:
        >>> from audit.registry import list_event_types
        >>> types = list_event_types()
        >>> types["auth.login"]
        EventTypeMetadata(
            category="auth",
            action="login",
            description="User authenticated successfully",
            required_metadata=["ip", "user_agent"],
            optional_metadata=["method"]
        )
    ```
    """
```

---

## Module: `audit.signals`

### Signal: `audit_record_failed`

**Purpose**: Emitted when audit event recording fails

**Signature**:
```python
audit_record_failed = Signal()  # providing_args=['exception', 'event_data']

# Usage:
from audit.signals import audit_record_failed

@receiver(audit_record_failed, sender=AuditEvent)
def handle_audit_failure(sender, exception, event_data, **kwargs):
    """Custom handler for audit failures"""
    if event_data['event_type'] == 'auth.login':
        # Page ops for critical auth event failures
        send_page(f"Audit recording failed: {exception}")
```

**Arguments**:
- `sender`: Always `AuditEvent` model class
- `exception`: The caught exception instance
- `event_data`: Dict of event data that failed to record (event_type, user_id, etc.)

**When Emitted**: Every time `audit_log.record()` catches an exception during save

---

## Module: `audit.metrics`

### Metric: `audit_failures_total`

**Type**: Counter

**Purpose**: Count audit recording failures by event type and reason

**Labels**:
- `event_type`: The event_type that failed (e.g., "auth.login")
- `reason`: Error class name (e.g., "DatabaseError", "IntegrityError")

**Usage**:
```python
# Automatic - incremented by audit_log.record() on failure
# Query in Prometheus:
rate(audit_failures_total[5m]) > 0  # Alert if any failures
sum(audit_failures_total{event_type="auth.login"}) by (reason)  # Failures by reason
```

### Metric: `audit_events_recorded_total`

**Type**: Counter

**Purpose**: Count successful audit event recordings by type

**Labels**:
- `event_type`: The event_type recorded (e.g., "auth.login")

**Usage**:
```python
# Automatic - incremented by audit_log.record() on success
# Query in Prometheus:
rate(audit_events_recorded_total[5m])  # Events per second
sum(audit_events_recorded_total) by (event_type)  # Total events by type
```

---

## Integration Examples

### B08 Permission System

```python
# src/permissions/evaluator.py
from audit.api import audit_log

class PermissionEvaluator:
    def check_permission(self, user, permission, resource):
        result = self._evaluate(user, permission, resource)

        # Audit the permission check
        audit_log.record(
            event_type="permission.checked",
            user=user,
            organization=resource.organization if hasattr(resource, 'organization') else None,
            metadata={
                "permission": permission,
                "resource_type": resource.__class__.__name__,
                "resource_id": resource.id,
                "result": "allowed" if result else "denied",
            }
        )

        return result
```

```python
# src/permissions/models.py
from audit.api import audit_log

class RoleAssignment(models.Model):
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new:
            audit_log.record(
                event_type="role.assigned",
                user=self.assigned_by,
                organization=self.organization,
                metadata={
                    "role_name": self.role.name,
                    "target_user_id": self.user.id,
                    "target_user_email": self.user.email,
                    "scope": self.scope,
                }
            )
```

### B03 Authentication

```python
# src/accounts/views.py
from audit.api import audit_log

class LoginView(View):
    def post(self, request):
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(username=username, password=password)

        if user:
            login(request, user)
            audit_log.record(
                event_type="auth.login",
                user=user,
                request=request,  # Automatic IP/user agent capture
                metadata={"method": "password"}
            )
            return redirect('dashboard')
        else:
            audit_log.record(
                event_type="auth.login_failed",
                request=request,
                metadata={
                    "username": username,
                    "reason": "invalid_credentials"
                }
            )
            return render(request, 'login.html', {'error': 'Invalid credentials'})
```

### Downstream Product (Custom Events)

```python
# downstream_product/billing/apps.py
from django.apps import AppConfig
from audit.registry import register_event_type

class BillingConfig(AppConfig):
    name = 'billing'

    def ready(self):
        # Register custom event types
        register_event_type(
            "billing.subscription_created",
            description="New subscription created",
            required_metadata=["plan_name", "amount"],
            optional_metadata=["trial_days", "coupon_code"]
        )
        register_event_type(
            "billing.payment_received",
            description="Payment successfully processed",
            required_metadata=["amount", "currency", "payment_method"],
            optional_metadata=["transaction_id", "invoice_id"]
        )

# downstream_product/billing/services.py
from audit.api import audit_log

def create_subscription(user, plan, organization):
    subscription = Subscription.objects.create(
        user=user,
        plan=plan,
        organization=organization
    )

    audit_log.record(
        event_type="billing.subscription_created",
        user=user,
        organization=organization,
        metadata={
            "plan_name": plan.name,
            "amount": plan.price,
            "subscription_id": subscription.id
        }
    )

    return subscription
```

---

## Backward Compatibility Guarantees

**Stable API** (Will not change without major version bump):
- `audit_log.record()` signature and behavior
- `register_event_type()` signature and validation rules
- `audit_record_failed` signal arguments
- Prometheus metric names and labels

**Unstable/Internal** (May change in minor versions):
- `AuditEvent` model fields (use API, not direct model access)
- Registry internal data structures
- Admin customization details

**Deprecation Policy**:
- Breaking changes require 1 minor version deprecation warning
- Example: If adding required parameter, provide default for 1 version
- Deprecated features logged at WARNING level

---

## Error Codes

| Code | Exception | Meaning | Caller Action |
|------|-----------|---------|---------------|
| `UNREGISTERED_EVENT_TYPE` | ValueError | Event type not in registry | Register type or fix typo |
| `METADATA_SIZE_EXCEEDED` | ValueError | Metadata > 10KB | Reduce metadata size |
| `INVALID_EVENT_TYPE_FORMAT` | ValueError | Type doesn't match regex | Fix format to `category.action` |
| `DUPLICATE_EVENT_TYPE` | ValueError | Type already registered | Use existing or choose different name |
| `RECORDING_FAILED` | None (graceful) | Database error, etc. | Check logs, metrics, retry if needed |

---

## Performance Characteristics

**audit_log.record()**:
- **Typical**: 5-15ms (database insert + index updates)
- **With GIN index**: +10-20% vs without index
- **Failure path**: <1ms (validation only, no DB hit)
- **Graceful degradation**: <1ms (catch exception, log, signal, metric)

**register_event_type()**:
- **Typical**: <1ms (in-memory dict insert with lock)
- **Startup**: ~10-50ms for 50-100 core event types

**Query Performance** (100K events):
- **Recent events (no filter)**: <50ms (uses `-created_at` index)
- **By event_type**: <100ms (uses `event_type` index)
- **By user/org/project**: <100ms (uses FK indexes + select_related)
- **By metadata value**: <200ms (uses GIN index)
- **Complex multi-filter**: <500ms (combines multiple indexes)

---

## Testing Recommendations

**Unit Tests**:
```python
def test_audit_log_record_success():
    event = audit_log.record("auth.login", user=user, metadata={"ip": "127.0.0.1"})
    assert event is not None
    assert event.event_type == "auth.login"
    assert event.user == user

def test_audit_log_unregistered_type():
    with pytest.raises(ValueError, match="Unregistered event type"):
        audit_log.record("invalid.type", user=user)

def test_audit_log_metadata_size_exceeded():
    huge_metadata = {"data": "x" * 100000}
    with pytest.raises(ValueError, match="exceeds 10KB limit"):
        audit_log.record("auth.login", user=user, metadata=huge_metadata)

@patch('audit.models.AuditEvent.objects.create', side_effect=DatabaseError)
def test_audit_log_graceful_failure(mock_create, mock_signal):
    result = audit_log.record("auth.login", user=user)
    assert result is None
    mock_signal.send.assert_called_once()
```

**Integration Tests**:
```python
def test_b08_permission_check_creates_audit_event():
    evaluator.check_permission(user, "projects.create", org)
    event = AuditEvent.objects.latest('created_at')
    assert event.event_type == "permission.checked"
    assert event.user == user
    assert event.metadata["permission"] == "projects.create"
```
