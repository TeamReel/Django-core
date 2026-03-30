# H3 — Retention Policy & Cleanup

> **Effort:** ~2 uur | **Impact:** Automatische opruiming

## To do

- [ ] `SOFT_DELETE_RETENTION` configuratie in settings:
  ```python
  SOFT_DELETE_RETENTION = {
      "default": timedelta(days=30),
      "content_generation.ContentItem": timedelta(days=60),
      "files.FileAsset": timedelta(days=14),
  }
  ```
- [ ] Celery beat task: `cleanup_expired_trash` — draait dagelijks
  - Query: TrashItems waar `expires_at < now()`
  - Permanent delete in batches (500 per run)
  - Logging: welke items opgeruimd + count
- [ ] Grace period notificatie (optional): 3 dagen voor expiry → notificatie naar deleted_by user
- [ ] Management command: `python manage.py cleanup_trash --dry-run` (handmatige run)

## Done criteria

- [ ] `expires_at` wordt berekend bij TrashItem creatie (deleted_at + retention)
- [ ] Celery beat task ruimt expired items op
- [ ] Dry-run mode toont wat opgeruimd zou worden zonder te deleten
- [ ] Retention is configureerbaar per model type
