# T2 — Modal Types

**Status:** ✅ Done
**Track:** T — Type Safety
**Effort:** 1 uur
**Dependencies:** Geen

---

## Doel

Fix `any` types in modal components en batch types.

## Probleembestanden

### AssetGenerationModal.tsx (lines 286-287)

```tsx
generation: any
selectedTemplate: any
```

### batchTypes.ts (line 16)

```tsx
metadata?: any
```

## Acties

1. [x] Identificeer `generation` type — waarschijnlijk `GenerationResult` of similar
2. [x] Identificeer `selectedTemplate` type — waarschijnlijk `ContentTemplate`
3. [x] Definieer `metadata` type — waarschijnlijk `Record<string, unknown>` of specifiek interface
4. [x] Vervang `any` door proper types
5. [x] Export types voor hergebruik

## Verificatie

- [x] Geen `any` types in genoemde bestanden
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green
- [x] Gecommit + gepusht
