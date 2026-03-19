````markdown
# B45: Import/Export & Reporting

**Priority:** ⏳ Later
**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 326
**Category:** Backend
**Merged from:** B38 (Advanced Reporting & Exports) + B45 (Import/Export Engine)

## Description

## 324. B45 – Import/Export & Reporting

**Doel**: Bulk data import (CSV, Excel, JSON), async export jobs met voortgangsrapportage, en gestructureerde report-generatie (PDF/Excel).

**Waarom agnostisch**: Data import/export en reporting zijn universeel — user migration, bulk updates, analytics reports, compliance exports.

**Wat moet er gebeuren**:

### Import Engine
- **ImportJob model**:
  - Fields: file (FK to B22), format, status, progress_percent
  - Mapping: column_mapping (JSON), validation_errors (JSON)
  - Stats: total_rows, processed_rows, success_count, error_count
  - Owner: user, organisation/project context
- **Import formats**: CSV (delimiter detection), Excel (.xlsx/.xls), JSON
- **Import workflow**:
  1. Upload file → validate format
  2. Column mapping (preview first N rows)
  3. Dry-run validation
  4. Execute import (async via Celery)
  5. Error report generation

### Export Engine
- **ExportJob model**:
  - Fields: export_type, filters (JSON), format, status
  - Output: file (FK to B22), download_url, expires_at
  - Stats: total_records, exported_records
- **Export formats**: CSV, Excel, JSON, PDF (for reports)
- **Export workflow**:
  1. Select data type + filters
  2. Choose format + columns
  3. Queue job (async via Celery)
  4. Download link via email/notification

### Report Generation (uit B38)
- Report templates (PDF via WeasyPrint, Excel via openpyxl, CSV)
- Predefined report types: Usage, Credits, Audit Log, Users
- Custom reports (SQL queries, admin only, sandboxed)
- Scheduling via B15 (daily/weekly/monthly)
- Email delivery via B16, storage via B22

### Registry Pattern
- Importable/Exportable model registration
- Field mapping configuration per model

### Integration
- B15 (Celery async), B22 (file storage), B16 (email delivery), B17 (notifications)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `POST /api/v1/imports/` — Start import job
- `GET /api/v1/imports/{id}/` — Get import status
- `POST /api/v1/imports/{id}/preview/` — Preview with mapping
- `POST /api/v1/imports/{id}/execute/` — Execute import
- `POST /api/v1/exports/` — Start export job
- `GET /api/v1/exports/{id}/` — Get export status + download URL
- `GET /api/v1/reports/` — List available report types
- `POST /api/v1/reports/generate/` — Generate report

**Status**: 📋 ROADMAP

## Notes
- Samenvoeging van B38 (Advanced Reporting & Exports) en B45 (Import/Export Engine)
- B38 focuste op reporting, B45 op import/export — samen één coherent systeem

---

## Delivery Checklist

- [ ] **Migrations**: Applied to Railway (production-safe)
- [ ] **Seed Data**: Fixtures/factories created for testing
- [ ] **Admin**: Registered & configured in Django Admin
- [ ] **API**: Endpoints tested in Swagger/OpenAPI
- [ ] **Demo Integration**: Visible in demo app (if applicable)
- [ ] **Manual Test**: Test file completed in `documents/08-testing/manual-tests/`
- [ ] **Documentation**: README updated with usage examples
````
