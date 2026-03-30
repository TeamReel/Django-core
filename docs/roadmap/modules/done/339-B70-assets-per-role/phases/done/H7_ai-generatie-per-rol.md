# H7 — AI Generatie per Rol

| | |
|---|---|
| Fase | H7 |
| Effort | ~3 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | H6 |

## Doel

AI asset generatie (images + videos) stuurt `role` context mee zodat gegenereerde assets op de juiste plek in de metadata terechtkomen.

## Scope

### Backend — `src/generative/views_asset.py`

**Asset dispatch** moet role-aware worden:
```python
# Bij AI generatie:
# 1. Ontvang role uit request
# 2. Genereer asset met role-specifieke prompt context
# 3. Sla op via set_variant_value(membership, role, ...)
```

**Approval propagation** (lijn ~3697, ~3846):
- Al omgezet in H2, maar hier wordt de AI-specifieke logica getest
- Bij goedkeuring van AI-gegenereerde asset: correcte role/kit/variant

**Auto-dispatch RVM** (lijn ~3957):
- Al omgezet in H3, maar hier wordt het per-rol getest
- RVM (Remove Video Matte) wordt per rol getriggered

### Frontend — AI generatie UI

```typescript
// Bij AI asset generatie request:
const request = {
  membership_id: member.id,
  asset_type: "intro",
  kit_type: "home",
  variant_id: "default",
  role: selectedRole,  // Meegestuurd vanuit role tab
  prompt_context: {
    role: selectedRole,
    kit: "home",
    // ...
  }
};
```

### Prompt context per rol

| Rol | Context |
|-----|---------|
| `keeper` | Keeperstenue, handschoenen, doelgebied |
| `player` | Veldtenue, speelveld |
| `coach` | Trainingskleding, zijlijn |

## Checklist

- [ ] AI generatie requests bevatten `role` veld
- [ ] AI-gegenereerde assets worden opgeslagen onder `roles.{role}.*`
- [ ] Approval propagation schrijft naar correcte role
- [ ] Auto-dispatch RVM per rol
- [ ] Frontend stuurt role mee bij AI generatie
- [ ] Prompt context bevat rol-specifieke hints
- [ ] Tests voor AI pipeline met role context
- [ ] `pytest` groen
