# R4 — Gitignore & Binary Assets

**Status:** ✅ Done
**Effort:** 30 min
**Scope:** Untrack binary assets uit git, update `.gitignore`, verwijder lokale debug directories

---

## Doel

De `asc/` directory bevat 82 tracked binary media files (JPG, PNG, MP4) die het repository onnodig vergroten. Daarnaast moeten lokale debug directories opgeruimd worden en `.gitignore` geconsolideerd.

## Current State

| Item | Status | Detail |
|------|--------|--------|
| `asc/` (82 files) | In `.gitignore` maar **nog tracked** | Binary club media (logos, sponsors, player photos, rendered videos) |
| `local_lineup_test/` | In `.gitignore`, untracked | Lokale test sandbox (Python scripts, fonts, test images) |
| `repro_lineup/` | In `.gitignore`, untracked | FFmpeg debug artifacts (test videos, .bat files) |
| `demo/test-results/` | **Niet** in `.gitignore` | Playwright output |
| `debug_*.png` | **Niet** in `.gitignore` | Debug images at root |

## Acties

1. `git rm -r --cached asc/` — untrack 82 binary files (directory blijft lokaal, al in .gitignore)
2. Verwijder lokale directories: `local_lineup_test/`, `repro_lineup/`
3. Voeg toe aan `.gitignore`:
   ```
   # Debug & test output
   debug_*.png
   *_dump.txt
   tsc_output.txt
   demo/test-results/
   ```
4. Verifieer `.gitignore` geen duplicaten bevat
5. `git status` — geen ungewenste tracked files meer

## Impact

De 82 bestanden in `asc/` zijn samen ~50-100 MB aan binary data. Na `git rm --cached` worden ze wel nog in de git history bewaard, maar niet meer in nieuwe commits meegenomen. Voor echte repo-verkleining is `git filter-branch` of BFG nodig (out of scope).

## Verificatie

- [x] `git ls-files asc/` retourneert 0 resultaten (was 82)
- [x] `local_lineup_test/` en `repro_lineup/` verwijderd
- [x] `.gitignore` al up-to-date (asc/, local_lineup_test/, repro_lineup/ waren al aanwezig; debug_*.png toegevoegd in R3)
- [x] Geen duplicaten in `.gitignore`
- [x] Gecommit + gepusht
