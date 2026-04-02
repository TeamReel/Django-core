# Q080 — Unit tests prepare_sponsor_pil + ImageCache

| | |
|---|---|
| Status | � DONE |
| Bron | Code DONE Q076/Q077 |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat
Q076 introduceert `prepare_sponsor_pil()` en Q077 de `ImageCache` class in `_common.py`. Beide worden indirect getest via bestaande integration tests (281 passing), maar missen dedicated unit tests.

## Checklist
- [ ] `test_composer_helpers.py`: `TestPrepareSponsorPil` class — test None-url, download failure, strip+crop success, strip fallback
- [ ] `test_composer_helpers.py`: `TestImageCache` class — test get(), cache hit, clear(), None-url
- [ ] Tests
- [ ] Verify
