# Q079 — Builders voor MatchIntro en ThenVsNow

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Pipeline analyse |
| Impact | 🟢 nice-to-have |
| Effort | ~3 uur |

## Wat

De pipeline volgt het **Builder → Composer** patroon:
- `LineupSegmentBuilder` → `LineupData` → `lineup_composer.py`
- `GoalCelebrationBuilder` → `GoalCelebrationData` → `goal_celebration_composer.py`

Twee content types wijken af:

**`processors/match_intro.py`:** `_gather_match_data()` zit inline in de processor (methode op `MatchIntroProcessor`, ~40 regels). Returns een losse `dict` i.p.v. een typed dataclass.

**`processors/then_vs_now.py`:** Data-gathering zit inline in `_process()` (~50 regels). Returns losse variabelen die als kwargs worden doorgegeven aan de composer.

### Waarom builders?
1. **Type safety**: dataclass met velden + defaults i.p.v. losse dicts
2. **Testbaarheid**: builder apart testbaar van processor
3. **Consistentie**: alle content types volgen hetzelfde patroon
4. **Hergebruik**: match_intro data kan ook door een match_flyer builder gebruikt worden

### Design

**`match_intro_builder.py`:**
```python
@dataclass
class MatchIntroData:
    activity_id: str
    match_date: str | None
    kickoff_time: str | None
    own_team_name: str
    opponent_name: str
    is_home: bool
    venue: str | None
    competition_name: str | None
    brand_primary: str
    brand_secondary: str
    logo_url: str | None
    opponent_logo_url: str | None
    sponsor_url: str | None
    field_background_url: str | None

class MatchIntroBuilder:
    def __init__(self, activity_id: str): ...
    def gather_data(self) -> MatchIntroData: ...
```

**`then_vs_now_builder.py`:**
```python
@dataclass
class ThenVsNowData:
    team_name: str
    season_name: str | None
    brand_color: str | None
    logo_url: str | None
    background_url: str
    sponsor_url: str | None
    video_type: str
    members: list[MemberClip]

class ThenVsNowBuilder:
    def __init__(self, activity_id: str): ...
    def gather_data(self) -> ThenVsNowData: ...
```

## Checklist

- [ ] `src/video/services/match_intro_builder.py`: `MatchIntroData` + `MatchIntroBuilder`
- [ ] `processors/match_intro.py`: `_gather_match_data()` verplaatsen naar builder, processor roept builder aan
- [ ] `src/video/services/then_vs_now_builder.py`: `ThenVsNowData` + `ThenVsNowBuilder`
- [ ] `processors/then_vs_now.py`: data-gathering verplaatsen naar builder
- [ ] Unit tests voor beide builders
- [ ] Tests: alle bestaande video tests moeten slagen
- [ ] Verify
