---
work_package_id: "WP02"
subtasks:
  - "T015"
  - "T016"
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
  - "T023"
  - "T024"
  - "T025"
  - "T026"
  - "T027"
title: "Structured Logging & Correlation IDs"
phase: "Phase 1 - Logging Infrastructure"
lane: "doing"
assignee: "Claude Agent"
agent: "claude"
shell_pid: "39236"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-03T00:00:00Z"
    lane: "planned"
    agent: "copilot"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-03T14:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "39236"
    action: "Started WP02 implementation: Structured Logging & Correlation IDs"
---

# Work Package Prompt: WP02 – Structured Logging & Correlation IDs

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged`.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

**Goal**: Implement structured JSON logging with PII redaction, correlation ID propagation, and secure field filtering.

**Success Criteria**:
- All logs include correlation IDs and are parsable by standard JSON parsers (SC-003)
- PII redaction rules prevent leakage of sensitive fields in logs (SC-004: 0 unredacted values in 1,000 log samples)
- Correlation IDs propagate from HTTP request → log → Celery task → task log
- JSON logs include required fields: timestamp (ISO 8601), severity, message, correlation_id, context (FR-006)
- Sensitive fields auto-redacted: `password`, `secret`, `token`, `api_key`, `ssn`, `email`, `phone_number`, `credit_card` (FR-007)
- SQL queries logged with parameterized placeholders only (FR-015)
- Log severity levels configurable: DEBUG, INFO, WARNING, ERROR, CRITICAL (FR-016)

**Addresses**:
- User Story 2 (P2): Structured Logging with Security Compliance
- FR-006, FR-007, FR-008, FR-015, FR-016

---

## Context & Constraints

**Prerequisites**:
- [spec.md](../../spec.md): User Story 2, FR-006 to FR-008, FR-015, FR-016
- [plan.md](../../plan.md): Constitution Principle V (Security & Privacy), Principle VI (Performance)
- [research.md](../../research.md): Research Decision #1 (stdlib logging + custom JSON formatter), Decision #5 (contextvars for correlation IDs)
- [data-model.md](../../data-model.md): Structured log record format, correlation ID context

**Architectural Decisions**:
- Use stdlib `logging` with custom `JSONFormatter` (no structlog dependency)
- PII redaction via `logging.Filter` applied before emission
- Correlation ID storage in `contextvars.ContextVar` (async-safe)
- Middleware extracts `X-Correlation-ID` header or generates UUID

**Constraints**:
- **Performance**: <1ms log emission overhead (Constitution Principle VI)
- **Security**: No PII, secrets, or sensitive data in logs (Constitution Principle V)
- **Async Safety**: Use `contextvars` (not thread-local) for correlation ID storage

---

## Subtasks & Detailed Guidance

### T015 – Create `src/observability/logging.py` module

Create module with imports and placeholder for formatter/filters.

### T016 – Create `contextvars.ContextVar` for correlation ID

```python
import contextvars

correlation_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar('correlation_id', default=None)

def get_correlation_id() -> str | None:
    """Get correlation ID for current context."""
    return correlation_id_var.get()

def set_correlation_id(correlation_id: str) -> None:
    """Set correlation ID for current context."""
    correlation_id_var.set(correlation_id)
```

### T017 – Implement `JSONFormatter` class

Extend `logging.Formatter` with required fields per FR-006:

```python
import json
import logging
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON with required fields."""
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "severity": record.levelname,
            "message": record.getMessage(),
            "correlation_id": getattr(record, 'correlation_id', None),
            "logger_name": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "context": getattr(record, 'context', {}),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info)
            }
        
        return json.dumps(log_data, default=str)
```

### T018 – Implement `PIIRedactionFilter` class

Auto-redact sensitive fields per FR-007:

```python
import re

class PIIRedactionFilter(logging.Filter):
    """Filter to redact PII fields from log records."""
    
    REDACTED_FIELDS = {
        'password', 'secret', 'token', 'api_key', 'private_key',
        'email', 'ssn', 'phone_number', 'credit_card', 'date_of_birth'
    }
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Redact PII from record context and exception details."""
        context = getattr(record, 'context', {})
        if context:
            record.context = self._redact_dict(context)
        
        if record.exc_info:
            # Redact exception message if contains PII patterns
            record.exc_info = (record.exc_info[0], self._redact_string(str(record.exc_info[1])), record.exc_info[2])
        
        return True
    
    def _redact_dict(self, data: dict) -> dict:
        """Recursively redact sensitive fields in dictionary."""
        redacted = {}
        for key, value in data.items():
            if key.lower() in self.REDACTED_FIELDS or any(pattern in key.lower() for pattern in ['_token', '_secret', '_key']):
                redacted[key] = "[REDACTED]"
            elif isinstance(value, dict):
                redacted[key] = self._redact_dict(value)
            else:
                redacted[key] = value
        return redacted
    
    def _redact_string(self, text: str) -> str:
        """Redact email patterns from string."""
        return re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[REDACTED_EMAIL]', text)
