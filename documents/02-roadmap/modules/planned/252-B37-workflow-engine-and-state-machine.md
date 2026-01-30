# Fase 12: Workflows & Payments

## 49. B37 – Workflow Engine & State Machine

**Doel**: Generic workflow/state machine voor business processes (approvals, order status, etc.).

**Waarom agnostisch**: Workflows zijn universeel - document approval, project status, user onboarding, order fulfillment.

**Wat moet er gebeuren**:
- **Workflow model**: Define workflows in database
  - Fields: name, description, states (JSON), transitions (JSON)
  - States: e.g., ["draft", "submitted", "approved", "rejected"]
  - Transitions: e.g., {"draft → submitted": "submit", "submitted → approved": "approve"}
- **WorkflowInstance model**: Track instance progress
  - Fields: workflow (FK), current_state, context (JSON), created_by, updated_at
  - Foreign keys: content_type, object_id (generic FK to any model, e.g., Project)
- **State transitions**: Enforce rules
  - Validate transition (is "draft → approved" allowed? No, must go via "submitted")
  - Permission checks (only admins can "approve")
  - Action hooks (on transition, trigger B15 background task)
- **Workflow actions**: Custom logic per transition
  - on_enter_state: Run logic when entering state (e.g., send notification)
  - on_exit_state: Run logic when leaving state (e.g., audit log)
  - on_transition: Run logic during transition (e.g., validate data)
- **Visual workflow builder** (optional, future): UI to design workflows
- **Integration**: Audit trail (B09), notifications (B16), background tasks (B15)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)
- No frontend/demo page required per Constitution
- Frontend integration is downstream product responsibility

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

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
```
