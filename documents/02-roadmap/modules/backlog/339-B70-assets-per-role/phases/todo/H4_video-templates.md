# H4 — Video Templates per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~4 uur |
| Focus | Backend + Templates |
| Afhankelijkheid | H3 |

## Context

Video templates (lineup, highlights, etc.) moeten de juiste assets selecteren op basis van de rol die een speler heeft in een specifieke wedstrijd.

## Scenario's

| Situatie | Verwacht gedrag |
|----------|----------------|
| Keeper in lineup | Gebruik keeper-closeup (met handschoenen) |
| Keeper als invaller op veld | Gebruik player-closeup (als beschikbaar) |
| Speler die ook keeper is | Afhankelijk van positie in die wedstrijd |
| Coach in interview | Gebruik coach-assets (casual kleding) |

## Implementatie

### 1. Participation model: welke rol in deze wedstrijd?

**Bestand**: `src/matches/models/participation.py`

```python
class Participation(TimeStampedModel):
    """A member's participation in a specific match."""

    match = ForeignKey(Match, on_delete=CASCADE, related_name="participations")
    membership = ForeignKey(ProjectMembership, on_delete=CASCADE)

    # Role in THIS match (may differ from general functional_role)
    match_role = CharField(
        max_length=50,
        choices=FUNCTIONAL_ROLE_CHOICES,
        null=True,
        blank=True,
        help_text="Role for this specific match. Defaults to primary functional role."
    )

    @property
    def effective_role(self) -> str:
        """Get the role to use for asset selection."""
        if self.match_role:
            return self.match_role
        return get_primary_role(self.membership) or "player"
```

### 2. Template asset resolver

**Bestand**: `src/video/services/template_assets.py`

```python
class TemplateAssetResolver:
    """Resolve assets for video templates based on context."""

    def __init__(self, match: Match):
        self.match = match

    def get_participant_assets(self, participation: Participation) -> dict:
        """Get all assets for a participant in this match."""
        role = participation.effective_role
        member = participation.membership

        return {
            "closeup": self._get_asset(member, "closeup", role),
            "fullbody": self._get_asset(member, "fullbody", role),
            "halfbody": self._get_asset(member, "halfbody", role),
            "intro": self._get_video(member, "intro", role),
            "celebration": self._get_video(member, "celebration", role),
            "name": member.user.get_full_name(),
            "number": participation.jersey_number,
            "role": role,
        }

    def _get_asset(self, member, asset_type: str, role: str) -> str | None:
        """Get processed image asset URL."""
        asset = get_member_asset(
            member.metadata or {},
            asset_type=asset_type,
            kit_type=self._get_kit_type(),
            role=role,
        )
        return asset.get("processed") if asset else None

    def _get_kit_type(self) -> str:
        """Determine kit type based on match (home/away)."""
        return "home" if self.match.is_home_match else "away"
```

### 3. Lineup video template update

**Bestand**: `src/video/templates/lineup.py`

```python
def render_lineup(match: Match) -> VideoSpec:
    """Render lineup video with role-appropriate assets."""
    resolver = TemplateAssetResolver(match)

    participants = []
    for p in match.participations.filter(in_starting_lineup=True):
        assets = resolver.get_participant_assets(p)
        participants.append({
            "name": assets["name"],
            "number": assets["number"],
            "closeup_url": assets["closeup"],
            "role_label": ROLE_LABELS.get(assets["role"], ""),
        })

    return VideoSpec(
        template="lineup_v2",
        data={"participants": participants},
    )
```

## Acceptatiecriteria

- [ ] Participation.match_role voor wedstrijd-specifieke rol
- [ ] TemplateAssetResolver selecteert assets o.b.v. rol
- [ ] Lineup video gebruikt role-specific closeups
- [ ] Keeper in lineup → keeper-closeup
- [ ] Fallback naar legacy assets als role-specific ontbreekt
- [ ] Tests voor asset resolution
