# B34 Generative Pipelines - Quickstart Guide

**Module**: B34 Generative Pipelines
**Purpose**: AI content generation factory with template-based job lifecycle management
**Status**: 🚧 In Development (Phase 1 - Core Models & API)

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Basic Workflow](#basic-workflow)
4. [Testing](#testing)
5. [Extension Examples](#extension-examples)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Dependencies
- **Python**: 3.12+ (django-core-app standard)
- **Django**: 5.1+
- **PostgreSQL**: 15+ (local or Railway)
- **Redis**: 7+ (Celery broker)
- **OpenAI API Key**: Required for `openai` provider
- **LangGraph SDK**: 0.2+ (installed via `pip install langgraph`)

### Environment Variables
Add to `.env`:
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_ORGANIZATION=org-...  # Optional

# LangGraph Configuration (local execution, no Cloud API)
LANGGRAPH_ENABLE_SDK=true

# Celery (B15 integration)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Credits Integration (B11)
CREDITS_ENABLED=true
```

### Installed Modules
- **B07**: Projects (project membership checks)
- **B08**: Authentication (user context)
- **B11**: Credits (reserve/settle pattern)
- **B15**: Background Tasks (Celery worker)
- **B22/B35**: File Storage (output file management)
- **B23**: WebSocket (real-time status updates - optional)
- **B33**: Brand Identity (template context - optional)

---

## Local Setup

### 1. Install Python Dependencies
```bash
# From repo root
pip install openai==1.x langgraph==0.2.x jsonschema==4.x
```

### 2. Run Migrations
```bash
python manage.py migrate generative
```

Expected tables:
- `generative_generationtemplate`
- `generative_generationrequest`
- `generative_generationoutput`

### 3. Start Celery Worker
```bash
# Terminal 1 - Celery worker (picks up generation tasks)
celery -A src.celery worker --loglevel=info --pool=solo

# Terminal 2 - Django dev server
python manage.py runserver
```

### 4. Create Test User & Project
```bash
python manage.py shell
```
```python
from src.accounts.models import User
from src.projects.models import Project

# Create user
user = User.objects.create_user(
    username="dev",
    email="dev@teamreel.local",
    password="dev123"
)

# Create project (B07)
project = Project.objects.create(
    name="Test Project",
    organization=user.organization,  # Assuming B10 Org exists
    created_by=user
)
```

---

## Basic Workflow

### 1. Create Generation Template

**API Endpoint**: `POST /api/v1/generative/templates/`

#### Example: Simple OpenAI Completion
```bash
curl -X POST http://localhost:8000/api/v1/generative/templates/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Match Summary Generator",
    "description": "Generate 3-sentence summary from match highlights",
    "pipeline_provider": "openai",
    "template_data": {
      "model": "gpt-4o",
      "messages": [
        {
          "role": "system",
          "content": "You are a professional football analyst. Summarize match highlights in exactly 3 sentences."
        },
        {
          "role": "user",
          "content": "Highlights: {{highlights}}"
        }
      ],
      "max_tokens": 300,
      "temperature": 0.7
    },
    "input_schema": {
      "type": "object",
      "properties": {
        "highlights": {
          "type": "array",
          "items": {"type": "string"},
          "minItems": 1
        }
      },
      "required": ["highlights"]
    },
    "estimated_cost_credits": 10.0,
    "retention_days": 90,
    "project": "PROJECT_UUID_HERE"
  }'
```

**Response** (201):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Match Summary Generator",
  "pipeline_provider": "openai",
  "is_active": true,
  "is_latest": true,
  "version_number": 1,
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### Example: LangGraph Workflow
```bash
curl -X POST http://localhost:8000/api/v1/generative/templates/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Multi-Step Analysis Pipeline",
    "description": "3-step workflow: extract→analyze→format",
    "pipeline_provider": "langgraph",
    "graph_id": "match_analysis_v2",
    "template_data": {
      "graph_config": {
        "steps": ["extract_entities", "sentiment_analysis", "format_report"]
      }
    },
    "input_schema": {
      "type": "object",
      "properties": {
        "match_id": {"type": "string", "format": "uuid"},
        "analysis_depth": {"type": "string", "enum": ["basic", "detailed"]}
      },
      "required": ["match_id"]
    },
    "estimated_cost_credits": 50.0,
    "retention_days": 365,
    "project": "PROJECT_UUID_HERE"
  }'
```

### 2. Submit Generation Request

**API Endpoint**: `POST /api/v1/generative/requests/`

```bash
curl -X POST http://localhost:8000/api/v1/generative/requests/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": "550e8400-e29b-41d4-a716-446655440000",
    "input_data": {
      "highlights": [
        "Messi scores brilliant goal in 23rd minute",
        "VAR overturns penalty decision in 67th minute",
        "Last-minute equalizer by Ronaldo"
      ]
    },
    "project": "PROJECT_UUID_HERE"
  }'