```

### T019 – Create `CorrelationIDFilter` class

Inject correlation ID from contextvar:

```python
class CorrelationIDFilter(logging.Filter):
    """Filter to inject correlation ID into log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add correlation ID from contextvar to record."""
        record.correlation_id = get_correlation_id()
        return True
```

### T020 – Create `src/observability/middleware.py` module

Placeholder for middleware classes.

### T021 – Implement `CorrelationIDMiddleware`

Extract or generate correlation ID per FR-008:

```python
import uuid
from django.utils.deprecation import MiddlewareMixin
from .logging import set_correlation_id

class CorrelationIDMiddleware(MiddlewareMixin):
    """Middleware to extract or generate correlation IDs."""
    
    def process_request(self, request):
        """Extract X-Correlation-ID header or generate UUID."""
        correlation_id = request.META.get('HTTP_X_CORRELATION_ID')
        
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        
        set_correlation_id(correlation_id)
        request.correlation_id = correlation_id
```

### T022 – Store correlation ID in contextvar (completed in T021)

Handled by `set_correlation_id()` call in middleware.

### T023 – Configure Django `LOGGING` settings

Update `src/config/settings/base.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'observability.logging.JSONFormatter',
        },
    },
    'filters': {
        'correlation_id': {
            '()': 'observability.logging.CorrelationIDFilter',
        },
        'pii_redaction': {
            '()': 'observability.logging.PIIRedactionFilter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'filters': ['correlation_id', 'pii_redaction'],
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

### T024 – Add logging settings

```python
OBSERVABILITY_LOGGING_JSON = env.bool('OBSERVABILITY_LOGGING_JSON', default=True)
OBSERVABILITY_PII_REDACTION_ENABLED = env.bool('OBSERVABILITY_PII_REDACTION_ENABLED', default=True)
```

### T025 – Configure log severity levels

Update root logger level based on environment:

```python
LOGGING['root']['level'] = env.str('LOG_LEVEL', default='INFO')
```

### T026 – Update middleware list

Add `CorrelationIDMiddleware` early in stack:

```python
MIDDLEWARE = [
    'observability.middleware.CorrelationIDMiddleware',  # Early in stack
    'django.middleware.security.SecurityMiddleware',
    # ... rest of middleware
]
```

### T027 – Implement SQL query parameter stripping

Add helper function in `logging.py`:

```python
def redact_sql_params(sql: str) -> str:
    """Strip parameters from SQL queries for FR-015."""
    # Replace numeric literals: WHERE id=123 → WHERE id=?
    sql = re.sub(r'=\s*\d+', '=?', sql)
    # Replace string literals: WHERE email='user@example.com' → WHERE email=?
    sql = re.sub(r"=\s*'[^']*'", "=?", sql)
    sql = re.sub(r'=\s*"[^"]*"', '=?', sql)
    return sql
```

Use in exception logging when SQL errors occur.

---

## Test Strategy

**Test File**: `tests/observability/test_logging.py`, `tests/observability/test_middleware.py`

**Key Scenarios**:
1. PII redaction: Log with `password`, `email`, `ssn` fields, verify all redacted
2. Correlation ID injection: Trigger log, verify `correlation_id` present
3. JSON parsing: Ingest 10,000 logs, verify 0 parsing errors (SC-003)
4. SQL parameter stripping: Log SQL with parameters, verify redacted
5. Missing correlation ID: Request without header, verify UUID generated

**Coverage Target**: 95%

---

## Definition of Done Checklist

- [ ] All 13 subtasks (T015-T027) completed
- [ ] JSON logs include required fields (timestamp, severity, message, correlation_id, context)
- [ ] PII redaction tested with 1,000 log samples (0 unredacted per SC-004)
- [ ] Correlation IDs propagate from HTTP → log
- [ ] SQL queries logged with parameterized placeholders
- [ ] Type hints present for all logging interfaces
- [ ] Tests cover PII redaction, correlation ID propagation, JSON parsing

---

## Activity Log

- 2025-12-03T00:00:00Z – copilot – lane=planned – Prompt created via /spec-kitty.tasks
