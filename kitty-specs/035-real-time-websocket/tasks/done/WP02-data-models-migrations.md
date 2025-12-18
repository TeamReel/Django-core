---
work_package_id: "WP02"
title: "Data Models & Migrations"
lane: "done"
subtasks: ["T007", "T008", "T009", "T010", "T011", "T012"]
priority: "P1"
estimated_effort: "1-2 days"
dependencies: ["WP01"]
review_status: "acknowledged"
reviewed_by: "copilot-reviewer"
agent: "copilot"
shell_pid: "47288"
history:
  - action: "created"
    timestamp: "2025-12-18T15:30:00Z"
    author: "spec-kitty.tasks"
    note: "Generated from WebSocket infrastructure specification"
  - action: "review_feedback"
    timestamp: "2025-12-18T18:10:00Z"
    author: "copilot-reviewer"
    note: "Missing T012 indexes and unit tests"
  - action: "review_feedback"
    timestamp: "2025-12-18T18:30:00Z"
    author: "copilot-reviewer"
    note: "Invalid partial index condition and missing atomic=False"
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Key Issues**:
1. **Invalid Partial Index Condition**: The migration `0002_partial_indexes.py` uses `NOW()` in a partial index predicate (`WHERE last_heartbeat < NOW() - INTERVAL '5 minutes'`). This is not allowed in PostgreSQL as index predicates must be immutable.
2. **Missing Atomic Transaction Handling**: The migration uses `CREATE INDEX CONCURRENTLY`, which cannot run inside a transaction. The `Migration` class must set `atomic = False`.
3. **Redundant Index**: The stale connection index is likely redundant given the standard index on `last_heartbeat` defined in the model `Meta`.

**What Was Done Well**:
- Unit tests are comprehensive and passing (11/11).
- Models are correctly implemented.
- `RealtimeMessage` partial index for undelivered messages is correct.

**Action Items** (must complete before re-review):
- [ ] Fix **Migration 0002**: Remove the invalid partial index on `last_heartbeat`. If a partial index is needed for active connections, use `is_active=True` (if such a field exists) or rely on the standard index.
- [ ] Add `atomic = False` to the `Migration` class in `0002_partial_indexes.py` to support `CONCURRENTLY`.
- [ ] Verify the migration runs successfully on a local Postgres instance (if available) or ensure syntax is valid.

# WP02: Data Models & Migrations

## Objective
Create comprehensive database models for WebSocket connections, real-time messages, presence tracking, and activity events. This work package establishes the data foundation that supports all WebSocket functionality with proper validation, relationships, and performance optimization.

## Context
This work package builds on WP01's infrastructure setup and creates the persistent data layer. The models integrate with existing django-core User/Organization/Project models and follow the structured envelope message format defined in the specification.

## Detailed Implementation Guide

### T007: Create WebSocketConnection Model with Validation
**Estimated Time**: 2-3 hours

**Implementation Steps**:
1. **Create model** - In `src/realtime/models.py`:
   ```python
   import uuid
   from django.db import models
   from django.contrib.auth import get_user_model
   from django.utils import timezone
   from django.core.validators import RegexValidator

   User = get_user_model()

   class WebSocketConnection(models.Model):
       AUTH_METHOD_CHOICES = [
           ('session', 'Session Authentication'),
           ('jwt', 'JWT Token Authentication'),
       ]

       connection_id = models.UUIDField(
           primary_key=True,
           default=uuid.uuid4,
           editable=False,
           help_text="Unique identifier for the WebSocket connection"
       )

       user = models.ForeignKey(
           User,
           on_delete=models.CASCADE,
           related_name='websocket_connections',
           help_text="User associated with this connection"
       )

       channel_name = models.CharField(
           max_length=255,
           unique=True,
           validators=[
               RegexValidator(
                   regex=r'^[a-zA-Z0-9\.\-_]+$',
                   message='Channel name must be alphanumeric with dots, hyphens, underscores'
               )
           ],
           help_text="Django Channels channel name for message routing"
       )

       authenticated_at = models.DateTimeField(
           auto_now_add=True,
           help_text="Timestamp when connection was authenticated"
       )

       last_heartbeat = models.DateTimeField(
           default=timezone.now,
           help_text="Last received heartbeat timestamp"
       )

       message_count = models.PositiveIntegerField(
           default=0,
           help_text="Number of messages sent through this connection"
       )

       auth_method = models.CharField(
           max_length=10,
           choices=AUTH_METHOD_CHOICES,
           default='session',
           help_text="Authentication method used for this connection"
       )

       client_info = models.JSONField(
           default=dict,
           blank=True,
           help_text="Browser/client metadata for debugging"
       )

       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)

       class Meta:
           db_table = 'realtime_websocket_connection'
           ordering = ['-created_at']
           indexes = [
               models.Index(fields=['user', '-created_at']),
               models.Index(fields=['last_heartbeat']),
               models.Index(fields=['auth_method']),
           ]

       def __str__(self):
           return f"WebSocket {self.connection_id} - {self.user.username}"

       def is_stale(self, timeout_seconds=300):
           """Check if connection is stale based on last heartbeat"""
           return timezone.now() - self.last_heartbeat > timezone.timedelta(seconds=timeout_seconds)

       def increment_message_count(self):
           """Safely increment message count"""
           self.message_count = models.F('message_count') + 1
           self.save(update_fields=['message_count'])
   ```

