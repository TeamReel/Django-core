# H1 — Tenue-validatie bij lineup

> **Effort:** ~4 uur | **Impact:** Voorkomt kapotte video's door verkeerde tenue-toewijzing

## Probleem

De keeper-positie (GK, slot 1) kan gevuld worden met elke speler, ook als die geen keeper-tenue assets heeft. Omgekeerd: een member met alleen keeper-tenue kan op een veldpositie gezet worden die thuis-tenue vereist. De video toont dan placeholder silhouetten zonder dat de gebruiker het weet.

**Scope:** Alleen thuis-tenue (`home`) en keeper-tenue (`goalkeeper`). Geen uit-tenue.

## Huidige situatie

- `ProjectMembership.metadata.teamreel_assets.roles.{role}.images.fullbody.{kit_type}` bevat de assets
- `kit_type` is `home`, `goalkeeper`, `away`, of `third`
- De video builder gebruikt: `goalkeeper` voor GK-slot, `home` voor alle andere slots
- Er is **geen validatie** dat een member daadwerkelijk de juiste kit assets heeft

## Aanpak

### Backend: Validatie in LineupSyncService

- [ ] Voeg validatie toe in `LineupSyncService.sync()`:
  - Voor GK-slot (slot 1): check of member processed `goalkeeper` fullbody asset heeft
  - Voor veldposities (slots 2-11): check of member processed `home` fullbody asset heeft
  - Als asset ontbreekt: sync gaat door maar zet `data.asset_warning = "missing_goalkeeper_kit"` of `"missing_home_kit"`
  - **Niet blokkerend** — lineup kan worden opgeslagen, maar warning wordt meegegeven

### Backend: Asset check utility

- [ ] Maak `check_member_kit_readiness()` in `src/video/utils/asset_metadata.py`:
  ```python
  def check_member_kit_readiness(pm: ProjectMembership, kit_type: str) -> dict:
      """Check of member processed assets heeft voor gegeven kit_type."""
      # Return: {ready: bool, has_fullbody: bool, has_closeup: bool, has_intro: bool}
  ```
  - Hergebruik bestaande `resolve_lineup_member_assets()` logica
  - Return readiness status per asset type

### Frontend: Squad grouping op basis van tenue

- [ ] Update squad groepering in `useLineupSheet.ts`:
  - Members zonder keeper-tenue kunnen niet naar GK-slot gesleept worden
  - Members met alleen keeper-tenue verschijnen in keeper-groep (bestaande logica werkt al via `functional_roles`)
  - Optioneel: toon ⚠️ badge op member als tenue ontbreekt voor hun slot

### Frontend: Waarschuwing bij generatie

- [ ] In content generation flow (pre-generate check):
  - Lees `Participation.data.asset_warning` velden
  - Toon samenvatting: "2 spelers missen de juiste tenue-assets"
  - Niet blokkerend — gebruiker kan doorgaan

### Tests

- [ ] Test: member met goalkeeper kit → mag op GK-slot, readiness = true
- [ ] Test: member zonder goalkeeper kit → mag op GK-slot, maar warning in data
- [ ] Test: member met home kit → mag op veldpositie, readiness = true
- [ ] Test: member zonder home kit → mag op veldpositie, maar warning in data
- [ ] Test: video builder gebruikt correcte kit_type per slot (ongewijzigd, al correct)

## Done criteria

- [ ] GK-slot Participations bevatten `data.asset_warning` als keeper-tenue ontbreekt
- [ ] Veldpositie Participations bevatten `data.asset_warning` als thuis-tenue ontbreekt
- [ ] Frontend toont visuele indicatie bij members met asset warnings
- [ ] Lineup kan altijd worden opgeslagen (niet blokkerend)
- [ ] Geen regressie in video generatie
