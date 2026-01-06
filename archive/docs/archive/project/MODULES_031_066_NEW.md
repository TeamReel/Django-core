# Modules 031-066: Hergestructureerd met Demo-First Approach

## Principe: Visuele Validatie via Demo Shell

**Elke nieuwe module krijgt een werkende demo-component** zodat je visueel kunt valideren dat het werkt.

---

## Fase 8: Demo Foundation & File Management (031-034)

### 31. F10 – Demo Shell & Development Dashboard

**Doel**
Minimale demo-site + development dashboard voor end-to-end validatie en visueel vertrouwen.

**Waarom agnostisch**
Geen product, maar generieke demo die core-flows valideert en contracten zichtbaar maakt.

**Wat moet er gebeuren**
- Demo-app in `examples/demo-shell/`
- **Basis flows**: login → context switch → permissions → list/detail
- **Development dashboard**: Real-time platform status
  - Module completion (001-066 overview)
  - CI pipeline status
  - Test coverage metrics
  - API health checks
- **States**: loading, empty, error, 403, 404
- **Incrementele groei**: Elke module 032+ krijgt dedicated demo-pagina
- Seed fixtures voor reproduceerbare demo
- Smoke-test suite voor CI

**Demo Checklist (incremental)**:
- ✅ **Phase 1-7**: Auth, context, permissions, notifications
- 🔄 **Phase 8**: Development dashboard, file upload demo, rich text demo
- 🔄 **Phase 9**: Real-time updates demo, search demo, workflow demo, payment demo
- 🔄 **Phase 10**: PDF export demo, admin panel demo, ops console demo

**Specify Prompt**

```
/spec-kitty.specify feature=F10-demo-shell-development-dashboard

[feature summary]
Create minimal demo shell + development dashboard to visually demonstrate all platform capabilities as they're built, with real-time platform health monitoring.

[goals and non-goals]
Goals:
- Visual validation for each new module (032-066)
- Development dashboard showing module status, CI, coverage, health
- Click-through experience for all core features
- Reproducible with seed data
- CI smoke tests for critical journeys

Non-goals:
- Build customer-facing product
- Domain-specific pages

[key user stories]
- As a stakeholder, I see visual proof that each module works
- As a developer, I use dashboard to monitor platform health
- As a maintainer, I verify modules work together via demo
- As a reviewer, I validate behavior quickly

[constraints and assumptions]
- Reuses auth, context, permissions, design system
- Dashboard shows: modules 001-066 status, CI pipeline, test coverage, API health
- Each module 032+ MUST add demo page
- Lightweight, fast to load

[demo requirements per phase]
Phase 8 (032-034):
- File upload/download page (B22)
- Rich text editor page (F13)
- Performance dashboard showing cache hits (B25)

Phase 9 (035-038):
- Live activity feed with WebSocket updates (B23)
- Search bar with instant results (B24)
- Approval workflow example (B27)
- Payment form with Stripe/test mode (B26)

Phase 10 (039-042):
- PDF export button on any page (B28)
- Admin panel for users/orgs/projects (F14)
- Platform health console (F11)
- Billing usage charts (F12)
```

---

### 32. B22 – File & Media Management

**Doel**
Generieke file upload/download met storage adapters, thumbnails en tenant-scoped permissions.

**Waarom agnostisch**
File handling is universeel: avatars, documents, product images, media libraries.

**Wat moet er gebeuren**
- **FileAsset model**: owner, org/project scope, MIME type, size, storage path
- **Storage adapters**: Local filesystem + S3 interface
- **Image processing**: Thumbnails (Pillow), resize, crop via adapters
- **Permissions**: ACL integration (B08), tenant-scoped access
- **API endpoints**: Upload (multipart), download (presigned URLs), delete, list
- **Validation**: File size limits, MIME type whitelist, virus scan hooks
- **Audit**: B09 integration for upload/download/delete events

**Demo Requirements**:
- 📁 **File Upload Page** in demo-shell:
  - Drag-and-drop upload zone
  - Progress bar
  - Preview for images
  - File list with download/delete actions
  - Tests: upload image → see thumbnail → download → delete

**Specify Prompt**

