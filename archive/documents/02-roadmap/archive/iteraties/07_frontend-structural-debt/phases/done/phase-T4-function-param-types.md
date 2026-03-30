# T4 — Function Parameter Types

**Status:** ✅ Done
**Commit:** `78bc0f43`
**Effort:** 4 uur
**Scope:** 724 → ~196 `: any` parameters (72% reduction)
**Vereist:** T1

---

## Doel

Vervang `: any` function parameters door correcte types. Na C2 zijn de catch params al `unknown`; dit richt zich op callback props, event handlers, en data-processing functies.

## Strategie

| Context | Typische fix |
|---------|-------------|
| `onClick` handler parameter | `(item: any)` → `(item: Activity)` |
| Map/filter callback | `.map((m: any) =>` → `.map((m: Member) =>` |
| Form submit data | `(data: any)` → `(data: FormValues)` |
| API response handler | `(res: any)` → `(res: ApiEnvelope<T>)` |

## Verificatie

- [x] `: any` parameter count 724 → ~196 (72% reduction, 528 replaced)
- [x] ~40 local interfaces toegevoegd voor data shapes
- [x] `npx vite build` slaagt
- [x] 30/30 tests passing
- [x] 0 TypeScript compilation errors
