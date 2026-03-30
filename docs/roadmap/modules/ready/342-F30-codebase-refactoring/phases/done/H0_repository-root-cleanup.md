# H0 — Repository Root Opschonen

> **Effort:** ~2 uur | **Impact:** Schone werkruimte, geen afleiding door debug-rommel

## Analyse (eerst uitvoeren)

- [ ] Inventariseer exacte aantallen: `Get-ChildItem -File *.png, *.jpg, *.jpeg | Measure`
- [ ] Inventariseer debug scripts: `Get-ChildItem check_*.py, diagnose_*.py, debug_*.py, find_*.py, fix_*.py, verify_*.py`
- [ ] Inventariseer log/output bestanden: `Get-ChildItem *.txt -File`
- [ ] Inventariseer test-output folders: `Get-ChildItem -Directory | Where Name -match '^(review-|e2e-|f29-|deploy-|mobile-|desktop-|lineup-)'`
- [ ] Controleer wat in `.gitignore` al staat
- [ ] Rapporteer bevindingen aan gebruiker vóór uitvoering

## Uitvoering

- [ ] Verplaats alle PNG/JPEG screenshots uit root naar `archive/screenshots/`
- [ ] Verplaats alle debug Python scripts (~21) naar `archive/legacy-root-cleanup/scripts/`
  - `check_*.py`, `diagnose_*.py`, `debug_*.py`, `find_*.py`, `fix_*.py`, `list_*.py`, `verify_*.py`, `update_*.py`, `_move_phases.py`
- [ ] Verplaats alle log/output bestanden (~20) naar `archive/legacy-root-cleanup/logs/`
  - `test-*.txt`, `tmp_*.txt`, `brand_results.txt`, `celery_logs.txt`, `vite-build-output.txt`
- [ ] Verplaats alle test-output folders (~50) naar `archive/test-output-dirs/`
  - `review-*`, `e2e-*`, `f29-*`, `deploy-*`, `mobile-*`, `desktop-*`, `lineup-field-*`, etc.
- [ ] Verplaats `kitty-specs/` naar `archive/kitty-specs-legacy/`
- [ ] Update `.gitignore` — voeg patronen toe voor screenshots en debug output:
  ```
  # Debug/test output
  *.png
  !demo/public/**/*.png
  !teamreel_logos/**/*.png
  check_*.py
  diagnose_*.py
  debug_*.py
  tmp_*.txt
  test-*.txt
  ```
- [ ] Verwijder `coverage/` en `htmlcov/` uit git tracking (regenereerbaar)
- [ ] Controleer dat `asc/`, `examples/`, `teamreel_logos/` duidelijk doel hebben of archiveer

## Done criteria

- [ ] Repository root bevat maximaal ~60 bestanden/folders
- [ ] Geen PNG/JPEG bestanden in root
- [ ] Geen `check_*.py` of `diagnose_*.py` scripts in root
- [ ] Geen `test-*.txt` of `tmp_*.txt` in root
- [ ] `.gitignore` voorkomt dat dit soort bestanden opnieuw gecommit worden
- [ ] `git status` is schoon na de opruiming
