# Q055 — Extract match-info resolution naar shared module

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review — media pipeline |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
Match-info resolution (team names, date, kickoff, venue, competition, score) is 3× gekopieerd met identiek patroon in `lineup_builder.py` (regels ~530-590), `goal_celebration_builder.py` (regels ~255-310) en `match_flyer_generator.py` (regels ~1235-1270).

Elke kopie bevat dezelfde venue-filtering logica ("home"/"away"/"thuis"/"uit" → None), dezelfde `teamreel.vars` en `teamreel.match_context` fallback chains, en dezelfde competition_name resolution.

**Extract naar een `MatchContext` dataclass + factory function.**

## Wat is gedaan
- `MatchContext` frozen dataclass in `src/video/services/match_context.py` — bevat alle match-info velden incl. club-namen, score, venue, competition
- `resolve_match_context(activity)` factory — extracteert alles uit een Activity instance (geen extra DB queries)
- Venue: uniforme filtering van "home"/"away"/"thuis"/"uit" → None
- Competition: `teamreel.vars` → `meta.competition_name` → period fallback
- Team names: `own_team_name` (team) + `own_club_name` (club-niveau) + opponent equivalenten
- Lineup_builder: 2× ~35 regels match-context verwijderd (both _gather_lineup_data + _gather_lineup_from_memberships)
- Goal_celebration_builder: ~30 regels match-context verwijderd
- Match_flyer_generator: ~35 regels match-context + club name resolution verwijderd

## Checklist
- [x] Create `src/video/services/match_context.py`
- [x] Factory: `resolve_match_context(activity) → MatchContext`
- [x] Replace in lineup_builder (2 methods), goal_celebration_builder, match_flyer_generator
- [x] Tests: 194 passed (3 pre-existing errors)
- [x] Verify
