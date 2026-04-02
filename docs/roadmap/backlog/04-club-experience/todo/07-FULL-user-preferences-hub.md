# 314 — B47 — User Preferences Hub

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (User Experience) |
| Impact | 🟡 important |
| Effort | ~20 uur |

## Wat

Gecentraliseerde user preferences: notification settings, UI preferences (theme, compact mode), privacy controls, en defaults. Key-value opslag per user met JSON schema validatie, default inheritance (system → org → user), bulk get/update, en GDPR-compliance (data export, account deletion).

## Waarom belangrijk

Gebruikers verwachten persoonlijke instellingen — dark mode, email frequentie, standaard project. Zonder een centraal preference systeem worden instellingen verspreid over meerdere models en is er geen consistente API. GDPR vereist data export en deletion mogelijkheden.

## Past in TeamReel / CoreApp

- **TeamReel**: Coaches willen push notifications voor wedstrijden maar niet voor elke content update. Admins willen een compact overzicht, spelers willen alleen hun team zien. Preferences maken personalisatie mogelijk.
- **CoreApp**: User preferences is universeel — elk multi-user SaaS-product heeft settings, defaults en privacy controls nodig. Het key-value + schema pattern is herbruikbaar.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=B47-user-preferences-hub

We bouwen een user preferences systeem in de Django 5 + DRF backend.

[feature summary]
Gecentraliseerd preference systeem met key-value opslag, schema validatie, default inheritance, en GDPR compliance.

[goals]
- UserPreference model: user FK, category, key, value (JSONField), updated_at
- Categories: notifications, privacy, display, defaults
- Preference schema registry met validatie per key
- Default inheritance: system defaults → org defaults → user preferences
- Bulk get/update (alle preferences in één call)
- Reset to defaults per categorie
- GDPR: data export endpoint, account deletion request

[non-goals]
- A/B test variant storage
- Application-level settings (feature flags)
- Complex preference dependencies

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Auth: bestaand user model (src/accounts/)
- Org model: src/organisations/
- Tests: pytest + factory_boy
- Cache: Redis (voor preference lookups)
```

### Plan

```
/spec-kitty.plan feature=B47-user-preferences-hub

[tech choices]
- Model: UserPreference (user, category, key, value JSONField)
- Schema: PreferenceSchemaRegistry (Python dict met defaults + validators)
- Cache: Redis cache per user (invalidate on update)
- Serializer: DRF met nested preference rendering
- Inheritance: merge system → org → user in service layer

[models]
- UserPreference: user FK, category (enum), key, value (JSON), updated_at
- OrganisationPreferenceDefault: org FK, category, key, default_value (JSON)

[api endpoints]
- GET /api/v1/preferences/ — alle preferences (merged met defaults)
- GET /api/v1/preferences/{category}/ — per categorie
- PATCH /api/v1/preferences/ — bulk update
- DELETE /api/v1/preferences/{category}/ — reset naar defaults
- GET /api/v1/preferences/schema/ — beschikbare keys + types
- POST /api/v1/preferences/export/ — GDPR data export

[files to create]
- src/preferences/ — nieuwe Django app
- src/preferences/models.py, serializers.py, views.py, registry.py
- tests/test_preferences/
```

### Research

```
/spec-kitty.research feature=B47-user-preferences-hub

Onderzoek de volgende punten:

1. Welk user model wordt er gebruikt? Check src/accounts/models.py voor bestaande preference-achtige velden.
2. Bestaan er al instellingen per user of per org in de codebase? (notification prefs, display settings)
3. Hoe is de Redis cache geconfigureerd? Welke cache backend wordt gebruikt?
4. Welke GDPR-gerelateerde functionaliteit bestaat er al?
5. Hoe werkt de org-scoping in ViewSets? Welke mixin/permission wordt gebruikt?
```
