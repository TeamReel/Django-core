# API Contract: Activities & Period Hierarchy

**Feature**: 039-activities-period-hierarchy
**API Version**: v1
**Base URL**: `/api/v1/`
**Authentication**: Required (JWT via B05)
**Authorization**: B08 permissions (organisation.manage_periods, project.manage_activities, etc.)

## Endpoints Summary

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | /periods/ | List periods | Yes |
| POST | /periods/ | Create period | Yes (manage_periods) |
| GET | /periods/{id}/ | Retrieve period | Yes |
| PUT | /periods/{id}/ | Update period | Yes (manage_periods) |
| DELETE | /periods/{id}/ | Delete period | Yes (manage_periods) |
| GET | /periods/{id}/children/ | Get direct children | Yes |
| GET | /periods/{id}/descendants/ | Get all descendants (CTE) | Yes |
| GET | /activities/ | List activities | Yes |
| POST | /activities/ | Create activity | Yes (manage_activities) |
| GET | /activities/{id}/ | Retrieve activity | Yes |
| PUT | /activities/{id}/ | Update activity | Yes (manage_activities) |
| DELETE | /activities/{id}/ | Delete activity | Yes (manage_activities) |
| GET | /activities/{id}/participants/ | List activity participants | Yes |
| GET | /participations/ | List participations | Yes |
| POST | /participations/ | Create participation | Yes (manage_activities) |
| GET | /participations/{id}/ | Retrieve participation | Yes |
| PUT | /participations/{id}/ | Update participation | Yes (manage_activities) |
| DELETE | /participations/{id}/ | Delete participation | Yes (manage_activities) |

---

## Period Endpoints

### List Periods
```
GET /api/v1/periods/
```

**Query Parameters**:
- `organisation_id` (UUID, optional): Filter by organisation
- `project_id` (UUID, optional): Filter by project
- `parent_id` (UUID, optional): Filter by parent (use `null` for root periods)
- `page` (integer, optional): Page number (default: 1)
- `page_size` (integer, optional): Items per page (default: 20, max: 100)

**Response** (200 OK):
```json
{
  "count": 42,
  "next": "/api/v1/periods/?page=2",
  "previous": null,
  "results": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "organisation": {
        "id": "org-uuid",
        "name": "Ajax Amsterdam"
      },
      "project": null,
      "parent_period": null,
      "name": "Seizoen 2023/2024",
      "description": "Competitie en beker seizoen",
      "start_date": "2023-09-01",
      "end_date": "2024-06-30",
      "data": {},
      "created_at": "2023-08-15T10:00:00Z",
      "updated_at": "2023-08-15T10:00:00Z",
      "created_by": {"id": "user-uuid", "name": "Admin"},
      "children_count": 3,
      "activities_count": 0
    }
  ]
}
```

---

### Create Period
```
POST /api/v1/periods/
```

**Request Body**:
```json
{
  "organisation_id": "org-uuid",
  "project_id": "project-uuid",  // optional
  "parent_period_id": "parent-uuid",  // optional
  "name": "Najaarscompetitie",
  "description": "September tot December",
  "start_date": "2023-09-01",
  "end_date": "2023-12-31",
  "data": {"budget": 25000}
}
```

**Response** (201 Created):
```json
{
  "id": "period-uuid",
  "organisation": {...},
  "project": {...},
  "parent_period": {...},
  "name": "Najaarscompetitie",
  "description": "September tot December",
  "start_date": "2023-09-01",
  "end_date": "2023-12-31",
  "data": {"budget": 25000},
  "created_at": "2023-08-20T14:30:00Z",
  "updated_at": "2023-08-20T14:30:00Z",
  "created_by": {...},
  "children_count": 0,
  "activities_count": 0
}
```

**Validation Errors** (400 Bad Request):
```json
{
  "end_date": ["End date must be after start date"],
  "parent_period": ["Child period's organisation must match parent's organisation"],
  "organisation": ["This field is required"]
}
```

**Permission Errors** (403 Forbidden):
```json
{
  "detail": "You do not have permission to manage periods in this organisation"
}
```

---

