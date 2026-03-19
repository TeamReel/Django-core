# Phase 12: Workflows & Payments (251-253)

**Focus**: Workflow engine, payment gateways, advanced reporting

---

## [B36: Payment Gateway Adapters](../modules/backlog/251-B36-payment-gateway-adapters/index.md)

**Goal**: Multi-gateway payment integration (Stripe first, PayPal adapter) met webhook handling.

**Waarom agnostisch**: Payment processing is universeel - subscriptions, credits purchase, invoicing.

**Wat moet er gebeuren**:
- **Payment gateway adapter pattern**: `PaymentGateway` interface
  - Implementations: `StripeGateway`, `PayPalGateway`, `MollieGateway` (future)
  - Methods: `create_payment_intent`, `capture_payment`, `refund_payment`, `get_payment_status`
- **Stripe integration** (primary):
  - Stripe Elements (frontend component for card input)
  - Payment Intents API (backend handling)
  - Webhook handling (payment success, failure, refund)
  - Customer management (save cards, recurring billing)
- **PayPal integration** (secondary, optional):
  - PayPal SDK integration
  - Express Checkout flow
  - Webhook handling (IPN notifications)
- **Transaction model**: Store payment metadata
  - Fields: gateway, transaction_id, amount, currency, status, metadata (JSON)
  - Foreign keys: user, organisation (payer)
  - Audit trail via B09 (payment_created, payment_captured, payment_refunded)
- **Webhook security**: Signature verification
  - Validate webhook signatures (Stripe: `stripe.Webhook.construct_event`)
  - Reject unsigned webhooks
  - Idempotency (handle duplicate webhooks)
- **Credit purchase flow**:
  - User selects credit package (100, 500, 1000 credits)
  - Creates payment intent
  - Frontend shows Stripe Elements card input
  - User completes payment
  - Webhook triggers credit addition (B11 integration)

**Demo Requirements**:
- 💳 **Payment Page** (`/demo/payments`):
  - Credit packages (100/500/1000 credits, €10/€40/€80)
  - Stripe Elements card input (test mode, card: 4242 4242 4242 4242)
  - Payment button (create intent → capture payment)
  - Success/error messages
  - Transaction history (list of past payments)
  - Receipt download (PDF via B38)
  - Tests: select package → enter test card → pay → verify credits added

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B36-payment-gateway-adapters

[feature summary]
Multi-gateway payment integration (Stripe, PayPal) with webhook handling and credit purchase flow.

[goals]
- Payment gateway adapter pattern
- Stripe integration (primary)
- PayPal integration (optional)
- Webhook handling + signature verification
- Credit purchase flow (B11 integration)

