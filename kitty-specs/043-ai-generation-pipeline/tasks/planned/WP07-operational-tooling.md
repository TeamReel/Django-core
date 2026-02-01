---
work_package_id: "WP07"
subtasks:
  - "T055"
  - "T056"
  - "T057"
  - "T058"
  - "T059"
  - "T060"
  - "T061"
  - "T062"
  - "T063"
title: "Operational Tooling"
phase: "Phase 4 - Operations & Polish"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-01T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP07 – Operational Tooling

## Review Feedback

*[Empty - populated by `/spec-kitty.review` if work needs changes]*

---

## Objectives & Success Criteria

**Outcomes**:
1. Cleanup cron job for expired outputs
2. Cost update cron job for provider pricing
3. Django admin enhancements (filters, actions, search)
4. Structured logging with request context
5. Prometheus metrics for monitoring
6. Management commands for common operations
7. Tooling tests achieve >80% coverage

**Success Metrics**:
- Cron jobs run daily without errors
- Admin interface supports bulk operations
- Logs include request ID, user, status
- Metrics exported to Prometheus

---

## Context & Constraints

**Prerequisites**:
- WP01-WP06 complete (all core functionality exists)
- Celery Beat configured for cron jobs
- Prometheus exporter installed (optional)

**Supporting Documents**:
- [spec.md](../spec.md) - NFR-001 to NFR-007 (operational requirements)
- [plan.md](../plan.md) - Phase 7 implementation details

**Architectural Decisions**:
- Cron jobs via Celery Beat (not system cron)
- Structured logging with JSON formatter
- Metrics optional (feature flag)

**Constraints**:
- Production-safe: No destructive operations without confirmation
- Performance: Batch operations for large datasets
- Monitoring: Export key metrics (requests/min, costs, errors)

---

## Subtasks & Detailed Guidance

### Subtask T055 – Create cleanup cron job

**Purpose**: Daily cleanup of expired outputs

**Steps**:
1. Already created in WP06 T049:
   ```python
   # src/generative/management/commands/cleanup_expired_outputs.py
   class Command(BaseCommand):
       help = 'Delete expired generation outputs'
       # ... implementation from T049
   ```

2. Register with Celery Beat:
   ```python
   # settings.py or celery.py
   from celery.schedules import crontab

   CELERY_BEAT_SCHEDULE = {
       'cleanup-expired-outputs': {
           'task': 'src.generative.tasks.cleanup_expired_outputs',
           'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
       },
   }
   ```

3. Create Celery task wrapper:
   ```python
   # src/generative/tasks.py
   from celery import shared_task
   from django.core.management import call_command

   @shared_task
   def cleanup_expired_outputs():
       """Celery task to cleanup expired outputs."""
       call_command('cleanup_expired_outputs')
   ```

**Files**: `src/generative/tasks.py`, `settings.py`

**Parallel?**: No (depends on WP06 T049)

**Notes**: Run daily at 2 AM (low-traffic time)

---

### Subtask T056 – Create cost update cron job

**Purpose**: Monthly update of provider pricing

**Steps**:
1. Create command:
   ```python
   # src/generative/management/commands/update_pricing.py
   from django.core.management.base import BaseCommand
   import requests

   class Command(BaseCommand):
       help = 'Update provider pricing from external API'

       def handle(self, *args, **options):
           # Fetch latest pricing from OpenAI API
           # (or manual update from pricing.py)

           from src.generative.utils.pricing import PRICING_MODELS

           # Example: Update OpenAI pricing
           # In production, fetch from official API or update manually
           PRICING_MODELS['openai']['gpt-4']['input'] = 0.03  # per 1K tokens
           PRICING_MODELS['openai']['gpt-4']['output'] = 0.06

           self.stdout.write(self.style.SUCCESS('Pricing updated'))
   ```

2. Register with Celery Beat:
   ```python
   CELERY_BEAT_SCHEDULE = {
       # ... existing schedules
       'update-pricing': {
           'task': 'src.generative.tasks.update_pricing',
           'schedule': crontab(day_of_month=1, hour=0, minute=0),  # Monthly
       },
   }
   ```

3. Create Celery task:
   ```python
   @shared_task
   def update_pricing():
       """Update provider pricing."""
       call_command('update_pricing')
   ```

**Files**: `src/generative/management/commands/update_pricing.py`, `src/generative/tasks.py`

**Parallel?**: After T055

**Notes**: Run monthly on 1st day of month

---

### Subtask T057 – Enhance Django admin

**Purpose**: Add filters, actions, search to admin interface