### Get Period Children
```
GET /api/v1/periods/{id}/children/
```

**Response** (200 OK):
```json
{
  "count": 3,
  "results": [
    {
      "id": "child1-uuid",
      "name": "Najaarscompetitie",
      ...
    },
    {
      "id": "child2-uuid",
      "name": "Voorjaarscompetitie",
      ...
    }
  ]
}
```

---

### Get Period Descendants (All Levels)
```
GET /api/v1/periods/{id}/descendants/
```

**Response** (200 OK):
```json
{
  "count": 15,
  "results": [
    {
      "id": "child1-uuid",
      "name": "Najaarscompetitie",
      "depth": 1,
      ...
    },
    {
      "id": "grandchild1-uuid",
      "name": "December 2023",
      "depth": 2,
      ...
    },
    ...
  ]
}
```

**Performance Note**: Uses PostgreSQL recursive CTE. Guaranteed <500ms for hierarchies up to 10 levels.

---

### Delete Period
```
DELETE /api/v1/periods/{id}/
```

**Response** (204 No Content): Period deleted successfully

**Validation Errors** (400 Bad Request):
```json
{
  "detail": "Cannot delete period with 3 child periods. Delete children first."
}
```
or
```json
{
  "detail": "Cannot delete period with 12 activities. Delete activities first."
}
```

---

## Activity Endpoints

### List Activities
```
GET /api/v1/activities/
```

**Query Parameters**:
- `project_id` (UUID, optional): Filter by project
- `period_id` (UUID, optional): Filter by period (includes descendants if `include_descendants=true`)
- `include_descendants` (boolean, optional): Include activities from descendant periods (default: true)
- `activity_type` (string, optional): Filter by type (match, meeting, training, etc.)
- `start_time__gte` (ISO datetime, optional): Activities starting after this time
- `start_time__lte` (ISO datetime, optional): Activities starting before this time
- `page` (integer, optional): Page number
- `page_size` (integer, optional): Items per page

**Response** (200 OK):
```json
{
  "count": 87,
  "next": "/api/v1/activities/?page=2",
  "previous": null,
  "results": [
    {
      "id": "activity-uuid",
      "project": {
        "id": "project-uuid",
        "name": "Ajax Onder 19"
      },
      "period": {
        "id": "period-uuid",
        "name": "December 2023"
      },
      "title": "Ajax - Feyenoord",
      "activity_type": "match",
      "start_time": "2023-12-15T14:30:00Z",
      "end_time": "2023-12-15T16:15:00Z",
      "location": "Johan Cruijff Arena",
      "description": "Eredivisie wedstrijd",
      "data": {
        "score_home": 3,
        "score_away": 1,
        "goals": [...]
      },
      "created_at": "2023-12-01T10:00:00Z",
      "updated_at": "2023-12-15T17:00:00Z",
      "created_by": {...},
      "participants_count": 18
    }
  ]
}
```

---

### Create Activity
```
POST /api/v1/activities/
```

**Request Body**:
```json
{
  "project_id": "project-uuid",
  "period_id": "period-uuid",
  "title": "Ajax - PSV",
  "activity_type": "match",
  "start_time": "2023-12-22T20:00:00Z",
  "end_time": "2023-12-22T21:45:00Z",
  "location": "Johan Cruijff Arena",
  "description": "Top wedstrijd",
  "data": {}
}
```

**Response** (201 Created): Same structure as list item

**Validation Errors** (400 Bad Request):
```json
{
  "period": ["Period must belong to same organisation as activity's project"],
  "end_time": ["End time must be after start time"]
}
```

