# Examples

Working code examples demonstrating Django Core-App patterns and best practices.

## Available Examples

| Example | Description | Demonstrates |
|---------|-------------|--------------|
| [CRUD API](crud-api.md) | Complete REST API with auth | ViewSets, serializers, permissions, pagination |
| [Background Tasks](background-tasks.md) | Celery task patterns | Async tasks, retries, health checks, observability |
| [Scaffolding Demo](scaffolding-demo.md) | CLI project generation | Template system, code generation |

## How to Use Examples

Each example is a sub-project within the main repository that:

1. **Shares Core's environment** - No separate installation needed
2. **Has its own README** - Detailed walkthrough and setup instructions
3. **Includes smoke tests** - Verifies the example works with current Core
4. **Is minimal but realistic** - Demonstrates patterns without unnecessary complexity

## Running Example Tests

All example smoke tests run as part of the CI pipeline:

```bash
# Run all example tests
pytest tests/examples/ -v

# Run specific example tests
pytest tests/examples/test_crud_api_smoke.py -v
```

## Example Structure

Each example follows this structure:

```
examples/<example-name>/
├── README.md           # Walkthrough and documentation
├── models.py           # Django models (if applicable)
├── serializers.py      # DRF serializers (if applicable)
├── views.py            # Views or ViewSets
├── urls.py             # URL routing
└── apps.py             # Django app config
```

Corresponding smoke tests are in:

```
tests/examples/
└── test_<example_name>_smoke.py
```

## Creating New Examples

When adding examples:

1. Keep them minimal - focus on one pattern
2. Use Core authentication and permissions
3. Add smoke tests that verify key flows
4. Write a clear README with step-by-step walkthrough
5. Register in `docs/examples/` with a guide document
