# 339-B70 — Assets Per Role

| | |
|---|---|
| Code | B70 |
| Status | � READY |
| Prioriteit | Hoog |
| Geschatte effort | ~36 uur |
| Afhankelijkheid | F26 H13 (multi-role UI, done) |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie

Assets worden opgeslagen op **member-niveau** in `ProjectMembership.metadata.teamreel_assets`.

**Twee problemen:**

**Probleem A — Geen rolscheiding**: Een lid met meerdere rollen (keeper + speler) heeft maar één set assets. Maar een keeper-closeup (keeperstenue, handschoenen) is iets heel anders dan een speler-closeup (veldtenue).

**Probleem B — Suffix-based variants**: Video-varianten worden opgeslagen als suffix op kit_type:

```json
"videos": {
  "intro": {
    "home": { "raw": "...", "processed": "..." },
    "home_arms_crossed": { "raw": "...", "processed": "..." },
    "home_thumbs_up": { "raw": "...", "processed": "..." }
  }
}
```

Dit geeft problemen:
- Strings parsen om tenue van variant te scheiden (`split("_", 1)` op 6+ plekken)
- Niet makkelijk te tellen hoeveel varianten een tenue heeft
- 5 verschillende fallback-strategieën in `job.py` voor legacy formaten
- Semantisch onduidelijk: `home_arms_crossed` — is `arms` deel van kit of variant?

### 1.2 Gewenste situatie

Assets worden opgeslagen **per functionele rol** met **geneste variant-structuur**:

```json
{
  "teamreel_assets": {
    "roles": {
      "keeper": {
        "images": {
          "closeup": {
            "goalkeeper": { "default": { "raw": "...", "processed": "..." } }
          },
          "fullbody": {
            "goalkeeper": { "default": { "raw": "...", "processed": "..." } }
          }
        },
        "videos": {
          "intro": {
            "goalkeeper": {
              "default": { "raw": "...", "processed": "..." },
              "arms_crossed": { "raw": "...", "processed": "..." }
            }
          },
          "celebration": {
            "goalkeeper": {
              "default": { "raw": "...", "processed": "..." }
            }
          }
        }
      },
      "player": {
        "images": {
          "fullbody": {
            "home": { "default": { "raw": "...", "processed": "..." } },
            "away": { "default": { "raw": "...", "processed": "..." } }
          }
        },
        "videos": {
          "intro": {
            "home": {
              "default": { "raw": "...", "processed": "..." },
              "thumbs_up": { "raw": "...", "processed": "..." },
              "arms_crossed": { "raw": "...", "processed": "..." }
            }
          }
        }
      }
    },
    "media": { ... },
    "images": { ... },
    "videos": { ... }
  }
}
```

**Structuur**: `roles.{rol}.{images|videos}.{type}.{kit}.{variant} = variant_value`

**S3-pad**: `members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}`

**Root-level** (`images`, `videos`) blijft behouden als legacy fallback tijdens migratie.

### 1.3 Impactanalyse — Touchpoints

#### Backend — Write-path (8 locaties suffix-constructie)

| # | Bestand | Functie | Wat |
|---|---------|---------|-----|
| 1 | `src/video/tasks/asset_processing.py:54` | `_update_variant_metadata()` | Hoofd write naar metadata |
| 2 | `src/video/tasks/asset_processing.py:100` | `_get_variant_state()` | Composite key lookup |
| 3 | `src/video/views/job.py:637` | `process_asset()` | Write trigger |
| 4 | `src/video/views/job.py:1331` | `_set_variant_metadata()` | Direct metadata write |
| 5 | `src/video/views/job.py:1377` | `_get_variant_metadata()` | Direct metadata read |
| 6 | `src/generative/views_asset.py:3697` | Propagate image approval | AI pipeline write |
| 7 | `src/generative/views_asset.py:3846` | Propagate video approval | AI pipeline write |
| 8 | `src/video/management/commands/process_teamreel_assets.py:125` | Management command | Batch write |

#### Backend — Read-path (6 locaties suffix-parsing)

