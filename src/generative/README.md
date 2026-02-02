# B34 Generative Pipelines

AI content generation factory with template-based job lifecycle management.

## Features

- **Template Management**: Versioned generation blueprints with JSON Schema validation
- **Pipeline Execution**: OpenAI (simple completions) + LangGraph (stateful workflows)
- **Async Processing**: Celery-based job queue with retry logic
- **Credit Management**: Reserve/settle/refund credits via B11 integration
- **Brand Identity**: Inject B33 brand context into prompts (optional)
- **File Storage**: B35 integration with presigned URLs
- **WebSocket Events**: Real-time status updates (optional)

## Architecture

### Core Models

- **GenerationTemplate**: Versioned generation blueprints (name, input_schema, pipeline_config)
- **GenerationRequest**: Async job tracking (status, retry_count, costs, transaction_id)
- **GenerationOutput**: Result storage (text_content or file_id with expiration)

### Pipeline Execution

- **BasePipelineExecutor**: Abstract base class for executor implementations
- **OpenAIExecutor**: Direct OpenAI API calls (80% use case - simple completions)
- **LangGraphExecutor**: LangGraph SDK integration (20% use case - stateful workflows)

### Task Processing

- **Celery Tasks**: Async processing with exponential backoff retry
- **Celery Beat**: Scheduled jobs (cleanup expired outputs, update pricing)

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements/base.txt
```

### 2. Run Migrations

```bash
python manage.py migrate generative
```

### 3. Configure Settings

```python
# settings.py
INSTALLED_APPS += ['src.generative']

# OpenAI Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# LangGraph Configuration
LANGGRAPH_API_URL = os.getenv('LANGGRAPH_API_URL', 'http://localhost:8123')

# Generation Settings
GENERATIVE_MAX_RETRIES = 5
GENERATIVE_WEBSOCKET_ENABLED = True
```

### 4. Start Celery Worker

```bash
celery -A config worker --loglevel=info
celery -A config beat --loglevel=info
```

### 5. Create Template

```python
POST /api/v1/generative/templates/
{
  "name": "Blog Post Generator",
  "slug": "blog-post-generator",
  "version": "1.0.0",
  "input_schema": {
    "type": "object",
    "properties": {
      "topic": {"type": "string"},
      "length": {"type": "integer"}
    },
    "required": ["topic"]
  },
  "pipeline_config": {
    "provider": "openai",
    "model": "gpt-4",
    "temperature": 0.7,
    "estimated_cost": 0.10
  }
}
```

### 6. Submit Request

```python
POST /api/v1/generative/requests/
{
  "template": 1,
  "input_data": {
    "topic": "AI in Healthcare",
    "length": 500
  }
}
```

## API Endpoints

### Templates

- `POST /templates/` - Create template (admin only)
- `GET /templates/` - List templates (project-filtered)
- `GET /templates/{id}/` - Template details
- `PATCH /templates/{id}/` - Update template (metadata only)
- `DELETE /templates/{id}/` - Soft-delete template
- `POST /templates/{id}/clone/` - Clone template (create new version)

### Requests

- `POST /requests/` - Submit generation request (async via Celery)
- `GET /requests/{id}/` - Request status + output reference
- `POST /requests/{id}/cancel/` - Cancel pending request (refund credits)

### Outputs

- `GET /outputs/{id}/` - Retrieve output (text/JSON/files with presigned URLs)

### Health

- `GET /health/` - Health check endpoint (database + Celery)

## Custom LangGraph Graphs

Register custom workflows for complex generation tasks:

```python
# teamreel/graphs/match_analysis.py
from langgraph.graph import StateGraph
from src.generative.graphs.registry import GraphRegistry

@GraphRegistry.register('match_analysis_v2')
def build_match_analysis_graph():
    """Multi-step match analysis workflow."""
    graph = StateGraph()

    # Define nodes
    graph.add_node("extract_stats", extract_statistics)
    graph.add_node("analyze_performance", analyze_player_performance)
    graph.add_node("generate_insights", generate_insights)

    # Define edges
    graph.add_edge("extract_stats", "analyze_performance")
    graph.add_edge("analyze_performance", "generate_insights")

    # Set entry point
    graph.set_entry_point("extract_stats")

    return graph.compile()
```

Then use in template:

```json
{
  "pipeline_config": {
    "provider": "langgraph",
    "graph_name": "match_analysis_v2",
    "langgraph_config": {
      "checkpoint_mode": "background"
    }
  }
}
```

## Testing

```bash
# Run all tests
pytest tests/generative/ -v

