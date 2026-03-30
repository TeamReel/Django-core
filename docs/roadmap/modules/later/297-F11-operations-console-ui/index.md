# Fase 12: Advanced UI

## 52. F11 – Operations Console UI

**Doel**: Operations console voor monitoring van background jobs, imports, workflows, agent runs, errors.

**Waarom agnostisch**: Operations monitoring is universeel - watch jobs, debug errors, review logs.

**Wat moet er gebeuren**:
- Job Monitoring (real-time status, logs, retry/cancel actions)
- Metrics Dashboard (success/fail rates, duration charts via F08)
- Audit Log Viewer (filterable, detail views via B09)
- Workflow Inspector (state machine visualizer via B37)
- Error Aggregation (grouped errors, stack traces)

**Demo Requirements**:
-  **Ops Console** (`/ops`): Dashboard  job list  detail views  retry/cancel
- Tests: view dashboard  filter jobs  retry failed job  verify

**Status**:  ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=F11-operations-console

[feature summary]
Operations console for monitoring background jobs, workflows, and errors.

[goals]
- Job monitoring with real-time updates (WebSocket via B23)
- Metrics dashboard with charts (F08)
- Audit log viewer (B09 integration)
- Workflow inspector (B37 integration)
- Error aggregation

[demo requirements]
Demo page: /ops
- Dashboard with job metrics
- Job list with filters
- Retry/cancel actions
- Log streaming
- Export audit logs to CSV
```

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
