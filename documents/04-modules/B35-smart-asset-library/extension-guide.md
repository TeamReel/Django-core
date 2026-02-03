# B35 Smart Asset Library: Integration Guide

This guide describes how to extend and integrate the Smart Asset Library (B35) with other modules in the system.

## Overview

The Smart Asset Library provides a unified way to store and link media content against any business object using `MediaItemRelation`. This allows modules like **Competition Management**, **Training**, or **Scouting** to attach photos and videos without creating custom media models.

## Pattern: Attaching Media to Domain Objects

Instead of adding `ForeignKey(MediaItem)` to your models, use the **inverse relation** pattern provided by `MediaItemRelation`. This keeps your domain models clean and allows multiple media items per object.

### 1. In your Module (Backend)

No changes are strictly required in your models if you only need runtime attachment. However, to easily access media from your model, you can add a `GenericRelation`.

```python
# src/training/models.py
from django.contrib.contenttypes.fields import GenericRelation
from medialib.models import MediaItemRelation

class TrainingDrill(models.Model):
    name = models.CharField(max_length=100)
    # ... other fields ...

    # Optional: Reverse relation for easy querying
    media_relations = GenericRelation(
        MediaItemRelation,
        related_query_name='training_drill'
    )
```

### 2. Using the API to Link Media

Use the `add_relation` endpoint on the Media Library API.

**Request:** `POST /api/v1/media-library/items/{media_id}/add_relation/`

```json
{
    "target_type": "training.trainingdrill",
    "target_id": "{drill_uuid}",
    "relation_type": "demonstration"
}
```

### 3. Fetching Media for your Object

To get all media items for a specific drill, use the library's filter endpoint:

**Request:** `GET /api/v1/media-library/items/?target_type=training.trainingdrill&target_id={drill_uuid}`

## Extension Point: Custom Relation Types

If your module needs specific relation types (e.g., "scouting_report", "medical_scan"), strictly defined validation logic can be added to `MediaItemRelationService` (extensible via subclassing or signals if needed, though currently open).

## Frontend Integration

1. **Upload**: Use the `MediaUploader` component to upload file to `MediaItem`.
2. **Link**: On success, call `add_relation` with the current context object ID.
3. **Display**: Query the media list filtered by the current object ID.
