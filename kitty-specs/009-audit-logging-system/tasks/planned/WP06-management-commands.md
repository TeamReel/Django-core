# WP06: Management Commands

```yaml
work_package_id: WP06
feature: 009-audit-logging-system
priority: P2
estimated_subtasks: 4
dependencies: [WP01, WP03]
lane: planned
history:
  - date: 2025-11-27
    action: created
    author: AI Agent
```

## Objective

Create management commands for operational tasks: listing event types, exporting events to CSV, and cleaning up old events per retention policy.

## Context

**Priority**: P2 (Nice to have for operations) - Core functionality works without these, but they improve operational efficiency.

**Commands**:
1. `audit_list_event_types` - Display registered event types
2. `audit_export` - Export events to CSV with filtering
3. `audit_cleanup` - Delete old events per retention policy

## Detailed Guidance

### T036: Create audit_list_event_types Command [P]

**Goal**: Display all registered event types in table format.

**Implementation** (create `src/audit/management/commands/audit_list_event_types.py`):
```python
from django.core.management.base import BaseCommand
from audit.registry import list_event_types


class Command(BaseCommand):
    help = 'List all registered audit event types'

    def handle(self, *args, **options):
        event_types = list_event_types()

        if not event_types:
            self.stdout.write(self.style.WARNING('No event types registered'))
            return

        # Print header
        self.stdout.write(self.style.SUCCESS(f'\nRegistered Event Types ({len(event_types)}):'))
        self.stdout.write('-' * 80)

        # Group by category
        by_category = {}
        for et in event_types:
            by_category.setdefault(et.category, []).append(et)

        # Print by category
        for category in sorted(by_category.keys()):
            self.stdout.write(f'\n{category.upper()}:')
            for et in sorted(by_category[category], key=lambda x: x.name):
                required = f" (requires: {', '.join(et.required_metadata_keys)})" if et.required_metadata_keys else ""
                self.stdout.write(f'  {et.name:<30} {et.description}{required}')

        self.stdout.write('\n')
```

**Output Example**:
```
Registered Event Types (13):
--------------------------------------------------------------------------------

AUTH:
  auth.login                     User successfully logged in (requires: ip)
  auth.login_failed              Login attempt failed (requires: ip, username)
  auth.logout                    User logged out
  auth.password_changed          User changed password

PERMISSION:
  permission.checked             Permission check performed (requires: permission, result)
  ...
```

**Files Created**:
- `src/audit/management/commands/audit_list_event_types.py`

**Validation**:
- `python manage.py audit_list_event_types`
- Verify 13 core types displayed
- Verify grouped by category

---

### T037: Create audit_export Command [P]

**Goal**: Export events to CSV with filtering options.

**Implementation** (create `src/audit/management/commands/audit_export.py`):
```python
import csv
import json
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from audit.models import AuditEvent


class Command(BaseCommand):
    help = 'Export audit events to CSV'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            required=True,
            help='Output CSV file path'
        )
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Export events from last N days (default: 30)'
        )
        parser.add_argument(
            '--event-types',
            type=str,
            help='Comma-separated list of event types to export (default: all)'
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='Filter by user ID'
        )

    def handle(self, *args, **options):
        output_path = options['output']
        days = options['days']
        event_types_filter = options.get('event_types')
        user_id_filter = options.get('user_id')

        # Build queryset
        cutoff_date = timezone.now() - timedelta(days=days)
        queryset = AuditEvent.objects.filter(created_at__gte=cutoff_date)

        if event_types_filter:
            event_types = [et.strip() for et in event_types_filter.split(',')]
            queryset = queryset.filter(event_type__in=event_types)

        if user_id_filter:
            queryset = queryset.filter(user_id=user_id_filter)

        # Optimize with select_related
        queryset = queryset.select_related('user', 'organization', 'project')

        # Export to CSV
        try:
            with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)

                # Header
                writer.writerow([
                    'ID',
                    'Created At',
                    'Event Type',
                    'User Email',
                    'Organization',
                    'Project',
                    'Metadata'
                ])

                # Data rows
                count = 0
                for event in queryset.iterator(chunk_size=1000):
                    writer.writerow([
                        event.id,
                        event.created_at.isoformat(),
                        event.event_type,
                        event.user.email if event.user else '',
                        event.organization.name if event.organization else '',
                        event.project.name if event.project else '',
                        json.dumps(event.metadata, ensure_ascii=False)
                    ])
                    count += 1

                    if count % 1000 == 0:
                        self.stdout.write(f'Exported {count} events...')

            self.stdout.write(
                self.style.SUCCESS(f'Successfully exported {count} events to {output_path}')
            )

        except IOError as e:
            raise CommandError(f'Failed to write to {output_path}: {e}')
```

