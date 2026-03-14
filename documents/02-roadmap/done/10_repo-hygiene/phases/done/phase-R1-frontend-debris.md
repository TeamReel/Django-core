# R1 — Frontend Debris

**Status:** ✅ Done
**Effort:** 30 min
**Scope:** Verwijder temp/debug files uit `demo/`

---

## Doel

Verwijder 19 tracked bestanden in `demo/` die overblijfselen zijn van eerdere refactoring-rondes: one-off Python codemods, debug TypeScript files, backup files, en Playwright output.

## Current State

| Categorie | Files | Detail |
|-----------|-------|--------|
| Python codemod (root) | 1 | `fix_squad_tab.py` |
| Python codemods (scripts/) | 14 | `c1_console_cleanup.py`, `c2_catch_unknown.py`, `c3_error_handling.py`, `d1_dark_mode_gaps.py`, `d1_fix_text_color.py`, `d2_accessibility.py`, `d2_fix_arrows.py`, `i2_hex_to_tokens.py`, `i3_inline_border_radius.py`, `i4_inline_typography.py`, `i5_inline_spacing.py`, `i6_inline_colors.py`, `i7_inline_shadow_zindex.py` + `ts_parse_diag.cjs` |
| Debug TS files (src/) | 3 | `test-chain.ts`, `test-import.ts`, `test-types.ts` |
| Backup file | 1 | `src/types/external.d.ts.bak` |
| Playwright output | 1 | `test-results/.last-run.json` |
| **Totaal** | **20** | |

**Behouden:** `scripts/generate.mjs` (referenced by package.json), `scripts/balance_tokens.cjs` (utility), `stylelint-plugin-8pt-grid.cjs` (actief gebruikt door .stylelintrc.json)

## Acties

1. `git rm demo/fix_squad_tab.py`
2. `git rm demo/scripts/c1_console_cleanup.py demo/scripts/c2_catch_unknown.py demo/scripts/c3_error_handling.py demo/scripts/d1_dark_mode_gaps.py demo/scripts/d1_fix_text_color.py demo/scripts/d2_accessibility.py demo/scripts/d2_fix_arrows.py demo/scripts/i2_hex_to_tokens.py demo/scripts/i3_inline_border_radius.py demo/scripts/i4_inline_typography.py demo/scripts/i5_inline_spacing.py demo/scripts/i6_inline_colors.py demo/scripts/i7_inline_shadow_zindex.py demo/scripts/ts_parse_diag.cjs`
3. `git rm demo/src/test-chain.ts demo/src/test-import.ts demo/src/test-types.ts`
4. `git rm demo/src/types/external.d.ts.bak`
5. `git rm demo/test-results/.last-run.json`
6. Voeg toe aan `.gitignore`: `demo/test-results/`, `demo/scripts/*.py`
7. Verifieer: `npx tsc --noEmit` + `npx vitest run`

## Verificatie

- [x] 20 bestanden verwijderd uit git
- [x] `.gitignore` bijgewerkt met `demo/test-results/`
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (187 files, 892 tests)
- [x] Gecommit + gepusht
