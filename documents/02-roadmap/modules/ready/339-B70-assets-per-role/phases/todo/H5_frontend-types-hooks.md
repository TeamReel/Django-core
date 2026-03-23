# H5 — Frontend Types + Asset Hooks

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~2 uur |
| Laag | Frontend |
| Afhankelijkheid | H0 |

## Doel

Frontend utilities updaten voor geneste variant-structuur + role-aware asset reads.

## Implementatie

### 1. TypeScript types

```typescript
// Geneste variant structuur
interface KitVariants {
  [variantId: string]: VariantValue;  // "default", "arms_crossed", etc.
}

interface AssetCategory {
  [kitType: string]: KitVariants;     // "home", "goalkeeper", etc.
}

interface RoleAssets {
  images?: Record<string, AssetCategory>;
  videos?: Record<string, AssetCategory>;
  media?: Record<string, MediaSlot>;
}

interface TeamReelAssets {
  roles?: Record<string, RoleAssets>;
  // Legacy root-level (fallback):
  images?: Record<string, unknown>;
  videos?: Record<string, unknown>;
  media?: Record<string, MediaSlot>;
}
```

### 2. `mediaHelpers.ts` updaten

**Bestand**: `demo/src/utils/mediaHelpers.ts`

- `readAssetsFromMembership()` → role-aware, leest `roles.{role}.*`
- `getMediaProcessingState()` → geneste iteratie: `type.kit.variant`
- `mergeAssetsIntoMetadata()` → schrijft genest formaat

### 3. `assetStatus.ts` updaten

**Bestand**: `demo/src/utils/assetStatus.ts`

- `getMemberAssetStatus()` → per-role asset tracking
- Tracked slots per rol:
  - **player**: kit (home) + closeup + intro → per variant count
  - **keeper**: kit (goalkeeper) + closeup + intro
  - **coach/staf**: closeup alleen

### 4. `ActiveJobsModal.tsx`

**Bestand**: `demo/src/components/ActiveJobsModal/ActiveJobsModal.tsx`

- Deduplication logica aanpassen voor geneste keys

## Tests

- Test `getAssetsForRole()` met genest formaat → correct
- Test `getAssetsForRole()` met suffix legacy → fallback werkt
- Test `getMemberAssetStatus()` per rol → juiste counts
- Test `getAllVariants()` → vindt alle varianten

## Acceptatiecriteria

- [ ] TypeScript types voor geneste structuur
- [ ] `mediaHelpers.ts` leest genest + suffix fallback
- [ ] `assetStatus.ts` role-aware
- [ ] `ActiveJobsModal` werkt met geneste keys
- [ ] Geen breaking changes voor bestaande callers
