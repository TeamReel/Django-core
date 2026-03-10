# T1 — Function Parameter Types

**Status:** 🔲 Todo
**Effort:** 6 uur
**Scope:** 404 `: any` parameters → <50

---

## Doel

Alle function parameters met `: any` type geven een echte type. Dit herstelt TypeScript's compile-time checks.

## Current State

```powershell
# Count `: any` params (excluding `as any`)
(Get-ChildItem -Recurse -Include "*.tsx","*.ts" | Select-String ": any(?![a-zA-Z\[])").Count
# Result: 404
```

## Pattern Aanpak

### 1. Event Handlers (hoogste frequentie)

**Voor:**
```typescript
const handleChange = (e: any) => { ... }
```

**Na:**
```typescript
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... }
// Of generic:
const handleChange = (e: React.ChangeEvent<HTMLElement>) => { ... }
```

### 2. Callback Props

**Voor:**
```typescript
interface Props {
  onSelect: (item: any) => void;
}
```

**Na:**
```typescript
interface Props<T> {
  onSelect: (item: T) => void;
}
// Of specifiek:
interface Props {
  onSelect: (item: Project) => void;
}
```

### 3. Utility Functions

**Voor:**
```typescript
function formatValue(value: any): string { ... }
```

**Na:**
```typescript
function formatValue(value: unknown): string { ... }
// Of union:
function formatValue(value: string | number | null): string { ... }
```

### 4. Generic Fallback

Als type echt niet te bepalen is:
```typescript
function process<T>(data: T): T { ... }
// Of:
function process(data: unknown): unknown { ... }
```

## Prioriteit per Folder

| Folder | `: any` Count | Prioriteit |
|--------|---------------|------------|
| hooks/ | ~120 | P0 — meest gebruikt |
| pages/ | ~100 | P1 |
| components/ | ~80 | P1 |
| utils/ | ~50 | P2 |
| api/ | ~30 | P2 |
| adapters/ | ~24 | P3 |

## Verificatie

- [ ] `: any` count <50
- [ ] Remaining `: any` gedocumenteerd met reden
- [ ] `npx tsc --noEmit` passing
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na T1:
- **`: any` parameters:** <50 (van 404)
- **Remaining cases:** Justified met comments
