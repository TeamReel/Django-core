---
work_package_id: "WP08"
subtasks:
  - "T069"
  - "T070"
  - "T071"
  - "T072"
  - "T073"
  - "T074"
  - "T075"
  - "T076"
  - "T077"
title: "Background Tasks Example"
phase: "Phase 3 - Examples"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-04T21:30:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP08 – Background Tasks Example

## Objectives & Success Criteria

**Goal**: Create an example demonstrating Celery task patterns.

**Success Criteria**:
- Example shows async task, periodic task, and chained tasks
- Demonstrates error handling and retries
- Includes monitoring patterns
- Smoke tests pass in CI

## Context & Constraints

**Reference Documents**:
- `kitty-specs/021-docs-examples/spec.md` - User Story 5, FR-044 through FR-051
- `kitty-specs/015-tasks-scheduling-foundation/spec.md` - Task patterns
- `src/tasks/` - Core task infrastructure

**Dependencies**: WP01 (structure), WP02 (getting started), WP07 (CRUD example)

**Example Structure**:
```
examples/background-tasks/
├── README.md
├── pyproject.toml
├── src/
│   └── email_tasks/
│       ├── __init__.py
│       ├── tasks.py
│       ├── scheduler.py
│       └── models.py
└── tests/
    └── test_email_tasks.py
```

## Subtasks & Detailed Guidance

### T069 – Create `examples/background-tasks/` directory structure

**Purpose**: Set up example project skeleton.

**Steps**:
1. Create directory structure as shown above
2. Add `__init__.py` files
3. Set up Celery configuration

**Files**: `examples/background-tasks/` directory tree

### T070 – Create `examples/background-tasks/pyproject.toml`

**Purpose**: Example project configuration with Celery.

**Content**:
```toml
[project]
name = "background-tasks-example"
version = "0.1.0"
description = "Background tasks example using django-core"
requires-python = ">=3.12"
dependencies = [
    "django>=5.1",
    "celery>=5.3",
    "redis>=5.0",
    "django-celery-beat>=2.5",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-django>=4.5",
    "pytest-celery>=0.0.0",
]
```

**Files**: `examples/background-tasks/pyproject.toml`

### T071 – Create basic async task

**Purpose**: Demonstrate simple async task pattern.

**Content**:
```python
# examples/background-tasks/src/email_tasks/tasks.py
from celery import shared_task
from django.core.mail import send_mail
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_welcome_email(self, user_email: str, user_name: str):
    """Send welcome email to new user.
    
    Demonstrates:
    - Basic async task
    - Retry on failure
    - Logging
    """
    try:
        send_mail(
            subject='Welcome!',
            message=f'Hello {user_name}, welcome to our platform!',
            from_email='noreply@example.com',
            recipient_list=[user_email],
        )
        logger.info(f"Welcome email sent to {user_email}")
        return {"status": "sent", "email": user_email}
    except Exception as exc:
        logger.error(f"Failed to send email: {exc}")
        raise self.retry(exc=exc, countdown=60)
```

**Files**: `examples/background-tasks/src/email_tasks/tasks.py`

### T072 – Create periodic task

**Purpose**: Demonstrate scheduled task pattern.

**Content**:
```python
# examples/background-tasks/src/email_tasks/scheduler.py
from celery import shared_task
from celery.schedules import crontab
from django.utils import timezone
from .models import EmailLog

@shared_task
def cleanup_old_logs():
    """Clean up email logs older than 30 days.
    
    Demonstrates:
    - Periodic task pattern
    - Database cleanup
    - Scheduled execution
    """
    cutoff = timezone.now() - timezone.timedelta(days=30)
    deleted_count, _ = EmailLog.objects.filter(created_at__lt=cutoff).delete()
    return {"deleted_count": deleted_count}

# In celery.py or settings:
# CELERY_BEAT_SCHEDULE = {
#     'cleanup-old-logs': {
#         'task': 'email_tasks.scheduler.cleanup_old_logs',
#         'schedule': crontab(hour=2, minute=0),  # Run at 2 AM
#     },
# }
```

**Files**: `examples/background-tasks/src/email_tasks/scheduler.py`

### T073 – Create chained tasks

**Purpose**: Demonstrate task chaining pattern.

