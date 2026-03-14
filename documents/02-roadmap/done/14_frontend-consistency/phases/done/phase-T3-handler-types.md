# T3 — Handler Types

**Status:** ✅ Done
**Track:** T — Type Safety
**Effort:** 15 min
**Dependencies:** Geen
**Voltooid:** 2026-03-12

---

## Doel

Fix `any` types in handler en utility files.

## Probleembestanden

### handlers.ts (line 27)

```tsx
params: any
```

### useSports.ts (line 78)

```tsx
const p = payload as any
```

## Oplossing

### handlers.ts

Geïmporteerd `SubmitParams` type van useAssetGeneration:
```tsx
import type { SubmitParams } from '../../../hooks/useAssetGeneration';
startUploadAutoProcess: (outputType: string, params: SubmitParams) => void;
```

### useSports.ts

Expliciet payload shape type i.p.v. `any`:
```tsx
const p = payload as { results?: unknown; data?: unknown | { results?: unknown; data?: unknown } };
```

## Verificatie

- [x] `any` types vervangen
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (984 tests)