```
/spec-kitty.specify feature=B22-file-media-management

[feature summary]
Provide tenant-scoped file and media management with storage adapters, image processing, and ACL-enforced access.

[goals and non-goals]
Goals:
- Generic file upload/download for any use case
- Storage adapter interface (local/S3/Azure)
- Image thumbnails and basic transformations
- Tenant isolation and ACL enforcement
- Audit trail for all file operations

Non-goals:
- Advanced video transcoding
- Full media DAM UI (downstream can build)
- Built-in CDN (infrastructure concern)

[key user stories]
- As a user, I upload files securely within my org/project scope
- As a developer, I switch storage backends without code changes
- As security, I audit who uploaded/downloaded what
- As an operator, I enforce file size limits and MIME type rules

[constraints and assumptions]
- Integrates with B08 (ACL), B09 (audit), B06/B07 (org/project scoping)
- Pillow for image processing
- Presigned URLs for S3 downloads (no proxy)
- Virus scan via external service hook (optional)

[technical details]
- Storage adapter interface: upload(file, path), download(path), delete(path), list(prefix)
- Default local storage in MEDIA_ROOT
- S3 adapter uses boto3 with credentials from environment
- Image transformations: thumbnail(size), resize(width, height), crop(x, y, w, h)
- MIME type detection via python-magic
- File size limit configurable per tenant (default 10MB, max 100MB)

[demo requirements]
Demo page: /demo/files
- Drag-and-drop upload zone
- File list with thumbnails
- Download button (presigned URL)
- Delete button with confirmation
- Tests: upload image → thumbnail appears → download → delete
```

---

### 33. B25 – Cache Layer & Patterns

**Doel**
Formaliseren van Redis-based caching met patterns, decorators en invalidation strategies.

**Waarom agnostisch**
Performance optimization via caching is universeel herbruikbaar.

**Wat moet er gebeuren**
- **Redis integration**: Expand B06 Redis usage to central cache layer
- **Cache decorators**: `@cache_result(ttl=300)`, `@cache_invalidate(pattern)`
- **Cache patterns**: Query result caching, fragment caching, rate limiting storage
- **Invalidation**: Tag-based invalidation, TTL-based expiry, manual purge
- **Monitoring**: Cache hit/miss rates, memory usage, eviction stats
- **Configuration**: Per-environment cache settings, circuit breaker

**Demo Requirements**:
- 📊 **Performance Dashboard** in demo-shell:
  - Cache hit/miss ratio chart
  - Memory usage gauge
  - Top cached queries list
  - Cache clear button (for testing)
  - Before/after performance comparison

**Specify Prompt**

```
/spec-kitty.specify feature=B25-cache-layer-patterns

[feature summary]
Formalize Redis-based caching with reusable patterns, decorators, and invalidation strategies for performance optimization.

[goals and non-goals]
Goals:
- Centralized cache configuration and monitoring
- Reusable cache decorators for views/API/queries
- Tag-based invalidation for related data
- Rate limiting storage (alongside B13 throttling)
- Performance metrics in demo dashboard

Non-goals:
- Replace application logic with cache
- Implement full CDN (infrastructure concern)
- Cache sensitive data without encryption

[key user stories]
- As a developer, I cache expensive queries with one decorator
- As an operator, I monitor cache effectiveness via dashboard
- As a user, I experience faster page loads
- As security, I ensure sensitive data is never cached unencrypted

[constraints and assumptions]
- Uses Redis (already present for B06 rate limiting)
- Integrates with B18 observability for metrics
- Cache keys include tenant scope to prevent leakage
- TTL defaults: query results 5min, API responses 1min, static data 1hr

[technical details]
- Cache backend: django-redis
- Decorators: @cache_result(key_pattern, ttl), @cache_invalidate_on_save(model)
- Invalidation tags: "org:<id>", "project:<id>", "user:<id>"
- Circuit breaker: disable cache if Redis fails (degrade gracefully)
- Metrics: prometheus-client counters for hits/misses

[demo requirements]
Demo page: /demo/performance
- Real-time cache metrics dashboard
- Charts: hit/miss ratio over time, memory usage
- Table: top 10 cached queries with hit counts
- Actions: clear all cache, clear by tag
- Before/after test: uncached query → cached query response time
```

---

### 34. F13 – Rich Text Editor Component

**Doel**
WYSIWYG editor component met content sanitization en markdown support.

**Waarom agnostisch**
Rich text editing is basis voor CMS, comments, emails, documentation.

**Wat moet er gebeuren**
- **Editor component**: Integration van TipTap of Quill
- **Toolbar**: Bold, italic, lists, links, images, code blocks
- **Content sanitization**: DOMPurify for XSS prevention
- **Markdown support**: Bidirectional markdown ↔ HTML conversion
- **Image uploads**: Integration met B22 for inline images
- **Mentions**: @user, #project autocompletion (optional)
- **Accessibility**: Keyboard shortcuts, screen reader support

**Demo Requirements**:
- ✍️ **Rich Text Page** in demo-shell:
  - Editor with full toolbar
  - Live preview toggle (HTML/Markdown)
  - Save button → stores in backend
  - Load button → renders saved content
  - Tests: type text → format → insert image (via B22) → save → reload

**Specify Prompt**

