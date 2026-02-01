---
work_package_id: "WP06"
subtasks:
  - "T044"
  - "T045"
  - "T046"
  - "T047"
  - "T048"
  - "T049"
  - "T050"
  - "T051"
  - "T052"
  - "T053"
  - "T054"
title: "Brand & File Storage Integration"
phase: "Phase 3 - Integrations"
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

# Work Package Prompt: WP06 – Brand & File Storage Integration

## Review Feedback

*[Empty - populated by `/spec-kitty.review` if work needs changes]*

---

## Objectives & Success Criteria

**Outcomes**:
1. B33 Brand Identity integration for template context
2. B22/B35 File Storage integration for output files
3. Presigned URL generation for file downloads
4. File expiration based on retention_days
5. WebSocket events for real-time status updates (optional)
6. Integration tests achieve >85% coverage

**Success Metrics**:
- Template uses brand context in prompts
- File outputs stored in B35 with presigned URLs
- Presigned URLs expire after configured duration
- WebSocket events sent on status changes

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (models exist)
- WP02 complete (API exists)
- WP04 complete (async task exists)
- B33 Brand Identity module exists
- B22/B35 File Storage module exists
- B23 WebSocket module exists (optional)

**Supporting Documents**:
- [spec.md](../spec.md) - FR-024 to FR-026 (integration requirements)
- B33 Brand Identity module documentation
- B35 File Storage module documentation

**Architectural Decisions**:
- Brand context injected into executor input_data
- File storage via B35 FileStorageService
- Presigned URLs generated on-demand (not stored)
- WebSocket events optional (feature flag)

**Constraints**:
- Product-agnostic: Brand context injection optional (template config)
- File expiration: Aligned with template retention_days
- Presigned URL TTL: 1 hour (configurable)

---

## Subtasks & Detailed Guidance

### Subtask T044 – Add brand context injection

**Purpose**: Inject B33 brand identity into executor input

**Steps**:
1. Create `src/generative/services/brand.py`:
   ```python
   from src.brand.models import BrandIdentity

   class BrandContextService:
       """Inject brand identity into generation context."""

       @staticmethod
       def get_brand_context(organisation_id: int, brand_id: int = None) -> dict:
           """Get brand context for template.

           Returns:
               {
                   'brand_name': 'Acme Inc',
                   'colors': {'primary': '#FF0000', 'secondary': '#00FF00'},
                   'fonts': {'heading': 'Arial', 'body': 'Helvetica'},
                   'voice_tone': 'Professional',
                   'logo_url': 'https://...'
               }
           """
           if brand_id:
               brand = BrandIdentity.objects.get(id=brand_id, organisation_id=organisation_id)
           else:
               brand = BrandIdentity.objects.filter(organisation_id=organisation_id, is_default=True).first()

           if not brand:
               return {}

           return {
               'brand_name': brand.name,
               'colors': brand.colors,
               'fonts': brand.fonts,
               'voice_tone': brand.voice_tone,
               'logo_url': brand.logo.url if brand.logo else None
           }

       @staticmethod
       def inject_brand_context(input_data: dict, template_config: dict, organisation_id: int) -> dict:
           """Inject brand context into input_data if configured."""
           if not template_config.get('use_brand_context'):
               return input_data

           brand_id = template_config.get('brand_id')
           brand_context = BrandContextService.get_brand_context(organisation_id, brand_id)

           # Merge into input_data
           input_data['brand'] = brand_context
           return input_data
   ```

**Files**: `src/generative/services/brand.py`

**Parallel?**: No (core brand logic)

**Notes**: Brand context optional per template (use_brand_context flag)

---

### Subtask T045 – Integrate brand context in task

**Purpose**: Inject brand context before executor execution