**Steps**:
1. Update `src/generative/admin.py`:
   ```python
   from django.contrib import admin
   from django.utils.html import format_html

   @admin.register(GenerationTemplate)
   class GenerationTemplateAdmin(admin.ModelAdmin):
       list_display = ['name', 'slug', 'version', 'organisation', 'is_latest', 'is_active', 'created_at']
       list_filter = ['is_active', 'is_latest', 'organisation', 'created_at']
       search_fields = ['name', 'slug', 'description']
       date_hierarchy = 'created_at'
       actions = ['activate_templates', 'deactivate_templates']

       def activate_templates(self, request, queryset):
           """Bulk activate templates."""
           count = queryset.update(is_active=True)
           self.message_user(request, f'{count} templates activated')

       def deactivate_templates(self, request, queryset):
           """Bulk deactivate templates."""
           count = queryset.update(is_active=False)
           self.message_user(request, f'{count} templates deactivated')

   @admin.register(GenerationRequest)
   class GenerationRequestAdmin(admin.ModelAdmin):
       list_display = ['id', 'template', 'requester', 'status_badge', 'retry_count', 'estimated_cost', 'actual_cost', 'created_at']
       list_filter = ['status', 'error_category', 'created_at']
       search_fields = ['id', 'requester__username', 'template__name']
       date_hierarchy = 'created_at'
       actions = ['cancel_requests', 'retry_requests']

       def status_badge(self, obj):
           """Colored status badge."""
           colors = {
               'pending': 'orange',
               'processing': 'blue',
               'completed': 'green',
               'failed': 'red',
               'cancelled': 'gray'
           }
           color = colors.get(obj.status, 'black')
           return format_html(
               '<span style="color: {};">{}</span>',
               color, obj.status.upper()
           )

       def cancel_requests(self, request, queryset):
           """Bulk cancel requests."""
           pending = queryset.filter(status__in=['pending', 'processing'])
           count = pending.update(status='cancelled')
           self.message_user(request, f'{count} requests cancelled')

       def retry_requests(self, request, queryset):
           """Bulk retry failed requests."""
           failed = queryset.filter(status='failed', retry_count__lt=5)
           for req in failed:
               req.status = 'pending'
               req.save()
               from src.generative.tasks import process_generation_request
               process_generation_request.delay(req.id)
           self.message_user(request, f'{failed.count()} requests queued for retry')
   ```

**Files**: `src/generative/admin.py`

**Parallel?**: After WP01 T008

**Notes**: Add bulk actions for common operations

---

### Subtask T058 – Add structured logging

**Purpose**: Log with request context for debugging

**Steps**:
1. Configure logging:
   ```python
   # settings.py
   LOGGING = {
       'version': 1,
       'disable_existing_loggers': False,
       'formatters': {
           'json': {
               '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
               'format': '%(asctime)s %(name)s %(levelname)s %(message)s'
           },
       },
       'handlers': {
           'console': {
               'class': 'logging.StreamHandler',
               'formatter': 'json',
           },
           'file': {
               'class': 'logging.handlers.RotatingFileHandler',
               'filename': 'logs/generative.log',
               'maxBytes': 10485760,  # 10MB
               'backupCount': 5,
               'formatter': 'json',
           },
       },
       'loggers': {
           'generative': {
               'handlers': ['console', 'file'],
               'level': 'INFO',
               'propagate': False,
           },
       },
   }
   ```

2. Add context to logs:
   ```python
   # src/generative/tasks.py
   import logging

   logger = logging.getLogger('generative.tasks')

   @shared_task
   def process_generation_request(request_id):
       logger.info(
           'Processing request',
           extra={
               'request_id': request_id,
               'user_id': request.requester_id,
               'template_id': request.template_id,
               'provider': request.template.pipeline_config['provider']
           }
       )
   ```

**Files**: `settings.py`, update all modules with structured logs

**Parallel?**: After WP04 (task exists)

**Notes**: Add `python-json-logger` to requirements

---

### Subtask T059 – Add Prometheus metrics

**Purpose**: Export metrics for monitoring

**Steps**:
1. Install prometheus client:
   ```bash
   pip install prometheus-client django-prometheus
   ```

2. Add to settings:
   ```python
   INSTALLED_APPS = [
       # ... existing
       'django_prometheus',
   ]

   MIDDLEWARE = [
       'django_prometheus.middleware.PrometheusBeforeMiddleware',
       # ... existing middleware
       'django_prometheus.middleware.PrometheusAfterMiddleware',
   ]
   ```