| # | Bestand | Parse methode | Wat |
|---|---------|--------------|-----|
| 9 | `src/video/views/job.py:640-682` | 5-staps fallback chain | **Hoogste risico** |
| 10 | `src/video/views/job.py:912` | `split("_", 1)` | process_all_variants |
| 11 | `src/video/views/job.py:1262` | `split("_", 1)` | active_processing_jobs |
| 12 | `src/video/management/commands/reprocess_pending_assets.py:343` | `split("_", 1)` | Re-queue |
| 13 | `src/video/management/commands/reset_processed_teamreel_assets.py:371` | `split("_", 1)` | Reset state |
| 14 | `src/generative/views_asset.py:3957` | `startswith()` loop | Auto-dispatch RVM |

#### Backend — S3 paden (5 locaties in asset_processor.py)

| # | Lijn | Formaat | Huidig pad |
|---|------|---------|------------|
| 15 | :247 | PNG images | `members/{id}/processed/{type}/{kit}{_variant}_{hash}.png` |
| 16 | :479 | MP4 passthrough | idem |
| 17 | :582 | MOV/WebM RVM | idem |
| 18 | :788 | MP4 preview | idem |
| 19 | :1025 | WebM rembg | idem |

#### Frontend (read-only, geen suffix-constructie)

| # | Bestand | Impact |
|---|---------|--------|
| 20 | `demo/src/utils/mediaHelpers.ts` | Lees-logica aanpassen voor genest |
| 21 | `demo/src/utils/assetStatus.ts` | Status per rol + variant |
| 22 | `demo/src/pages/periods/MemberDetailPanel.tsx` | Role-tabs + variant display |
| 23 | `demo/src/pages/periods/MemberAssetsTab.tsx` | Per-kit per-variant cards |
| 24 | `demo/src/pages/identity/HubSelectieTab.tsx` | Asset dots per rol |
| 25 | `demo/src/pages/identity/MemberSummarySheet.tsx` | Slots per rol |
| 26 | `demo/src/components/ActiveJobsModal/ActiveJobsModal.tsx` | Deduplication |

**Totaal: 26 touchpoints** (19 backend, 7 frontend)

---

## 2. Designbeslissingen

### 2.1 Variant-nesting (NIEUW)

**Was**: suffix-based `{kit}_{variant}` → `"home_arms_crossed"`
**Wordt**: genest `{kit}.{variant}` → `"home": { "arms_crossed": {...} }`

Voordelen:
- Geen string-parsing meer (`split("_", 1)` verdwijnt)
- Makkelijk alle varianten van een tenue itereren: `Object.keys(intro.home)`
- Schone API: `kit_type` en `variant_id` zijn aparte velden, nooit gecombineerd
- Fallback-chain in `job.py` wordt drastisch simpeler

Conventie:
- **`"default"`** = de standaard variant (was: geen suffix)
- Images hebben typisch alleen `"default"` (1 foto per kit)
- Videos kunnen meerdere varianten hebben (default, arms_crossed, thumbs_up, etc.)

### 2.2 Backward compatibility — Gradual migration

**Strategie**: Dual-write + fallback-read
1. **Fase 1**: Nieuwe helpers lezen eerst `roles.{role}.*.{kit}.{variant}`, fallback naar root + suffix
2. **Fase 2**: Writes gaan naar nieuw formaat EN oud formaat (dual-write)
3. **Fase 3**: Management command migreert bestaande data (suffix→nested, root→role)
4. **Fase 4**: Na verificatie: stop dual-write, alleen nieuw formaat

### 2.3 S3-padstructuur (NIEUW)

**Was**: `members/{id}/processed/{type}/{kit}{_variant}_{hash}.{ext}`
**Wordt**: `members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}`

Voorbeeld: `members/abc/processed/player/intro/home/arms_crossed_f7a2b1.webm`

Bestaande S3 objecten worden NIET verplaatst — de URL in metadata verwijst al naar het juiste object. Alleen nieuwe uploads gebruiken het nieuwe pad.

### 2.4 Rol-naar-kit mapping

