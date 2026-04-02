# 265 — D06 — Structured Output Validation

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Backend (Data Quality) |
| Impact | 🟡 important |
| Effort | ~20 uur |

## Wat

Runtime validatie van structured outputs (JSON, Pydantic, TypeScript types) voor data quality. Schema registry met JSON Schema en Pydantic validators, runtime validation met gedetailleerde foutmeldingen, type coercion, en custom validators via een plugin systeem.

## Waarom belangrijk

Naarmate TeamReel meer AI-gegenereerde content produceert, wordt output-validatie essentieel. Foutieve JSON-structuren van LLMs kunnen de hele pipeline breken. Gestructureerde validatie vangt fouten vroegtijdig op, geeft duidelijke foutmeldingen, en garandeert data-integriteit door de hele keten heen.

## Past in TeamReel / CoreApp

- **TeamReel**: AI-generatie levert JSON output (line-ups, captions, social posts). Validatie voorkomt broken content en geeft gebruikers bruikbare foutmeldingen.
- **CoreApp**: Output validation is platform-agnostisch — elk SaaS-product met API responses, data contracts of ML outputs heeft dit nodig. Past in de Data Foundations laag.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=D06-structured-output-validation

We bouwen runtime validatie van structured outputs voor de Django 5 + DRF backend.

[feature summary]
Runtime validation layer voor JSON/Pydantic outputs met schema registry, custom validators, en gedetailleerde error reporting.

[goals]
- JSON Schema validation voor complex nested objects (AI-gegenereerde content)
- Pydantic model validation in Django views en Celery tasks
- Custom validators via plugin registration pattern
- Error messages met field path + menselijke beschrijving
- Type coercion voor compatible types (string→int, etc.)
- Integratie met bestaande generative pipeline (src/generative/)

[non-goals]
- Frontend/Zod validatie (dat is een apart frontend concern)
- GraphQL schema validatie
- Database constraint validatie (dat doet Django ORM al)

[tech context]
- Backend: Django 5, DRF, PostgreSQL
- Bestaande AI pipeline: src/generative/ met GenerationTemplate model
- Celery workers verwerken AI output async
- Tests: pytest met factory_boy
```

### Plan

```
/spec-kitty.plan feature=D06-structured-output-validation

[tech choices]
- Python: pydantic v2 voor schema definitie + validatie
- JSON Schema: jsonschema library als fallback voor external schemas
- Registry pattern: Django app met SchemaRegistry singleton
- Storage: schema definities in database (SchemaDefinition model) + code-defined schemas
- Error formatting: custom ErrorFormatter class met i18n-ready messages
- Integratie: decorator @validate_output voor views en Celery tasks
- Tests: pytest + parametrize voor validatie edge cases

[models]
- SchemaDefinition: name, version, schema_type (json_schema/pydantic), schema_data (JSONField)
- ValidationLog: content_type, object_id, schema FK, is_valid, errors (JSONField), validated_at

[api endpoints]
- GET /api/v1/schemas/ — lijst schema definities
- POST /api/v1/validate/ — valideer data tegen schema
- GET /api/v1/validation-logs/ — recente validatie resultaten

[files to create/modify]
- src/validation/ — nieuwe Django app
- src/generative/pipeline.py — output validation stap toevoegen
- tests/test_validation/ — validatie tests
```

### Research

```
/spec-kitty.research feature=D06-structured-output-validation

Onderzoek de volgende punten voor implementatie:

1. Hoe integreert pydantic v2 met Django 5 models? Zijn er bekende incompatibiliteiten?
2. Wat is het beste pattern voor een schema registry in Django (singleton vs app config vs database)?
3. Hoe valideert de huidige generative pipeline (src/generative/) output? Waar zitten de integratiepunten?
4. Welke AI output formats komen voor in de codebase (JSON structuren, verwachte velden)?
5. Performance: wat is de overhead van pydantic validatie op grote AI responses?
```
