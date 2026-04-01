# 357-F35 — Content Pipeline Refactor

| | |
|---|---|
| Code | F35 |
| Status | 📐 READY |
| Prioriteit | Hoog |
| Geschatte effort | ~16 uur |
| Afhankelijkheden | B70 (assets per role, done), B55 (video pipeline, done), B39 (activities, done) |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

Reverse engineering van de lineup video pipeline heeft structurele problemen blootgelegd. Het platform kan video’s genereren, maar de onderliggende datalagen zijn niet goed verbonden.

### 1.1 Kritisch (🔴) — In scope

**Probleem A — Lineup leeft alleen in metadata JSON**
Wanneer een gebruiker een lineup opslaat (via Dashboard, Wizard, of Match Detail), wordt dit opgeslagen als `Activity.metadata.lineup = {formation, goalkeeper[], player[]}`. Er worden **geen Participation records** aangemaakt. Gevolg:
- Lineup data is niet queryable (wie speelde wanneer, op welke positie)
- Formatie + positie (LB, CM, ST) worden niet vastgelegd in de database
- Geen rapportage over selecties
- Video builder omzeilt dit door `selected_member_ids` mee te sturen bij generatie

**Probleem B — Geen tenue-validatie bij positie-toewijzing**
De keeper-positie (slot 1, GK) kan gevuld worden met elke speler, ook als die geen keeper-tenue asset heeft. En omgekeerd: een member met alleen keeper-tenue kan op een veldpositie gezet worden. Er is geen validatie dat:
- GK-slot → alleen members met `goalkeeper` kit assets
- Veldposities → alleen members met `home` kit assets

### 1.2 Later (Q-items)

De volgende problemen zijn geïdentificeerd maar vallen buiten deze feature:
- **Squad readiness dashboard** — geen aggregaat overzicht van asset-completeness → Q-item
- **Seizoen-filter in wizard** — squad selectors tonen oud-spelers → Q-item
- **Competition name uit Period** — metadata string i.p.v. afgeleid uit Period tree → Q-item

---

## 2. Doel

1. **Lineup = Participations** — één bron van waarheid, queryable, met formatie + positie per speler
2. **Tenue-validatie** — keeper-slot alleen voor members met keeper assets, veldposities alleen voor members met thuis-tenue
3. **Formatie bepaalt posities** — 4-3-3 / 4-4-2 / 3-4-3 elk met eigen positie-layout, opgeslagen per Participation

---

## 3. Huidige staat (reverse engineering)

### Data flow — Lineup Video

```
Frontend (Dashboard / Wizard / Match Detail)
  → Gebruiker kiest: Formation (4-3-3/4-4-2/3-4-3) + Members per slot
  → Opslaan: PATCH /activities/{id}/ → metadata.lineup (JSON blob)
    → { formation: "4-3-3", goalkeeper: [pm_id], player: [pm_id, pm_id, ...] }
    → Slot-volgorde = positie-volgorde (slot 2=LB, slot 3=CB, etc.)
  → Genereren: POST /video/jobs/lineup-from-template/
    → selected_member_ids + formation meegegeven door frontend

Backend VideoJob
  → LineupSegmentBuilder(formation="4-3-3")
    → Splitst spelers via FORMATION_SPLITS: {4-3-3: (4,3,3), 4-4-2: (4,4,2), 3-4-3: (3,4,3)}
    → Haalt per member: fullbody (kit_url), intro (intro_url), closeup (closeup_url)
    → Kit: "goalkeeper" voor keeper-slot, "home" voor veldspelers
    → FFmpeg compositing → MP4 → S3 → MediaItem
```

### Formatie-posities (frontend FORMATION_LAYOUTS)

| Formatie | Slot 1 | Slots 2-5 | Slots 5/6-8/9 | Slots 9/10-11 |
|----------|--------|-----------|----------------|----------------|
| 4-3-3 | GK | LB, CB, CB, RB | CM, CDM, CM | LW, ST, RW |
| 4-4-2 | GK | LB, CB, CB, RB | LM, CM, CM, RM | ST, ST |
| 3-4-3 | GK | CB, CB, CB | LWB, CM, CM, RWB | LW, ST, RW |

### Betrokken modellen

| Model | Rol | Probleem |
|-------|-----|----------|
| `Activity` | Wedstrijd container | `metadata.lineup` is niet-relationeel |
| `Participation` | Speler↔Wedstrijd | Wordt niet aangemaakt bij lineup save |
| `Participation.member` | FK naar `organisations.Membership` | **Moet naar `ProjectMembership`** (assets + seizoen zitten daar) |
| `ProjectMembership` | Speler↔Team (+seizoen) | Bevat `metadata.teamreel_assets` |
| `VideoJob` | Video generatie | Leest formation, geen posities opgeslagen |

### Design beslissingen

| Beslissing | Keuze | Reden |
|------------|-------|-------|
| Participation.member FK | → `ProjectMembership` | Assets, seizoen, team allemaal op PM; voorkomt extra lookups |
| Tenue scope | Alleen thuis + keeper | Geen uit-tenue nodig; away/third later desgewenst |
| Bankspelers | Ja, als `role="substitute"` | Complete wedstrijdselectie, weinig extra werk |
| Formatie + positie | Opslaan in `Participation.data` | `{slot, position, formation, line}` per speler |

### Betrokken bestanden

**Backend:**
- `src/activities/api/serializers_activity.py` — ActivitySerializer.update() doet geen participation sync
- `src/video/services/lineup_builder.py` — Bepaalt video-layout op basis van formation, leest geen posities uit DB
- `src/video/utils/asset_metadata.py` — `resolve_lineup_member_assets()` haalt assets per kit_type
- `src/activities/models.py` — Participation model (member FK moet wijzigen naar ProjectMembership)

**Frontend:**
- `demo/src/components/dashboard/useLineupSheet.ts` — Slaat lineup op in metadata, niet als participations
- `demo/src/components/MatchWizardV2/hooks/useSquadData.ts` — Zelfde save pattern
- `demo/src/pages/identity/content-generation/contentGenConstants.ts` — FORMATION_LAYOUTS met posities per slot

---

## 4. Fasering

| Fase | Titel | Effort | Impact |
|------|-------|--------|--------|
| H0 | Lineup → Participation Sync | ~12 uur | Lineup + formatie + posities worden relationeel, queryable |
| H1 | Tenue-validatie bij lineup | ~4 uur | Keeper-slot alleen voor keeper-tenue, veldposities alleen voor thuis-tenue |

### Later (Q-items)
- Squad Readiness Dashboard (~10u)
- Season-scoped Squad Everywhere (~6u)
- Competition Name from Period (~4u)

---

## 5. Acceptatiecriteria

### Must have
- [ ] Lineup opslaan creëert/update Participation records per speler + bankspeler
- [ ] `Participation.data` bevat `{slot, position, formation, line}` (bijv. `{slot: 3, position: "CB", formation: "4-3-3", line: "defender"}`)
- [ ] `Participation.member` → `ProjectMembership` FK (niet organisations.Membership)
- [ ] Video builder leest Participations als primaire bron, fallback naar metadata
- [ ] GK-slot accepteert alleen members met `goalkeeper` kit assets
- [ ] Veldposities accepteren alleen members met `home` kit assets
- [ ] Bestaande metadata.lineup blijft werken als fallback (backward compat)

### Should have
- [ ] Migratie-script voor bestaande metadata.lineup → Participations
- [ ] Frontend toont waarschuwing bij member zonder juiste tenue voor positie

### Nice to have
- [ ] Rapportage: selecties per lid per seizoen (vanuit Participations)
