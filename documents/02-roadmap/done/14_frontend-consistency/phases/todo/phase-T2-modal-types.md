# T2 — Modal Types

**Status:** 🔲 Todo
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

1. [ ] Identificeer `generation` type — waarschijnlijk `GenerationResult` of similar
2. [ ] Identificeer `selectedTemplate` type — waarschijnlijk `ContentTemplate`
3. [ ] Definieer `metadata` type — waarschijnlijk `Record<string, unknown>` of specifiek interface
4. [ ] Vervang `any` door proper types
5. [ ] Export types voor hergebruik

## Verificatie

- [ ] Geen `any` types in genoemde bestanden
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
