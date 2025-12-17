# Fase 12: Advanced UI (044-047)

**Focus**: Admin panel, operations console, billing UI, frontend form components

---

## 44. F14 – Admin Panel Components

**Feature**: `F14-admin-panel-components`

**Doel**: Herbruikbare admin panel componenten voor content management (users, organisations, projects).

**Package**: `@django-core/admin-panel`

**Dependencies**:
- `@django-core/design-system` (F01) - core components
- `@django-core/auth` (F02) - authentication state
- Backend: B05 (auth), B06 (orgs), B07 (projects), B08 (permissions)

**Core Componenten**:
- `AdminTable` - Sorteerbare tabel met bulk actions, filtering, pagination
- `AdminForm` - Auto-generated forms met validatie
- `AdminPanel` - Layout wrapper met sidebar navigation
- `BulkActions` - Multi-select met actions (delete, export, change status)
- `QuickFilters` - Predefined filters voor common queries

**Demo Page**: ⚙️ `/admin` - Users/orgs/projects management, CRUD operations, bulk actions

**Acceptance Criteria**:
- [ ] AdminTable met 100+ items rendert <200ms
- [ ] Bulk actions op 50+ items completeert <1s
- [ ] AdminForm auto-generates van TypeScript interfaces
- [ ] Permission checks integreren met B08
- [ ] Mobile-responsive admin views

---

## 45. F11 – Operations Console UI

**Feature**: `F11-operations-console`

**Doel**: Operations console voor monitoring van background jobs, imports, workflows, agent runs, errors.

**Package**: `@django-core/ops-console`

**Dependencies**:
- `@django-core/design-system` (F01)
- `@django-core/data-viz` (F08) - charts voor metrics
- Backend: B09 (audit), B15 (background tasks), B27 (workflows)

**Core Features**:
- **Job Monitoring**: Real-time status, logs, retry/cancel actions
- **Metrics Dashboard**: Success/fail rates, duration charts, error trends
- **Audit Log Viewer**: Filterable audit events met detail views
- **Workflow Inspector**: State machine visualizer, transition history
- **Error Aggregation**: Grouped errors met stack traces

**Demo Page**: 🖥️ `/ops` - Dashboard, job list, detail views, retry/cancel actions

**Acceptance Criteria**:
- [ ] Dashboard met 1000+ jobs rendert <500ms
- [ ] Real-time updates via WebSocket (B23)
- [ ] Log streaming voor active jobs
- [ ] Retry/cancel operations werken via B15 API
- [ ] Export audit logs naar CSV

---

## 46. F12 – Billing & Usage UI

**Feature**: `F12-billing-usage-ui`

**Doel**: User-facing UI voor usage tracking, credits, billing history, payment methods.

**Package**: `@django-core/billing-ui`

**Dependencies**:
- `@django-core/design-system` (F01)
- `@django-core/data-viz` (F08) - usage charts
- Backend: B11 (billing), B26 (payments)

**Core Features**:
- **Usage Dashboard**: Charts voor API calls, storage, compute credits
- **Credit Purchase Flow**: Integration met B26 payment gateways
- **Billing History**: Transaction list, invoices, payment methods
- **Usage Alerts**: Threshold warnings, auto-top-up configuration
- **Invoice Downloads**: PDF generation via B28

**Demo Page**: 💰 `/billing` - Usage charts, buy credits flow, transaction history

**Acceptance Criteria**:
- [ ] Usage charts tonen real-time data (max 5s delay)
- [ ] Credit purchase flow integreert met Stripe (B26)
- [ ] Invoice PDFs genereren <2s (B28)
- [ ] Multi-currency support
- [ ] Usage export naar CSV/Excel

---

## 47. F15 – Frontend Form Components

**Feature**: `F15-frontend-form-components`

**Doel**: Advanced form components - multi-step wizards, conditional fields, auto-save, validation.

**Package**: `@django-core/forms`

**Dependencies**:
- `@django-core/design-system` (F01) - base components
- `react-hook-form` - form state management
- `zod` - schema validation

**Core Components**:
- `MultiStepForm` - Wizard met progress indicator, step validation
- `ConditionalFields` - Show/hide fields gebaseerd op andere values
- `AutoSaveForm` - Debounced auto-save naar backend
- `FileUploadField` - Drag-drop upload met progress (integreert met B22)
- `RichTextField` - Wrapper voor F13 TipTap editor

**Demo Page**: 📋 `/demo/forms` - Multi-step wizard, validation demos, auto-save example

**Acceptance Criteria**:
- [ ] Multi-step forms met 10+ stappen werken smooth
- [ ] Auto-save triggert max 1x per 2 seconden
- [ ] Client-side validatie met Zod schemas
- [ ] Server-side error mapping naar form fields
- [ ] Accessibility: keyboard navigation, screen readers

---

**Fase 12 Compleet**: Admin panel, ops console, billing UI, form components - **71 Modules Total**