```

**Response** (201):
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "template": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "retry_count": 0,
  "created_at": "2024-01-15T10:35:00Z",
  "websocket_channel": "generation.650e8400-e29b-41d4-a716-446655440000"
}
```

**Notes**:
- Request immediately goes to Celery queue (status=`pending`)
- Credits reserved from user's balance (B11 integration)
- WebSocket channel available for real-time updates (B23)

### 3. Poll Request Status

**API Endpoint**: `GET /api/v1/generative/requests/{id}/`

```bash
curl http://localhost:8000/api/v1/generative/requests/650e8400-e29b-41d4-a716-446655440000/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response** (status=`completed`):
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "processing_metadata": {
    "provider": "openai",
    "model": "gpt-4o",
    "duration_seconds": 3.42,
    "token_usage": {
      "prompt_tokens": 150,
      "completion_tokens": 75,
      "total_tokens": 225
    }
  },
  "actual_cost_credits": 11.3,
  "output": "750e8400-e29b-41d4-a716-446655440000",
  "completed_at": "2024-01-15T10:35:04Z"
}
```

### 4. Retrieve Output

**API Endpoint**: `GET /api/v1/generative/outputs/{id}/`

```bash
curl http://localhost:8000/api/v1/generative/outputs/750e8400-e29b-41d4-a716-446655440000/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response**:
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440000",
  "request": "650e8400-e29b-41d4-a716-446655440000",
  "result_type": "text",
  "result_data": {
    "summary": "Messi's brilliant 23rd-minute goal set the tone for an electrifying match. VAR intervention overturned a controversial penalty decision in the 67th minute, keeping the score tight. Ronaldo's dramatic last-minute equalizer ensured both teams shared the points in a thrilling encounter."
  },
  "file_ids": [],
  "expires_at": "2024-04-15T10:35:04Z",
  "created_at": "2024-01-15T10:35:04Z"
}
```

---

## Testing

### Unit Tests

```bash
# Run all generative tests
pytest tests/generative/ -v

# Test specific module
pytest tests/generative/test_models.py -v
pytest tests/generative/test_api.py -v
pytest tests/generative/test_executors.py -v

# Coverage report (target: >85%)
pytest tests/generative/ --cov=src.generative --cov-report=html
```

### Manual Testing with Django Shell

```python
from src.generative.models import GenerationTemplate, GenerationRequest
from src.generative.tasks import process_generation_request
from src.accounts.models import User
from src.projects.models import Project

# Get test user and project
user = User.objects.get(username="dev")
project = Project.objects.first()

# Create template
template = GenerationTemplate.objects.create(
    name="Test Template",
    pipeline_provider="openai",
    template_data={
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Say hello!"}
        ]
    },
    input_schema={"type": "object", "properties": {}},
    project=project,
    created_by=user
)

# Submit request
request = GenerationRequest.objects.create(
    template=template,
    input_data={},
    project=project,
    created_by=user
)

# Trigger Celery task manually (bypasses queue)
process_generation_request.apply(args=[str(request.id)])

# Check result
request.refresh_from_db()
print(f"Status: {request.status}")
print(f"Output: {request.output.result_data if request.output else 'None'}")
```

