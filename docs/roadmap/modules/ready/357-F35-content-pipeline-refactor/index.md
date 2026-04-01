# 357-F35 — Content Pipeline Refactor

| | |
|---|---|
| Code | F35 |
| Status | 📐 READY |
| Prioriteit | Hoog |
| Geschatte effort | ~20 uur |
| Afhankelijkheden | B70 (assets per role, done), B55 (video pipeline, done), B39 (activities, done), B32 (sport config, done) |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

Reverse engineering van de lineup video pipeline heeft structurele problemen blootgelegd.

### 1.1 Kritisch (🔴) — In scope

**Probleem A — Lineup leeft alleen in metadata JSON**
Lineup wordt opgeslagen als `Activity.metadata.lineup = {formation, goalkeeper[], player[]}`. Er worden **geen Participation records** aangemaakt. Gevolg:
- Lineup data is niet queryable (wie speelde wanneer, op welke positie)
- Formatie + positie (LB, CM, ST) worden niet vastgelegd in de database
- Geen rapportage over selecties
- Video builder omzeilt dit door `selected_member_ids` mee te sturen bij generatie

**Probleem B — Formaties zijn hardcoded in frontend**
Het `Formation` model bestaat al (B32) met `positions` JSON, `sport_config` FK, en API endpoint. Maar de frontend gebruikt nog steeds **hardcoded `FORMATION_LAYOUTS`** (~18 plekken). Posities komen niet uit de database en zijn dus niet configureerbaar per sport.

**Probleem C — Geen tenue-validatie bij positie-toewijzing**
GK-slot kan gevuld worden met spelers zonder keeper-tenue, en omgekeerd. Er is geen validatie dat assets matchen met de positie.

### 1.2 Later (Q-items)

- **Squad readiness dashboard** → Q050
- **Seizoen-filter in wizard** → Q051
- **Competition name uit Period** → Q052

---

## 2. Doel

1. **Formaties uit database** — `Formation` model (B32) als enige bron, frontend haalt uit API
2. **Lineup = Participations** — per wedstrijd: welke formatie, welke member op welke positie
3. **Activity ↔ Formation** — per wedstrijd de gebruikte tactiek vastleggen
4. **Tenue-validatie** — keeper-slot alleen voor keeper-tenue, veldposities alleen voor thuis-tenue
5. **Sport-agnostisch** — Football 11v11 nu, maar model werkt voor elke sport via `sport_config`

---

## 3. Huidige staat

### Wat al bestaat (B32 Sport Configuration)

| Component | Status | Locatie |
|-----------|--------|---------|
| `Formation` model | ✅ Bestaat | `src/sport_configuration/models.py` |
| `Formation.positions` JSONField | ✅ Bestaat | `[{slot, position, x, y}]` — zelfde structuur als frontend |
| `Formation.sport_config` FK | ✅ Bestaat | Gekoppeld aan sport variant (Football 11v11) |
| `FormationViewSet` + API | ✅ Bestaat | `GET /sport-configuration/formations/` |
| `FormationSerializer` | ✅ Bestaat | Inclusief positions, code, name |
| Frontend `masterData.ts` fetch | ✅ Bestaat | `fetchFormations()` → API call |
| Frontend `FORMATION_LAYOUTS` | ❌ Hardcoded | 18 plekken gebruiken constant i.p.v. API |

### Data flow nu

```
Frontend
  → FORMATION_LAYOUTS["4-3-3"].positions (hardcoded constant)
  → Lineup opslaan: metadata.lineup = {formation: "4-3-3", goalkeeper: [...], player: [...]}
  → Video genereren: selected_member_ids + formation string meegegeven

Backend
  → FORMATION_SPLITS["4-3-3"] = (4, 3, 3) (hardcoded dict)
  → Splitst spelers in defender/midfielder/attacker lijnen
```

### Data flow na F35

```
Frontend
  → Formation uit API (/sport-configuration/formations/?sport_config=X)
  → Activity.formation = FK naar Formation record
  → Lineup opslaan → Participation records met slot + positie
  → Video genereren: leest Participations uit DB

Backend
  → Formation.positions uit database (niet hardcoded)
  → Participation.data = {slot, position, formation_id, line}
  → Video builder leest uit Participations + Formation.positions
```

