# Prompt Template Library

**Feature**: 002-prompt-template-library
**Status**: Draft
**Mission**: software-dev
**Date**: 2026-03-31

## Overview

TeamReel gebruikt 10 prompt templates voor AI-gegenereerde beeldcontent (logo's, tenues, member foto's). Deze templates zijn momenteel hardcoded in een Python-module (`teamreel_prompts.py`) en worden geladen via `importlib` — een fragiel patroon dat geen runtime-editing, versioning of per-organisatie aanpassingen ondersteunt.

Deze feature migreert alle prompt templates naar database-opslag via het bestaande `GenerationTemplate` model, vervangt alle importlib-aanroepen door database lookups, en biedt een Admin UI voor prompt editing en een read-only API voor de frontend.

**Uitgangspunt**: Het model is al uitgebreid (WP01 done) — `prompt_text`, `parameters_schema` en `preprocessing_config` velden bestaan, 10 templates zijn geseed via data migration, Admin fieldsets zijn ingericht, en de `organisation` FK is nullable.

## Actors

| Actor | Description |
|-------|-------------|
| Content Manager | Bewerkt prompt templates via Django Admin |
| Developer | Gebruikt API om beschikbare templates op te vragen |
| AI Pipeline | Haalt prompt template data op bij het genereren van content |
| System | Voert migrations uit, invalidateert cache |

## User Scenarios

### Scenario 1: Pipeline genereert content met DB-backed prompt
**Given** een actieve GenerationTemplate met slug `logo_standardize` in de database
**When** de AI pipeline een logo-standardisatie start
**Then** wordt de prompt text uit de database geladen (via cache), variabelen ingevuld, en doorgestuurd naar de AI provider — zonder importlib

### Scenario 2: Content Manager past prompt aan
**Given** een Content Manager met org-admin rechten in Django Admin
**When** zij de prompt_text van `fullbody_in_tenue` aanpast en opslaat
**Then** wordt de cache geïnvalideerd en gebruikt de volgende generatie de bijgewerkte prompt

### Scenario 3: Frontend vraagt beschikbare templates op
**Given** een ingelogde gebruiker met project-member rechten
**When** de frontend `GET /api/v1/generative/templates/` aanroept
**Then** ontvangt deze een lijst van actieve templates met hun parameters, preprocessing config en beschrijvingen

### Scenario 4: Template niet gevonden
**Given** een generatie-aanvraag met een onbekende template slug
**When** de pipeline de template probeert op te halen
**Then** wordt een duidelijke foutmelding gegeven (GenerationTemplateNotFound)

## Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Het systeem MOET prompt templates ophalen uit de database in plaats van via importlib file loading | Must | Approved |
| FR-002 | Het systeem MOET een prompt service bieden met caching (TTL 300s) en cache-invalidatie bij opslaan | Must | Approved |
| FR-003 | Het systeem MOET template variabelen substitueren (`{placeholder}` → waarde) bij het resolven van prompts | Must | Approved |
| FR-004 | Het systeem MOET alle 4 importlib call sites vervangen door database lookups | Must | Approved |
| FR-005 | Het systeem MOET een duidelijke foutmelding geven wanneer een template slug niet gevonden wordt | Must | Approved |
| FR-006 | De read-only API MOET actieve templates teruggeven met parameters_schema, preprocessing_config en beschrijving | Must | Approved |
| FR-007 | De Admin UI MOET prompt_text, parameters_schema en preprocessing_config bewerkbaar tonen | Must | Approved |
| FR-008 | Het systeem MOET serializer-validatie bieden voor parameters_schema structuur (label + type per parameter) | Should | Approved |
| FR-009 | Het systeem MOET serializer-validatie bieden voor preprocessing_config structuur (string values) | Should | Approved |

## Non-Functional Requirements

| ID | Requirement | Threshold | Status |
|----|-------------|-----------|--------|
| NFR-001 | Template lookup moet gecached zijn om database load te minimaliseren | TTL ≤ 300 seconden, cache hit rate > 90% bij herhaalde lookups | Approved |
| NFR-002 | Cache-invalidatie moet onmiddellijk zijn na template wijziging | < 1 seconde na save | Approved |
| NFR-003 | Alle bestaande generatie-flows moeten blijven werken na de migratie | 0 regressies in bestaande tests | Approved |
| NFR-004 | Geen N+1 queries bij het ophalen van templates via de API | Max 1 query per lijst-request | Approved |

## Constraints

| ID | Constraint | Status |
|----|-----------|--------|
| C-001 | Moet het bestaande GenerationTemplate model uitbreiden; geen nieuw model | Approved |
| C-002 | Alle migrations moeten safe en additive zijn (geen DROP, geen data loss) | Approved |
| C-003 | Organisation-scoped querysets op alle ViewSets; permission_classes verplicht | Approved |
| C-004 | select_related/prefetch_related waar nodig | Approved |
| C-005 | Bestaande API contract (`/api/v1/generative/templates/`) mag niet breken | Approved |

## Success Criteria

1. **Prompt loading werkt via database**: Alle AI-generaties halen prompts uit de database; geen importlib-aanroepen meer in productie-code
2. **Zero regressies**: Alle bestaande pytest tests slagen na de refactor
3. **Template editing werkt**: Content Managers kunnen prompt teksten wijzigen via Django Admin en de wijzigingen zijn direct actief na cache-invalidatie
4. **API is operationeel**: Frontend kan beschikbare templates ophalen met hun parameters en configuratie
5. **Performance is acceptabel**: Template lookups zijn gecached; herhaalde aanroepen raken niet de database

## Key Entities

| Entity | Description | Status |
|--------|-------------|--------|
| GenerationTemplate | Bestaand model, uitgebreid met prompt_text, parameters_schema, preprocessing_config | Bestaat (WP01 done) |
| PromptService | Nieuwe service: get_prompt_template(), resolve_prompt(), cache invalidation | Nieuw te bouwen |

## Assumptions

1. WP01 (schema + seed) is volledig afgerond — model velden, migrations 0009+0010, admin fieldsets, 10 seed templates, 21 tests
2. De bestaande `list_asset_templates_view` functie in `views_generate.py` kan vervangen worden door een DB query zonder frontend-impact
3. De 4 importlib call sites zijn de enige plekken waar prompts geladen worden
4. Cache-invalidatie via Django's `post_save` signal is voldoende (geen gedistribueerde cache nodig)
5. Het `archive/legacy-root-cleanup/scripts/teamreel_prompts.py` bestand wordt niet verwijderd maar blijft als referentie in het archief

## Scope Boundaries

### In scope
- Prompt service met caching + invalidatie
- Vervangen van alle 4 importlib call sites
- Variable substitution in prompts
- Serializer validaties voor parameters_schema en preprocessing_config
- Tests voor alle nieuwe functionaliteit
- Regressietests voor bestaande generatie-flows

### Out of scope
- Per-organisatie template customization (toekomstige feature)
- Template versioning workflow (exists on model, not activated)
- Frontend UI voor template editing (alleen Admin)
- Video pipeline refactoring (beyond prompt loading)
- Nieuwe prompt templates toevoegen
