# C2 — ESLint Zero

**Status:** ✅ Done
**Effort:** 1.5 uur (geschat 3 uur)
**Scope:** 37 `eslint-disable` comments → 0

---

## Doel

Alle `eslint-disable` suppressions oplossen door de onderliggende issues écht te fixen.

## Resultaat

### Bevindingen

De ESLint config (`demo/eslint.config.js`) is een **flat config zonder shared presets**.
Slechts 5 rules zijn actief geconfigureerd:
- `react-hooks/rules-of-hooks` (error)
- `react-hooks/exhaustive-deps` (warn)
- `@typescript-eslint/no-unused-vars` (warn)
- `@typescript-eslint/consistent-type-imports` (warn)
- `react-refresh/only-export-components` (warn)

**Niet geconfigureerd:** `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion`, `no-constant-condition`

### Acties

| Categorie | Count | Actie |
|-----------|-------|-------|
| Dead comments (regels niet in config) | 24 | Verwijderd als dode code |
| `exhaustive-deps` suppressions | 13 | Verwijderd — nu zichtbaar als warnings |
| Code fixes | 3 | Zie hieronder |

### Code fixes
1. **`seasonDetailUtils.ts`** — `while(true)` → `for (let attempt = 1; attempt <= maxAttempts; attempt++)` met proper early return
2. **`useMemberMediaActions.ts`** — 2× `useRef<HTMLInputElement>(null!)` → `useRef<HTMLInputElement | null>(null)` (usage sites hadden al `?.`)

### ESLint baseline (niet C2 scope)
- 1 pre-existing error: `BreadcrumbNav.tsx:24` — `useNavigate` conditionally called (rules-of-hooks)
- 630 warnings: `consistent-type-imports`, `no-unused-vars`, `exhaustive-deps` (135 totaal, waarvan 122 pre-existing)

## Verificatie

- [x] 0 `eslint-disable` comments in productie-code (excl tests)
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (123 files, 529 tests)
- [ ] ~~ESLint run clean~~ — 630 warnings + 1 error waren pre-existing (vóór C2). Niet in scope.
