# 339-B70 — Assets Per Role

| | |
|---|---|
| Code | B70 |
| Status | � READY |
| Prioriteit | Hoog |
| Geschatte effort | ~28 uur |
| Afhankelijkheid | F26 H13 (multi-role UI, done) |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie

Assets worden opgeslagen op **member-niveau** in `ProjectMembership.metadata.teamreel_assets`:

```json
{
  "teamreel_assets": {
    "images": {
      "closeup": { "home": { "raw": "...", "processed": "..." } },
      "fullbody": { "home": { "raw": "...", "processed": "..." } },
      "halfbody": { "home": { "raw": "...", "processed": "..." } }
    },
    "videos": {
      "intro": { "home": { "raw": "...", "processed": "..." } },
      "celebration": { "home": { "raw": "...", "processed": "..." } }
    },
    "media": {
      "profile": { "url": "...", "caption": "" },
      "kit": { "url": "..." },
      "closeup": { "url": "..." }
    }
  }
}
```

**Probleem**: Een lid met meerdere rollen (bijv. keeper + speler) heeft maar één set assets. In werkelijkheid:
- Keeper-closeup: in keeperstenue, met handschoenen, keeper-pose
- Speler-closeup: in veldtenue, zonder handschoenen, speler-pose
- Keeper-intro: intro-video met keepersuitrusting
- Speler-intro: intro-video met veldtenue

### 1.2 Gewenste situatie

Assets worden opgeslagen **per functionele rol** binnen een member:

```json
{
  "teamreel_assets": {
    "roles": {
      "keeper": {
        "images": {
          "closeup": { "goalkeeper": { "raw": "...", "processed": "..." } },
          "fullbody": { "goalkeeper": { "raw": "...", "processed": "..." } },
          "halfbody": { "goalkeeper": { "raw": "...", "processed": "..." } }
        },
        "videos": {
          "intro": { "goalkeeper": { "raw": "...", "processed": "..." } },
          "celebration": { "goalkeeper": { "raw": "...", "processed": "..." } }
        }
      },
      "player": {
        "images": {
          "closeup": { "home": { "raw": "...", "processed": "..." } },
          "fullbody": { "home": { "raw": "...", "processed": "..." } }
        },
        "videos": {
          "intro": { "home": { "raw": "...", "processed": "..." } }
        }
      }
    },
    "media": { ... },
    "images": { ... },
    "videos": { ... }
  }
}
```

### 1.3 Impactanalyse — Touchpoints

| # | Component | Bestand(en) | Impact |
|---|-----------|-------------|--------|
| 1 | **Metadata write-path** | `src/video/tasks/asset_processing.py` → `_update_variant_metadata()` | Moet naar `roles.{role}.*` schrijven |
| 2 | **Celery task** | `src/video/tasks/asset_processing.py` → `process_member_asset()` | Moet `role` parameter accepteren |
| 3 | **Asset processor** | `src/video/services/asset_processor.py` → `process_asset()` | Role in S3 pad scoping |
| 4 | **Serializer** | `src/projects/api/serializers.py` → `get_metadata()` | Role-aware asset blending |
| 5 | **Frontend read** | `demo/src/utils/mediaHelpers.ts` | `getMediaProcessingState()` per rol |
| 6 | **Frontend status** | `demo/src/utils/assetStatus.ts` | `getMemberAssetStatus()` per rol |
| 7 | **MemberDetailPanel** | `demo/src/pages/periods/MemberDetailPanel.tsx` | Role-tabs voor assets |
| 8 | **MemberAssetsTab** | `demo/src/pages/periods/MemberAssetsTab.tsx` | Per-kit per-rol asset cards |
| 9 | **AI generation** | `demo/src/pages/periods/MemberAiModal.tsx` | Role context bij generatie |
| 10 | **Hub Selectie** | `demo/src/pages/identity/HubSelectieTab.tsx` | Asset status dot per rol |
| 11 | **Member Summary** | `demo/src/pages/identity/MemberSummarySheet.tsx` | Slot presence per rol |
| 12 | **Video lineup** | `src/video/services/lineup_composer.py` | Asset selectie o.b.v. rol |

---

