# Phase 9: Backend Infrastructure (034-038)

**Focus**: Backend utilities - file management, real-time (WebSocket), full-text search, cache patterns

---

## [B22: File & Media Management](../modules/done/034-B22-file-and-media-management.md)

**Goal**: Generieke file upload/download met storage adapters, image processing en tenant-scoped permissions.

**Waarom agnostisch**: File handling is universeel - avatars, documents, product images, media libraries.

**Wat moet er gebeuren**:
- **FileAsset model**: owner (User), org/project scope (FK), MIME type, size, storage path
- **Storage adapters**: Local filesystem (dev) + S3 interface (prod)
  - Adapter pattern: `StorageBackend` interface
  - Implementations: `LocalStorage`, `S3Storage`, `AzureBlobStorage`
- **Image processing**: Thumbnails, resize, crop (Pillow)
  - Generate thumbnails on upload (async via B15)
  - Support JPEG, PNG, GIF, WebP
  - EXIF stripping (privacy)
- **Permissions**: ACL integration (B08), tenant-scoped access
  - Org-scoped: all org members can view
  - Project-scoped: only project members can view
  - User-scoped: only owner can view
- **API endpoints**:
  - `POST /api/files/upload` (multipart/form-data, progress tracking)
  - `GET /api/files/:id/download` (presigned URLs for S3, direct download for local)
  - `DELETE /api/files/:id` (soft delete, audit log via B09)
  - `GET /api/files/` (list files, filtered by scope)
- **Validation**:
  - File size limits (configurable, default 10MB)
  - MIME type whitelist (images, PDFs, office docs)
  - Virus scan hooks (ClamAV integration optional, async)
- **Audit trail**: B09 integration for upload/download/delete events

**Demo Requirements**:
- 📁 **File Upload Page** (`/demo/files`):
  - Drag-and-drop upload zone
  - Progress bar (chunked upload for large files)
  - Preview for images (thumbnails)
  - File list with download/delete actions
  - Permission indicators (org/project/user scope)
  - Tests: upload image → see thumbnail → download → delete → verify audit log

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B22-file-media-management

[feature summary]
Provide tenant-scoped file and media management with storage adapters, image processing, and ACL-enforced access.

[goals]
- Generic file upload/download for any use case
- Storage adapter interface (local/S3/Azure)
- Image thumbnails and basic transformations
- Tenant isolation and ACL enforcement
- Audit trail for all file operations

[demo requirements]
Demo page: /demo/files
- Drag-and-drop upload zone
- File list with thumbnails
- Download (presigned URL), delete actions
- Tests: upload → thumbnail → download → delete
```

---

## [B23: Real-time Infrastructure (WebSocket/Channels)](../modules/done/035-B23-real-time-infrastructure.md)

**Goal**: Django Channels setup voor WebSocket support, broadcast patterns en live updates.

**Waarom agnostisch**: Real-time updates zijn universeel - notifications, collaboration, live data feeds.

**Wat moet er gebeuren**:
- **Django Channels**: ASGI configuration + Redis channel layer
  - Update `asgi.py` for ASGI app
  - Configure channel layer in settings
  - Redis backend for channel persistence
- **WebSocket routing**: `/ws/` namespace
  - `/ws/notifications` (user-specific)
  - `/ws/presence` (online users)
  - `/ws/activity` (org/project activity feed)
- **Broadcast utilities**: Send updates to specific scopes
  - `broadcast_to_user(user_id, message)` (user channel)
  - `broadcast_to_org(org_id, message)` (all org members)
  - `broadcast_to_project(project_id, message)` (project members)
- **Connection authentication**: JWT token validation via WebSocket headers
  - `Authorization: Bearer <token>` in WebSocket handshake
  - Reject unauthenticated connections
- **Reconnection**: Exponential backoff, automatic reconnect
  - Client-side: retry 3 times with 1s, 2s, 4s delays
  - Server-side: heartbeat ping every 30s
- **Rate limiting**: Max 100 messages/minute per connection
  - Track per connection (Redis counter)
  - Disconnect if exceeded
- **Monitoring**: Active connections, message throughput, errors
  - Prometheus metrics: `websocket_connections_active`, `websocket_messages_total`

**Demo Requirements**:
- 📡 **Live Activity Feed** (`/demo/realtime`):
  - WebSocket connection status indicator (green = connected, red = disconnected)
  - Live notifications (appear instantly without page refresh)
  - Online users count (updates in real-time)
  - Activity feed (login events, project updates, file uploads)
  - Reconnect button (manual test)
  - Tests: connect WebSocket → send notification → verify instant display

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B23-realtime-infrastructure-channels

[feature summary]
Django Channels WebSocket infrastructure for real-time updates (notifications, presence, activity).

[goals]
- ASGI + Redis channel layer
- WebSocket routing + authentication
- Broadcast patterns (user, org, project scopes)
- Connection management + rate limiting
- Monitoring + observability

[demo requirements]
Demo page: /demo/realtime
- Connection status indicator
- Live notifications (no refresh)
- Online users count
- Activity feed
- Tests: WebSocket connect → broadcast → verify display
```