```
/spec-kitty.specify feature=F13-rich-text-editor-component

[feature summary]
Provide a rich text editor component with content sanitization, markdown support, and inline image uploads.

[goals and non-goals]
Goals:
- Reusable WYSIWYG editor for any text content
- Safe HTML sanitization (XSS prevention)
- Markdown bidirectional conversion
- Inline image uploads via B22
- Keyboard shortcuts and accessibility

Non-goals:
- Complex collaborative editing (use B23 for that)
- Advanced formatting (tables, custom styles)
- Built-in content versioning (use model history)

[key user stories]
- As a user, I create rich text content easily
- As a developer, I integrate the editor in any form
- As security, I trust content is sanitized
- As an author, I switch between visual and markdown modes

[constraints and assumptions]
- Uses F01 design system for styling
- Integrates with B22 for image uploads
- DOMPurify for sanitization
- TipTap (recommended) or Quill as editor engine
- Must work in controlled/uncontrolled form modes

[technical details]
- Package: @django-core/rich-text-editor
- Editor engine: TipTap (extensible, TypeScript-first)
- Sanitization: DOMPurify with strict whitelist
- Markdown: remark/rehype for conversion
- Image upload: drag-drop → B22 API → insert URL
- Props: initialValue, onChange, readonly, placeholder, toolbar (configurable)

[demo requirements]
Demo page: /demo/editor
- Full editor with toolbar (bold, italic, lists, links, images, code)
- Toggle button: visual ↔ markdown view
- Save button → POST /api/demo/content
- Load button → GET /api/demo/content → populate editor
- Image upload test: drag image → uploads via B22 → inserts in editor
- Tests: create content → save → clear → load → verify content
```

---

## Fase 9: Real-time & Search (035-038)

### 35. B23 – Real-time Infrastructure (WebSocket/Channels)

**Doel**
Django Channels setup voor WebSocket support, broadcast patterns en live updates.

**Waarom agnostisch**
Real-time features zijn universeel: notifications, chat, live dashboards, collaboration.

**Wat moet er gebeuren**
- **Django Channels setup**: ASGI, channel layers, Redis backend
- **WebSocket auth**: Token-based authentication via B05
- **Broadcast patterns**: org-wide, project-wide, user-specific channels
- **Integration met B16/B17**: Push notifications via WebSocket
- **Connection management**: Heartbeat, reconnect logic, presence tracking
- **Observability**: Connection count, message throughput, latency

**Demo Requirements**:
- 📡 **Live Activity Feed** in demo-shell:
  - WebSocket connection status indicator
  - Live notifications appearing instantly
  - Activity feed (user X uploaded file Y, user Z commented on project A)
  - Online users list (presence)
  - Tests: open 2 browsers → action in one → see update in other instantly

**Specify Prompt**

```
/spec-kitty.specify feature=B23-real-time-infrastructure

[feature summary]
Set up Django Channels for WebSocket support with broadcast patterns, authentication, and live update infrastructure.

[goals and non-goals]
Goals:
- Real-time push notifications via WebSocket
- Broadcast to org/project/user channels
- Presence tracking (online/offline)
- Integration with notifications (B16/B17)
- Fallback to polling if WebSocket fails

Non-goals:
- Full chat application (downstream can build)
- Video/audio streaming
- Complex CRDT for collaborative editing

[key user stories]
- As a user, I see notifications instantly without page refresh
- As a developer, I broadcast events to all users in an org
- As an operator, I monitor WebSocket connections and throughput
- As a product team, I build live features on this foundation

[constraints and assumptions]
- Django Channels 4.x with Redis channel layer
- WebSocket authentication via B05 JWT tokens
- Integrates with B06/B07 for org/project scoping
- Must degrade gracefully if WebSocket connection fails

[technical details]
- ASGI application with Channels routing
- Channel layer: Redis (same instance as B25 cache)
- Authentication middleware: JWT token from query param or cookie
- Broadcast patterns:
  - org-{id}: all users in organization
  - project-{id}: all users in project
  - user-{id}: specific user only
- Message types: notification, activity, presence, system
- Heartbeat: ping/pong every 30s, disconnect after 3 missed pongs

[demo requirements]
Demo page: /demo/realtime
- Connection status: green (connected), yellow (connecting), red (disconnected)
- Live activity feed: real-time list of events
- Online users: avatars of connected users in current org
- Test actions:
  - Upload file → see "User X uploaded file.pdf" in feed
  - Switch org → see different online users
  - Open 2 browsers → action in one → instant update in other
- Tests: verify <100ms latency for local events
```

---

### 36. B24 – Full-text Search Foundation

**Doel**
Full-text search via PostgreSQL + adapter pattern voor Elasticsearch (optional).

**Waarom agnostisch**
Search is universeel: users, orgs, projects, files, content.

