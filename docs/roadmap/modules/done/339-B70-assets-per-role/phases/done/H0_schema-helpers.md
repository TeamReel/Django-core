# H0 — Schema + Read/Write Helpers

| | |
|---|---|
| Fase | H0 |
| Effort | ~2 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | — |

## Doel

Nieuwe metadata-structuur definiëren en centrale read/write helpers bouwen die door alle andere fases worden gebruikt.

## Scope

### Backend — `src/video/utils/asset_metadata.py` (NIEUW)

```python
ROLE_KIT_MAP = {
    "keeper": {"default": "goalkeeper", "kits": ["goalkeeper"]},
    "player": {"default": "home", "kits": ["home", "away", "third"]},
    "coach": {"default": None, "kits": []},
    "assistant": {"default": None, "kits": []},
}

ASSET_TYPES_BY_ROLE = {
    "keeper": ["fullbody", "halfbody", "closeup", "intro", "celebration"],
    "player": ["fullbody", "halfbody", "closeup", "intro", "celebration"],
    "coach": ["profile"],
    "assistant": ["profile"],
}

SHARED_ASSET_TYPES = ["profile", "action_photo"]

def get_variant_value(membership, role, media_type, asset_type, kit, variant="default"):
    """Direct dict lookup — geen fallbacks."""
    assets = membership.metadata.get("teamreel_assets", {})
    return (assets
            .get("roles", {})
            .get(role, {})
            .get(media_type, {})  # "images" | "videos"
            .get(asset_type, {})
            .get(kit, {})
            .get(variant))

def set_variant_value(membership, role, media_type, asset_type, kit, variant, value):
    """Set value at roles.{role}.{media_type}.{asset_type}.{kit}.{variant}."""
    assets = membership.metadata.setdefault("teamreel_assets", {})
    roles = assets.setdefault("roles", {})
    role_data = roles.setdefault(role, {})
    type_data = role_data.setdefault(media_type, {})
    asset_data = type_data.setdefault(asset_type, {})
    kit_data = asset_data.setdefault(kit, {})
    kit_data[variant] = value

def iter_variants(membership, role, media_type, asset_type, kit=None):
    """Yield (kit, variant_id, variant_value) tuples."""
    assets = membership.metadata.get("teamreel_assets", {})
    asset_data = (assets
                  .get("roles", {})
                  .get(role, {})
                  .get(media_type, {})
                  .get(asset_type, {}))
    kits = [kit] if kit else asset_data.keys()
    for k in kits:
        kit_data = asset_data.get(k, {})
        for variant_id, value in kit_data.items():
            yield k, variant_id, value

def get_roles_for_member(membership):
    """Return list of functional roles from membership."""
    return membership.metadata.get("teamreel_assets", {}).get("roles", {}).keys()
```

### Frontend — `demo/src/utils/assetMetadata.ts` (NIEUW)

```typescript
export interface VariantValue {
  raw?: string;
  processed?: string;
  processing_state?: string;
  specs?: Record<string, unknown>;
}

export interface RoleAssets {
  images?: Record<string, Record<string, Record<string, VariantValue>>>;
  videos?: Record<string, Record<string, Record<string, VariantValue>>>;
}

export interface TeamreelAssets {
  roles?: Record<string, RoleAssets>;
  media?: Record<string, unknown>;
}

export const ROLE_KIT_MAP: Record<string, { default: string | null; kits: string[] }> = {
  keeper: { default: "goalkeeper", kits: ["goalkeeper"] },
  player: { default: "home", kits: ["home", "away", "third"] },
  coach: { default: null, kits: [] },
  assistant: { default: null, kits: [] },
};

export function getVariantValue(
  assets: TeamreelAssets,
  role: string,
  mediaType: "images" | "videos",
  assetType: string,
  kit: string,
  variant = "default"
): VariantValue | undefined {
  return assets?.roles?.[role]?.[mediaType]?.[assetType]?.[kit]?.[variant];
}
```

## Checklist

- [ ] `asset_metadata.py` aangemaakt met alle helpers
- [ ] Constants: `ROLE_KIT_MAP`, `ASSET_TYPES_BY_ROLE`, `SHARED_ASSET_TYPES`
- [ ] `get_variant_value()` — directe lookup, geen fallback
- [ ] `set_variant_value()` — geneste dict write
- [ ] `iter_variants()` — iterate over kit/variant pairs
- [ ] Frontend types in `assetMetadata.ts`
- [ ] Frontend `getVariantValue()` helper
- [ ] Unit tests voor alle helpers (happy path + edge cases)
- [ ] `pytest` groen