**Usage Examples**:
```bash
# Export last 30 days to file
python manage.py audit_export --output events.csv

# Export last 7 days
python manage.py audit_export --output events.csv --days 7

# Export only login events
python manage.py audit_export --output logins.csv --event-types "auth.login,auth.login_failed"

# Export events for specific user
python manage.py audit_export --output user_events.csv --user-id 123
```

**Files Created**:
- `src/audit/management/commands/audit_export.py`

**Validation**:
- `python manage.py audit_export --output test.csv --days 1`
- Verify CSV file created
- Open in Excel: Verify readable

---

### T038: Create audit_cleanup Command [P]

**Goal**: Delete events older than retention period with dry-run safety.

**Implementation** (create `src/audit/management/commands/audit_cleanup.py`):
```python
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from audit.models import AuditEvent


class Command(BaseCommand):
    help = 'Delete old audit events per retention policy'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Delete events older than N days (default: 90)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']

        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=days)

        # Find old events
        old_events = AuditEvent.objects.filter(created_at__lt=cutoff_date)
        count = old_events.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('No events to delete'))
            return

        # Show summary
        self.stdout.write(f'\nFound {count} events older than {days} days (before {cutoff_date.date()})')

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN - No events will be deleted'))

            # Show breakdown by event type
            from django.db.models import Count
            breakdown = (
                old_events
                .values('event_type')
                .annotate(count=Count('id'))
                .order_by('-count')
            )

            self.stdout.write('\nBreakdown by event type:')
            for row in breakdown:
                self.stdout.write(f"  {row['event_type']:<30} {row['count']:>6} events")

            self.stdout.write(f'\nRe-run without --dry-run to delete {count} events')
        else:
            # Confirm before deletion
            self.stdout.write(
                self.style.WARNING(f'\nWARNING: About to delete {count} events. This cannot be undone.')
            )

            confirm = input('Type "DELETE" to confirm: ')

            if confirm != 'DELETE':
                self.stdout.write(self.style.ERROR('Deletion cancelled'))
                return

            # Delete events
            with transaction.atomic():
                deleted_count, _ = old_events.delete()

            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {deleted_count} events')
            )
```

**Usage Examples**:
```bash
# Dry run: Show what would be deleted (90 days default)
python manage.py audit_cleanup --dry-run

# Dry run: 30 days retention
python manage.py audit_cleanup --days 30 --dry-run

# Actually delete (prompts for confirmation)
python manage.py audit_cleanup --days 90

# Delete without prompt (DANGEROUS - for automation)
echo "DELETE" | python manage.py audit_cleanup --days 90
```

**Safety Features**:
- **Dry-run default behavior**: Always safe to run with --dry-run
- **Confirmation required**: Must type "DELETE" to proceed
- **Transaction safety**: Deletion wrapped in atomic transaction
- **Breakdown display**: Shows what will be deleted by event type

**Files Created**:
- `src/audit/management/commands/audit_cleanup.py`

**Validation**:
- `python manage.py audit_cleanup --days 1 --dry-run`
- Verify shows event count without deleting
- Remove --dry-run, verify prompts for confirmation

---

### T039: Write Tests for Management Commands [P]

