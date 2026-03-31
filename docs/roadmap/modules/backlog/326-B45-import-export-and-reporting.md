# 326 — B45 — Import/Export & Reporting

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (Data Management) |
| Impact | 🟡 important |
| Effort | ~30 uur |

## Wat

Bulk data import (CSV, Excel, JSON) met column mapping en dry-run validatie, async export jobs met voortgangsrapportage, en gestructureerde report-generatie (PDF via WeasyPrint, Excel via openpyxl). ImportJob en ExportJob models met Celery-based async processing, error reporting, en download links via email/notification.

## Waarom belangrijk

Clubs hebben bestaande data: ledenlijsten in Excel, wedstrijdprogramma's in CSV. Handmatig invoeren van 200 leden is een dealbreaker. Import maakt onboarding schaalbaar. Export is essentieel voor GDPR (data portability), bestuursvergaderingen (rapporten), en sponsorgesprekken (usage statistics).

## Past in TeamReel / CoreApp

- **TeamReel**: Clubs importeren ledenlijsten, wedstrijdschema's, en team-indelingen vanuit bestaande systemen. Bestuurders exporteren content-overzichten en usage-reports voor vergaderingen. Sponsors krijgen exposure-rapporten.
- **CoreApp**: Import/export is universeel — elk SaaS-product met data management heeft bulk import, export, en reporting nodig. Het async job pattern via Celery is herbruikbaar.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B45-import-export-and-reporting

We bouwen een import/export en reporting systeem in de Django 5 + DRF backend.

[feature summary]
Bulk import (CSV/Excel/JSON), async export jobs, en PDF/Excel report generatie met Celery processing.

[goals]
- ImportJob model: file upload, column mapping, dry-run validatie, async execution
- Import formats: CSV (delimiter detection), Excel (.xlsx), JSON
- ExportJob model: filters, format keuze, async generatie, download link met expiry
- Export formats: CSV, Excel, JSON, PDF (reports)
- Report templates: Usage, Credits, Audit Log, Users
- Celery-based async processing voor import en export
- Error reporting: per-row errors bij import, downloadbaar error rapport
- Registerable models: ImportableModelMixin voor plug-and-play

[non-goals]
- Real-time data sync (ETL pipeline)
- Custom report builder (SQL editor)
- Streaming imports voor very large files (>100MB)

[tech context]
- Backend: Django 5, DRF, PostgreSQL, Celery
- Files: FileAsset model (src/files/) voor uploads en exports
- PDF: WeasyPrint (HTML→PDF)
- Excel: openpyxl
- Email: bestaand email systeem voor download links
- Tests: pytest + factory_boy
```

### Plan

```
/spec-kitty.plan feature=B45-import-export-and-reporting

[tech choices]
- Import: pandas voor CSV/Excel parsing (robuust, delimiter detection)
- Export: openpyxl (Excel), csv module (CSV), WeasyPrint (PDF)
- Async: Celery tasks op default queue
- File storage: FileAsset model voor uploads en generated exports
- Progress: ImportJob/ExportJob percentages via Celery task state
- Registry: ImportableModelRegistry met field mapping config per model

[models]
- ImportJob: file FK, format, status, column_mapping (JSON), validation_errors (JSON), stats (total/processed/success/error)
- ExportJob: export_type, filters (JSON), format, status, output_file FK, expires_at, stats
- ReportTemplate: name, template_type, html_template (voor PDF)

[api endpoints]
- POST /api/v1/imports/ — start import (file upload)
- POST /api/v1/imports/{id}/preview/ — preview met mapping
- POST /api/v1/imports/{id}/execute/ — uitvoeren
- GET /api/v1/imports/{id}/ — status + errors
- POST /api/v1/exports/ — start export
- GET /api/v1/exports/{id}/ — status + download URL
- GET /api/v1/reports/ — beschikbare report types
- POST /api/v1/reports/generate/ — genereer rapport

[files to create]
- src/data_exchange/ — nieuwe Django app
- src/data_exchange/importers.py — import logica per model
- src/data_exchange/exporters.py — export logica
- src/data_exchange/reports.py — report generatie
- src/data_exchange/tasks.py — Celery tasks
- tests/test_data_exchange/
```

### Research

```
/spec-kitty.research feature=B45-import-export-and-reporting

Onderzoek de volgende punten:

1. Welke models moeten importeerbaar zijn? Check src/ voor Member, Activity, Organisation models.
2. Hoe werkt de FileAsset model voor file uploads? Check src/files/.
3. Zijn er al import/export functies in de codebase?
4. Welke data-formaten leveren clubs typisch aan? (ledenlijst format, programma format)
5. Is WeasyPrint al geïnstalleerd? Check requirements/*.txt.
```
