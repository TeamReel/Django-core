# H5 — Frontend Types + Hooks

| | |
|---|---|
| Fase | H5 |
| Effort | ~2 uur |
| Laag | Frontend |
| Afhankelijkheid | H0 |

## Doel

Frontend types, hooks en utility functies aanpassen voor de nieuwe geneste metadata-structuur met role-scoping.

## Scope

### Types — `demo/src/utils/assetMetadata.ts` (uit H0)

Types zijn al gedefinieerd in H0. Hier worden de hooks en helpers gebouwd.

### `demo/src/utils/mediaHelpers.ts` — Refactor

```typescript
// WAS:
export function getMediaProcessingState(assets, assetType, compositeKey) {
  return assets?.videos?.[assetType]?.[compositeKey]?.processing_state;
}

// WORDT:
export function getMediaProcessingState(
  assets: TeamreelAssets,
  role: string,
  assetType: string,
  kit: string,
  variant = "default"
): string | undefined {
  return getVariantValue(assets, role, "videos", assetType, kit, variant)?.processing_state;
}
```

### `demo/src/utils/assetStatus.ts` — Per rol

```typescript
// WAS:
export function getMemberAssetStatus(assets) {
  // Checked 5 hardcoded slots against root-level data

// WORDT:
export function getMemberAssetStatus(assets: TeamreelAssets, role: string) {
  // Check slots for specific role
  const roleAssets = assets?.roles?.[role];
  // Count filled/total for images + videos
}
```

### `readAssetsFromMembership()` — Vereenvoudigen

```typescript
// WAS: complex fallback logic reading from images/videos/media root
// WORDT: direct read from roles.{role}
export function readAssetsFromMembership(
  membership: Membership,
  role: string
): RoleAssets {
  return membership.metadata?.teamreel_assets?.roles?.[role] ?? { images: {}, videos: {} };
}
```

### Nieuwe hook: `useRoleAssets()`

```typescript
export function useRoleAssets(membership: Membership, role: string) {
  const assets = membership.metadata?.teamreel_assets;
  const roleAssets = assets?.roles?.[role];

  return {
    getImage: (type: string, kit: string) =>
      getVariantValue(assets, role, "images", type, kit),
    getVideo: (type: string, kit: string, variant = "default") =>
      getVariantValue(assets, role, "videos", type, kit, variant),
    getVariants: (type: string, kit: string) =>
      Object.keys(roleAssets?.videos?.[type]?.[kit] ?? {}),
    getStatus: () => getMemberAssetStatus(assets, role),
  };
}
```

## Checklist

- [ ] `getMediaProcessingState()` omgezet naar role-based
- [ ] `getMemberAssetStatus()` accepteert `role` parameter
- [ ] `readAssetsFromMembership()` vereenvoudigd (geen fallbacks)
- [ ] `useRoleAssets()` hook aangemaakt
- [ ] Alle imports bijgewerkt in consuming components
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npx vite build` succesvol