**Wat moet er gebeuren**
- **Search adapter interface**: search(query, filters), index(document), delete(document_id)
- **PostgreSQL implementation**: Native full-text search with GIN indexes
- **Search index models**: Tenant-scoped search documents with metadata
- **Indexing signals**: Auto-index on create/update for User, Organisation, Project, FileAsset
- **Query API**: `/api/search?q=<query>&scope=<org|project|global>`
- **Elasticsearch adapter** (optional): Swappable via settings

**Demo Requirements**:
- 🔍 **Search Bar** in demo-shell:
  - Global search input in navbar
  - Instant results dropdown (as-you-type)
  - Results grouped by type (users, orgs, projects, files)
  - Click result → navigate to detail page
  - Tests: search "john" → see user "John Doe", search "sales" → see "Sales Project"

**Specify Prompt**

```
/spec-kitty.specify feature=B24-full-text-search-foundation

[feature summary]
Provide full-text search with PostgreSQL (default) and optional Elasticsearch adapter, with tenant-scoped indexing.

[goals and non-goals]
Goals:
- Search users, orgs, projects, files, content
- Adapter pattern for swappable backends
- Automatic indexing via signals
- Fast, relevant results
- Tenant-scoped search

Non-goals]
- Advanced NLP, stemming, language detection (backend-specific)
- Search analytics (separate module)
- Full Elasticsearch setup included (optional adapter)

[key user stories]
- As a user, I search for users/orgs/projects instantly
- As a developer, I add searchable models easily
- As an operator, I switch to Elasticsearch without code changes
- As security, I ensure cross-tenant search isolation

[constraints and assumptions]
- PostgreSQL with GIN indexes (ts_vector) as default
- Elasticsearch adapter optional (via SEARCH_BACKEND setting)
- Indexing via Django signals (post_save, post_delete)
- Search scope: user-specific, org-specific, project-specific, global

[technical details]
- Adapter interface: SearchBackend.search(query, filters), .index(doc), .delete(doc_id)
- PostgreSQL implementation:
  - SearchDocument model: content_type, object_id, search_vector (tsvector)
  - GIN index on search_vector
  - Rank by ts_rank
- Indexing: signals on User, Organisation, Project, FileAsset
- Query API: GET /api/search?q=<query>&scope=<org_id|project_id|global>&type=<user|org|project|file>
- Elasticsearch adapter: uses elasticsearch-dsl-py, same interface

[demo requirements]
Demo page: /demo/search + navbar search bar
- Search input in navbar
- As-you-type dropdown with instant results (<200ms)
- Results grouped:
  - Users: name, email, avatar
  - Organisations: name, description
  - Projects: name, org name
  - Files: filename, uploader, thumbnail
- Click result → navigate to detail page
- Tests:
  - Search "john" → see user "John Doe"
  - Search "sales" → see "Sales Project"
  - Search "invoice" → see "invoice.pdf" file
```

---

### 37. B27 – Workflow Engine & State Machine

**Doel**
Generic workflow/state machine voor business processes (approvals, order status, etc.).

**Waarom agnostisch**
Workflow patterns zijn herbruikbaar: approvals, onboarding, order processing.

**Wat moet er gebeuren**
- **Workflow models**: WorkflowDefinition, WorkflowInstance, WorkflowStep, Transition
- **State machine**: Define states, transitions, guards, actions
- **Task integration**: Auto-create tasks (B15) for manual steps
- **Notifications**: Trigger notifications (B16/B17) on state changes
- **Audit trail**: All transitions logged (B09)
- **API**: Start workflow, transition state, query current state

**Demo Requirements**:
- 🔄 **Approval Workflow Page** in demo-shell:
  - Document upload (via B22)
  - Submit for approval button → creates workflow instance
  - Status: Draft → Pending → Approved/Rejected
  - Approval action (for manager role)
  - History timeline showing all transitions
  - Tests: upload doc → submit → approve → see status change

**Specify Prompt**