# Run with coverage
pytest tests/generative/ --cov=src.generative --cov-report=html

# Run integration tests only
pytest tests/generative/ -v -m integration

# Run specific test file
pytest tests/generative/test_api.py -v
```

## Monitoring

### Logs

Structured JSON logs in `logs/generative.log`:

```json
{
  "timestamp": "2026-02-02T17:00:00Z",
  "level": "INFO",
  "logger": "generative.tasks",
  "message": "Processing request",
  "request_id": "123",
  "user_id": "456",
  "template_id": "789",
  "provider": "openai"
}
```

### Metrics

Prometheus metrics at `/metrics/` (if enabled):

- `generative_requests_total{status, provider}` - Total requests
- `generative_request_duration_seconds{provider}` - Processing duration
- `generative_request_cost_dollars{provider}` - Request costs
- `generative_active_requests` - Currently processing

### Health Check

```bash
curl http://localhost:8000/api/v1/generative/health/

{
  "status": "healthy",
  "database": "ok",
  "celery": "ok"
}
```

## Production Deployment

### 1. Environment Variables

```bash
# Required
export OPENAI_API_KEY="sk-..."
export LANGGRAPH_API_URL="https://langgraph.yourcompany.com"
export CELERY_BROKER_URL="redis://localhost:6379/0"
export CELERY_RESULT_BACKEND="redis://localhost:6379/1"

# Optional
export GENERATIVE_MAX_RETRIES=5
export GENERATIVE_WEBSOCKET_ENABLED=true
```

### 2. Run Migrations

```bash
python manage.py migrate generative
```

### 3. Start Services

```bash
# Django (Gunicorn)
gunicorn config.wsgi --bind 0.0.0.0:8000 --workers 4

# Celery Worker
celery -A config worker --loglevel=info --concurrency=4

# Celery Beat (for scheduled tasks)
celery -A config beat --loglevel=info
```

### 4. Scheduled Jobs

Celery Beat automatically runs:

- **Cleanup expired outputs**: Daily at 2:45 AM UTC
- **Update template costs**: Monthly on 1st at 3:00 AM UTC

### 5. Management Commands

```bash
# Retry failed requests (manual intervention)
python manage.py retry_failed_requests --max-retries=5

# Generate usage report
python manage.py usage_report --days=30 --format=json

# Update template costs manually
python manage.py update_template_costs --dry-run
```

## Troubleshooting

### Request Stuck in "processing"

**Symptom**: Request status remains "processing" indefinitely

**Solutions**:
1. Check Celery worker logs: `docker logs celery-worker`
2. Verify Celery Beat is running: `celery -A config inspect active`
3. Restart worker: `docker restart celery-worker`

### Insufficient Credits Error

**Symptom**: HTTP 402 Payment Required

**Solutions**:
1. Check user balance: `curl /api/v1/credits/balance/`
2. Top up credits via admin or API
3. Verify transaction not stuck in "pending"

### Rate Limit Error

**Symptom**: Request fails with "Rate limit exceeded"

**Solutions**:
1. Wait for exponential backoff retry (automatic)
2. Check OpenAI quota: https://platform.openai.com/account/usage
3. Increase rate limits in OpenAI dashboard

### File Not Found

**Symptom**: Output retrieval returns 404

**Solutions**:
1. Check output expiration: `retention_days` on template
2. Verify file exists in B35 storage
3. Check presigned URL expiration (default 3600s)

### LangGraph Connection Error

**Symptom**: "Connection refused" to LangGraph server

**Solutions**:
1. Verify LANGGRAPH_API_URL is correct
2. Check LangGraph server is running: `curl $LANGGRAPH_API_URL/health`
3. Verify network connectivity between services

## Architecture Decisions

See [Architecture Decision Record](../../../documents/04-modules/B34-generative-pipelines/adr.md) for detailed rationale behind:

- LangGraph SDK vs Cloud API
- True versioning pattern
- Per-template retention policy
- Hybrid cost estimation
- 80/20 provider split

## Contributing

### Code Style

- Follow PEP8 (enforced by black + ruff)
- Use type hints (validated by mypy)
- Write docstrings for public APIs
- Add tests for new features (>80% coverage)

### Testing

```bash
# Before commit
pytest tests/generative/ --cov=src.generative --cov-report=term
black src/generative/
ruff check src/generative/
mypy src/generative/
```

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] Coverage >80% for new code
- [ ] No type errors (mypy)
- [ ] No security issues (bandit)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated

## License

MIT License - see LICENSE file for details
