# Q030 — Ruff Backend Cleanup

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Codebase Review (29 maart 2026) |
| Impact | 🟡 important |
| Effort | ~30 min |

## Wat

Opschonen van unused imports en dubbele method definitie gedetecteerd door Ruff.

## Issues

### F401 Unused Imports (3x)
`src/accounts/serializers.py`:
- Line 105: `Membership` wordt geïmporteerd maar niet gebruikt
- Line 121: `ProjectMembership` wordt geïmporteerd maar niet gebruikt
- Line 144: `RoleAssignment` import dubbel (variabele wordt niet gebruikt na import in try/except)

### F811 Redefinition (1x)
`src/notifications/views/notification_views.py`:
- `get_queryset()` method is 2x gedefinieerd (line 155 en 173)
- De eerste definitie wordt nooit uitgevoerd (wordt overschreven)
- Code moet gemerged worden of eerste definitie verwijderd

## Checklist
- [x] Review `serializers.py` imports - noqa comments toegevoegd (false positives)
- [x] Merge of verwijder dubbele `get_queryset` in notification_views.py
- [x] `ruff check src/ --select=F401,F811` geeft 0 errors
- [x] Tests passeren
