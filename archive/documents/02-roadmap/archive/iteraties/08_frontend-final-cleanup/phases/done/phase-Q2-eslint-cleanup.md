# Q2 — ESLint Cleanup

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** 31 `eslint-disable` comments → 0

---

## Doel

Alle `eslint-disable` comments verwijderen door de onderliggende code te fixen.

## Current State

```powershell
(Get-ChildItem -Recurse -Include "*.tsx","*.ts" | Select-String "eslint-disable").Count
# Result: 31
```

## Categorieën

### 1. `eslint-disable-next-line` — Single line disables
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;
```
→ **Fix:** Type the variable properly

### 2. `eslint-disable` — File-level disables
```typescript
/* eslint-disable react-hooks/exhaustive-deps */
```
→ **Fix:** Add missing dependencies or restructure hook

### 3. Common Rules Being Disabled

| Rule | Typical Reason | Fix |
|------|----------------|-----|
| `@typescript-eslint/no-explicit-any` | Lazy typing | Add proper types |
| `react-hooks/exhaustive-deps` | Missing deps | Add deps or use ref |
| `@typescript-eslint/no-unused-vars` | Dead code | Remove variable |
| `react/display-name` | Anonymous component | Give component a name |
| `no-console` | Debug logging | Use logger utility |

## Approach

1. **Search** for all `eslint-disable` comments
2. **Group** by rule being disabled
3. **Fix** underlying issue (not just remove comment)
4. **Remove** disable comment

## Verificatie

- [ ] `eslint-disable` count = 0
- [ ] ESLint passes without disable comments
- [ ] `npx tsc --noEmit` passing
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na Q2:
- **`eslint-disable` comments:** 0 (van 31)
- **ESLint:** Clean run, no rule violations
