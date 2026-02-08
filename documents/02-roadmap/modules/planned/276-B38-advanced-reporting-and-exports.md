# Fase 12: Workflows & Payments

## 50. B38 – Advanced Reporting & Exports

**Doel**: Genereer PDF/Excel reports, data exports met templates en scheduling.

**Waarom agnostisch**: Reporting is universeel - analytics reports, invoices, user data exports, compliance reports.

**Wat moet er gebeuren**:
- Report templates (PDF via WeasyPrint, Excel via openpyxl, CSV)
- Predefined report types (Usage, Credits, Audit Log, Users)
- Custom reports (SQL queries, admin only, sandboxed)
- Scheduling via B15 (daily/weekly/monthly)
- Email delivery via B16, storage via B22

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)
- No frontend/demo page required per Constitution
- Frontend integration is downstream product responsibility

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

[scope]
Backend only - Django app, REST API, pytest tests, README
No frontend/demo pages (downstream product responsibility)
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
