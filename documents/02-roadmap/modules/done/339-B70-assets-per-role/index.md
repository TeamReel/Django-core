# 339-B70 — Assets Per Role + Variant Nesting

| | |
|---|---|
| Code | B70 |
| Status | ✅ DONE |
| Prioriteit | Hoog |
| Geschatte effort | ~31 uur |
| Voortgang | H0–HX done (11/11 fases) |
| Afhankelijkheid | F26 H13 (multi-role UI, done) |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

### 1.1 Huidige situatie

Assets worden opgeslagen op **member-niveau** in `ProjectMembership.metadata.teamreel_assets`.

**Drie problemen:**

**Probleem A — Geen rolscheiding**: Een lid met meerdere rollen (keeper + speler) heeft maar één set assets. Maar een keeper-closeup (keeperstenue, handschoenen) is iets heel anders dan een speler-closeup (veldtenue).

**Probleem B — Suffix-based variants**: Video-varianten als suffix op kit_type: `home_arms_crossed`. Moet geparsed worden met `split("_", 1)` op 6+ plekken. Semantisch onduidelijk.

**Probleem C — 5-staps fallback chain**: Door 4 historische formaten bevat `job.py:640-682` een 5-staps fallback chain. Geen bugs meer, maar onnodige complexiteit die elke read raakt.

**Huidige formaten in productie:**

| Era | Formaat | Voorbeeld | Geschat % |
|-----|---------|-----------|-----------|
| Q1 2024 | Flat media | `media.kit.url = "s3://..."` | ~2-5% |
| Q2 2024 | Bare keys | `videos.intro.arms_crossed = {...}` | ~10-15% |
| Q2-Q3 | Composite strings | `videos.intro.home_arms_crossed = "url"` | ~5-10% |
| Q3+ 2024 | Composite objects | `videos.intro.home_arms_crossed = {raw, processed, ...}` | ~70-75% |

### 1.2 Gewenste situatie

