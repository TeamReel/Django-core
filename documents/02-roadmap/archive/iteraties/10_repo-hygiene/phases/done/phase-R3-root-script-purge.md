# R3 — Root Script Purge

**Status:** ✅ Done
**Effort:** 30 min
**Scope:** Verwijder one-off debug scripts en temp output files uit de repository root

---

## Doel

De repo root bevat 15 tracked bestanden (Python scripts + debug output) die one-off debug/data-tools zijn en niet in productie thuishoren. Daarnaast zijn er 7 untracked lokale scripts die lokaal verwijderd moeten worden.

## Current State — Tracked (git rm)

| File | Omschrijving |
|------|-------------|
| `analyze_media.py` | FFmpeg webm analysis helper |
| `copy_assets.py` | Brand asset copy tool (one-off data migration) |
| `debug_crop_visualization.py` | PIL debug visualization for lineup crop |
| `debug_selection_logic.py` | Debug script for asset selection logic |
| `download_processed_intros.py` | Download intro videos via Django ORM |
| `fix_approvals_encoding.py` | Fix cp1252→UTF-8 mojibake (already applied) |
| `fix_stuck_assets.py` | Fix stuck assets for specific project |
| `generate_ffmpeg_command.py` | Generate FFmpeg CLI for lineup videos |
| `inspect_user_metadata.py` | Inspect user metadata via Django ORM |
| `teamreel_prompts.py` | 1949-line AI prompt library → move to `src/generative/` |
| `metadata_dump.txt` | Production membership metadata dump |
| `tsc_output.txt` | TypeScript compiler error output |
| `debug_crop.png` | Debug image from crop visualization |
| `debug_final.png` | Debug image |
| `debug_head.png` | Debug image |
| `debug_mask.png` | Debug image |
| `debug_masked_body.png` | Debug image |

## Current State — Untracked (lokaal verwijderen)

| File | Omschrijving |
|------|-------------|
| `check_bernt.py` | Query Django DB for goalkeeper metadata |
| `check_ffmpeg.py` | Check if ffmpeg is on PATH |
| `check_index_sigs.py` | TypeScript index-signature audit |
| `check_intro_data.py` | ⚠️ **Bevat hardcoded DB credentials** |
| `check_intro_format.py` | ⚠️ **Bevat hardcoded DB credentials** |
| `check_member_meta.py` | Query production DB for member metadata |
| `coverage.json` | Empty coverage output (already .gitignored) |

## Acties

1. **⚠️ EERST:** Verwijder `check_intro_data.py` en `check_intro_format.py` lokaal (bevatten credentials)
2. Verwijder overige untracked files: `check_bernt.py`, `check_ffmpeg.py`, `check_index_sigs.py`, `check_member_meta.py`, `coverage.json`
3. `git rm` alle 17 tracked bestanden (zie lijst boven)
4. Voeg toe aan `.gitignore`: `debug_*.png`, `*_dump.txt`, `tsc_output.txt`
5. **Besluit over `teamreel_prompts.py`:** verwijderen of verplaatsen naar `src/generative/prompts.py`
6. Verifieer: `python manage.py check` (geen broken imports)

## Verificatie

- [x] 0 one-off scripts in repo root (alleen `manage.py` blijft)
- [x] 7 untracked files lokaal verwijderd (incl. credentials)
- [x] Credentials-bestanden verwijderd
- [x] `.gitignore` bijgewerkt (debug_*.png, *_dump.txt, tsc_output.txt)
- [x] Gecommit + gepusht