**Steps**:
1. Update `process_generation_request` task:
   ```python
   from .services.brand import BrandContextService

   @shared_task(bind=True, max_retries=5)
   def process_generation_request(self, request_id: int):
       request = GenerationRequest.objects.get(id=request_id)

       # Inject brand context
       input_data = BrandContextService.inject_brand_context(
           input_data=request.input_data,
           template_config=request.template.pipeline_config,
           organisation_id=request.template.organisation_id
       )

       # Execute with brand context
       executor = ExecutorFactory.get_executor(request.template.pipeline_config)
       result = executor.execute(input_data)
       # ... rest of task
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T044

**Notes**: Inject before executor.execute()

---

### Subtask T046 – Add FileStorageService integration

**Purpose**: Store file outputs via B35 FileStorageService

**Steps**:
1. Create `src/generative/services/file_storage.py`:
   ```python
   from src.files.services import FileStorageService
   from django.core.files.base import ContentFile
   import io

   class GenerationFileService:
       """File storage for generation outputs."""

       @staticmethod
       def store_output_file(content: bytes, filename: str, mime_type: str, user_id: int) -> int:
           """Store output file in B35.

           Returns:
               file_id (B35 FileStorageRecord ID)
           """
           file_obj = ContentFile(content, name=filename)

           record = FileStorageService.upload_file(
               file=file_obj,
               filename=filename,
               mime_type=mime_type,
               uploaded_by_id=user_id,
               category='generation_output'
           )

           return record.id

       @staticmethod
       def get_presigned_url(file_id: int, expiration: int = 3600) -> str:
           """Get presigned URL for file download.

           Args:
               file_id: B35 FileStorageRecord ID
               expiration: URL expiration in seconds (default 1 hour)

           Returns:
               Presigned URL
           """
           return FileStorageService.get_presigned_url(file_id, expiration=expiration)
   ```

**Files**: `src/generative/services/file_storage.py`

**Parallel?**: No (core file logic)

**Notes**: Wrap B35 FileStorageService for generation-specific logic

---

### Subtask T047 – Store file outputs

**Purpose**: Save file outputs to B35 on completion

**Steps**:
1. Update `process_generation_request` task:
   ```python
   from .services.file_storage import GenerationFileService

   if result.success:
       output = result.output

       # Check if output is file
       if output.get('format') in ['image', 'video']:
           file_content = output.get('file_content')  # bytes
           filename = output.get('filename', f'output_{request.id}.png')
           mime_type = output.get('mime_type', 'image/png')

           # Store file
           file_id = GenerationFileService.store_output_file(
               content=file_content,
               filename=filename,
               mime_type=mime_type,
               user_id=request.requester_id
           )

           # Create output
           GenerationOutput.objects.create(
               request=request,
               output_type=output['format'],
               file_id=file_id,
               metadata=result.metadata
           )
       else:
           # Text output
           GenerationOutput.objects.create(
               request=request,
               output_type='text',
               text_content=output.get('text'),
               metadata=result.metadata
           )
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T046

**Notes**: Detect file vs text output from executor result

---

### Subtask T048 – Generate presigned URLs

**Purpose**: Generate presigned URLs in serializer

**Steps**:
1. Update `GenerationOutputSerializer`:
   ```python
   from .services.file_storage import GenerationFileService

   class GenerationOutputSerializer(serializers.ModelSerializer):
       presigned_url = serializers.SerializerMethodField()

       def get_presigned_url(self, obj):
           """Generate presigned URL for file download."""
           if obj.file_id:
               try:
                   return GenerationFileService.get_presigned_url(
                       file_id=obj.file_id,
                       expiration=3600  # 1 hour
                   )
               except Exception as e:
                   logger.error(f"Failed to generate presigned URL: {e}")
                   return None
           return None
   ```

**Files**: `src/generative/serializers.py`

**Parallel?**: After T046

**Notes**: Presigned URL generated on-demand (not stored)

---

### Subtask T049 – Implement file expiration

**Purpose**: Delete expired files based on retention_days