3. Add custom metrics:
   ```python
   # src/generative/metrics.py
   from prometheus_client import Counter, Histogram, Gauge

   request_total = Counter(
       'generative_requests_total',
       'Total generation requests',
       ['status', 'provider']
   )

   request_duration = Histogram(
       'generative_request_duration_seconds',
       'Request processing duration',
       ['provider']
   )

   request_cost = Histogram(
       'generative_request_cost_dollars',
       'Request cost in dollars',
       ['provider']
   )

   active_requests = Gauge(
       'generative_active_requests',
       'Number of active requests'
   )
   ```

4. Instrument task:
   ```python
   from .metrics import request_total, request_duration, request_cost

   @shared_task
   def process_generation_request(request_id):
       start = time.time()

       # ... execute request

       duration = time.time() - start
       provider = request.template.pipeline_config['provider']

       request_total.labels(status=request.status, provider=provider).inc()
       request_duration.labels(provider=provider).observe(duration)
       if request.actual_cost:
           request_cost.labels(provider=provider).observe(request.actual_cost)
   ```

5. Expose metrics endpoint:
   ```python
   # urls.py
   urlpatterns = [
       # ... existing
       path('metrics/', include('django_prometheus.urls')),
   ]
   ```

**Files**: `src/generative/metrics.py`, `settings.py`, `urls.py`

**Parallel?**: After WP04 (task exists)

**Notes**: Metrics optional (feature flag)

---

### Subtask T060 – Create management commands

**Purpose**: Commands for common operations

**Steps**:
1. Retry failed requests:
   ```python
   # src/generative/management/commands/retry_failed_requests.py
   from django.core.management.base import BaseCommand
   from src.generative.models import GenerationRequest
   from src.generative.tasks import process_generation_request

   class Command(BaseCommand):
       help = 'Retry failed generation requests'

       def add_arguments(self, parser):
           parser.add_argument('--max-retries', type=int, default=5)

       def handle(self, *args, **options):
           max_retries = options['max_retries']
           failed = GenerationRequest.objects.filter(
               status='failed',
               retry_count__lt=max_retries
           )

           count = 0
           for req in failed:
               req.status = 'pending'
               req.save()
               process_generation_request.delay(req.id)
               count += 1

           self.stdout.write(self.style.SUCCESS(f'Queued {count} requests for retry'))
   ```

2. Generate usage report:
   ```python
   # src/generative/management/commands/usage_report.py
   from django.core.management.base import BaseCommand
   from django.utils import timezone
   from src.generative.models import GenerationRequest
   from datetime import timedelta

   class Command(BaseCommand):
       help = 'Generate usage report'

       def add_arguments(self, parser):
           parser.add_argument('--days', type=int, default=30)

       def handle(self, *args, **options):
           days = options['days']
           since = timezone.now() - timedelta(days=days)

           requests = GenerationRequest.objects.filter(created_at__gte=since)

           total_requests = requests.count()
           completed = requests.filter(status='completed').count()
           failed = requests.filter(status='failed').count()
           total_cost = requests.aggregate(Sum('actual_cost'))['actual_cost__sum'] or 0

           self.stdout.write(f"Usage Report (last {days} days)")
           self.stdout.write(f"Total Requests: {total_requests}")
           self.stdout.write(f"Completed: {completed}")
           self.stdout.write(f"Failed: {failed}")
           self.stdout.write(f"Total Cost: ${total_cost:.2f}")
   ```

**Files**: `src/generative/management/commands/retry_failed_requests.py`, `src/generative/management/commands/usage_report.py`

**Parallel?**: After WP04

**Notes**: Commands useful for ops tasks

---

### Subtask T061 – Add health check endpoint

**Purpose**: Health check for monitoring systems

**Steps**:
1. Create view:
   ```python
   # src/generative/views.py
   from rest_framework.decorators import api_view, permission_classes
   from rest_framework.permissions import AllowAny
   from rest_framework.response import Response
   from django.db import connection

   @api_view(['GET'])
   @permission_classes([AllowAny])
   def health_check(request):
       """Health check endpoint."""
       try:
           # Check database
           with connection.cursor() as cursor:
               cursor.execute("SELECT 1")

           # Check Celery (optional)
           from celery import current_app
           celery_status = current_app.control.inspect().stats()

           return Response({
               'status': 'healthy',
               'database': 'ok',
               'celery': 'ok' if celery_status else 'unreachable'
           })
       except Exception as e:
           return Response({
               'status': 'unhealthy',
               'error': str(e)
           }, status=503)
   ```

2. Add URL:
   ```python
   urlpatterns = [
       # ... existing
       path('health/', health_check, name='health-check'),
   ]
   ```

**Files**: `src/generative/views.py`, `src/generative/urls.py`

**Parallel?**: After WP02

