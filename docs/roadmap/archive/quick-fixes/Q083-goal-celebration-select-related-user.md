# Q083 — Fix missing select_related("user") in GoalCelebrationBuilder

| | |
|---|---|
| Status | � DONE |
| Bron | Pipeline DONE — N+1 query |
| Impact | 🔴 critical |
| Effort | ~0.5 uur |

## Wat
`goal_celebration_builder.py` regel 186 doet:
```python
membership = ProjectMembership.objects.filter(id=self.scorer_member_id).first()
```
Daarna wordt `membership.user.first_name`, `membership.user.last_name` opgehaald — dat is een extra database query per keer (N+1). Alle andere builders (`lineup_builder`, `then_vs_now_builder`) gebruiken wél `select_related("user")`.

## Checklist
- [ ] Voeg `.select_related("user")` toe aan de membership query in `goal_celebration_builder.py`
- [ ] Tests
- [ ] Verify