### Integration Tests

```bash
# Run end-to-end workflow tests
pytest tests/generative/integration/test_end_to_end.py -v --tb=short
```

**Test Scenarios**:
1. Simple OpenAI completion (happy path)
2. LangGraph workflow with multiple steps
3. Input validation failures (JSON Schema)
4. Insufficient credits (B11 integration)
5. Retry logic (transient errors)
6. File output handling (B22/B35 integration)

---

## Extension Examples

### 1. Custom LangGraph Graph

**Location**: `teamreel/graphs/custom_analysis.py` (downstream product)

```python
from langgraph.graph import StateGraph, END
from src.generative.graphs.registry import register_graph

@register_graph("custom_analysis_v1")
def create_custom_graph():
    """
    3-step analysis pipeline: extract → analyze → summarize
    """
    workflow = StateGraph(dict)

    workflow.add_node("extract", extract_entities)
    workflow.add_node("analyze", perform_analysis)
    workflow.add_node("summarize", generate_summary)

    workflow.set_entry_point("extract")
    workflow.add_edge("extract", "analyze")
    workflow.add_edge("analyze", "summarize")
    workflow.add_edge("summarize", END)

    return workflow.compile()

def extract_entities(state):
    # Extract entities from input
    return {"entities": [...]}

def perform_analysis(state):
    # Analyze extracted entities
    return {"analysis": {...}}

def generate_summary(state):
    # Generate final summary
    return {"summary": "..."}
```

**Register in Django Settings**:
```python
# teamreel/settings.py
INSTALLED_APPS += ['teamreel.graphs']
```

**Use in Template**:
```json
{
  "name": "Custom TeamReel Analysis",
  "pipeline_provider": "langgraph",
  "graph_id": "custom_analysis_v1",
  "template_data": {
    "graph_config": {"depth": "detailed"}
  }
}
```

### 2. Custom Executor (Third-Party Provider)

**Location**: `src/generative/executors/anthropic.py` (core extension)

```python
from src.generative.executors.base import BasePipelineExecutor
import anthropic

class AnthropicExecutor(BasePipelineExecutor):
    provider_name = "anthropic"

    def execute(self, template_data: dict, input_data: dict) -> dict:
        client = anthropic.Anthropic(api_key=self.get_api_key())

        response = client.messages.create(
            model=template_data["model"],
            messages=self._build_messages(template_data, input_data),
            max_tokens=template_data.get("max_tokens", 1024)
        )

        return {
            "result_type": "text",
            "result_data": {"text": response.content[0].text},
            "processing_metadata": {
                "provider": "anthropic",
                "model": response.model,
                "usage": response.usage.dict()
            }
        }

    def estimate_cost(self, template_data: dict, input_data: dict) -> float:
        # Anthropic pricing logic
        return 0.0  # Calculate based on model
```

**Register in Factory**:
```python
# src/generative/executors/factory.py
from .anthropic import AnthropicExecutor

EXECUTOR_REGISTRY = {
    "openai": OpenAIExecutor,
    "langgraph": LangGraphExecutor,
    "anthropic": AnthropicExecutor,  # New provider
}
```

### 3. TeamReel-Specific Template

**Use Case**: Generate match highlight video descriptions