**Validation**:
- Model validates connection_id uniqueness
- Foreign key relationship with User works correctly
- Channel name validation prevents invalid characters
- Message count increment works atomically

**Files to Create/Modify**:
- `src/realtime/models.py` (create)

---

### T008: Create RealtimeMessage Model with Envelope Format
**Estimated Time**: 2-3 hours

**Implementation Steps**:
1. **Add RealtimeMessage model** - Continue in `src/realtime/models.py`:
   ```python
   class RealtimeMessage(models.Model):
       MESSAGE_TYPE_CHOICES = [
           ('notification', 'Notification Message'),
           ('presence', 'Presence Update'),
           ('activity', 'Activity Event'),
       ]

       SCOPE_TYPE_CHOICES = [
           ('user', 'User Specific'),
           ('organization', 'Organization Wide'),
           ('project', 'Project Specific'),
       ]

       message_id = models.UUIDField(
           primary_key=True,
           default=uuid.uuid4,
           editable=False,
           help_text="Unique identifier for message tracking"
       )

       message_type = models.CharField(
           max_length=20,
           choices=MESSAGE_TYPE_CHOICES,
           help_text="Type of real-time message"
       )

       scope_type = models.CharField(
           max_length=20,
           choices=SCOPE_TYPE_CHOICES,
           help_text="Broadcast scope level"
       )

       scope_id = models.PositiveIntegerField(
           help_text="ID of the scope (user_id, org_id, project_id)"
       )

       sender_user = models.ForeignKey(
           User,
           on_delete=models.CASCADE,
           related_name='sent_realtime_messages',
           help_text="User who triggered this message"
       )

       content = models.JSONField(
           help_text="Message payload following structured envelope format"
       )

       created_at = models.DateTimeField(
           auto_now_add=True,
           help_text="Message creation timestamp"
       )

       delivered_at = models.DateTimeField(
           null=True,
           blank=True,
           help_text="When message was successfully delivered"
       )

       retry_count = models.PositiveSmallIntegerField(
           default=0,
           help_text="Number of delivery attempts"
       )

       class Meta:
           db_table = 'realtime_message'
           ordering = ['-created_at']
           indexes = [
               models.Index(fields=['scope_type', 'scope_id', '-created_at']),
               models.Index(fields=['message_type', '-created_at']),
               models.Index(fields=['sender_user', '-created_at']),
               models.Index(fields=['delivered_at']),
           ]

       def __str__(self):
           return f"{self.message_type} message {self.message_id}"

       def mark_delivered(self):
           """Mark message as successfully delivered"""
           self.delivered_at = timezone.now()
           self.save(update_fields=['delivered_at'])

       def increment_retry(self):
           """Increment retry count for failed delivery"""
           if self.retry_count < 3:
               self.retry_count = models.F('retry_count') + 1
               self.save(update_fields=['retry_count'])
               return True
           return False

       def to_envelope_format(self):
           """Convert to structured envelope format for WebSocket transmission"""
           return {
               'meta': {
                   'type': self.message_type,
                   'id': str(self.message_id),
                   'timestamp': self.created_at.isoformat(),
                   'version': '1.0'
               },
               'payload': {
                   'data': self.content
               },
               'auth': {
                   'user_id': self.sender_user.id,
                   'scope': f"{self.scope_type}:{self.scope_id}",
               }
           }
   ```

**Validation**:
- Message types and scope types validate correctly
- JSON content field accepts structured data
- Envelope format conversion works properly
- Retry logic prevents infinite attempts

**Files to Create/Modify**:
- `src/realtime/models.py` (modify)

