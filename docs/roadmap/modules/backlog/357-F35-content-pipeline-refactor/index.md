# 357-F35 — Content Pipeline Refactor

| | |
|---|---|
| Code | F35 |
| Status | 📋 ROADMAP |
| Prioriteit | Hoog |
| Geschatte effort | ~40 uur |
| Afhankelijkheden | B70 (assets per role, done), B55 (video pipeline, done), B39 (activities, done) |
| Doelgroep | Club Admin, Team Admin |

---

## 1. Probleemanalyse

Reverse engineering van de lineup video pipeline heeft **6 structurele problemen** blootgelegd. Het platform kan video's genereren, maar de onderliggende datalagen zijn niet goed verbonden. Dit leidt tot inconsistente data, gemiste features, en een fragiele pipeline.

### 1.1 Kritsiche problemen (🔴)

**Probleem A — Lineup leeft alleen in metadata JSON**
Wanneer een gebruiker een lineup opslaat (via Dashboard, Wizard, of Match Detail), wordt dit opgeslagen als `Activity.metadata.lineup = {formation, goalkeeper[], player[]}`. Er worden **geen Participation records** aangemaakt. Gevolg:
- Lineup data is niet queryable (wie speelde wanneer)
- Geen rapportage over speelminuten, selecties
- Video builder omzeilt dit door `selected_member_ids` mee te sturen bij generatie

**Probleem B — Thuis/Uit tenue wordt genegeerd**
De video engine leest `Activity.metadata.is_home` maar gebruikt dit alleen voor branding (team naam volgorde). Kit selectie is **hardcoded**: `kit_type = "goalkeeper" | "home"`. Uitwedstrijden tonen altijd het thuistenue. Het data model ondersteunt `home/away/third` kits (B70 heeft dit gebouwd), maar de video builder gebruikt ze nooit.

### 1.2 Belangrijke verbeteringen (🟡)

**Probleem C — Geen squad-level asset readiness**
Per member toont de detail-pagina asset status (🟢/🟡/🔴). Maar er is geen aggregaat overzicht: "8 van 11 spelers klaar voor lineup video". Gebruikers genereren onbewust video's met placeholder silhouetten.

**Probleem D — Squad niet seizoen-gefilterd in wizard**
De Dashboard lineup sheet en MatchWizardV2 halen **alle project members** op, niet seizoen-gefilterd. Spelers van vorige seizoenen verschijnen in de lineup selector. Alleen de Match Detail pagina filtert op seizoen.

### 1.3 Architectureel (🟢)

**Probleem E — Period hiërarchie onderbenut**
De Period hiërarchie (Season → Competition → Week) is gebouwd met recursive CTE's, maar `competition_name` wordt als hardcoded string in metadata opgeslagen i.p.v. afgeleid uit de Period tree. Geen blocker, maar missed verbinding.

**Probleem F — Content dispatching**
Goed opgezet, typed lookup maps, geen actie nodig.

---

## 2. Doel

Een modulaire, consistente content pipeline waarin:
1. **Lineup = Participations** — één bron van waarheid, queryable
2. **Tenue volgt wedstrijd context** — thuis/uit/derde automatisch
3. **Readiness is zichtbaar** — voordat je genereert, weet je wat er mist
4. **Squad = seizoen-scoped** — overal dezelfde seizoen-filtered squad

---

## 3. Huidige staat (reverse engineering)

### Data flow — Lineup Video

```
Frontend Wizard
  → Gebruiker kiest: Activity + Formation + Members
  → Opslaan: PATCH /activities/{id}/ → metadata.lineup (JSON blob)
  → Genereren: POST /video/jobs/lineup-from-template/
    → selected_member_ids meegegeven door frontend (niet uit DB)

Backend VideoJob
  → LineupSegmentBuilder
    → Kan werken met selected_member_ids (frontend) OF Participations (DB)
    → Haalt per member: fullbody (kit_url), intro (intro_url), closeup (closeup_url)
    → Kit: altijd "home" voor spelers, "goalkeeper" voor keepers
    → FFmpeg compositing → MP4 → S3 → MediaItem
```

### Betrokken modellen

| Model | Rol | Probleem |
|-------|-----|----------|
| `Activity` | Wedstrijd container | `metadata.lineup` is niet-relationeel |
| `Participation` | Speler↔Wedstrijd | Wordt niet aangemaakt bij lineup save |
| `ProjectMembership` | Speler↔Team (+seizoen) | `period` FK vaak null |
| `Period` | Seizoen/Competitie | Hiërarchie onderbenut |
| `VideoJob` | Video generatie | Kit type hardcoded |

### Betrokken bestanden

**Backend:**
- `src/activities/api/serializers_activity.py` — ActivitySerializer.update() doet geen participation sync
- `src/video/services/lineup_builder.py` — `kit_type = "home"` hardcoded (line ~745, ~880)
- `src/video/utils/asset_metadata.py` — `resolve_lineup_member_assets()` accepteert kit_type maar caller geeft altijd "home"
- `src/activities/models.py` — Participation model (onderbenut)

**Frontend:**
- `demo/src/components/dashboard/useLineupSheet.ts` — Slaat lineup op in metadata, niet als participations
- `demo/src/components/MatchWizardV2/hooks/useSquadData.ts` — Zelfde save pattern, geen seizoen-filter
- `demo/src/pages/activities/useMatchDataFetching.ts` — Enige plek met seizoen-filter
- `demo/src/constants/assetProcessingSpecs.ts` — `isLineupReady()` per variant, geen aggregaat
- `demo/src/pages/periods/ProjectSeasonMemberDetailPage.tsx` — Asset status per member

---

## 4. Fasering

| Fase | Titel | Effort | Impact |
|------|-------|--------|--------|
| H0 | Lineup → Participation Sync | ~12 uur | Lineup data wordt relationeel, queryable |
| H1 | Smart Kit Resolution | ~8 uur | Correcte tenue in video's (thuis/uit/derde) |
| H2 | Squad Readiness Dashboard | ~10 uur | Zichtbaarheid voordat je genereert |
| H3 | Season-scoped Squad Everywhere | ~6 uur | Consistent seizoen-filter in alle flows |
| H4 | Competition Name from Period | ~4 uur | Data uit model i.p.v. hardcoded metadata string |

---

## 5. Acceptatiecriteria

### Must have
- [ ] Lineup opslaan creëert/update Participation records (formation, position, role)
- [ ] Video builder leest Participations als primaire bron
- [ ] Uitwedstrijden gebruiken "away" kit in video
- [ ] Squad readiness overzicht per seizoen (X/Y leden klaar)
- [ ] Alle lineup selectors gebruiken seizoen-gefilterde squad

### Should have
- [ ] Pre-generation warning als assets incompleet zijn
- [ ] Competition name afgeleid uit Period hiërarchie
- [ ] Migratie-script voor bestaande metadata.lineup → Participations

### Nice to have
- [ ] Rapportage: speelminuten per lid per seizoen (vanuit Participations)
- [ ] Automatische kit suggestie op basis van thuisclub + is_home
