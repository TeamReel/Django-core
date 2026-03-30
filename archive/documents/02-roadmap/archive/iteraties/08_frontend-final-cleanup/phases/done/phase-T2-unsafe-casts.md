# T2 — Unsafe Casts Cleanup

**Status:** 🔲 Todo
**Effort:** 4 uur
**Scope:** 287 `as any` casts → <30

---

## Doel

`as any` casts verwijderen of vervangen door safe casts. Deze casts schakelen TypeScript's type checking volledig uit.

## Current State

```powershell
(Get-ChildItem -Recurse -Include "*.tsx","*.ts" | Select-String " as any").Count
# Result: 287
```

## Categorieën

### 1. API Response Casts (~40%)
```typescript
// Voor
const data = response.json() as any;

// Na
const data = response.json() as ApiResponse<Project>;
```

### 2. Event Target Casts (~25%)
```typescript
// Voor
const value = (e.target as any).value;

// Na
const value = (e.target as HTMLInputElement).value;
```

### 3. Third-Party Library Casts (~15%)
```typescript
// Voor
chart.update(options as any);

// Na (als lib types slecht zijn)
// @ts-expect-error - ChartJS types incomplete for this option
chart.update(options);
```

### 4. Dynamic Object Access (~10%)
```typescript
// Voor
const val = obj[key] as any;

// Na
const val = obj[key as keyof typeof obj];
```

### 5. Legitimate Uses (~10%)
Soms is `as any` nodig:
- Test mocks
- Type narrowing workarounds
- Library quirks

→ Vervang door `as unknown as TargetType` of document met comment.

## Replacement Guide

| Pattern | Replacement |
|---------|-------------|
| `as any` → type assertion | `as SpecificType` |
| `as any` → type guard | `if (isType(x)) { ... }` |
| `as any` → generic | `<T>` parameter |
| `as any` → unknown | `as unknown as T` (safer cast chain) |

## Verificatie

- [ ] `as any` count <30
- [ ] Remaining `as any` have justification comments
- [ ] `npx tsc --noEmit` passing
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na T2:
- **`as any` casts:** <30 (van 287)
- **All remaining:** Documented exceptions
