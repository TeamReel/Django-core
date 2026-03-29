# Q029 — Ruff F821 Undefined Names Fixen

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Codebase Review (29 maart 2026) |
| Impact | 🔴 critical |
| Effort | ~1 uur |

## Wat

De codebase bevat 5 kritieke F821 errors: code die functies of modules aanroept die niet geïmporteerd zijn. Dit veroorzaakt runtime crashes als deze codepaths worden uitgevoerd.

## Issues

### shutil niet geïmporteerd (3x)
- `src/video/services/goal_celebration_composer.py:171` - `shutil.copy()` gebruikt
- `src/video/services/lineup_composer.py:1325` - `shutil.copy()` gebruikt
- `src/video/services/lineup_flyer_generator.py:307` - `shutil.rmtree()` gebruikt

### download_image niet geïmporteerd (2x)
- `src/video/services/match_flyer_generator.py:82` - functie `_download_image()` roept `download_image()` aan
- `src/video/services/processors/match_intro.py:77` - idem

## Checklist
- [ ] `import shutil` toevoegen aan goal_celebration_composer.py
- [ ] `import shutil` toevoegen aan lineup_composer.py
- [ ] `import shutil` toevoegen aan lineup_flyer_generator.py
- [ ] `download_image` import toevoegen aan match_flyer_generator.py (uit `_common` module)
- [ ] `download_image` import toevoegen aan match_intro.py (uit `_common` module)
- [ ] `ruff check src/ --select=F821` geeft 0 errors
- [ ] Tests passeren