**Eén formaat. Geen fallbacks. Clean break.**

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
    "media": { ... }
  }
}
```

**Structuur**: `roles.{rol}.{images|videos}.{type}.{kit}.{variant} = variant_value`

**Na migratie**: root-level `images` en `videos` keys worden verwijderd. Geen fallbacks nodig.

### 1.3 Impactanalyse — Touchpoints

**26 touchpoints** (19 backend, 7 frontend). Alle worden in één keer omgezet.

#### Backend — Write (8 locaties, suffix → genest)

| # | Bestand | Functie |
|---|---------|---------|
| 1 | `src/video/tasks/asset_processing.py:54` | `_update_variant_metadata()` |
| 2 | `src/video/tasks/asset_processing.py:100` | `_get_variant_state()` |
| 3 | `src/video/views/job.py:637` | `process_asset()` |
| 4 | `src/video/views/job.py:1331` | `_set_variant_metadata()` |
| 5 | `src/video/views/job.py:1377` | `_get_variant_metadata()` |
| 6 | `src/generative/views_asset.py:3697` | Propagate image approval |
| 7 | `src/generative/views_asset.py:3846` | Propagate video approval |
| 8 | `src/video/management/commands/process_teamreel_assets.py:125` | Batch write |

#### Backend — Read (6 locaties, split/fallback → geneste lookup)

| # | Bestand | Huidig | Wordt |
|---|---------|--------|-------|
| 9 | `src/video/views/job.py:640-682` | 5-staps fallback | Directe dict-lookup |
| 10 | `src/video/views/job.py:912` | `split("_", 1)` | Dict iteration |
| 11 | `src/video/views/job.py:1262` | `split("_", 1)` | Dict iteration |
| 12 | `src/video/management/commands/reprocess_pending_assets.py:343` | `split("_", 1)` | Dict iteration |
| 13 | `src/video/management/commands/reset_processed_teamreel_assets.py:371` | `split("_", 1)` | Dict iteration |
| 14 | `src/generative/views_asset.py:3957` | `startswith()` | Dict iteration |

#### Backend — S3 paden (5 locaties in asset_processor.py)

| # | Lijn | Huidig | Wordt |
|---|------|--------|-------|
| 15-19 | :247, :479, :582, :788, :1025 | `{type}/{kit}{_variant}_{hash}.{ext}` | `{role}/{type}/{kit}/{variant}_{hash}.{ext}` |

#### Frontend (7 locaties, read-only)

| # | Bestand |
|---|---------|
| 20 | `demo/src/utils/mediaHelpers.ts` |
| 21 | `demo/src/utils/assetStatus.ts` |
| 22 | `demo/src/pages/periods/MemberDetailPanel.tsx` |
| 23 | `demo/src/pages/periods/MemberAssetsTab.tsx` |
| 24 | `demo/src/pages/identity/HubSelectieTab.tsx` |
| 25 | `demo/src/pages/identity/MemberSummarySheet.tsx` |
| 26 | `demo/src/components/ActiveJobsModal/ActiveJobsModal.tsx` |

---

## 2. Designbeslissingen

### 2.1 Clean Break — Geen Fallbacks

**Strategie**: One-shot migratie, geen dual-write, geen fallback-lagen.

**Waarom niet gradual/dual-write?**
- De codebase heeft al 4 historische formaten met een 5-staps fallback chain
- Dual-write voegt een 5e formaat toe met nóg meer fallback-complexiteit
- Feature flags voor fallbacks worden nooit opgeruimd
- We bouwen de app nog — dit is het moment om het goed te doen

**Deploy-draaiboek:**
1. Deploy nieuwe code (leest nieuw formaat, schrijft nieuw formaat)
2. Pause Celery workers (~30 sec)
3. Run migratie: `python manage.py migrate_asset_metadata`
4. Resume Celery workers
5. Verify: `python manage.py verify_asset_metadata`

**Rollback**: git revert + herstart. Migratie is reversible (oud formaat wordt als backup bewaard in `_legacy_assets`).

### 2.2 Variant-nesting

**Was**: `{kit}_{variant}` → `"home_arms_crossed"` (suffix, string-parsing nodig)
**Wordt**: `{kit}.{variant}` → `"home": { "arms_crossed": {...} }` (genest, dict-lookup)

- **`"default"`** = standaard variant (was: geen suffix)
- Images: typisch alleen `"default"` per kit
- Videos: meerdere varianten per kit (default, arms_crossed, thumbs_up, etc.)
- `split("_", 1)` verdwijnt volledig uit codebase

### 2.3 S3-padstructuur

**Was**: `members/{id}/processed/{type}/{kit}{_variant}_{hash}.{ext}`
**Wordt**: `members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}`

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

### 2.6 Shared vs. role-specific

| Asset | Per Rol | Gedeeld |
|-------|---------|---------|
| Closeup in tenue | ✅ | |
| Fullbody in tenue | ✅ | |
| Halfbody in tenue | ✅ | |
| Intro video | ✅ (multi-variant) | |
| Celebration video | ✅ (multi-variant) | |
| Profielfoto (headshot) | | ✅ |
| Action photo | | ✅ |

### 2.7 API interface

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

- `role` verplicht (geen default-guessing)
- `variant_id` default `"default"` als niet meegegeven
- `kit_type` en `variant_id` altijd aparte velden, nooit gecombineerd

### 2.8 Default role

- Bij upload: role is verplicht (UI stuurt geselecteerde rol mee)
- Bij display: primaire rol als default tab
- Leden met 1 rol: geen role selector getoond

---

## 3. Fasering

| Fase | Titel | Effort | Laag | Afhankelijkheid |
|------|-------|--------|------|-----------------|
| H0 | Schema + Read/Write Helpers | ~2 uur | Backend + Frontend | — |
| H1 | One-Shot Migratie Command | ~4 uur | Backend | H0 |
| H2 | Backend Write-Path (alle 8 locaties) | ~3 uur | Backend | H0 |
| H3 | Backend Read-Path + Fallback Opruimen | ~3 uur | Backend | H0 |
| H4 | Celery + S3 + Management Commands | ~3 uur | Backend | H2 |
| H5 | Frontend Types + Hooks | ~2 uur | Frontend | H0 |
| H6 | MemberDetailPanel Role Tabs + Variants | ~4 uur | Frontend | H5 |
| H7 | AI Generatie per Rol | ~3 uur | Backend + Frontend | H6 |
| H8 | Selectie & Summary per Rol | ~2 uur | Frontend | H5 |
| H9 | Video Lineup per Rol | ~3 uur | Backend | H2 |
| HX | E2E Test + Deploy Draaiboek | ~2 uur | Full-stack | Alle |

---

## 4. Acceptatiecriteria

### Backend — Variant nesting
- [ ] Alle 8 write-locaties gebruiken genest formaat `{kit}.{variant}`
- [ ] Alle 6 read-locaties gebruiken directe dict-lookups
- [ ] `split("_", 1)` verdwenen uit asset code
- [ ] 5-staps fallback chain in `job.py` verwijderd
- [ ] `variant_id` default `"default"` (nooit leeg/None)

### Backend — Role scoping
- [ ] `_update_variant_metadata()` schrijft naar `roles.{role}.*`
- [ ] `process_member_asset` accepteert `role` als verplicht veld
- [ ] S3: `members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}`
- [ ] Serializer levert role-based assets
- [ ] Video lineup selecteert assets o.b.v. functionele rol

### Migratie
- [ ] `migrate_asset_metadata` converteert alle 4 legacy formaten → nieuw
- [ ] `verify_asset_metadata` checkt dat alle data correct gemigreerd is
- [ ] Migratie is idempotent en reversible
- [ ] Deploy-draaiboek getest met `--dry-run`

### Frontend
- [ ] `getAssetsForRole()` leest geneste structuur (geen fallback)
- [ ] `getMemberAssetStatus()` per rol
- [ ] MemberDetailPanel met role-tabs + variant grid
- [ ] AI generatie stuurt role + variant mee
- [ ] Selectie UI toont completeness per rol

### Kwaliteit
- [ ] TypeScript 0 errors, Vite build success
- [ ] `pytest` all green
- [ ] Geen N+1 queries
- [ ] WCAG 2.1 AA op alle nieuwe UI
- [ ] Geen `split("_", 1)` in codebase
- [ ] Geen fallback-code in reads
