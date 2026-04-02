# Q048 — ViewSet toont geen global templates + get_template org-prioriteit

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review WP01/WP02 |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat

Drie gerelateerde issues uit de code review van prompt-template-library (WP01+WP02):

1. **ViewSet sluit global templates uit** — `GenerationTemplateViewSet.get_queryset()` filtert `organisation=membership.organisation`, maar seeded templates hebben `organisation=None`. Die zijn onzichtbaar via de API. Fix: voeg `Q(organisation__isnull=True)` toe.

2. **`get_template()` org-prioriteit fragiel** — als dezelfde slug zowel globaal als org-specifiek bestaat, bepaalt `qs.first()` + default ordering (`-created_at`) welke wint. Nieuwste wint, ongeacht scope. Fix: voeg `.order_by(F("organisation").asc(nulls_last=True))` toe zodat org-specifiek altijd voorrang krijgt.

3. **Geen `post_delete` signal** — alleen `post_save` invalideert de cache. Bij hard-delete (admin bypass van soft-delete) blijft stale cache bestaan. Fix: voeg `post_delete` receiver toe in `signals.py`.

## Checklist
- [x] ViewSet `get_queryset` uitbreiden met `Q(organisation__isnull=True)`
- [x] `get_template()` ordering toevoegen voor org-prioriteit
- [x] `post_delete` signal toevoegen voor cache invalidatie
- [x] Tests voor alle drie punten
- [x] Verify: pytest + ruff clean