**Notes**: Health check for load balancers

---

### Subtask T062 – Add rate limiting

**Purpose**: Prevent abuse with rate limits

**Steps**:
1. Install django-ratelimit:
   ```bash
   pip install django-ratelimit
   ```

2. Add to ViewSet:
   ```python
   from ratelimit.decorators import ratelimit
   from ratelimit.exceptions import Ratelimited

   class GenerationRequestViewSet(viewsets.ModelViewSet):
       @ratelimit(key='user', rate='10/m', method='POST')
       def create(self, request, *args, **kwargs):
           """Rate limit: 10 requests per minute per user."""
           if getattr(request, 'limited', False):
               raise Ratelimited('Too many requests')
           return super().create(request, *args, **kwargs)
   ```

3. Handle exception:
   ```python
   # settings.py
   REST_FRAMEWORK = {
       'EXCEPTION_HANDLER': 'src.generative.exceptions.custom_exception_handler'
   }

   # src/generative/exceptions.py
   from rest_framework.views import exception_handler
   from rest_framework.response import Response

   def custom_exception_handler(exc, context):
       if isinstance(exc, Ratelimited):
           return Response({'error': 'Rate limit exceeded'}, status=429)
       return exception_handler(exc, context)
   ```

**Files**: `src/generative/views.py`, `src/generative/exceptions.py`

**Parallel?**: After WP02

**Notes**: Rate limit configurable per environment

---

### Subtask T063 – Write tooling tests

**Purpose**: Achieve >80% tooling test coverage

**Steps**:
1. Create `tests/generative/test_commands.py`:
   ```python
   import pytest
   from django.core.management import call_command
   from io import StringIO

   @pytest.mark.django_db
   class TestManagementCommands:
       def test_cleanup_expired_outputs(self, expired_output):
           """Test cleanup command deletes expired outputs."""
           out = StringIO()
           call_command('cleanup_expired_outputs', stdout=out)

           assert 'Deleted 1 expired outputs' in out.getvalue()
           assert not GenerationOutput.objects.filter(id=expired_output.id).exists()

       def test_retry_failed_requests(self, failed_request):
           """Test retry command queues failed requests."""
           out = StringIO()
           call_command('retry_failed_requests', stdout=out)

           assert 'Queued 1 requests for retry' in out.getvalue()
           failed_request.refresh_from_db()
           assert failed_request.status == 'pending'

       def test_usage_report(self, request):
           """Test usage report command."""
           out = StringIO()
           call_command('usage_report', '--days=7', stdout=out)

           output = out.getvalue()
           assert 'Usage Report' in output
           assert 'Total Requests: 1' in output
   ```

2. Test admin actions:
   ```python
   @pytest.mark.django_db
   class TestAdminActions:
       def test_cancel_requests_action(self, admin_client, request):
           """Test bulk cancel action."""
           from django.contrib.admin.sites import AdminSite
           from src.generative.admin import GenerationRequestAdmin

           site = AdminSite()
           admin = GenerationRequestAdmin(GenerationRequest, site)

           queryset = GenerationRequest.objects.filter(id=request.id)
           admin.cancel_requests(None, queryset)

           request.refresh_from_db()
           assert request.status == 'cancelled'
   ```

3. Run tests: `pytest tests/generative/test_commands.py -v`

**Files**: `tests/generative/test_commands.py`

**Parallel?**: After T055-T062

**Notes**: Test commands with `call_command()`

---

## Definition of Done Checklist

- [x] Cleanup cron job registered with Celery Beat
- [x] Cost update cron job registered
- [x] Django admin enhancements (filters, actions, badges)
- [x] Structured logging configured with JSON formatter
- [x] Prometheus metrics added (optional)
- [x] Management commands created (retry, usage report)
- [x] Health check endpoint added
- [x] Rate limiting added to API
- [x] Tooling tests written with >80% coverage
- [x] All tests pass: `pytest tests/generative/test_commands.py`

---

## Review Guidance

**Acceptance Checkpoints**:
1. Verify cron jobs registered: `celery -A project beat --loglevel=info`
2. Test admin bulk actions: Cancel 10 requests at once
3. Check structured logs: Verify JSON format in logs/generative.log
4. Test health check: `curl http://localhost:8000/api/v1/generative/health/`
5. Test rate limiting: Submit 11 requests in 1 minute → verify HTTP 429

**Critical Validations**:
- Cron jobs run without errors (check Celery logs)
- Admin actions work on bulk datasets
- Logs include request context (request_id, user_id)
- Metrics exported to Prometheus (if enabled)

---

## Activity Log

- 2026-02-01T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
