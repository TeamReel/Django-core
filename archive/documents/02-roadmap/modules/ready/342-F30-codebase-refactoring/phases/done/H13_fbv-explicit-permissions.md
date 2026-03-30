# H13 — FBV Permission Classes expliciet maken

> **Effort:** ~1 uur | **Impact:** Defense-in-depth, code leesbaarheid

## Context

7 function-based views missen een expliciete `@permission_classes` decorator. Ze zijn beveiligd via de globale `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]`, maar expliciete decorators zijn beter voor:
- Leesbaarheid: je ziet direct welke auth nodig is
- Defense-in-depth: niet afhankelijk van een settings-bestand ergens anders
- Consistentie: alle andere FBVs in de codebase hebben het wel

## To do

- [ ] `src/accounts/api/views_context.py` — voeg `@permission_classes([IsAuthenticated])` toe aan:
  - `auth_me`
  - `auth_default_context`
  - `active_context`
- [ ] `src/accounts/api/views_profile.py` — voeg `@permission_classes([IsAuthenticated])` toe aan:
  - `update_profile`
  - `change_password`
  - `upload_avatar`
  - +1 andere FBV
- [ ] Verifieer dat `from rest_framework.decorators import permission_classes` al geïmporteerd is

## Done criteria

- [ ] Alle FBVs met `@api_view` hebben ook een expliciete `@permission_classes`
- [ ] Geen regressies — alle tests slagen