---

## [B24: Full-text Search Foundation](../modules/done/036-B24-full-text-search-foundation.md)

**Goal**: Full-text search via PostgreSQL + adapter pattern voor Elasticsearch (optional).

**Waarom agnostisch**: Search is universeel - users, organisations, projects, files, content.

**Wat moet er gebeuren**:
- **PostgreSQL FTS**: `tsvector` columns op searchable models
  - Add `search_vector` column to User, Organisation, Project models
  - Update trigger to auto-populate on INSERT/UPDATE
  - GIN index on `search_vector` column
- **Trigram indexes**: Voor fuzzy matching (typo tolerance)
  - `pg_trgm` extension
  - Trigram indexes on name, description fields
- **Search API**: `GET /api/search/?q=query&types=user,org,project`
  - Query parsing (quoted phrases, boolean operators: AND/OR/NOT)
  - Grouped results by type (users, orgs, projects)
  - Relevance ranking (ts_rank)
  - Highlighting (ts_headline)
- **Permissions**: Only show results user has access to (via B08)
  - Filter results by org membership
  - Filter results by project permissions
  - No leaking of private data
- **Adapter pattern**: Interface voor future Elasticsearch/Meilisearch
  - `SearchBackend` interface
  - Implementations: `PostgresSearchBackend`, `ElasticsearchBackend` (future)

**Demo Requirements**:
- 🔍 **Search Bar** (`/demo/search`):
  - Instant search input (300ms debounce)
  - Grouped results by type (Users, Organisations, Projects)
  - Highlighting (matched terms in bold)
  - "No results" state
  - Permission checks (only show accessible results)
  - Tests: search "TechCorp" → verify org + projects appear, search "Alice" → verify user appears

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B24-fulltext-search-foundation

[feature summary]
PostgreSQL full-text search with permissions-aware results and adapter pattern for future search engines.

[goals]
- PostgreSQL tsvector + trigram indexes
- Search API with query parsing
- Grouped + ranked results
- Permission filtering (B08 integration)
- Adapter interface for Elasticsearch

