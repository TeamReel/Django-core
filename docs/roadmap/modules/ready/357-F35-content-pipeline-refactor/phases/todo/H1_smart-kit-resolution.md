# H1 — Smart Kit Resolution

> **Effort:** ~8 uur | **Impact:** Correcte tenue in lineup video's (thuis/uit/derde)

## Probleem

`LineupSegmentBuilder` zet `kit_type = "home"` voor alle spelers, ongeacht of het een uit- of thuiswedstrijd is. `Activity.metadata.is_home` wordt gelezen maar alleen voor branding, niet voor kit selectie. Het B70 data model ondersteunt `home/away/third` kits, de frontend uploadt ze, maar de video builder gebruikt ze niet.

## Aanpak

### Backend: Kit resolution logica

- [ ] Maak `resolve_kit_type()` in `src/video/utils/asset_metadata.py`
  - Input: `functional_role`, `is_home`, `kit_preference` (optioneel override)
  - Logic:
    - `keeper` → altijd `"goalkeeper"`
    - `player` + thuiswedstrijd → `"home"`
    - `player` + uitwedstrijd → `"away"`, fallback naar `"home"` als away ontbreekt
    - `player` + explicit override → `kit_preference` (voor toekomstige wedstrijd-config)
  - Return: `kit_type` string

- [ ] Update `LineupSegmentBuilder._gather_lineup_from_memberships()` (~line 880):
  - Vervang `kit_type = "goalkeeper" if ... else "home"` door `resolve_kit_type(role, is_home)`
  - Pass `is_home` door vanuit `LineupData` naar member resolution

- [ ] Update `LineupSegmentBuilder._gather_lineup_from_participations()` (~line 745):
  - Zelfde wijziging: gebruik `resolve_kit_type()` i.p.v. hardcoded

- [ ] Update `resolve_lineup_member_assets()` in `asset_metadata.py`:
  - Accepteert al `kit_type` parameter → geen interface wijziging nodig
  - Voeg fallback toe: als `away` kit geen processed asset heeft, probeer `home`

### Frontend: Kit informatie meegeven

- [ ] `contentGenerationVideoApi.ts` → `generateLineupVideo()`:
  - Stuur `is_home` mee in de API call (uit `matchData.metadata.is_home`)
  - Backend view `lineup_from_template` accepteert optioneel `is_home` override

- [ ] Optioneel: "Tenue" selector in OptionsStep
  - Dropdown: Thuis / Uit / Derde
  - Default: automatisch op basis van `is_home`
  - Override mogelijk voor speciale gevallen

### Tests

- [ ] Test: thuiswedstrijd → `kit_type = "home"`
- [ ] Test: uitwedstrijd → `kit_type = "away"` (met away asset)
- [ ] Test: uitwedstrijd zonder away asset → fallback naar `"home"`
- [ ] Test: keeper → altijd `"goalkeeper"` ongeacht thuis/uit
- [ ] Test: explicit override (`kit_preference = "third"`)

## Done criteria

- [ ] Uitwedstrijd lineup video's tonen away tenue als beschikbaar
- [ ] Fallback naar home tenue als away niet geüpload
- [ ] Keeper tenue ongewijzigd
- [ ] `is_home` wordt doorgegeven van frontend naar video builder
- [ ] Bestaande video generatie werkt ongewijzigd (backward compat)
