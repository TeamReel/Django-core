# H2 — Squad Readiness Dashboard

> **Effort:** ~10 uur | **Impact:** Zichtbaar welke leden klaar zijn voor video generatie

## Probleem

Per member toont de detail-pagina asset badges (🟢 processed / 🟡 processing / 🔴 missing). Maar er is:
- Geen squad-level overzicht ("8/11 spelers klaar")
- Geen pre-generation warning
- Gebruikers genereren video's met placeholder silhouetten zonder het te weten

## Aanpak

### Backend: Squad readiness API

- [ ] Nieuw endpoint: `GET /api/v1/projects/{id}/squad-readiness/`
  - Query params: `period` (seizoen filter), `content_type` (lineup, match_intro, etc)
  - Response:
    ```json
    {
      "total_members": 15,
      "ready_members": 11,
      "readiness_pct": 73,
      "members": [
        {
          "id": "pm-uuid",
          "name": "Jan de Vries",
          "role": "player",
          "kit_type": "home",
          "assets": {
            "fullbody": { "status": "processed", "kit": "home" },
            "closeup": { "status": "processed", "kit": "home" },
            "intro": { "status": "missing", "kit": null },
            "fullbody_away": { "status": "missing", "kit": "away" }
          },
          "lineup_ready": true,
          "missing_for_lineup": []
        }
      ]
    }
    ```
  - Readiness logic per content type:
    - `lineup`: fullbody + closeup vereist, intro optioneel
    - `match_intro`: fullbody vereist
    - `goal_celebration`: celebration video vereist

- [ ] Service: `SquadReadinessService` in `src/projects/services/squad_readiness.py`
  - Itereer `ProjectMembership` records (period-filtered)
  - Check `metadata.teamreel_assets.roles.{role}.{images|videos}.{type}.{kit}` per member
  - Gebruik `isLineupReady` equivalent logic (processed state + not raw==processed)

### Frontend: Readiness component

- [ ] `SquadReadinessCard` component op SeasonSquadTab
  - Progress bar: "11/15 leden klaar voor lineup video"
  - Per member: naam + groene/rode dots per asset type
  - Click op member → navigeer naar member detail

- [ ] Pre-generation warning in MatchWizardV2 en ContentGenerationModal
  - Na lineup stap, vóór generatie: check readiness
  - Warning badge: "3 spelers zonder foto's — worden als silhouet getoond"
  - "Toch doorgaan" button (niet blokkeren, wel waarschuwen)

### Frontend: Hook + types

- [ ] `useSquadReadiness(projectId, periodId?)` React Query hook
- [ ] Types in `squadReadinessTypes.ts`

### Tests

- [ ] Backend: endpoint retourneert juiste readiness per member
- [ ] Backend: period filter werkt correct
- [ ] Backend: content_type filter selecteert juiste vereiste assets
- [ ] Frontend: readiness card toont correcte telling

## Done criteria

- [ ] Squad readiness overzicht zichtbaar op Season pagina
- [ ] Pre-generation warning in wizard als assets incompleet
- [ ] API endpoint retourneert per-member asset status
- [ ] Period-scoped filtering werkt
