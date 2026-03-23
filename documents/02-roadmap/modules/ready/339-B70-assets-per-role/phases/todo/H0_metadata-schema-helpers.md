# H0 — Metadata Schema + Read/Write Helpers

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | — |

## Doel

De nieuwe metadata structuur definiëren en universele read/write helpers bouwen die zowel het nieuwe formaat (genest variant + role) als het oude formaat (suffix + root) ondersteunen.

## Nieuwe structuur

```
roles.{role}.{images|videos}.{type}.{kit}.{variant} = variant_value
```

- `variant` = `"default"` voor standaard, of beschrijvende naam (bv. `"arms_crossed"`)
- Images: typisch alleen `"default"` variant per kit
- Videos: meerdere varianten mogelijk per kit

## Implementatie

### 1. Backend helpers — `src/projects/utils/role_assets.py` (NIEUW)

```python
# === READ ===

def get_assets_for_role(
    metadata: dict, role: str, *, fallback_root: bool = True
) -> dict:
    """Haal assets op voor een specifieke rol, met optionele root-fallback."""

def get_asset_variant(
    metadata: dict, role: str | None,
    asset_type: str, kit_type: str, variant_id: str = "default",
    *, fallback_root: bool = True,
) -> dict | None:
    """Haal één specifieke variant op. Leest eerst genest, dan suffix-fallback."""

def get_all_variants(
    metadata: dict, role: str | None,
    asset_type: str, kit_type: str,
) -> dict[str, dict]:
    """Haal alle varianten op voor een type+kit. Returns {variant_id: value}."""

# === WRITE ===

def set_asset_variant(
    metadata: dict, role: str,
    asset_type: str, kit_type: str, variant_id: str,
    value: dict, *, dual_write: bool = True,
) -> dict:
    """Schrijf variant naar roles.{role}.*.{type}.{kit}.{variant}.
    Als dual_write=True, ook naar root in oud suffix-formaat."""

# === LEGACY ===

def _read_legacy_suffix(
    assets: dict, asset_type: str, kit_type: str, variant_id: str,
) -> dict | None:
    """Lees van oud suffix-formaat: {type}.{kit}_{variant}"""

def _read_legacy_root(
    assets: dict, asset_type: str, kit_type: str, variant_id: str,
) -> dict | None:
    """Lees van root-level (niet role-scoped)."""
```

### 2. Frontend helpers — `demo/src/utils/roleAssets.ts` (NIEUW)

```typescript
interface VariantValue {
  raw?: string;
  processed?: string;
  processing_state?: string;
  // ... etc
}

function getAssetsForRole(
  metadata: Record<string, unknown>, role: string
): RoleAssets;

function getAssetVariant(
  metadata: Record<string, unknown>,
  role: string | null,
  assetType: string,
  kitType: string,
  variantId?: string, // default: "default"
): VariantValue | null;

function getAllVariants(
  metadata: Record<string, unknown>,
  role: string | null,
  assetType: string,
  kitType: string,
): Record<string, VariantValue>;
```

Beide met fallback: genest → suffix → root.

### 3. Tests

**Backend**: `tests/projects/test_role_assets.py`
- Test `get_asset_variant()` met nieuw formaat → vindt variant
- Test `get_asset_variant()` met oud suffix-formaat → fallback werkt
- Test `get_asset_variant()` met root-level → fallback werkt
- Test `set_asset_variant()` → schrijft genest + root dual-write
- Test `get_all_variants()` → vindt alle varianten van een kit

## Acceptatiecriteria

- [ ] `get_asset_variant()` leest genest formaat
- [ ] `get_asset_variant()` valt terug naar suffix + root
- [ ] `set_asset_variant()` schrijft genest + optioneel dual-write
- [ ] `get_all_variants()` returnt alle varianten van een kit
- [ ] Frontend `roleAssets.ts` equivalent helpers
- [ ] Tests voor alle read/write paden
