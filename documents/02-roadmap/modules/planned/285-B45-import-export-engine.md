# B45: Import/Export Engine

**Phase:** 13
**Status:** 📋 ROADMAP
**Module ID:** 285
**Category:** Backend

## Description

## 285. B45 – Import/Export Engine

**Doel**: Bulk data import (CSV, Excel, JSON) en async export jobs met voortgangsrapportage.

**Waarom agnostisch**: Data import/export is universeel - user migration, bulk updates, reporting.

**Wat moet er gebeuren**:
- **ImportJob model**:
  - Fields: file (FK to B22), format, status, progress_percent
  - Mapping: column_mapping (JSON), validation_errors (JSON)
  - Stats: total_rows, processed_rows, success_count, error_count
  - Owner: user, organisation/project context
- **ExportJob model**:
  - Fields: export_type, filters (JSON), format, status
  - Output: file (FK to B22), download_url, expires_at
  - Stats: total_records, exported_records
- **Import formats**:
  - CSV (with delimiter detection)
  - Excel (.xlsx, .xls)
  - JSON (array of objects)
- **Export formats**:
  - CSV, Excel, JSON
  - PDF (for reports, via B38)
- **Import workflow**:
  1. Upload file → validate format
  2. Column mapping UI (preview first N rows)
  3. Dry-run validation
  4. Execute import (async via Celery)
  5. Error report generation
- **Export workflow**:
  1. Select data type + filters
  2. Choose format + columns
  3. Queue job (async)
  4. Download link via email/notification
- **Registry pattern**:
  - Importable/Exportable model registration
  - Field mapping configuration per model
- **Integration**: B15 (Celery), B22 (files), B17 (notifications)

**Scope**: 🔧 **Backend Only** (Django app + REST API + tests + README)

**API Endpoints**:
- `POST /api/v1/imports/` - Start import job
- `GET /api/v1/imports/{id}/` - Get import status
- `POST /api/v1/imports/{id}/preview/` - Preview with mapping
- `POST /api/v1/imports/{id}/execute/` - Execute import
- `POST /api/v1/exports/` - Start export job
- `GET /api/v1/exports/{id}/` - Get export status + download URL

**Status**: 📋 ROADMAP

## Notes
<!-- Add progress notes here -->
