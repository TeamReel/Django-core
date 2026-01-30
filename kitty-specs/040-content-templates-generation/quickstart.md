# Quickstart: Content Templates & Generation (B31)

**Feature**: B31 Content Templates & Generation
**Branch**: `040-content-templates-generation`
**Date**: 2026-01-29

## Overview

This guide demonstrates how to use the B31 Content Generation API for creating templates, generating content, and managing the approval workflow.

---

## Prerequisites

- Django Core-App backend running
- Authenticated user with appropriate permissions (see [Permissions](#permissions))
- Active project and organization

---

## Permissions

| Role | Permissions |
|------|-------------|
| **Team Member** | `view_library`, `download_content` |
| **Team Admin** | Team Member + `generate_content` |
| **Club Admin** | Team Admin + `approve_content`, `manage_templates` (club-scoped) |
| **Land Admin** | Club Admin + all permissions (land-scoped) |

---

## API Base URL

```
http://localhost:8000/api/v1/content-generation/
```

All examples use `curl` with Bearer token authentication:

```bash
export TOKEN="your_jwt_token_here"
export BASE_URL="http://localhost:8000/api/v1/content-generation"
```

---

## 1. Create a Content Template

**Endpoint**: `POST /templates/`
**Permission**: `content_generation.manage_templates`

```bash
curl -X POST "$BASE_URL/templates/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Line-up Video",
    "description": "Generate video showing starting line-up with player names and formation",
    "template_type": "pre_match",
    "sport_type": "football",
    "ai_workflow_id": "workflow_lineup_v2",
    "template_settings": {
      "duration_seconds": 30,
      "background_music": true,
      "show_formation": true
    },
    "timeout_minutes": 15,
    "is_active": true,
    "organisation": 1,
    "project": null
  }'
```

**Response** (201 Created):
```json
{
  "id": 1,
  "name": "Line-up Video",
  "description": "Generate video showing starting line-up...",
  "template_type": "pre_match",
  "sport_type": "football",
  "ai_workflow_id": "workflow_lineup_v2",
  "template_settings": {
    "duration_seconds": 30,
    "background_music": true,
    "show_formation": true
  },
  "timeout_minutes": 15,
  "is_active": true,
  "organisation": 1,
  "project": null,
  "created_by": 10,
  "created_at": "2026-01-29T10:00:00Z",
  "updated_at": "2026-01-29T10:00:00Z"
}
```

---

## 2. List Available Templates

**Endpoint**: `GET /templates/`
**Permission**: `content_generation.view_library`

```bash
# List all active templates
curl -X GET "$BASE_URL/templates/?is_active=true" \
  -H "Authorization: Bearer $TOKEN"

# Filter by sport
curl -X GET "$BASE_URL/templates/?sport_type=football&is_active=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Line-up Video",
      "template_type": "pre_match",
      "sport_type": "football",
      "is_active": true,
      "...": "..."
    },
    {
      "id": 2,
      "name": "Match Highlights",
      "template_type": "post_match",
      "sport_type": "football",
      "is_active": true,
      "...": "..."
    }
  ]
}
```

---

## 3. Generate Content from Template

**Endpoint**: `POST /items/`
**Permission**: `content_generation.generate_content`

```bash
curl -X POST "$BASE_URL/items/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "template": 1,
    "project": 5,
    "activity": 123,
    "input_data": {
      "formation": "4-3-3",
      "players": [
        {"number": 1, "name": "John Doe", "position": "GK"},
        {"number": 10, "name": "Jane Smith", "position": "FW"},
        {"number": 7, "name": "Mike Johnson", "position": "MF"}
      ]
    }
  }'
```

**Response** (201 Created):
```json
{
  "id": 42,
  "template": 1,
  "project": 5,
  "activity": 123,
  "status": "queued",
  "input_data": {
    "formation": "4-3-3",
    "players": [...]
  },
  "output_file": null,
  "error_message": null,
  "created_by": 10,
  "created_at": "2026-01-29T10:05:00Z",
  "updated_at": "2026-01-29T10:05:00Z"
}
```

**Warning Response** (200 OK - duplicate detection):
```json
{
  "warning": "A generation for this template and activity is already in progress",
  "existing_item_id": 41,
  "existing_status": "generating",
  "proceed": true
}
```

---

## 4. Check Generation Status

**Endpoint**: `GET /items/{id}/status/`
**Permission**: `content_generation.view_library`

```bash
# Poll for status updates (use every 3-15 seconds)
curl -X GET "$BASE_URL/items/42/status/" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "id": 42,
  "status": "generating",
  "progress_percent": 65,
  "estimated_completion_seconds": 45
}
```

**Status Flow**:
```
queued → generating → completed (or failed)
```

---

## 5. Retrieve Generated Content

**Endpoint**: `GET /items/{id}/`
**Permission**: `content_generation.view_library`

```bash
curl -X GET "$BASE_URL/items/42/" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "id": 42,
  "template": {
    "id": 1,
    "name": "Line-up Video"
  },
  "project": 5,
  "activity": {
    "id": 123,
    "name": "Match vs Team B"
  },
  "status": "completed",
  "input_data": {...},
  "output_file": {
    "id": 789,
    "url": "https://files.example.com/content/42.mp4",
    "thumbnail_url": "https://files.example.com/thumbnails/42.jpg",
    "file_size": 15728640,
    "mime_type": "video/mp4"
  },
  "error_message": null,
  "metadata": {
    "generation_duration_seconds": 142,
    "retry_count": 0
  },
  "created_by": {
    "id": 10,
    "username": "coach_smith"
  },
  "created_at": "2026-01-29T10:05:00Z",
  "updated_at": "2026-01-29T10:07:22Z",
  "approval_history": []
}
```

---

## 6. Approve Generated Content

**Endpoint**: `POST /items/{id}/approve/`
**Permission**: `content_generation.approve_content`

```bash
curl -X POST "$BASE_URL/items/42/approve/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback_text": "Excellent work, approved for publication"
  }'
```

**Response** (200 OK):
```json
{
  "id": 42,
  "status": "approved",
  "approval": {
    "id": 1,
    "reviewer": {
      "id": 20,
      "username": "admin_jones"
    },
    "status": "approved",
    "feedback_text": "Excellent work, approved for publication",
    "reviewed_at": "2026-01-29T10:15:00Z"
  }
}
```

---

## 7. Reject Generated Content

**Endpoint**: `POST /items/{id}/reject/`
**Permission**: `content_generation.approve_content`

```bash
curl -X POST "$BASE_URL/items/42/reject/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback_text": "Video quality is too low, please regenerate with HD settings"
  }'
```

**Response** (200 OK):
```json
{
  "id": 42,
  "status": "rejected",
  "approval": {
    "id": 2,
    "reviewer": {
      "id": 20,
      "username": "admin_jones"
    },
    "status": "rejected",
    "feedback_text": "Video quality is too low, please regenerate with HD settings",
    "reviewed_at": "2026-01-29T10:20:00Z"
  }
}
```

---

## 8. Request Content Revision

**Endpoint**: `POST /items/{id}/request-revision/`
**Permission**: `content_generation.approve_content`

```bash
curl -X POST "$BASE_URL/items/42/request-revision/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback_text": "Please adjust the timing of the player name reveal at 0:15"
  }'
```

**Response** (200 OK):
```json
{
  "id": 42,
  "status": "revision_requested",
  "approval": {
    "id": 3,
    "reviewer": 20,
    "status": "revision_requested",
    "feedback_text": "Please adjust the timing of the player name reveal at 0:15",
    "reviewed_at": "2026-01-29T10:25:00Z"
  }
}
```

---

## 9. Retry Failed Generation

**Endpoint**: `POST /items/{id}/retry/`
**Permission**: `content_generation.generate_content`

```bash
curl -X POST "$BASE_URL/items/42/retry/" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "id": 42,
  "status": "queued",
  "message": "Generation re-queued"
}
```

---

## 10. Browse Content Library

**Endpoint**: `GET /items/`
**Permission**: `content_generation.view_library`

```bash
# List all content for project
curl -X GET "$BASE_URL/items/?project=5" \
  -H "Authorization: Bearer $TOKEN"

# Filter by status
curl -X GET "$BASE_URL/items/?project=5&status=approved" \
  -H "Authorization: Bearer $TOKEN"

# Filter by template and activity
curl -X GET "$BASE_URL/items/?template=1&activity=123" \
  -H "Authorization: Bearer $TOKEN"

# Paginate results (50 per page)
curl -X GET "$BASE_URL/items/?project=5&page=2" \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "count": 150,
  "next": "/api/v1/content-generation/items/?page=2",
  "previous": null,
  "results": [
    {
      "id": 42,
      "template": {...},
      "status": "approved",
      "output_file": {...},
      "created_at": "2026-01-29T10:05:00Z"
    }
  ]
}
```

---

## Real-time Status Updates (WebSocket)

**WebSocket Endpoint**: `ws://localhost:8000/ws/content-generation/`

```javascript
// Frontend JavaScript example
const ws = new WebSocket('ws://localhost:8000/ws/content-generation/');

ws.onopen = () => {
  // Subscribe to content item updates
  ws.send(JSON.stringify({
    action: 'subscribe',
    contentItemId: 42
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Status update:', data);
  // { id: 42, status: 'generating', progress_percent: 75 }
};

ws.onerror = () => {
  // Fallback to HTTP polling
  startPolling(42);
};
```

**Polling Fallback** (when WebSocket unavailable):

```javascript
async function pollStatus(contentItemId) {
  const response = await fetch(`/api/v1/content-generation/items/${contentItemId}/status/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();

  if (data.status === 'completed' || data.status === 'failed') {
    // Stop polling
    return;
  }

  // Exponential backoff: 3s → 4.5s → 6.75s → ... → max 15s
  const interval = Math.min(3000 * Math.pow(1.5, retryCount), 15000);
  setTimeout(() => pollStatus(contentItemId), interval);
}
```

---

## Error Handling

### Common Error Responses

**400 Bad Request** - Validation error:
```json
{
  "error": "Validation error",
  "details": {
    "template": ["Template with id 999 does not exist"],
    "input_data": ["Missing required field: formation"]
  }
}
```

**403 Forbidden** - Permission denied:
```json
{
  "error": "You do not have permission to perform this action"
}
```

**404 Not Found** - Resource not found:
```json
{
  "error": "ContentItem with id 999 not found"
}
```

**500 Internal Server Error** - Server error:
```json
{
  "error": "An unexpected error occurred",
  "request_id": "abc-123-def"
}
```

---

## Integration Examples

### Python (requests library)

```python
import requests

BASE_URL = "http://localhost:8000/api/v1/content-generation"
TOKEN = "your_jwt_token_here"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

# Create content item
response = requests.post(
    f"{BASE_URL}/items/",
    headers=headers,
    json={
        "template": 1,
        "project": 5,
        "activity": 123,
        "input_data": {
            "formation": "4-3-3",
            "players": [...]
        }
    }
)

content_item = response.json()
print(f"Created: {content_item['id']}, Status: {content_item['status']}")

# Poll status until complete
import time

while True:
    status_response = requests.get(
        f"{BASE_URL}/items/{content_item['id']}/status/",
        headers=headers
    )
    status_data = status_response.json()

    if status_data['status'] in ['completed', 'failed']:
        break

    print(f"Progress: {status_data['progress_percent']}%")
    time.sleep(5)

print(f"Final status: {status_data['status']}")
```

### JavaScript (fetch API)

```javascript
const BASE_URL = 'http://localhost:8000/api/v1/content-generation';
const TOKEN = 'your_jwt_token_here';

async function generateContent() {
  const response = await fetch(`${BASE_URL}/items/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      template: 1,
      project: 5,
      activity: 123,
      input_data: {
        formation: '4-3-3',
        players: [...]
      }
    })
  });

  const contentItem = await response.json();
  console.log(`Created: ${contentItem.id}, Status: ${contentItem.status}`);

  // Start WebSocket or polling for status updates
  subscribeToUpdates(contentItem.id);
}
```

---

## Next Steps

- Review [data-model.md](data-model.md) for complete entity schemas
- Review [contracts/](contracts/) for full API specifications
- See [research.md](research.md) for architecture decisions and alternatives
- Implement models in `src/content_generation/models.py`
- Implement serializers in `src/content_generation/serializers.py`
- Implement views in `src/content_generation/views.py`
- Implement tasks in `src/content_generation/tasks.py`
