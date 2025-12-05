# Module Name

> Template for module documentation. Copy this file and fill in the sections.

## Overview

Brief description of the module's purpose and responsibilities.

**App location**: `src/<module_name>/`
**Feature spec**: `kitty-specs/<feature-id>/spec.md`

## Configuration

### Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `MODULE_SETTING_NAME` | `value` | Description of setting |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VAR_NAME` | Yes/No | Description |

## Models

### ModelName

Description of the model and its purpose.

| Field | Type | Description |
|-------|------|-------------|
| `field_name` | CharField | Description |

**Relationships**:
- `related_model` - ForeignKey to RelatedModel

## API Endpoints

### List Resources

```http
GET /api/v1/resources/
```

**Response**:
```json
{
  "results": [...],
  "count": 10
}
```

### Create Resource

```http
POST /api/v1/resources/
```

**Request Body**:
```json
{
  "field": "value"
}
```

## Usage Examples

### Common Pattern

```python
from module_name.models import ModelName

# Example usage
instance = ModelName.objects.create(field="value")
```

### Integration Pattern

```python
# How other modules interact with this one
from module_name.services import SomeService

service = SomeService()
result = service.do_something()
```

## Related Features

- [Related Module](./related-module.md) - Description of relationship
- [ADR-XXX: Relevant Decision](../architecture/adr/index.md) - Link to ADR

## Changelog

| Version | Change |
|---------|--------|
| 1.0.0 | Initial implementation |