## 2. Designbeslissingen

### 2.1 Backward compatibility — Gradual migration

**Strategie**: Dual-write + fallback-read
1. **Fase 1**: Read-helpers lezen van `roles.{role}.*`, met fallback naar root
2. **Fase 2**: Writes gaan naar `roles.{role}.*` EN root (dual-write)
3. **Fase 3**: Management command migreert bestaande root-assets naar rol-structuur
4. **Fase 4**: Na verificatie: stop dual-write, alleen role-based

### 2.2 Rol-naar-kit mapping

Per rol is er een default kit_type:
| Functionele rol | Default kit | Beschikbare kits |
|-----------------|-------------|------------------|
| `keeper` | `goalkeeper` | goalkeeper |
| `player` | `home` | home, away, third |
| `coach` | — | — (geen tenue assets) |
| `assistant` | — | — (geen tenue assets) |

### 2.3 Asset types per rol

Niet alle asset types zijn relevant voor alle rollen:
| Asset type | Player | Keeper | Coach/Staf |
|-----------|--------|--------|------------|
| `fullbody` | ✓ | ✓ | — |
| `halfbody` | ✓ | ✓ | — |
| `closeup` | ✓ | ✓ | — |
| `intro` | ✓ | ✓ | — |
| `celebration` | ✓ | ✓ | — |
| `profile` | ✓ | ✓ | ✓ |
| `action_photo` | ✓ | ✓ | — |

### 2.4 API interface

Bestaande endpoints krijgen optionele `role` parameter:
```
POST /api/v1/video/process-asset/
{
  "membership_id": "...",
  "asset_type": "closeup",
  "kit_type": "goalkeeper",
  "role": "keeper"          ← NEW, optioneel (fallback: primary role)
}
```

---

## 3. Fasering

| Fase | Titel | Effort | Laag | Afhankelijkheid |
|------|-------|--------|------|-----------------|
| H0 | Read-Abstractie & Helpers | ~2 uur | Backend + Frontend | — |
| H1 | Backend Write-Path per Rol | ~3 uur | Backend | H0 |
| H2 | Celery Task + Processor Role Param | ~3 uur | Backend | H1 |
| H3 | Frontend Role Asset Hooks | ~2 uur | Frontend | H0 |
| H4 | MemberDetailPanel Role Tabs | ~4 uur | Frontend | H3 |
| H5 | AI Generatie per Rol | ~3 uur | Frontend + Backend | H4 |
| H6 | Selectie & Summary per Rol | ~2 uur | Frontend | H3 |
| H7 | Video Lineup per Rol | ~3 uur | Backend | H2 |
| H8 | Data Migratie Command | ~3 uur | Backend | H1, H2 |
| H9 | Cleanup & Dual-Write Stop | ~2 uur | Backend + Frontend | H8 |
| HX | End-to-End Test & Verificatie | ~1 uur | Test | H0–H9 |

---

## 4. Acceptatiecriteria

### Backend
- [ ] `_update_variant_metadata()` schrijft naar `roles.{role}.*` (+ root dual-write)
- [ ] `process_member_asset` Celery task accepteert `role` parameter
- [ ] S3 storage pad bevat role: `members/{id}/processed/{role}/{type}/{kit}.png`
- [ ] Serializer levert role-based assets in API response
- [ ] Management command migreert bestaande assets naar role-structuur
- [ ] Video lineup selecteert assets o.b.v. functionele rol van lid

### Frontend
- [ ] `getAssetsForRole()` helper leest per-rol met root-fallback
- [ ] `getMemberAssetStatus()` kan per rol status berekenen
- [ ] MemberDetailPanel heeft role-tabs (bijv. Keeper / Speler)
- [ ] AI generatie stuurt role context mee
- [ ] Selectie UI toont asset completeness per rol
- [ ] MemberSummarySheet toont slots per actieve rol

### Kwaliteit
- [ ] TypeScript 0 errors, Vite build success
- [ ] Bestaande assets blijven werken (backward compat)
- [ ] Geen N+1 queries (context caching behouden)
- [ ] WCAG 2.1 AA op alle nieuwe UI elementen
- [ ] pytest tests voor role-based asset read/write

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