### Betrokken modellen

| Model | Rol | Wijziging |
|-------|-----|-----------|
| `Formation` | Formatie stamdata (B32) | Al correct, seed data nodig |
| `Activity` | Wedstrijd container | **Nieuw: `formation` FK naar Formation** |
| `Participation` | Speler↔Wedstrijd | **Nieuw: `project_membership` FK**, role/data per positie |
| `ProjectMembership` | Speler↔Team (+seizoen) | Ongewijzigd, bevat assets |

### Design beslissingen

| Beslissing | Keuze | Reden |
|------------|-------|-------|
| Participation.member FK | → nieuw `project_membership` FK (behoud oud veld) | Assets + seizoen op PM |
| Activity.formation | FK naar `Formation` model | Welke tactiek per wedstrijd |
| Formation stamdata | Seed vanuit bestaande `FORMATION_LAYOUTS` | Exacte match frontend ↔ DB |
| Tenue scope | Alleen thuis + keeper | Geen uit-tenue; later uitbreidbaar |
| Bankspelers | `role="substitute"` Participations | Complete wedstrijdselectie |
| Sport-agnostisch | Via `Formation.sport_config` FK | Andere sporten later, zelfde structuur |

### Betrokken bestanden

**Backend:**
- `src/sport_configuration/models.py` — Formation model (al correct)
- `src/activities/models.py` — Activity (formation FK), Participation (project_membership FK)
- `src/activities/api/serializers_activity.py` — Lineup sync hook
- `src/video/services/lineup_builder.py` — `FORMATION_SPLITS` hardcoded, moet uit DB
- `src/video/utils/asset_metadata.py` — Kit readiness check

**Frontend:**
- `demo/src/pages/identity/content-generation/contentGenConstants.ts` — `FORMATION_LAYOUTS` (te vervangen)
- `demo/src/components/dashboard/useLineupSheet.ts` — Lineup save + formation uit API
- `demo/src/components/MatchWizardV2/hooks/useSquadData.ts` — Zelfde
- `demo/src/pages/activities/match-detail/MatchLineupField.tsx` — Zelfde
- `demo/src/utils/masterData.ts` — `fetchFormations()` (al aanwezig)

---

## 4. Fasering

| Fase | Titel | Effort | Impact |
|------|-------|--------|--------|
| H0 | Lineup → Participation Sync + Formation uit DB | ~14 uur | Lineup + formatie + posities relationeel, formation uit stamdata |
| H1 | Tenue-validatie bij lineup | ~4 uur | Keeper-slot = keeper-tenue, veldposities = thuis-tenue |

### Later (Q-items)
- Q050 — Squad Readiness Dashboard (~10u)
- Q051 — Season-scoped Squad Everywhere (~6u)
- Q052 — Competition Name from Period (~4u)

---

## 5. Acceptatiecriteria

### Must have
- [ ] `Formation` records in DB voor 4-3-3, 4-4-2, 3-4-3 (seed data)
- [ ] `Activity.formation` FK naar `Formation` — welke tactiek per wedstrijd
- [ ] Lineup opslaan creëert/update Participation records per speler + bankspeler
- [ ] `Participation.data` bevat `{slot, position, formation_id, line}`
- [ ] `Participation.project_membership` FK naar `ProjectMembership`
- [ ] Frontend leest formaties uit API i.p.v. hardcoded `FORMATION_LAYOUTS`
- [ ] Video builder leest Participations + Formation uit DB als primaire bron
- [ ] GK-slot accepteert alleen members met `goalkeeper` kit assets
- [ ] Veldposities accepteren alleen members met `home` kit assets
- [ ] Bestaande metadata.lineup blijft werken als fallback (backward compat)

### Should have
- [ ] Migratie-script voor bestaande metadata.lineup → Participations
- [ ] Frontend toont waarschuwing bij member zonder juiste tenue

### Nice to have
- [ ] Rapportage: selecties per lid per seizoen
- [ ] Admin UI om formaties te beheren per sport
