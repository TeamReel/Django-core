# H0 — Read-Abstractie & Helpers

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~2 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | — |

## Doel

Creëer de read-abstractie die assets per rol kan lezen met fallback naar root-level. Geen writes, geen UI wijzigingen — puur de foundation.

## Backend

### `src/projects/utils/role_assets.py` (nieuw)

```python
def get_assets_for_role(metadata: dict, role: str) -> dict:
    """Read teamreel_assets for a specific role, with root-level fallback.

    Priority:
    1. metadata.teamreel_assets.roles.{role}.images/videos
    2. metadata.teamreel_assets.images/videos (root fallback)

    Returns merged dict with images + videos for the requested role.
    """

def get_all_role_assets(metadata: dict) -> dict[str, dict]:
    """Return dict of {role: assets} for all roles that have assets."""

def get_asset_variant(metadata: dict, role: str | None, asset_type: str, kit_type: str) -> dict | None:
    """Get specific variant value for a role + asset_type + kit_type."""
```

### Tests: `tests/projects/test_role_assets.py`

- Test read van root-level (bestaande data)
- Test read van `roles.{role}.*` (nieuwe data)
- Test fallback: role niet in roles → root
- Test prioriteit: role data wint van root data
- Test lege metadata → None

## Frontend

### `demo/src/utils/roleAssets.ts` (nieuw)

```typescript
export function getAssetsForRole(
  metadata: Record<string, unknown>,
  role: string
): TeamReelAssets | null

export function getAssetVariant(
  metadata: Record<string, unknown>,
  role: string | null,
  assetType: string,
  kitType: string,
): AssetVariant | null

export function getAllRoleAssets(
  metadata: Record<string, unknown>,
): Record<string, TeamReelAssets>
```

## Acceptatiecriteria

- [ ] Backend helper `get_assets_for_role()` werkt met root fallback
- [ ] Frontend helper `getAssetsForRole()` werkt identiek
- [ ] Unit tests voor backend helpers
- [ ] Geen bestaande functionaliteit breekt
- [ ] TypeScript 0 errors
