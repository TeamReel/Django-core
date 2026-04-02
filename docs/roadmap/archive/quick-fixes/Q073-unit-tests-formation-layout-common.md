# Q073 — Unit tests voor formation_layout.py en _common.py utilities

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review Q066-Q070 |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
`formation_layout.py` (nieuw in Q070) en de utility functies in `_common.py` (Q068) hebben **geen unit tests**. Dit zijn gedeelde modules waar zowel de flyer als de video compositor van afhangen — als positioneringslogica breekt, breken alle lineup outputs.

### Wat getest moet worden

**`formation_layout.py`:**
- `get_x_positions(count)` — correcte X posities voor 0-5 spelers
- `get_x_positions(count, margin=0.15)` — fixed margin variant
- `get_x_positions_for_group()` — 4-4-2 attacker override
- `get_y_stagger_offsets(4)` — stagger patroon voor 4 spelers
- `apply_formation_tweaks()` — per-formatie tweaks (4-3-3, 4-4-2, 3-4-3)
- `compute_group_positions()` — end-to-end met Y_POS_FLYER en Y_POS_COMPOSER
- `clamp01()` — edge cases (negatief, >1)

**`_common.py` utilities:**
- `hex_to_rgb()` — 6-digit en 3-digit hex
- `hex_to_rgba()` — voegt alpha 255 toe
- `ffmpeg_escape()` — speciale tekens (quotes, backslash, colon)

## Checklist
- [x] `tests/video/test_formation_layout.py` aanmaken (47 tests)
- [x] `tests/video/test_common_utils.py` aanmaken (19 tests)
- [x] Alle bovengenoemde functies testen
- [x] Tests (66/66 pass)
- [x] Verify

## Test coverage

**`test_formation_layout.py`** (47 tests):
- `clamp01()` — in range, zero, one, negative, >1
- `get_x_positions()` — 0-5 spelers, fixed margin, symmetrie, sortering
- `get_x_positions_for_group()` — 4-4-2 attacker override, fallthrough, margin passthrough
- `get_y_stagger_offsets()` — 4-player arc, custom amount, non-4 no stagger
- `apply_formation_tweaks()` — 4-3-3, 4-4-2, 3-4-3 tweaks + unknown formation passthrough + clamping
- `compute_group_positions()` — count, PlayerPosition type, Y lookup, composer vs flyer, tweaks on/off, unknown group fallback
- `Y_POS_FLYER` / `Y_POS_COMPOSER` — role completeness, keeper > defender, attacker < midfielder

**`test_common_utils.py`** (19 tests):
- `hex_to_rgb()` — 6-digit, 3-digit, without hash, lowercase, mixed case, black, white
- `hex_to_rgba()` — alpha 255, 3-digit, return type
- `ffmpeg_escape()` — colon, backslash, single quote, multiple specials, empty, double-escape