**Content**:
```python
# examples/background-tasks/src/email_tasks/tasks.py (add to existing)

@shared_task
def validate_email(email: str) -> dict:
    """Validate email format and existence."""
    import re
    is_valid = bool(re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email))
    return {"email": email, "is_valid": is_valid}

@shared_task
def log_email_attempt(result: dict) -> dict:
    """Log the email attempt to database."""
    from .models import EmailLog
    EmailLog.objects.create(
        email=result['email'],
        status='validated' if result.get('is_valid') else 'invalid'
    )
    return result

@shared_task
def notify_admin(result: dict) -> dict:
    """Notify admin of failed emails."""
    if not result.get('is_valid'):
        # Send admin notification
        pass
    return result

# Usage:
# from celery import chain
# workflow = chain(
#     validate_email.s('user@example.com'),
#     log_email_attempt.s(),
#     notify_admin.s()
# )
# workflow.apply_async()
```

**Files**: `examples/background-tasks/src/email_tasks/tasks.py`

### T074 – Create EmailLog model

**Purpose**: Supporting model for examples.

**Content**:
```python
# examples/background-tasks/src/email_tasks/models.py
from django.db import models

class EmailLog(models.Model):
    """Track email sending attempts."""
    email = models.EmailField()
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
```

**Files**: `examples/background-tasks/src/email_tasks/models.py`

### T075 – Create pytest tests with celery fixtures

**Purpose**: Test tasks with pytest-celery.

**Content**:
```python
# examples/background-tasks/tests/test_email_tasks.py
import pytest
from email_tasks.tasks import send_welcome_email, validate_email

@pytest.mark.django_db
class TestEmailTasks:
    def test_send_welcome_email_success(self, celery_app, celery_worker, mailoutbox):
        """Test welcome email task sends email."""
        result = send_welcome_email.delay('test@example.com', 'Test User')
        result.get(timeout=10)
        
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ['test@example.com']
    
    def test_validate_email_valid(self, celery_app, celery_worker):
        """Test email validation with valid email."""
        result = validate_email.delay('valid@example.com')
        response = result.get(timeout=10)
        
        assert response['is_valid'] is True
    
    def test_validate_email_invalid(self, celery_app, celery_worker):
        """Test email validation with invalid email."""
        result = validate_email.delay('invalid-email')
        response = result.get(timeout=10)
        
        assert response['is_valid'] is False
```

**Files**: `examples/background-tasks/tests/test_email_tasks.py`

### T076 – Create conftest.py with celery fixtures

**Purpose**: Celery test configuration.

**Content**:
```python
# examples/background-tasks/tests/conftest.py
import pytest

@pytest.fixture(scope='session')
def celery_config():
    return {
        'broker_url': 'memory://',
        'result_backend': 'cache+memory://',
        'task_always_eager': True,  # For testing
    }

@pytest.fixture
def mailoutbox():
    """Django mail outbox fixture."""
    from django.core import mail
    return mail.outbox
```

**Files**: `examples/background-tasks/tests/conftest.py`

### T077 – Write `examples/background-tasks/README.md`

**Purpose**: Step-by-step walkthrough.

**Content Structure**:
1. **Overview**: Celery task patterns demonstrated
2. **Prerequisites**: Redis, Celery knowledge
3. **Setup**:
   ```bash
   cd examples/background-tasks
   pip install -e .
   # Start Redis
   celery -A config worker -l INFO
   celery -A config beat -l INFO
   ```
4. **Task Patterns**:
   - Basic async task
   - Retry logic
   - Periodic tasks
   - Task chains
5. **Monitoring**: Flower, logging
6. **Running Tests**: `pytest`
7. **Key Patterns**: What to learn

**Files**: `examples/background-tasks/README.md`

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Redis not available in CI | Use memory broker for tests |
| Celery version conflicts | Pin versions in pyproject.toml |

## Definition of Done Checklist

- [ ] T069: Directory structure created
- [ ] T070: pyproject.toml with Celery deps
- [ ] T071: Basic async task with retries
- [ ] T072: Periodic task with schedule
- [ ] T073: Chained tasks example
- [ ] T074: EmailLog model created
- [ ] T075: Pytest tests with celery
- [ ] T076: conftest.py with fixtures
- [ ] T077: README with walkthrough
- [ ] Example runs with Redis
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Test with actual Redis if possible
- Verify retry logic works
- Check periodic task schedule

## Activity Log

- 2025-12-04T21:30:00Z – system – lane=planned – Prompt created.