**Goal**: Test all management commands with call_command().

**Implementation** (create `tests/audit/test_commands.py`):
```python
import csv
import io
import os
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from audit.api import audit_log
from audit.models import AuditEvent


class TestAuditListEventTypesCommand:
    """Test audit_list_event_types command."""

    def test_list_event_types_shows_core_types(self, db):
        """Command lists all 13 core event types."""
        out = io.StringIO()
        call_command('audit_list_event_types', stdout=out)
        output = out.getvalue()

        # Verify core event types present
        assert 'auth.login' in output
        assert 'permission.checked' in output
        assert 'role.assigned' in output
        assert 'Registered Event Types (13)' in output


class TestAuditExportCommand:
    """Test audit_export command."""

    @pytest.fixture
    def sample_events(self, db):
        """Create sample events for export."""
        events = []
        for i in range(10):
            event = audit_log.record('test.event', metadata={'index': i})
            events.append(event)
        return events

    def test_export_creates_csv_file(self, sample_events, tmp_path):
        """Command creates CSV file with events."""
        output_path = tmp_path / 'events.csv'

        call_command('audit_export', output=str(output_path), days=1)

        # Verify file created
        assert output_path.exists()

        # Verify content
        with open(output_path, 'r') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            assert len(rows) == 10
            assert rows[0]['Event Type'] == 'test.event'

    def test_export_filters_by_event_type(self, db, tmp_path):
        """Command filters by event type."""
        # Create mixed events
        audit_log.record('auth.login')
        audit_log.record('auth.logout')
        audit_log.record('permission.checked')

        output_path = tmp_path / 'events.csv'

        call_command(
            'audit_export',
            output=str(output_path),
            days=1,
            event_types='auth.login,auth.logout'
        )

        # Verify only auth events exported
        with open(output_path, 'r') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            assert len(rows) == 2
            for row in rows:
                assert row['Event Type'] in ['auth.login', 'auth.logout']

    def test_export_filters_by_date_range(self, db, tmp_path):
        """Command filters by date range."""
        # Create old event
        old_event = audit_log.record('test.event', metadata={'label': 'old'})
        old_event.created_at = timezone.now() - timedelta(days=10)
        old_event.save(update_fields=['created_at'])

        # Create recent event
        audit_log.record('test.event', metadata={'label': 'recent'})

        output_path = tmp_path / 'events.csv'

        # Export last 5 days (excludes 10-day-old event)
        call_command('audit_export', output=str(output_path), days=5)

        with open(output_path, 'r') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            assert len(rows) == 1
            assert '"label": "recent"' in rows[0]['Metadata']


class TestAuditCleanupCommand:
    """Test audit_cleanup command."""

    @pytest.fixture
    def old_events(self, db):
        """Create old events for cleanup."""
        events = []
        for i in range(5):
            event = audit_log.record('test.event', metadata={'index': i})
            event.created_at = timezone.now() - timedelta(days=100)
            event.save(update_fields=['created_at'])
            events.append(event)
        return events

    def test_cleanup_dry_run_shows_count(self, old_events):
        """Dry run shows count without deleting."""
        out = io.StringIO()
        call_command('audit_cleanup', days=90, dry_run=True, stdout=out)
        output = out.getvalue()

        # Verify shows 5 events
        assert '5 events' in output
        assert 'DRY RUN' in output

        # Verify events not deleted
        assert AuditEvent.objects.count() == 5

    def test_cleanup_deletes_old_events(self, old_events, monkeypatch):
        """Command deletes old events with confirmation."""
        # Mock input to auto-confirm
        monkeypatch.setattr('builtins.input', lambda _: 'DELETE')

        out = io.StringIO()
        call_command('audit_cleanup', days=90, stdout=out)
        output = out.getvalue()

        # Verify deletion
        assert 'Successfully deleted 5 events' in output
        assert AuditEvent.objects.count() == 0

    def test_cleanup_preserves_recent_events(self, db, monkeypatch):
        """Command only deletes old events, not recent."""
        # Create old event
        old_event = audit_log.record('test.event', metadata={'label': 'old'})
        old_event.created_at = timezone.now() - timedelta(days=100)
        old_event.save(update_fields=['created_at'])

        # Create recent event
        recent_event = audit_log.record('test.event', metadata={'label': 'recent'})

        # Mock confirmation
        monkeypatch.setattr('builtins.input', lambda _: 'DELETE')

        call_command('audit_cleanup', days=90)

        # Verify only old event deleted
        assert AuditEvent.objects.count() == 1
        assert AuditEvent.objects.first().metadata['label'] == 'recent'

    def test_cleanup_cancelled_without_confirmation(self, old_events, monkeypatch):
        """Command cancels without proper confirmation."""
        # Mock incorrect confirmation
        monkeypatch.setattr('builtins.input', lambda _: 'no')

        out = io.StringIO()
        call_command('audit_cleanup', days=90, stdout=out)
        output = out.getvalue()

        # Verify cancelled
        assert 'cancelled' in output.lower()

        # Verify events not deleted
        assert AuditEvent.objects.count() == 5
```