```
/spec-kitty.specify feature=B27-workflow-engine-state-machine

[feature summary]
Provide a generic workflow engine for business processes with state machines, tasks, and notifications.

[goals and non-goals]
Goals:
- Reusable workflow patterns (approvals, onboarding, order processing)
- State machines with guards and actions
- Integration with tasks (B15) and notifications (B16/B17)
- Audit trail (B09) for all transitions
- Tenant-scoped workflows

Non-goals:
- Replace complex BPM engines (Camunda, Temporal)
- Visual workflow designer (downstream can build)
- Real-time collaboration on workflows

[key user stories]
- As a user, I submit a document for approval
- As a manager, I approve or reject pending items
- As an auditor, I see full history of workflow transitions
- As a developer, I define custom workflows easily

[constraints and assumptions]
- Integrates with B15 (tasks), B16/B17 (notifications), B09 (audit)
- State machine: django-fsm or custom implementation
- Tenant-scoped with ACL (B08) for who can transition
- Transitions can trigger async tasks (B15)

[technical details]
- Models:
  - WorkflowDefinition: name, states (JSON), transitions (JSON)
  - WorkflowInstance: definition, current_state, context (JSON), owner
  - WorkflowTransition: instance, from_state, to_state, actor, timestamp, reason
- State machine:
  - States: draft, pending, approved, rejected
  - Transitions: submit (draft→pending), approve (pending→approved), reject (pending→rejected)
  - Guards: can_approve (requires manager permission)
  - Actions: send_notification, create_task
- API:
  - POST /api/workflows/instances/ (start workflow)
  - POST /api/workflows/instances/<id>/transition/ (trigger transition)
  - GET /api/workflows/instances/<id>/ (get current state + history)

[demo requirements]
Demo page: /demo/workflows/approval
- Upload document (via B22)
- Submit button → creates WorkflowInstance in "draft" state → transition to "pending"
- Status badge: Draft (gray), Pending (yellow), Approved (green), Rejected (red)
- Action buttons (conditional on role):
  - Manager sees: Approve, Reject
  - User sees: Cancel (if draft)
- History timeline:
  - "User X submitted document on 2025-12-15 14:30"
  - "Manager Y approved on 2025-12-15 15:00"
- Tests:
  - As user: upload doc → submit → see "pending"
  - As manager: open pending doc → approve → see "approved"
  - Verify notification sent to user on approval
```

---

### 38. B26 – Payment Gateway Adapters

**Doel**
Multi-gateway payment integration (Stripe first, PayPal adapter) met webhook handling.

**Waarom agnostisch**
Payments zijn universeel: subscriptions, transactions, e-commerce.

**Wat moet er gebeuren**
- **Payment adapter interface**: charge(), refund(), list_payments(), handle_webhook()
- **Stripe implementation**: Stripe Checkout, Payment Intents, webhooks
- **PayPal adapter** (example): PayPal REST API integration
- **Payment models**: Payment, PaymentIntent, PaymentMethod (references B11 credits/transactions)
- **Webhook handlers**: Stripe webhook verification and processing
- **Security**: Signature verification, idempotency keys
- **Audit**: All payments logged (B09)

**Demo Requirements**:
- 💳 **Payment Page** in demo-shell:
  - Product/service selection
  - Payment form (Stripe Elements)
  - Test mode toggle (use Stripe test keys)
  - Payment status: pending → succeeded/failed
  - Receipt page after successful payment
  - Tests: fill form with test card (4242 4242 4242 4242) → submit → see success

**Specify Prompt**

```
/spec-kitty.specify feature=B26-payment-gateway-adapters

[feature summary]
Provide multi-gateway payment integration with Stripe (primary) and PayPal adapter, including webhook handling and audit trail.

[goals and non-goals]
Goals:
- Unified payment interface for any gateway
- Stripe integration with webhooks
- PayPal adapter as example
- Secure webhook verification
- Integration with B11 (credits/transactions)
- Audit trail (B09) for all payments

Non-goals:
- Complex subscription billing UI (use B11/F12)
- PCI compliance hosting (use Stripe/PayPal hosted forms)
- Cryptocurrency payments

[key user stories]
- As a user, I pay securely without leaving the platform
- As a developer, I switch payment providers without rewriting code
- As an operator, I monitor payment success/failure rates
- As security, I verify all webhooks are authentic

[constraints and assumptions]
- Stripe as primary gateway (most common)
- PayPal as optional secondary
- Webhook signatures MUST be verified
- Idempotency keys for retry safety
- Integrates with B11 for credits/transactions

[technical details]
- Adapter interface:
  - charge(amount, currency, customer, metadata) → PaymentIntent
  - refund(payment_id, amount, reason) → Refund
  - list_payments(customer_id, filters) → List[Payment]
  - handle_webhook(payload, signature) → Event
- Stripe implementation:
  - Uses stripe-python SDK
  - Checkout sessions for hosted forms
  - Payment Intents API for server-side
  - Webhooks: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
  - Signature verification via stripe.Webhook.construct_event()
- Models:
  - Payment: amount, currency, status, gateway, gateway_payment_id, user, org
  - PaymentIntent: gateway-specific intent data
  - PaymentMethod: saved cards/methods (references only, no storage)

[demo requirements]
Demo page: /demo/payments
- Product selection: "Premium Plan $99/mo" or "One-time Purchase $49"
- Payment form:
  - Stripe Elements (card input)
  - Test mode banner: "Use test card 4242 4242 4242 4242"
  - Amount display
  - Pay button
- Payment flow:
  - Click Pay → creates PaymentIntent → shows Stripe form
  - Submit card → processes payment → webhook updates status
  - Redirect to success page with receipt
- Success page:
  - "Payment successful!"
  - Receipt: amount, date, transaction ID
  - Download PDF receipt button (via B28)
- Tests:
  - Test card (success): 4242 4242 4242 4242 → see success
  - Test card (decline): 4000 0000 0000 0002 → see error
  - Verify webhook updates Payment status
```

