# T3 — Typed Arrays

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** 64 `any[]` arrays → 0

---

## Doel

Alle `any[]` arrays typen. Dit is de kleinste type-safety fase maar belangrijk voor collection operations.

## Current State

```powershell
(Get-ChildItem -Recurse -Include "*.tsx","*.ts" | Select-String "any\[\]").Count
# Result: 64
```

## Common Patterns

### 1. State Arrays
```typescript
// Voor
const [items, setItems] = useState<any[]>([]);

// Na
const [items, setItems] = useState<Project[]>([]);
```

### 2. Function Returns
```typescript
// Voor
function getItems(): any[] { ... }

// Na
function getItems(): Activity[] { ... }
```

### 3. Props
```typescript
// Voor
interface Props {
  items: any[];
}

// Na
interface Props {
  items: ListItem[];
}
```

### 4. Map/Filter Operations
```typescript
// Voor
data.map((item: any) => item.name)

// Na
data.map((item: Project) => item.name)
// Of inferred:
data.map(item => item.name)  // als data al getypt is
```

## Quick Fixes

| Pattern | Search | Replace |
|---------|--------|---------|
| Empty array state | `useState<any[]>([])` | `useState<T[]>([])` |
| Generic arrays | `any[]` | `unknown[]` (voor echt onbekend) |
| API responses | `any[]` | `ApiListResponse<T>['results']` |

## Verificatie

- [ ] `any[]` count = 0
- [ ] `npx tsc --noEmit` passing
- [ ] `npx vitest run` passing

## Acceptatiecriteria

Na T3:
- **`any[]` usages:** 0 (van 64)
