# H3 — Frontend Role Asset Hooks

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~2 uur |
| Laag | Frontend |
| Afhankelijkheid | H0 |

## Doel

Frontend utilities en hooks bijwerken zodat assets per rol gelezen en getrackt worden.

## Implementatie

### 1. `mediaHelpers.ts` uitbreiden

**Bestand**: `demo/src/utils/mediaHelpers.ts`

- `readAssetsFromMembership()` → nieuwe overload met `role?` parameter
- Leest uit `metadata.teamreel_assets.roles.{role}.*` met fallback naar root (via H0 helpers)
- `mergeAssetsIntoMetadata()` → role-aware variant

### 2. `assetStatus.ts` uitbreiden

**Bestand**: `demo/src/utils/assetStatus.ts`

- `getMemberAssetStatus()` → role-aware: check per-role slots
- `AssetStatusResult` type uitbreiden met `role?: string`
- Tracked slots per rol:
  - **keeper**: kit + closeup + intro (geen tenue keuze nodig)
  - **player**: kit + closeup + intro (per tenue: home/away/third)
  - **coach/staf**: closeup + intro alleen

### 3. TypeScript types

**Bestand**: `demo/src/types/` of inline in relevant files

```typescript
interface RoleAssets {
  images?: Record<string, Record<string, AssetVariant>>;
  videos?: Record<string, Record<string, AssetVariant>>;
  media?: Record<string, MediaSlot>;
}

// Extend TeamReelAssets
interface TeamReelAssets {
  // ... existing
  roles?: Record<string, RoleAssets>;
}
```

### Tests

- Unit test `getAssetsForRole()` met role data → returns role assets
- Unit test `getAssetsForRole()` zonder role data → falls back to root
- Unit test `getMemberAssetStatus()` met role → correct slot tracking

## Acceptatiecriteria

- [ ] `readAssetsFromMembership()` ondersteunt `role` parameter
- [ ] `getMemberAssetStatus()` toont status per rol
- [ ] TypeScript types voor `roles` in metadata
- [ ] Fallback naar root als role geen assets heeft
- [ ] Geen breaking changes voor bestaande callers
