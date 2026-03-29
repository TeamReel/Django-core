# Q023 — N+1 queries in transaction serializers

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
De `transactions/api/serializers.py` doet **19 losse ORM calls** in serializer methods (.objects.get, .objects.filter, .exists()). Elke API call voor transacties raakt de database tientallen keren.

Ook `navigation/views.py` en `files/views.py` missen `select_related`/`prefetch_related` — die worden op elke pagina-load geraakt.

## Bestanden
| Bestand | Probleem |
|---------|---------|
| `src/transactions/api/serializers.py` | 19 ORM calls in serializer methods |
| `src/navigation/views.py` | Geen select_related in get_queryset |
| `src/files/views.py` | Geen select_related in get_queryset |
| `src/notifications/views/user_notification_views.py` | Geen prefetch_related |

## Checklist
- [x] `transactions/api/serializers.py` → ViewSets hadden al select_related, write-path ORM calls zijn OK
- [x] `navigation/views.py` → select_related("content_type") toegevoegd
- [x] `files/views.py` → select_related("uploaded_by") toegevoegd
- [x] `notifications/views/` → select_related("recipient_user") toegevoegd
- [x] Tests
- [x] Verify