---

### T009: Create PresenceStatus Model with Unique Constraints
**Estimated Time**: 1-2 hours

**Implementation Steps**:
1. **Add PresenceStatus model**:
   ```python
   class PresenceStatus(models.Model):
       STATUS_CHOICES = [
           ('online', 'Online'),
           ('away', 'Away'),
           ('offline', 'Offline'),
       ]

       user = models.ForeignKey(
           User,
           on_delete=models.CASCADE,
           related_name='presence_statuses'
       )

       status = models.CharField(
           max_length=10,
           choices=STATUS_CHOICES,
           default='offline'
       )

       last_seen = models.DateTimeField(
           default=timezone.now,
           help_text="Last activity timestamp"
       )

       current_location = models.CharField(
           max_length=255,
           blank=True,
           null=True,
           help_text="Current page/project location"
       )

       organization_id = models.PositiveIntegerField(
           help_text="Organization scope for presence visibility"
       )

       project_id = models.PositiveIntegerField(
           null=True,
           blank=True,
           help_text="Optional project scope"
       )

       updated_at = models.DateTimeField(auto_now=True)

       class Meta:
           db_table = 'realtime_presence_status'
           unique_together = [['user', 'organization_id', 'project_id']]
           indexes = [
               models.Index(fields=['organization_id', 'status']),
               models.Index(fields=['project_id', 'status']),
               models.Index(fields=['last_seen']),
           ]

       def __str__(self):
           return f"{self.user.username} - {self.status} in org {self.organization_id}"

       def update_status(self, new_status, location=None):
           """Update presence status with timestamp"""
           self.status = new_status
           self.last_seen = timezone.now()
           if location is not None:
               self.current_location = location
           self.save(update_fields=['status', 'last_seen', 'current_location', 'updated_at'])
   ```

**Validation**:
- Unique constraint on (user, organization_id, project_id) works
- Status choices validate properly
- Timestamp updates work correctly
- Location tracking functions properly

**Files to Create/Modify**:
- `src/realtime/models.py` (modify)

---

### T010: Create ActivityEvent Model for Audit Logging
**Estimated Time**: 1-2 hours

**Implementation Steps**:
1. **Add ActivityEvent model**:
   ```python
   class ActivityEvent(models.Model):
       event_id = models.UUIDField(
           primary_key=True,
           default=uuid.uuid4,
           editable=False
       )

       actor_user = models.ForeignKey(
           User,
           on_delete=models.CASCADE,
           related_name='activity_events',
           help_text="User who performed the action"
       )

       action_type = models.CharField(
           max_length=50,
           help_text="Type of action performed"
       )

       resource_type = models.CharField(
           max_length=50,
           help_text="Type of resource affected"
       )

       resource_id = models.PositiveIntegerField(
           help_text="ID of the affected resource"
       )

       organization_id = models.PositiveIntegerField(
           help_text="Organization context"
       )

       project_id = models.PositiveIntegerField(
           null=True,
           blank=True,
           help_text="Optional project context"
       )

       occurred_at = models.DateTimeField(
           default=timezone.now,
           help_text="When the activity occurred"
       )

       metadata = models.JSONField(
           default=dict,
           blank=True,
           help_text="Additional activity-specific data"
       )

       class Meta:
           db_table = 'realtime_activity_event'
           ordering = ['-occurred_at']
           indexes = [
               models.Index(fields=['organization_id', '-occurred_at']),
               models.Index(fields=['project_id', '-occurred_at']),
               models.Index(fields=['actor_user', '-occurred_at']),
               models.Index(fields=['action_type', '-occurred_at']),
           ]

       def __str__(self):
           return f"{self.actor_user.username} {self.action_type} {self.resource_type} {self.resource_id}"
   ```

**Validation**:
- Activity events capture all required metadata
- Indexing supports efficient queries by organization/project
- Metadata JSON field accepts structured data
- Timestamps accurately reflect activity timing

**Files to Create/Modify**:
- `src/realtime/models.py` (modify)

---

### T011: Generate and Run Database Migrations
**Estimated Time**: 1 hour

**Implementation Steps**:
1. **Generate initial migration**:
   ```bash
   cd src
   python manage.py makemigrations realtime
   ```

2. **Review migration file** to ensure proper field types and constraints

3. **Run migrations**:
   ```bash
   python manage.py migrate realtime
   ```

4. **Verify migration in database**:
   ```sql
   -- Check tables were created
   \dt realtime_*

   -- Check indexes
   \di realtime_*
   ```