**Soft Warning** (included in response metadata, doesn't block creation):
```json
{
  "warnings": [
    "Activity scheduled outside period date range (2023-12-22 not in 2023-09-01 to 2023-11-30)"
  ]
}
```

---

### Get Activity Participants
```
GET /api/v1/activities/{id}/participants/
```

**Query Parameters**:
- `status` (string, optional): Filter by status (confirmed, tentative, declined, no_response)
- `role` (string, optional): Filter by role (starter, substitute, etc.)

**Response** (200 OK):
```json
{
  "count": 18,
  "results": [
    {
      "id": "participation-uuid",
      "activity": {"id": "activity-uuid", "title": "Ajax - Feyenoord"},
      "period": null,
      "member": {
        "id": "member-uuid",
        "user": {
          "id": "user-uuid",
          "first_name": "Speler",
          "last_name": "1"
        }
      },
      "role": "starter",
      "status": "confirmed",
      "notes": "",
      "data": {
        "jersey_number": 10,
        "position": "striker"
      },
      "created_at": "2023-12-10T12:00:00Z",
      "updated_at": "2023-12-10T12:00:00Z",
      "created_by": {...}
    }
  ]
}
```

---

## Participation Endpoints

### List Participations
```
GET /api/v1/participations/
```

**Query Parameters**:
- `period_id` (UUID, optional): Filter by period
- `activity_id` (UUID, optional): Filter by activity
- `member_id` (UUID, optional): Filter by member
- `status` (string, optional): Filter by status
- `role` (string, optional): Filter by role

**Response**: Same structure as Get Activity Participants

---

### Create Participation
```
POST /api/v1/participations/
```

**Request Body** (period participation):
```json
{
  "period_id": "period-uuid",
  "member_id": "member-uuid",
  "role": "squad_member",
  "status": "confirmed",
  "notes": "",
  "data": {
    "jersey_number": 10,
    "position": "striker"
  }
}
```

**Request Body** (activity participation):
```json
{
  "activity_id": "activity-uuid",
  "member_id": "member-uuid",
  "role": "starter",
  "status": "confirmed",
  "notes": "",
  "data": {}
}
```

**Response** (201 Created): Full participation object

**Validation Errors** (400 Bad Request):
```json
{
  "non_field_errors": [
    "Participation must belong to either activity or period (not both)"
  ]
}
```
or
```json
{
  "member": [
    "Member must belong to same organisation as activity/period"
  ]
}
```

---

### Update Participation
```
PUT /api/v1/participations/{id}/
PATCH /api/v1/participations/{id}/
```

**Request Body** (PATCH example - update status only):
```json
{
  "status": "declined",
  "notes": "Illness"
}
```

**Response** (200 OK): Full participation object

---

### Delete Participation
```
DELETE /api/v1/participations/{id}/
```

**Response** (204 No Content): Participation deleted

---

## Error Responses

### Standard Error Format
All error responses follow B13 envelope pattern:

```json
{
  "detail": "Human-readable error message",
  "code": "error_code",
  "field_errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### HTTP Status Codes

- `200 OK`: Success (GET, PUT, PATCH)
- `201 Created`: Resource created (POST)
- `204 No Content`: Resource deleted (DELETE)
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `409 Conflict`: Concurrent modification conflict (optimistic locking)
- `500 Internal Server Error`: Unexpected server error

---

## Filtering & Search

### Full-Text Search (B14 Integration)
```
GET /api/v1/search/?q=ajax&types=period,activity
```

**Response**:
```json
{
  "count": 15,
  "results": [
    {
      "type": "period",
      "id": "period-uuid",
      "name": "Ajax Onder 19 Seizoen 2023/2024",
      "description": "...",
      "relevance": 0.95
    },
    {
      "type": "activity",
      "id": "activity-uuid",
      "title": "Ajax - Feyenoord",
      "activity_type": "match",
      "relevance": 0.87
    }
  ]
}
```

---

## Pagination

All list endpoints support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20, max: 100)

**Response Structure**:
```json
{
  "count": 150,
  "next": "/api/v1/periods/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## Rate Limiting

- **Authenticated users**: 1000 requests/hour
- **Read operations**: 100 requests/minute
- **Write operations**: 30 requests/minute

Rate limit headers included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1609459200
```

---

## Versioning

API versioned at URL level: `/api/v1/`

Breaking changes will be introduced via new version: `/api/v2/`

Deprecation policy: 6 months notice before version removal.

---

## Webhooks (Future Enhancement)

Not in MVP scope. Future versions may support:
- `period.created`
- `activity.created`
- `activity.updated`
- `participation.created`
- `participation.status_changed`
