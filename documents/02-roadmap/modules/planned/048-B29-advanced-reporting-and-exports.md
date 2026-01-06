# Fase 12: Workflows & Payments

## 48. B29 – Advanced Reporting & Exports

**Doel**: Genereer PDF/Excel reports, data exports met templates en scheduling.

**Waarom agnostisch**: Reporting is universeel - analytics reports, invoices, user data exports, compliance reports.

**Wat moet er gebeuren**:
- Report templates (PDF via WeasyPrint, Excel via openpyxl, CSV)
- Predefined report types (Usage, Credits, Audit Log, Users)
- Custom reports (SQL queries, admin only, sandboxed)
- Scheduling via B15 (daily/weekly/monthly)
- Email delivery via B16, storage via B22

**Demo Requirements**:
-  **Reports Page** (`/demo/reports`): Select report type  date range  format  generate (async)  download
- Tests: generate report  download  verify content

**Status**:  ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B29-advanced-reporting-exports

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
- Tests: generate report  download  verify content
```