[demo requirements]
Demo page: /demo/payments
- Credit packages (100/500/1000)
- Stripe Elements card input
- Payment flow (intent → capture)
- Transaction history
- Receipt download
- Tests: purchase credits → verify payment → check balance
```

---

## [B37: Workflow Engine & State Machine](../modules/backlog/252-B37-workflow-engine-and-state-machine/index.md)

**Goal**: Generic workflow/state machine voor business processes (approvals, order status, etc.).

**Waarom agnostisch**: Workflows zijn universeel - document approval, project status, user onboarding, order fulfillment.

**Wat moet er gebeuren**:
- **Workflow model**: Define workflows in database
  - Fields: name, description, states (JSON), transitions (JSON)
  - States: e.g., `["draft", "submitted", "approved", "rejected"]`
  - Transitions: e.g., `{"draft → submitted": "submit", "submitted → approved": "approve"}`
- **WorkflowInstance model**: Track instance progress
  - Fields: workflow (FK), current_state, context (JSON), created_by, updated_at
  - Foreign keys: content_type, object_id (generic FK to any model, e.g., Project)
- **State transitions**: Enforce rules
  - Validate transition (is "draft → approved" allowed? No, must go via "submitted")
  - Permission checks (only admins can "approve")
  - Action hooks (on transition, trigger B15 background task)
- **Workflow actions**: Custom logic per transition
  - `on_enter_state`: Run logic when entering state (e.g., send notification)
  - `on_exit_state`: Run logic when leaving state (e.g., audit log)
  - `on_transition`: Run logic during transition (e.g., validate data)
- **Visual workflow builder** (optional, future): UI to design workflows
  - Drag-and-drop state nodes
  - Draw transition arrows
  - Configure actions per transition
- **Integration**: Audit trail (B09), notifications (B16), background tasks (B15)

**Demo Requirements**:
- 🔄 **Approval Workflow** (`/demo/workflows/approval`):
  - Document approval flow (draft → submitted → approved/rejected)
  - Current state indicator (visual progress bar)
  - Transition buttons (e.g., "Submit for Approval", "Approve", "Reject")
  - History (list of past transitions with timestamps)
  - Permission checks (only admins see "Approve" button)
  - Tests: create document → submit → approve → verify state changes

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B37-workflow-engine-state-machine

[feature summary]
Generic workflow/state machine for business processes (approvals, status transitions).

[goals]
- Workflow model (states, transitions)
- WorkflowInstance model (track progress)
- State transition enforcement (validation, permissions)
- Action hooks (on_enter, on_exit, on_transition)
- Integration (B09 audit, B16 notifications, B15 tasks)

[demo requirements]
Demo page: /demo/workflows/approval
- Document approval flow (draft → submitted → approved/rejected)
- State indicator (progress bar)
- Transition buttons (submit, approve, reject)
- History (past transitions)
- Permission checks
- Tests: create → submit → approve → verify state
```

---

## [B38: Advanced Reporting & Exports](../modules/backlog/253-B38-advanced-reporting-and-exports/index.md)

**Goal**: Genereer PDF/Excel reports, data exports met templates en scheduling.

**Waarom agnostisch**: Reporting is universeel - analytics reports, invoices, user data exports, compliance reports.

**Wat moet er gebeuren**:
- **Report templates**: Define report structure
  - PDF templates (WeasyPrint or ReportLab)
  - Excel templates (openpyxl or xlsxwriter)
  - HTML templates (for PDF rendering)
- **Report types**: Predefined + custom
  - Predefined: Usage Report, Credit History, Audit Log Export, User List
  - Custom: User-defined SQL queries (admin only, sandboxed)
- **Data sources**: Query models for report data
  - ORM queries (filter by date range, org, user)
  - Aggregate functions (SUM, COUNT, AVG)
  - Join multiple models (e.g., User + Organisation + Projects)
- **Rendering**:
  - PDF: WeasyPrint (HTML → PDF, supports CSS)
  - Excel: openpyxl (write XLSX files)
  - CSV: Native Python (simple, fast)
- **Scheduling**: Generate reports on schedule (B15 integration)
  - Daily/weekly/monthly reports
  - Email delivery (via B16)
  - Store in B22 (file storage)
- **Permissions**: Only org admins can generate org reports
  - Superusers can generate platform-wide reports
  - Regular users can only generate their own reports

**Demo Requirements**:
- 📊 **Reports Page** (`/demo/reports`):
  - Report type selector (Usage, Credits, Audit Log, Users)
  - Date range picker (from/to)
  - Format selector (PDF, Excel, CSV)
  - Generate button (async via B15, shows progress)
  - Download link (when ready)
  - Scheduled reports list (view, edit, delete)
  - Tests: select report → generate → download → verify content

**Status**: 🚧 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B38-advanced-reporting-exports

[feature summary]
Generate PDF/Excel reports and data exports with templates and scheduling.

[goals]
- Report templates (PDF, Excel, CSV)
- Predefined report types (usage, credits, audit log)
- Custom reports (SQL queries, admin only)
- Scheduling (daily/weekly/monthly)
- Integration (B15 tasks, B16 email, B22 storage)

[demo requirements]
Demo page: /demo/reports
- Report type selector
- Date range picker
- Format selector (PDF/Excel/CSV)
- Generate button (async)
- Download link
- Scheduled reports list
- Tests: generate report → download → verify content
```

---

**Phase 12 Complete**: 3 modules (B36, B37, B38)
**Next**: Phase 13 - Advanced UI & Documents
