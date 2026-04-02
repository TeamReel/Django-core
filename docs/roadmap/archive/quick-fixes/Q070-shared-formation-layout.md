# Q070 — Shared FormationLayout voor lineup flyer + video

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review — pipeline analyse Q063-Q065 |
| Impact | 🟡 important |
| Effort | ~4 uur |

## Wat
`lineup_flyer_generator.py` en `lineup_composer.py` hebben elk hun eigen speler-positionering:

| | Flyer | Composer |
|---|---|---|
| Y_POS keeper | 0.90 | 0.97 |
| Y_POS defender | 0.72 | 0.80 |
| Y_POS midfielder | 0.53 | 0.57 |
| Y_POS attacker | 0.36 | 0.40 |
| X-positie logica | `_get_x_positions()` + `_apply_formation_tweaks()` | `get_x_positions()` + `get_x_positions_for_group()` |

Deze waarden wijken subtiel af, waardoor de opstelling er anders uitziet in flyer vs video. Beide delen al `LineupData` uit `lineup_builder.py`, maar de layout is niet gedeeld.

**Maak een `FormationLayout` dataclass die posities berekent, en gebruik die in beide generators.**

## Checklist
- [x] Maak `FormationLayout` in `lineup_builder.py` (of nieuw `formation_layout.py`)
- [x] Één set Y_POS waarden per rol
- [x] Eén `get_player_positions(formation, players)` method
- [x] Refactor `lineup_flyer_generator.py` → gebruik FormationLayout
- [x] Refactor `lineup_composer.py` → gebruik FormationLayout
- [ ] Visueel verifiëren dat output acceptabel is
- [ ] Tests
- [ ] Verify