**Files Created**:
- `tests/audit/test_commands.py`

**Validation**:
- `pytest tests/audit/test_commands.py -v`

---

## Test Strategy

**All Commands Testable in Parallel**: Each command is independent, tests can run in parallel.

**Test Coverage**:
- `audit_list_event_types`: Output format, grouping by category
- `audit_export`: CSV creation, filtering (date, event type, user), output format
- `audit_cleanup`: Dry-run, deletion with confirmation, preserves recent events

## Definition of Done

- [ ] All 4 subtasks completed (T036-T039)
- [ ] Commands created:
  - `src/audit/management/commands/audit_list_event_types.py`
  - `src/audit/management/commands/audit_export.py`
  - `src/audit/management/commands/audit_cleanup.py`
- [ ] audit_list_event_types works:
  - `python manage.py audit_list_event_types`
  - Shows 13 core types grouped by category
- [ ] audit_export works:
  - `python manage.py audit_export --output test.csv --days 1`
  - Creates CSV with events
  - Filters by --event-types work
  - Filters by --user-id work
- [ ] audit_cleanup works:
  - `python manage.py audit_cleanup --dry-run` shows count without deleting
  - `python manage.py audit_cleanup` prompts for confirmation
  - Typing "DELETE" deletes events
  - Typing anything else cancels
- [ ] All command tests pass: `pytest tests/audit/test_commands.py -v`
- [ ] No linting errors: `ruff check src/audit/ tests/audit/`

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| audit_cleanup deletes wrong events | Critical | Dry-run default, confirmation required, test thoroughly |
| audit_export timeout with large datasets | Medium | Use queryset.iterator(chunk_size=1000) for streaming |
| CSV export memory issues | Medium | Iterator prevents loading all events into memory |

## Reviewer Guidance

**What to verify**:
1. **audit_list_event_types**: Groups by category, shows required metadata keys
2. **audit_export**: Uses iterator() for large datasets, filters work correctly
3. **audit_cleanup**: Dry-run safe, confirmation required, deletes correct events

**What to test**:
1. Seed 100 events: `python manage.py audit_seed --count 100`
2. List event types: `python manage.py audit_list_event_types`
3. Export: `python manage.py audit_export --output test.csv --days 30`
   - Open test.csv in Excel: Verify readable
4. Cleanup dry-run: `python manage.py audit_cleanup --days 1 --dry-run`
   - Verify shows count without deleting
5. Cleanup (cancel): `python manage.py audit_cleanup --days 1`
   - Type "no" at prompt
   - Verify events not deleted
6. Cleanup (execute): `python manage.py audit_cleanup --days 1`
   - Type "DELETE" at prompt
   - Verify events deleted

**Red flags**:
- audit_cleanup deletes without confirmation
- audit_export loads all events into memory (no iterator)
- Commands raise exceptions instead of showing user-friendly errors
