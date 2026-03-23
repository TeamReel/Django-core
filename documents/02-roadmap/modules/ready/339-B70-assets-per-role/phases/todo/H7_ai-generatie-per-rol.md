# H7 — AI Generatie per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | H6 |

## Doel

AI-generatie contextbewust maken: rol bepaalt tenue, variant bepaalt pose.

## Implementatie

### 1. Backend: generation endpoints + role + variant

- Pass `role` + `variant_id` door naar `process_member_asset.delay()`
- Role bepaalt tenue selectie (keeper→goalkeeper, player→home/away/third)
- Variant bepaalt pose/stijl (default, arms_crossed, thumbs_up)

### 2. AI pipeline regex update

**Bestand**: `src/generative/views_asset.py`

Huidige filename pattern:
```
member_intro_kit_type-{kit}_style_variant-{style}_{hash}_{idx}.mp4
```

Na refactor: `kit_type` en `style_variant` worden apart opgeslagen in genest formaat i.p.v. als suffix gecombineerd.

### 3. Frontend: MemberAiModal

- Ontvangt `role` + `variantId` props van MemberDetailPanel
- Stuurt `role` + `variant_id` mee in API call
- Kit selector toont alleen relevante kits voor de rol
- Label: "Genereer [variant] voor [rol] in [tenue]"

### 4. Role-to-asset mapping (uitbreiden H0)

```python
ROLE_ASSET_TYPES = {
    "keeper": ["fullbody", "halfbody", "closeup", "intro", "celebration"],
    "player": ["fullbody", "halfbody", "closeup", "intro", "celebration"],
    "coach": ["closeup", "halfbody"],
    # ...
}

ROLE_KIT_TYPES = {
    "keeper": ["goalkeeper"],
    "player": ["home", "away", "third"],
    "coach": ["training"],
    # ...
}
```

## Acceptatiecriteria

- [ ] Generation endpoints accepteren `role` + `variant_id`
- [ ] Correcte tenue per rol
- [ ] AI pipeline schrijft genest formaat
- [ ] MemberAiModal stuurt role + variant mee
- [ ] Backward compat: zonder role → huidige gedrag
