# T4 — Function Parameter Types

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** ~159 `: any` parameters
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

- [ ] `: any` parameter count < 30 (van 159)
- [ ] `npx vite build` slaagt
