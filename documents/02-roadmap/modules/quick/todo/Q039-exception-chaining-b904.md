# Q039 — Exception Chaining (ruff B904)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat
46 plekken in de codebase waar `raise` in een `except`-blok geen `from err` of `from None` heeft. Zonder chaining verdwijnt de oorspronkelijke traceback, wat debugging veel moeilijker maakt.

## Scope
- `activities/api/serializers_*.py` — 5×
- `generative/` — 10×
- `video/services/` — 12×
- `branding/serializers.py` — 3×
- `workflows/` — 5×
- Overige apps — 11×

## Aanpak
Per case beoordelen:
- `raise ValidationError(...) from err` → als oorspronkelijke fout relevant is
- `raise ValidationError(...) from None` → als bewust een nieuwe fout wordt gegeven

## Checklist
- [ ] Alle 46 B904 violations fixen
- [ ] Verify: `ruff check src/ --select=B904` → 0 errors
- [ ] Tests: `pytest -x`