**Validation**:
- Migration creates all tables without errors
- Database constraints are properly applied
- Foreign key relationships work correctly
- All indexes are created as expected

**Files to Create/Modify**:
- Migration files in `src/realtime/migrations/`

---

### T012: Add Database Indexes for Performance Optimization
**Estimated Time**: 1 hour

**Implementation Steps**:
1. **Add composite indexes** - Create migration for additional indexes:
   ```python
   # New migration file
   from django.db import migrations, models

   class Migration(migrations.Migration):
       dependencies = [
           ('realtime', '0001_initial'),
       ]

       operations = [
           migrations.RunSQL(
               "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_message_undelivered ON realtime_message(created_at) WHERE delivered_at IS NULL;",
               reverse_sql="DROP INDEX IF EXISTS idx_realtime_message_undelivered;"
           ),
           migrations.RunSQL(
               "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_websocket_connection_stale ON realtime_websocket_connection(last_heartbeat) WHERE last_heartbeat < NOW() - INTERVAL '5 minutes';",
               reverse_sql="DROP INDEX IF EXISTS idx_websocket_connection_stale;"
           ),
       ]
   ```

2. **Test query performance**:
   ```python
   # Django shell performance tests
   from django.test.utils import override_settings
   from django.db import connection

   # Test queries use indexes
   with connection.cursor() as cursor:
       cursor.execute("EXPLAIN ANALYZE SELECT * FROM realtime_message WHERE delivered_at IS NULL ORDER BY created_at DESC LIMIT 10")
       print(cursor.fetchall())
   ```

**Validation**:
- Partial indexes improve query performance
- EXPLAIN ANALYZE shows index usage
- Migration runs without blocking database
- Query times improved for common operations

**Files to Create/Modify**:
- Additional migration file for performance indexes

---

## Testing Strategy

### Unit Tests
- Model validation (field constraints, choices)
- Model methods (increment_message_count, mark_delivered)
- Envelope format conversion
- Unique constraint enforcement

### Integration Tests
- Foreign key relationships with User model
- Migration rollback/forward compatibility
- Database constraint violations
- Query performance with sample data

### Performance Tests
- Index usage verification
- Query performance benchmarks
- Large dataset handling
- Concurrent write operations

## Definition of Done
- [ ] All four models created with proper field validation
- [ ] Database migrations run successfully
- [ ] Foreign key relationships work with existing models
- [ ] Unique constraints prevent data inconsistencies
- [ ] Performance indexes optimize common queries
- [ ] Model methods work correctly (envelope format, status updates)
- [ ] Composite indexes improve query performance
- [ ] All model validations pass
- [ ] Database schema matches specification

## Risks & Mitigation
- **Risk**: Migration conflicts with existing schema
  - **Mitigation**: Test migrations in isolated environment first
- **Risk**: Performance impact of new indexes
  - **Mitigation**: Use CONCURRENTLY for index creation, monitor query performance
- **Risk**: Foreign key constraints causing cascading deletes
  - **Mitigation**: Careful review of on_delete behaviors, test with sample data

## Reviewer Checklist
- [ ] All models follow django-core naming conventions
- [ ] Database constraints prevent invalid data
- [ ] Foreign key relationships are properly configured
- [ ] Indexes support expected query patterns
- [ ] Migration files are clean and reversible
- [ ] Model __str__ methods provide useful representations
- [ ] JSON fields accept valid structured data
- [ ] Unique constraints work as expected

## Activity Log

- 2025-12-18T17:47:14Z – copilot – shell_pid=47288 – lane=doing – Started implementation of WP02
- 2025-12-18T18:06:50Z – copilot – shell_pid=47288 – lane=doing – Resuming implementation to address review feedback
- 2025-12-18T18:19:37Z – copilot – shell_pid=47288 – lane=for_review – Implementation complete, ready for review
- 2025-12-18T18:21:05Z – copilot – shell_pid=47288 – lane=planned – Code review complete: Invalid partial index condition and missing atomic=False
- 2025-12-18T18:22:17Z – copilot – shell_pid=47288 – lane=doing – Resuming implementation to address review feedback
- 2025-12-18T18:23:40Z – copilot – shell_pid=47288 – lane=for_review – Addressed review feedback: Removed invalid partial index and added atomic=False
- 2025-12-18T18:26:55Z – copilot – shell_pid=47288 – lane=done – Approved after verifying fix for partial index syntax and atomic=False.
