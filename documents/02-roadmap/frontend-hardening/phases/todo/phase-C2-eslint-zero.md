# C2 — ESLint Zero

**Status:** 🔲 Todo
**Effort:** 3 uur
**Scope:** 37 `eslint-disable` comments → 0

---

## Doel

Alle `eslint-disable` suppressions oplossen door de onderliggende issues écht te fixen.

## Current State

| Rule | Count | Aanpak |
|------|-------|--------|
| `react-hooks/exhaustive-deps` | 10 | Fix dependencies of extract to useRef |
| `@typescript-eslint/no-explicit-any` | 18 | Type properly (interfaces, generics, `unknown`) |
| `no-constant-condition` | 1 | Refactor logic |
| **Totaal** | **37** | |

## Aanpak per categorie

### `exhaustive-deps` (10×)
- Analyseer elk useEffect: is de dependency echt niet nodig, of is er een stale closure?
- Opties: voeg dependency toe, wrap in useCallback, of verplaats naar useRef
- **Nooit** herschrijven als `// eslint-disable` verplaatsen

### `no-explicit-any` (18×)
- Deze zijn bewust gemarkeerd met reden-comments (bijv. "deeply nested API envelope")
- Per case: maak een interface, of gebruik `unknown` + type guard
- Gebruik `Record<string, unknown>` in plaats van `any` voor geneste API data

## Verificatie

- [ ] 0 `eslint-disable` comments in productie-code (excl tests)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] ESLint run clean: `npx eslint "src/**/*.{ts,tsx}"`