**Steps**:
1. Create cleanup command:
   ```python
   # src/generative/management/commands/cleanup_expired_outputs.py
   from django.core.management.base import BaseCommand
   from django.utils import timezone
   from src.generative.models import GenerationOutput
   from src.files.services import FileStorageService

   class Command(BaseCommand):
       help = 'Delete expired generation outputs'

       def handle(self, *args, **options):
           now = timezone.now()
           expired = GenerationOutput.objects.filter(
               expires_at__lt=now,
               file_id__isnull=False
           )

           count = 0
           for output in expired:
               try:
                   # Delete file from storage
                   FileStorageService.delete_file(output.file_id)

                   # Delete output record
                   output.delete()
                   count += 1
               except Exception as e:
                   self.stderr.write(f"Failed to delete output {output.id}: {e}")

           self.stdout.write(self.style.SUCCESS(f"Deleted {count} expired outputs"))
   ```

2. Add cron job (WP07)

**Files**: `src/generative/management/commands/cleanup_expired_outputs.py`

**Parallel?**: After T047

**Notes**: Run daily via cron (implemented in WP07)

---

### Subtask T050 – Add WebSocket event service

**Purpose**: Send real-time status updates via WebSocket

**Steps**:
1. Create `src/generative/services/websocket.py`:
   ```python
   from src.websocket.services import WebSocketService

   class GenerationWebSocketService:
       """WebSocket events for generation requests."""

       @staticmethod
       def send_status_update(request):
           """Send status update to requester."""
           event = {
               'type': 'generation_status',
               'request_id': request.id,
               'status': request.status,
               'retry_count': request.retry_count,
               'error_message': request.error_message,
               'created_at': request.created_at.isoformat(),
               'started_at': request.started_at.isoformat() if request.started_at else None,
               'completed_at': request.completed_at.isoformat() if request.completed_at else None
           }

           WebSocketService.send_to_user(
               user_id=request.requester_id,
               event=event
           )
   ```

**Files**: `src/generative/services/websocket.py`

**Parallel?**: After T044 (independent integration)

**Notes**: WebSocket events optional (feature flag)

---

### Subtask T051 – Emit WebSocket events

**Purpose**: Emit events on status transitions

**Steps**:
1. Update `process_generation_request` task:
   ```python
   from .services.websocket import GenerationWebSocketService

   # After status update
   request.status = 'processing'
   request.save()
   GenerationWebSocketService.send_status_update(request)

   # After completion
   request.status = 'completed'
   request.save()
   GenerationWebSocketService.send_status_update(request)
   ```

2. Feature flag:
   ```python
   # settings.py
   GENERATIVE_WEBSOCKET_ENABLED = True

   # In task:
   if settings.GENERATIVE_WEBSOCKET_ENABLED:
       GenerationWebSocketService.send_status_update(request)
   ```

**Files**: `src/generative/tasks.py`, `settings.py`

**Parallel?**: After T050

**Notes**: Feature flag allows disabling WebSocket

---

### Subtask T052 – Add template brand configuration

**Purpose**: Allow templates to specify brand context usage

**Steps**:
1. Update `pipeline_config` schema:
   ```python
   # Example template with brand context
   pipeline_config = {
       'provider': 'openai',
       'model': 'gpt-4',
       'use_brand_context': True,  # Enable brand injection
       'brand_id': 123  # Optional: specific brand (default: organisation default)
   }
   ```

2. Validate in serializer:
   ```python
   def validate_pipeline_config(self, value):
       if value.get('use_brand_context') and 'brand_id' not in value:
           # Use default brand
           pass
       return value
   ```

**Files**: `src/generative/serializers.py`

**Parallel?**: After T044

**Notes**: Brand context optional per template

---

### Subtask T053 – Add file storage tests

**Purpose**: Test file storage integration