[demo requirements]
Demo page: /demo/search
- Search input (debounced)
- Grouped results (users, orgs, projects)
- Highlighting + relevance ranking
- Permission checks
- Tests: search → results → verify access
```

---

## [B25: Cache Layer & Patterns](../modules/done/037-B25-cache-layer-and-patterns.md)

**Goal**: Formaliseren van Redis-based caching met patterns, decorators en invalidation strategies.

**Waarom agnostisch**: Performance optimization via caching is universeel herbruikbaar.

**Wat moet er gebeuren**:
- **Redis integration**: Expand B06 Redis usage to central cache layer
  - Configure django-redis as cache backend
  - Multiple cache aliases (default, sessions, throttle)
- **Cache decorators**: `@cache_result(ttl=300)`, `@cache_invalidate(pattern)`
  - View-level caching (`@cache_page(60 * 15)`)
  - Query-level caching (custom decorator)
  - Template fragment caching
- **Cache patterns**:
  - Query result caching (ORM queryset caching)
  - Fragment caching (template blocks)
  - Rate limiting storage (per-user/per-IP)
- **Invalidation**:
  - Tag-based invalidation (cache groups)
  - TTL-based expiry (automatic)
  - Manual purge (management command)
  - Signal-based invalidation (on model save/delete)
- **Monitoring**: Cache hit/miss rates, memory usage, eviction stats
  - Prometheus metrics: `cache_hit_total`, `cache_miss_total`, `cache_memory_bytes`
  - Dashboard integration (B18 observability)
- **Configuration**: Per-environment cache settings, circuit breaker
  - Dev: short TTL (5 minutes)
  - Prod: long TTL (1 hour)
  - Circuit breaker: fallback to database if Redis down

**Demo Requirements**:
- 📊 **Performance Dashboard** (`/demo/performance`):
  - Cache hit/miss ratio chart (line chart, last 24h)
  - Memory usage gauge (Redis memory consumption)
  - Top cached queries list (most hit keys)
  - Cache clear button (purge all keys)
  - Before/after performance comparison (benchmark query with/without cache)
  - Tests: run cached query → verify faster than uncached, clear cache → verify metrics reset

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B25-cache-layer-patterns

[feature summary]
Formalize Redis-based caching with reusable patterns, decorators, and invalidation strategies.

[goals]
- Centralized cache configuration
- Reusable cache decorators
- Tag-based invalidation
- Performance metrics
- Circuit breaker (graceful degradation)

[demo requirements]
Demo page: /demo/performance
- Cache metrics dashboard
- Hit/miss ratio chart
- Memory usage
- Clear cache actions
- Performance comparison tests
```

---

## [B26: Project-Level Access Control (New)](../modules/done/038-B26-project-level-access-control.md)

**Goal**: Fijnmazige toegangscontrole per project, los van organisatielidmaatschap.

**Waarom agnostisch**: Essentieel voor samenwerking met externen (freelancers, clients) die niet de hele organisatie mogen zien.

**Wat moet er gebeuren**:
- **ProjectMembership Model**:
  - Koppeling User <-> Project
  - Rollen: 'viewer', 'editor', 'admin' (project-scope)
- **Permission Updates**:
  - Update `IsOrganisationMember` naar `IsProjectMemberOrOrgAdmin`
  - Project-level permissies hebben voorrang op org-level (indien restrictiever)
- **UI Updates**:
  - Project Settings -> Members tab
  - "Invite to Project" flow (email invite)
  - "My Projects" dashboard filter (direct + org-inherited)
- **API Updates**:
  - `GET /api/v1/projects/:id/members`
  - `POST /api/v1/projects/:id/invite`
  - `DELETE /api/v1/projects/:id/members/:user_id`

**Demo Requirements**:
- 🔒 **Project Access Demo** (`/demo/project-access`):
  - Create project
  - Invite external user (not in org)
  - Login as external user -> verify only project access
  - Verify org admin still has access
  - Tests: invite → accept → verify scope → remove access

**Status**: 📋 PLANNED

**Specify Prompt**:
```
/spec-kitty.specify feature=B26-project-access-control

[feature summary]
Implement direct project membership and access control, allowing users to be added to specific projects without organization-wide access.

[goals]
- ProjectMembership model with roles
- Updated permission classes for project-level access
- Invite flow for external project members
- UI for managing project members
- API endpoints for project membership

[demo requirements]
Demo page: /demo/project-access
- Project member management UI
- Invite flow simulation
- Access verification tests
```

---

**Phase 9 Complete**: 5 modules (B22, B23, B24, B25, B26)
**Next**: Phase 10 - Frontend & Visual Development