---

## Fase 10: Advanced UI & Documents (039-042)

### 39. B28 – Document Generation (PDF/Excel)

**Doel**
PDF en Excel generatie voor reports, invoices, certificates, exports.

**Waarom agnostisch**
Document generation is universeel: reports, invoices, contracts, certificates.

**Wat moet er gebeuren**
- **PDF generation**: WeasyPrint or ReportLab
- **Excel generation**: openpyxl
- **Template system**: HTML→PDF templates, Excel templates
- **Async generation**: Large documents via B15 tasks
- **Storage**: Generated docs stored via B22
- **API**: POST /api/documents/generate (template, data) → download URL

**Demo Requirements**:
- 📄 **PDF Export Button** on demo pages:
  - "Export as PDF" button on any detail page
  - Generates PDF with logo, data, timestamp
  - Downloads automatically
  - Tests: click export → see PDF → verify content

**Specify Prompt**

```
/spec-kitty.specify feature=B28-document-generation-pdf-excel

[feature summary]
Provide PDF and Excel document generation from templates for reports, invoices, and exports.

[goals and non-goals]
Goals:
- Generate PDF from HTML templates
- Generate Excel from data
- Async generation for large documents
- Store in B22 file storage
- Template customization per tenant

Non-goals:
- Advanced PDF editing (use external tools)
- Complex charts/graphs (use libraries in templates)
- Real-time collaborative document editing

[key user stories]
- As a user, I export reports as PDF
- As an admin, I generate invoices automatically
- As a developer, I create document templates easily
- As compliance, I generate evidence packs

[constraints and assumptions]
- WeasyPrint for PDF (HTML→PDF)
- openpyxl for Excel
- Templates in Django template system
- Large documents generated async via B15
- Generated files stored via B22

[technical details]
- PDF generation:
  - Engine: WeasyPrint (supports CSS, images, fonts)
  - Templates: Django HTML templates with special PDF CSS
  - Example: invoice.html, report.html
- Excel generation:
  - Engine: openpyxl
  - Data: list of dicts or queryset
  - Styling: basic cell formatting, freeze panes
- API:
  - POST /api/documents/generate
    - Body: {template: "invoice", format: "pdf", data: {...}}
    - Response: {task_id: "123"} (if async) or {download_url: "..."} (if sync)
  - GET /api/documents/tasks/<task_id> → check status
  - GET /api/documents/download/<file_id> → download file
- Async: documents >1MB generated via B15 Celery task

[demo requirements]
Demo: "Export as PDF" button on multiple pages
- User detail page: export user profile as PDF
- Organisation page: export org report with member list
- Project page: export project summary
- Payment receipt page: export receipt as PDF
- Tests:
  - Click "Export as PDF" on user page → downloads user-profile.pdf
  - Open PDF → verify: logo, user name, email, joined date, timestamp
  - Excel test: export org members as Excel → verify columns
```

---

### 40. F14 – Admin Panel Components

**Doel**
User-friendly admin panel components voor content management (users, orgs, projects).

**Waarom agnostisch**
Admin/management UI patterns zijn universeel herbruikbaar.

**Wat moet er gebeuren**
- **Admin layout**: Sidebar navigation, breadcrumbs, actions bar
- **Data tables**: Sortable, filterable, paginated tables (react-table or TanStack Table)
- **CRUD forms**: Auto-generated forms from schemas
- **Bulk actions**: Select multiple → bulk delete/edit
- **Permissions**: Show/hide actions based on B08 permissions
- **Integration**: Uses F01 design system components

**Demo Requirements**:
- ⚙️ **Admin Panel** in demo-shell:
  - Users management: list, create, edit, delete, bulk actions
  - Organisations management: list, create, edit, delete
  - Projects management: list, create, edit, delete
  - Permissions: only admins see this page
  - Tests: create user → edit user → delete user

**Specify Prompt**