| Functionele rol | Default kit | Beschikbare kits |
|-----------------|-------------|------------------|
| `keeper` | `goalkeeper` | goalkeeper |
| `player` | `home` | home, away, third |
| `coach` | — | — (geen tenue assets) |
| `assistant` | — | — (geen tenue assets) |

### 2.5 Asset types per rol

| Asset type | Player | Keeper | Coach/Staf |
|-----------|--------|--------|------------|
| `fullbody` | ✓ | ✓ | — |
| `halfbody` | ✓ | ✓ | — |
| `closeup` | ✓ | ✓ | — |
| `intro` | ✓ (multi-variant) | ✓ (multi-variant) | — |
| `celebration` | ✓ (multi-variant) | ✓ (multi-variant) | — |
| `profile` | ✓ | ✓ | ✓ |
| `action_photo` | ✓ | ✓ | — |

### 2.6 API interface

Bestaande endpoints krijgen `role` + `variant_id` als aparte velden:
```
POST /api/v1/video/process-asset/
{
  "membership_id": "...",
  "asset_type": "intro",
  "kit_type": "home",
  "variant_id": "arms_crossed",
  "role": "player"
}
```

`variant_id` default naar `"default"` als niet meegegeven.

---

## 3. Fasering

| Fase | Titel | Effort | Laag | Afhankelijkheid |
|------|-------|--------|------|-----------------|
| H0 | Metadata Schema + Read/Write Helpers | ~3 uur | Backend + Frontend | — |
| H1 | Backend Write-Path Refactor | ~4 uur | Backend | H0 |
| H2 | Celery + S3 Paden + Processor | ~3 uur | Backend | H1 |
| H3 | Fallback Chain + AI Pipeline Read-Path | ~4 uur | Backend | H0 |
| H4 | Management Commands Update | ~2 uur | Backend | H1 |
| H5 | Frontend Types + Asset Hooks | ~2 uur | Frontend | H0 |
| H6 | MemberDetailPanel Role Tabs | ~4 uur | Frontend | H5 |
| H7 | AI Generatie per Rol | ~3 uur | Frontend + Backend | H6 |
| H8 | Selectie & Summary per Rol | ~2 uur | Frontend | H5 |
| H9 | Video Lineup per Rol | ~3 uur | Backend | H2 |
| H10 | Data Migratie Command | ~3 uur | Backend | H1, H3 |
| H11 | Cleanup & Dual-Write Stop | ~2 uur | Backend + Frontend | H10 |
| HX | End-to-End Test & Verificatie | ~1 uur | Test | Alle |

---

## 4. Acceptatiecriteria

### Backend — Variant nesting
- [ ] Alle 8 write-locaties gebruiken genest formaat `{kit}.{variant}` i.p.v. suffix
- [ ] Alle 6 read-locaties lezen genest, met suffix-fallback
- [ ] `variant_id` default naar `"default"` (nooit leeg/None in storage)
- [ ] Fallback chain in `job.py` vereenvoudigd
- [ ] `split("_", 1)` verdwenen uit codebase

### Backend — Role scoping
- [ ] `_update_variant_metadata()` schrijft naar `roles.{role}.*` (+ root dual-write)
- [ ] `process_member_asset` accepteert `role` parameter
- [ ] S3 pad: `members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}`
- [ ] Serializer levert role-based assets in API response
- [ ] Management command migreert bestaande data (suffix→nested + root→role)
- [ ] Video lineup selecteert assets o.b.v. functionele rol

### Frontend
- [ ] `getAssetsForRole()` helper leest geneste structuur met fallback
- [ ] `getMemberAssetStatus()` per rol
- [ ] MemberDetailPanel met role-tabs
- [ ] Variant picker/display voor videos (meerdere intro's per tenue)
- [ ] AI generatie stuurt role + variant context mee
- [ ] Selectie UI toont asset completeness per rol

### Kwaliteit
- [ ] TypeScript 0 errors, Vite build success
- [ ] Bestaande assets blijven werken (suffix fallback)
- [ ] Geen N+1 queries
- [ ] WCAG 2.1 AA op alle nieuwe UI elementen
- [ ] pytest tests voor nested variant + role-based read/write

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
