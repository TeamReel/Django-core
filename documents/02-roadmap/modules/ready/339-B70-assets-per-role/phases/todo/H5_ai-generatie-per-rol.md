# H5 — AI Generatie per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | H2, H4 |

## Doel

AI-generatie (via `generativeApi`) contextbewust maken van de geselecteerde rol, zodat gegenereerde assets (tenue, pose, achtergrond) passen bij de rol.

## Implementatie

### 1. Backend: generation endpoint + role

Alle generation endpoints die assets produceren moeten `role` accepteren:

- `src/generative/` — inventariseer welke endpoints assets genereren
- Pass `role` door naar `process_member_asset.delay(role=role)`
- Role bepaalt:
  - **Tenue selectie**: keeper kit vs home/away/third
  - **Pose suggestie**: keeper → keeper pose, speler → action pose
  - **Asset type**: welke types gegenereerd worden per rol

### 2. Frontend: MemberAiModal

- Ontvangt `role` prop van MemberDetailPanel (H4)
- Stuurt `role` mee in API call body
- UI hint: "Genereer assets voor [Rol]" als label
- Kit selector toont alleen relevante kits voor de rol

### 3. Role-to-asset-type mapping

Backend utility (uitbreiden `role_assets.py`):

```python
ROLE_ASSET_TYPES: dict[str, list[str]] = {
    "keeper": ["fullbody", "halfbody", "closeup"],
    "player": ["fullbody", "halfbody", "closeup"],
    "coach": ["closeup", "halfbody"],
    "assistant": ["closeup", "halfbody"],
    "verzorger": ["closeup"],
    "supporter": ["closeup"],
    "manager": ["closeup", "halfbody"],
}

ROLE_KIT_TYPES: dict[str, list[str]] = {
    "keeper": ["goalkeeper"],
    "player": ["home", "away", "third"],
    "coach": ["training"],
    "assistant": ["training"],
    # ... etc
}
```

### Tests

- Test generation met role=keeper → goalkeeper kit gebruikt
- Test generation met role=player → home kit default
- Test generation zonder role → backward compat

## Acceptatiecriteria

- [ ] Generation endpoints accepteren `role` parameter
- [ ] Correcte tenue gekozen per rol
- [ ] MemberAiModal stuurt role mee
- [ ] `ROLE_ASSET_TYPES` en `ROLE_KIT_TYPES` mappings
- [ ] Backward compat: geen role → huidige gedrag
- [ ] Tests
