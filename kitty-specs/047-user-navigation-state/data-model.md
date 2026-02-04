# Data Model: Navigation State

## Entities

### Abstract Base: `NavigationBase`
Shared structure for navigation references.
| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `user` | FK(User) | Related:`+` | Owner of the record. |
| `content_type` | FK(ContentType) | Nullable | Link to target model. |
| `object_id` | UUID/Str | Nullable | ID of target model. |
| `content_object` | GFK | Read-only | Computed Generic Foreign Key. |
| `label` | Char(255) | Required | Snapshot of title (fallback if object inaccessible). |
| `path` | Char(500) | Required | Frontend route (e.g., `/projects/123`). |
| `context` | JSON | Default:`{}` | Extra frontend state (metastate). |

### Model: `UserRecent` (extends `NavigationBase`)
Auto-generated history stream.
| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `last_seen_at` | DateTime | AutoNow | Timestamp of access. Updates on revisit. |

**Meta**:
- **Ordering**: `-last_seen_at`
- **Constraints**: `UniqueTogether(user, content_type, object_id)` (Update timestamp if exists)
- **Indices**: `(user, last_seen_at)`

### Model: `UserFavorite` (extends `NavigationBase`)
User-pinned items.
| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `created_at` | DateTime | AutoNowAdd | When it was starred. |
| `order` | Integer | Default:0 | For custom sorting (future proofing). |

**Meta**:
- **Ordering**: `-created_at` (default), `order` (optional)
- **Constraints**: `UniqueTogether(user, content_type, object_id)`

## Migrations Strategy
- **App**: New app `navigation` (or `core.navigation`).
- **Dependencies**: `users`, `contenttypes`.
- **Operations**: `CreateTable` x2.
