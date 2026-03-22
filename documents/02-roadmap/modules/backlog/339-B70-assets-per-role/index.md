# 339-B70 — Assets Per Role

| | |
|---|---|
| Code | B70 |
| Status | 📋 BACKLOG |
| Prioriteit | Medium |
| Geschatte effort | ~24 uur |
| Afhankelijkheid | F26 (multi-role UI) |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie

Assets worden opgeslagen op **member-niveau** (`ProjectMembership.metadata.teamreel_assets`):

```json
{
  "teamreel_assets": {
    "images": {
      "closeup": { "home": { "raw": "...", "processed": "..." } }
    }
  }
}
```

**Probleem**: Een keeper die ook speler is, heeft maar één closeup. In werkelijkheid:
- Keeper-closeup: in keeperstenue, handschoenen
- Speler-closeup: in veldtenue, zonder handschoenen

### 1.2 Gewenste situatie

Assets worden opgeslagen **per rol** binnen een member:

```json
{
  "teamreel_assets": {
    "roles": {
      "keeper": {
        "images": {
          "closeup": { "raw": "...", "processed": "..." },
          "fullbody": { "raw": "...", "processed": "..." },
          "halfbody": { "raw": "...", "processed": "..." }
        },
        "videos": {
          "short_intro": { "raw": "...", "processed": "..." },
          "goal_celebration": { "raw": "...", "processed": "..." }
        }
      },
      "player": {
        "images": {
          "closeup": { "raw": "...", "processed": "..." },
          "fullbody": { "raw": "...", "processed": "..." }
        },
        "videos": {
          "short_intro": { "raw": "...", "processed": "..." }
        }
      }
    }
  }
}
```

### 1.3 Impactanalyse

| Component | Impact |
|-----------|--------|
| Backend: `ProjectMembership.metadata` | Schema migratie (non-destructive) |
| Backend: Asset upload endpoints | Moet `role` parameter accepteren |
| Backend: Asset processing pipeline | Moet role-context meesturen |
| Frontend: Member detail panel | Tabs per rol i.p.v. per asset type |
| Frontend: Selectie grid | Asset status per rol tonen |
| Video generation | Template selecteert assets o.b.v. rol |

---

## 2. Fasering

| Fase | Titel | Effort | Focus |
|------|-------|--------|-------|
| H0 | Schema Extensie & Migratie | ~4 uur | Backend |
| H1 | Asset Upload API per Rol | ~6 uur | Backend |
| H2 | Asset Display per Rol (Frontend) | ~6 uur | Frontend |
| H3 | Processing Pipeline per Rol | ~4 uur | Backend |
| H4 | Video Templates per Rol | ~4 uur | Backend + Templates |

---

## 3. Designbeslissingen

### 3.1 Backward compatibility

**Aanpak**: Gradual migration
1. Oude assets blijven op root level (fallback)
2. Nieuwe uploads gaan naar `roles.{role}`
3. Read-logic: check `roles.{role}` first, dan fallback naar root

```python
def get_member_asset(member, asset_type, role=None):
    assets = member.metadata.get('teamreel_assets', {})

    # Try role-specific first
    if role and 'roles' in assets:
        role_assets = assets['roles'].get(role, {})
        if asset_type in role_assets.get('images', {}):
            return role_assets['images'][asset_type]

    # Fallback to root (legacy)
    return assets.get('images', {}).get(asset_type)
```

### 3.2 Default role

Als geen rol gespecificeerd:
- Bij upload: gebruik primaire rol van member
- Bij display: toon assets van primaire rol

### 3.3 Shared vs. role-specific

| Asset | Per Rol | Gedeeld |
|-------|---------|---------|
| Closeup in tenue | ✅ | |
| Fullbody in tenue | ✅ | |
| Halfbody in tenue | ✅ | |
| Short intro | ✅ | |
| Goal celebration | ✅ (keeper ≠ speler viering) | |
| Profielfoto (headshot) | | ✅ |
| Action photo | | ✅ |

---

## 4. Acceptatiecriteria

### Backend
- [ ] Schema ondersteunt assets per rol
- [ ] API accepteert `role` parameter bij upload
- [ ] Backward compatible met bestaande assets
- [ ] Processing pipeline kent rol-context
- [ ] Unit tests voor nieuwe schema

### Frontend
- [ ] Member detail toont tabs per rol bij multi-role leden
- [ ] Asset upload UI vraagt om rol selectie
- [ ] Selectie grid toont asset-status per rol
- [ ] Single-role leden: geen extra UI complexiteit

### Video Generation
- [ ] Templates selecteren correcte assets o.b.v. rol
- [ ] Keeper-lineup: keeper-assets
- [ ] Speler-lineup: speler-assets

---

## 5. Open vragen

1. **Migratie bestaande data**: Automatisch toewijzen aan primaire rol, of handmatig?
2. **Storage quota**: Verdubbelt opslag bij multi-role. Acceptabel?
3. **Processing costs**: Meer AI-processing bij meerdere rollen. Budget impact?

---

## 6. Risico's

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Schema migratie breekt bestaande data | Hoog | Gradual migration + fallback |
| UI wordt te complex | Medium | Single-role leden: simplified UX |
| Storage kosten | Laag | Monitor, cap aantal rollen |