```
/spec-kitty.specify feature=F14-admin-panel-components

[feature summary]
Provide user-friendly admin panel components for managing users, organisations, projects, and other entities.

[goals and non-goals]
Goals:
- Reusable admin layout and navigation
- Data tables with sort/filter/pagination
- CRUD forms with validation
- Bulk actions (select multiple, bulk delete/edit)
- Permission-based visibility (B08)
- Uses F01 design system

Non-goals:
- Replace Django admin entirely (optional alternative)
- Complex workflow designers
- Business intelligence dashboards

[key user stories]
- As an admin, I manage users/orgs/projects visually
- As a power user, I perform bulk operations
- As a developer, I add new admin pages easily
- As security, I ensure only authorized users access admin

[constraints and assumptions]
- Built on F01 design system
- Uses F06 page templates (app shell with sidebar)
- Integrates with B08 for permission checks
- Client-side routing (React Router or similar)

[technical details]
- Package: @django-core/admin-panel
- Components:
  - AdminLayout: sidebar, topbar, content area
  - DataTable: TanStack Table with sorting, filtering, pagination
  - CRUDForm: auto-generates form from JSON schema
  - BulkActions: select checkbox, bulk action dropdown
  - PermissionGate: renders children only if user has permission
- Navigation:
  - /admin/users (list, create, edit, delete)
  - /admin/organisations (list, create, edit, delete)
  - /admin/projects (list, create, edit, delete)
  - /admin/files (list, delete)
  - /admin/payments (list, refund)
- Bulk actions:
  - Select multiple users → bulk delete, bulk disable, bulk assign role
- Permission checks:
  - AdminLayout only renders if user.is_staff or has admin permission
  - Actions (edit, delete) check B08 permissions per entity

[demo requirements]
Demo page: /admin (requires staff or admin role)
- Sidebar navigation: Users, Organisations, Projects, Files, Payments
- Users page:
  - Table: columns (name, email, role, status, actions)
  - Sort by name, email, created_at
  - Filter by role, status
  - Pagination: 25 per page
  - Actions per row: Edit, Delete
  - Bulk actions: select checkboxes → Bulk Delete, Bulk Disable
  - Create User button → form modal
- Tests:
  - Login as admin → see admin panel
  - Create user → form validation → submit → user appears in table
  - Edit user → change email → save → verify change
  - Bulk delete: select 3 users → delete → confirm → gone
```

---

### 41. F11 – Operations Console UI

**Doel**
Ops console voor monitoring: jobs, imports, workflows, agent runs, errors.

**Waarom agnostisch**
Operational visibility patterns zijn universeel.

**Wat moet er gebeuren**
- **Dashboard**: Overview van runs/jobs/errors across modules
- **Detail pages**: Per run type (ingestion, workflow, agent, payment)
- **Actions**: Retry failed runs, cancel running jobs
- **Filters**: By tenant, status, time range, owner
- **Logs viewer**: Redacted logs (respects D06 policies)
- **Integration**: Calls B15/B22/B27/D14 APIs

**Demo Requirements**:
- 🖥️ **Ops Console Page** in demo-shell:
  - Dashboard: cards showing counts (pending jobs, failed runs, active workflows)
  - Job list: table with status, start time, duration, actions
  - Detail view: logs, retry button, cancel button
  - Tests: trigger failed job → see in console → retry → see success

**Specify Prompt**

```
/spec-kitty.specify feature=F11-operations-console-ui

[feature summary]
Provide operations console UI for monitoring and managing jobs, imports, workflows, payments, and agent runs.

[goals and non-goals]
Goals:
- Unified ops dashboard across all async operations
- Retry/cancel actions for failed/running jobs
- Redacted logs viewer (respects D06 policies)
- Filtering by tenant, status, time
- Real-time updates via B23 WebSocket

Non-goals:
- Replace full observability platforms (Grafana, Datadog)
- Custom alerting rules (use external tools)
- Log aggregation across multiple servers

[key user stories]
- As an operator, I see all failed jobs and retry them
- As a support agent, I investigate user issues via logs
- As a developer, I monitor my background tasks
- As security, I ensure logs are redacted

[constraints and assumptions]
- Built on F01 design system, F06 page templates
- Calls backend APIs from B15/B22/B27/B26/D14
- Logs fetched via API, redacted server-side (D06)
- Real-time updates via B23 WebSocket

[technical details]
- Package: @django-core/ops-console
- Pages:
  - /ops (dashboard overview)
  - /ops/jobs (B15 tasks)
  - /ops/workflows (B27 workflow instances)
  - /ops/payments (B26 payment intents)
  - /ops/agents (D14 agent runs, if implemented)
- Dashboard cards:
  - Jobs: total, running, failed, succeeded (last 24h)
  - Workflows: active, pending approval, completed
  - Payments: total amount, success rate, failed count
- Job list table:
  - Columns: ID, Type, Status, Owner, Org, Started, Duration, Actions
  - Filters: status (all/pending/running/failed/succeeded), time range, org, project
  - Actions per row: View Details, Retry (if failed), Cancel (if running)
- Detail view:
  - Job metadata: ID, type, status, owner, org, project, started, duration
  - Logs: scrollable log viewer with syntax highlighting, redacted
  - Actions: Retry, Cancel, Download Logs
  - Real-time updates: status changes via WebSocket

[demo requirements]
Demo page: /ops
- Dashboard:
  - 4 cards: Jobs (15 total, 2 failed), Workflows (3 active), Payments ($1,250 today), Files (45 uploaded)
  - Charts: jobs over time (line chart), payment success rate (donut chart)
- Jobs page:
  - Table with sample jobs:
    - Job #123: file_upload, succeeded, 2s duration
    - Job #124: pdf_generation, failed, 15s duration
    - Job #125: payment_intent, running, 3s elapsed
  - Click Job #124 (failed) → detail view:
    - Logs: "Error: WeasyPrint missing dependency cairo"
    - Retry button → POST /api/jobs/124/retry → status changes to "pending"
- Real-time test:
  - Trigger new job from another page → see it appear in ops console instantly
- Tests:
  - Filter by status=failed → see only Job #124
  - Retry Job #124 → verify status changes
  - Cancel running job → verify stops
```