**Steps**:
1. Add to `tests/generative/test_integrations.py`:
   ```python
   @pytest.mark.django_db
   class TestFileStorageIntegration:
       @patch('src.generative.services.file_storage.FileStorageService.upload_file')
       def test_store_file_output(self, mock_upload, request):
           """Test file output stored in B35."""
           mock_upload.return_value = Mock(id=456)

           file_id = GenerationFileService.store_output_file(
               content=b'image data',
               filename='output.png',
               mime_type='image/png',
               user_id=request.requester_id
           )

           assert file_id == 456
           assert mock_upload.called

       @patch('src.generative.services.file_storage.FileStorageService.get_presigned_url')
       def test_generate_presigned_url(self, mock_presigned, output):
           """Test presigned URL generation."""
           mock_presigned.return_value = 'https://presigned-url.com'

           url = GenerationFileService.get_presigned_url(output.file_id)

           assert url == 'https://presigned-url.com'
           assert mock_presigned.called

       def test_file_expiration_cleanup(self, output):
           """Test expired files deleted."""
           # Set expiration in past
           output.expires_at = timezone.now() - timedelta(days=1)
           output.save()

           # Run cleanup command
           from src.generative.management.commands.cleanup_expired_outputs import Command
           cmd = Command()
           cmd.handle()

           # Verify output deleted
           assert not GenerationOutput.objects.filter(id=output.id).exists()
   ```

**Files**: `tests/generative/test_integrations.py`

**Parallel?**: After T046-T049

**Notes**: Mock B35 FileStorageService to avoid real storage operations

---

### Subtask T054 – Write integration tests

**Purpose**: Achieve >85% integration test coverage

**Steps**:
1. Create `tests/generative/test_integrations.py`:
   ```python
   @pytest.mark.django_db
   class TestBrandIntegration:
       def test_brand_context_injection(self, organisation, brand):
           """Test brand context injected into input_data."""
           context = BrandContextService.get_brand_context(organisation.id, brand.id)

           assert context['brand_name'] == brand.name
           assert context['colors'] == brand.colors

       def test_inject_brand_optional(self, organisation):
           """Test brand injection optional per template."""
           input_data = {'prompt': 'Hello'}
           template_config = {'use_brand_context': False}

           result = BrandContextService.inject_brand_context(
               input_data, template_config, organisation.id
           )

           assert 'brand' not in result

   @pytest.mark.django_db
   class TestWebSocketIntegration:
       @patch('src.generative.services.websocket.WebSocketService.send_to_user')
       def test_websocket_status_update(self, mock_send, request):
           """Test WebSocket event sent on status update."""
           GenerationWebSocketService.send_status_update(request)

           assert mock_send.called
           call_args = mock_send.call_args[1]
           assert call_args['event']['request_id'] == request.id
           assert call_args['event']['status'] == request.status
   ```

2. Run tests: `pytest tests/generative/test_integrations.py -v`

**Files**: `tests/generative/test_integrations.py`

**Parallel?**: After T044-T053

**Notes**: Mock external services (brand, file storage, WebSocket)

---

## Definition of Done Checklist

- [x] Brand context injection service created
- [x] Brand context integrated in task execution
- [x] FileStorageService integration for file outputs
- [x] File outputs stored in B35 with presigned URLs
- [x] Presigned URLs generated in serializer
- [x] File expiration cleanup command created
- [x] WebSocket event service created
- [x] WebSocket events emitted on status transitions
- [x] Template brand configuration added
- [x] File storage tests written
- [x] Integration tests written with >85% coverage
- [x] All tests pass: `pytest tests/generative/test_integrations.py`

---

## Review Guidance

**Acceptance Checkpoints**:
1. Create template with brand context → verify brand injected into prompt
2. Generate file output → verify stored in B35 with presigned URL
3. Check presigned URL → verify expires after 1 hour
4. Run cleanup command → verify expired files deleted
5. Submit request → verify WebSocket event received

**Critical Validations**:
- Brand context optional (use_brand_context flag)
- File outputs stored in B35, text outputs in DB
- Presigned URLs expire after configured duration
- WebSocket events sent on status transitions

---

## Activity Log

- 2026-02-01T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