```python
from src.generative.models import GenerationTemplate
from src.projects.models import Project

project = Project.objects.get(name="TeamReel Production")

template = GenerationTemplate.objects.create(
    name="Highlight Video Description",
    description="Generate SEO-optimized description for match highlight videos",
    pipeline_provider="openai",
    template_data={
        "model": "gpt-4o",
        "messages": [
            {
                "role": "system",
                "content": "You are a sports content specialist. Generate SEO-optimized video descriptions."
            },
            {
                "role": "user",
                "content": """
                Generate a description for this match highlight:
                - Teams: {{team_a}} vs {{team_b}}
                - Date: {{match_date}}
                - Key moments: {{highlights}}
                - Duration: {{duration}} seconds

                Include:
                1. Engaging hook (1 sentence)
                2. Key moments (3-4 bullet points)
                3. SEO keywords (bottom)
                """
            }
        ]
    },
    input_schema={
        "type": "object",
        "properties": {
            "team_a": {"type": "string"},
            "team_b": {"type": "string"},
            "match_date": {"type": "string", "format": "date"},
            "highlights": {"type": "array", "items": {"type": "string"}},
            "duration": {"type": "integer"}
        },
        "required": ["team_a", "team_b", "highlights"]
    },
    estimated_cost_credits=15.0,
    retention_days=365,  # Keep for 1 year
    project=project,
    created_by=project.created_by
)
```

---

## Troubleshooting

### Issue: "Insufficient credits" error

**Symptom**: Request fails with `error_category=credit_insufficient`

**Solutions**:
1. Check user's credit balance:
   ```python
   from src.credits.services import CreditService
   balance = CreditService.get_balance(user)
   print(f"Balance: {balance}")
   ```

2. Add credits (B11):
   ```python
   from src.credits.models import CreditTransaction
   CreditTransaction.objects.create(
       user=user,
       amount=100.0,
       transaction_type="admin_adjustment",
       description="Test credits"
   )
   ```

3. Reduce template `estimated_cost_credits` (recalibrate)

### Issue: Celery task not processing

**Symptom**: Request stuck in `pending` status

**Solutions**:
1. Check Celery worker logs:
   ```bash
   celery -A src.celery worker --loglevel=debug
   ```

2. Verify Redis connection:
   ```bash
   redis-cli ping  # Should return "PONG"
   ```

3. Manually trigger task (debug):
   ```python
   from src.generative.tasks import process_generation_request
   result = process_generation_request.apply(args=["REQUEST_UUID"])
   print(result.get())
   ```

### Issue: OpenAI API key not found

**Symptom**: `error_category=provider_error` with "API key not configured"

**Solutions**:
1. Check `.env` file:
   ```bash
   grep OPENAI_API_KEY .env
   ```

2. Restart Django server after adding key

3. Verify key validity:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### Issue: LangGraph graph not found

**Symptom**: `error_category=internal_error` with "Graph 'xyz' not registered"

**Solutions**:
1. Check graph registry:
   ```python
   from src.generative.graphs.registry import list_graphs
   print(list_graphs())  # Should include your graph_id
   ```

2. Ensure graph module imported:
   ```python
   # src/generative/apps.py
   def ready(self):
       import src.generative.graphs.examples  # Force import
   ```

3. Use correct `graph_id` in template (case-sensitive)

### Issue: JSON Schema validation fails

**Symptom**: Request returns 400 with `input_data` validation error

**Solutions**:
1. Test schema separately:
   ```python
   import jsonschema
   schema = template.input_schema
   input_data = {"highlights": ["test"]}
   jsonschema.validate(input_data, schema)  # Raises if invalid
   ```

2. Check schema is Draft 7 compatible

3. Use online validator: https://www.jsonschemavalidator.net/

---

## Next Steps

1. **Implement Phase 2**: Executor implementations (OpenAI + LangGraph SDK)
2. **Add WebSocket Support**: Real-time status updates (B23 integration)
3. **Create TeamReel Graphs**: Product-specific workflows (e.g., match analysis, video descriptions)
4. **Performance Testing**: Load test with 100+ concurrent requests
5. **Cost Monitoring**: Track actual vs estimated costs, tune `estimated_cost_credits`

---

## Resources

- **API Spec**: [contracts/openapi.yaml](contracts/openapi.yaml)
- **Data Model**: [data-model.md](data-model.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Full Specification**: [spec.md](spec.md)

**Questions?** Consult [src/generative/README.md](../../src/generative/README.md) (coming in Phase 1)