---

### 42. F12 – Billing & Usage UI

**Doel**
UI voor usage tracking, credits, billing history (gebruikt B11 backend).

**Waarom agnostisch**
Billing/usage patterns zijn universeel voor SaaS.

**Wat moet er gebeuren**
- **Usage dashboard**: Charts showing credits used, API calls, storage
- **Billing history**: Table met transactions, invoices, payments
- **Credit management**: Buy credits, view balance, alerts
- **Usage limits**: Warnings when approaching limits
- **Integration**: B11 (credits/transactions), B26 (payments)

**Demo Requirements**:
- 💰 **Billing Page** in demo-shell:
  - Current balance card
  - Usage charts (API calls, storage, file uploads over time)
  - Buy credits button → payment flow (B26)
  - Transaction history table
  - Tests: view usage → buy credits → see balance update

**Specify Prompt**

```
/spec-kitty.specify feature=F12-billing-usage-ui

[feature summary]
Provide billing and usage UI for credits, transactions, usage tracking, and payment history.

[goals and non-goals]
Goals:
- Visual usage dashboard (API calls, storage, credits)
- Buy credits flow (via B26)
- Billing history and invoices
- Usage alerts when approaching limits
- Per-org billing visibility

Non-goals:
- Complex invoicing logic (use B11 backend)
- Multi-currency support (phase 2)
- Tax calculations (use external service)

[key user stories]
- As a user, I see my current credit balance and usage
- As an admin, I buy credits for my organisation
- As finance, I export billing history
- As a developer, I monitor API usage trends

[constraints and assumptions]
- Built on F01 design system, F06 page templates
- Uses B11 backend APIs for credits/transactions
- Payment via B26 (Stripe)
- Charts via recharts or Chart.js

[technical details]
- Package: @django-core/billing-ui
- Pages:
  - /billing (overview dashboard)
  - /billing/usage (detailed usage charts)
  - /billing/transactions (history table)
  - /billing/buy-credits (payment flow)
- Dashboard:
  - Current balance card: "1,250 credits remaining"
  - Usage this month: API calls (12,345), Storage (2.3 GB), File uploads (234)
  - Charts: line charts for usage over time (last 30 days)
  - Buy Credits button → modal with packages (100 credits $10, 500 credits $45, etc.)
- Transaction history:
  - Table: Date, Description, Amount, Balance After, Invoice
  - Filters: date range, type (purchase/usage/refund)
  - Export CSV button
- Buy credits flow:
  - Select package → redirects to B26 payment page → payment success → credits added → B17 notification sent

[demo requirements]
Demo page: /billing
- Dashboard:
  - Balance card: "1,250 credits" (green if >500, yellow if <500, red if <100)
  - Usage cards: "12,345 API calls this month", "2.3 GB storage", "234 files uploaded"
  - Charts: line chart showing API calls per day (last 30 days)
  - Buy Credits button
- Buy credits flow:
  - Click Buy Credits → modal with packages:
    - Starter: 100 credits - $10
    - Pro: 500 credits - $45 (save 10%)
    - Enterprise: 2,000 credits - $160 (save 20%)
  - Select Pro → Continue → redirect to B26 payment page
  - Complete payment → redirect back to /billing → see new balance: 1,750 credits
  - Notification: "Credits added: 500 credits purchased"
- Transaction history:
  - Table with sample transactions:
    - 2025-12-15: Credits purchased, +500, 1,750
    - 2025-12-14: API usage, -15, 1,250
    - 2025-12-13: File upload, -2, 1,265
  - Export CSV button → downloads transactions.csv
- Tests:
  - View usage charts → verify data
  - Buy credits → complete payment → verify balance update
  - Export CSV → verify file content
```

---

*Modules 043-066 (Data Foundations, ML/AI, Platform Gates, Integration, Operations) volgen hierna...*

**Total New Modules: 12 (032-042) + 24 (043-066) = 36 new modules**

**Total Platform: 30 existing + 36 new = 66 modules across 16 phases**
