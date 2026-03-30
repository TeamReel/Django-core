# Q1 — Console Cleanup

**Status:** ✅ Done
**Effort:** 3 uur
**Scope:** 544 console statements → 0 (+ logger utility)

---

## Doel

Alle `console.log`, `console.warn`, `console.error` statements verwijderen of vervangen door een proper logging utility.

## Current State

```powershell
(Get-ChildItem -Recurse -Include "*.tsx","*.ts" | Select-String "console\.(log|warn|error)").Count
# Result: 559
```

## Strategie

### 1. Categoriseer

| Type | Actie |
|------|-------|
| Debug logging | **Verwijderen** |
| Error logging | **Behouden** (maar via logger) |
| Development-only | **Verwijderen** of wrapped in `if (import.meta.env.DEV)` |
| User-facing errors | **Vervangen** door proper error handling |

### 2. Create Logger Utility

```typescript
// utils/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
    // Could send to error tracking service
  },
};
```

### 3. Bulk Replacement

```bash
# VSCode Search & Replace (regex)
Find: console\.log\((.*)\);?
Replace: // Removed debug log

# Of voor bewuste logs:
Find: console\.log\((.*)\);?
Replace: logger.debug($1);
```

## Acceptabele Console Usage

Na cleanup mogen alleen bestaan:
- `logger.error()` voor echte errors
- `console.error()` in catch blocks (via logger)
- Development-only logging achter flag

## Verificatie

- [ ] Raw `console.log` count = 0
- [ ] Raw `console.warn` count = 0
- [ ] `console.error` alleen via logger of in error boundaries
- [ ] `npx tsc --noEmit` passing
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na Q1:
- **Raw console statements:** 0 (van 559)
- **Proper logger calls:** alleen waar nodig
