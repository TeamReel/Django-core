# Q061 — Dedupliceer MediaItem creatie logica

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Pipeline analyse — extraction_metadata duplicatie |
| Impact | 🟡 important |
| Effort | ~1.5 uur |

## Wat
`tasks/_shared.py:create_media_item_for_completed_job` en `views/job.py:_save_approved_video_to_activity` zijn ~85% identiek. Beide bouwen dezelfde `extraction_metadata` dict (~30 regels copy-paste) en maken een `MediaItem` aan. Enige verschil: source tag ("auto" vs "approved"), created_by, en één extra veld (`scorer_member_id`).

Als één van beide verandert, driftet de ander.

**Extract `build_extraction_metadata(job, activity, project, config)` helper + refactor beide callers.**

## Bevat ook
- Verplaats `JOB_TYPE_TO_ASSET_TYPE` uit `views/job.py` inline → importeer uit `_shared.py` (staat daar nu dubbel)

## Checklist
- [x] Schrijf `build_extraction_metadata()` in `_shared.py`
- [x] Refactor `create_media_item_for_completed_job` → gebruik helper
- [x] Refactor `views/job.py:_save_approved_video_to_activity` → gebruik helper + importeer `JOB_TYPE_TO_ASSET_TYPE`
- [x] Verwijder inline `JOB_TYPE_TO_ASSET_TYPE` uit `views/job.py`
- [x] Tests
- [x] Verify
