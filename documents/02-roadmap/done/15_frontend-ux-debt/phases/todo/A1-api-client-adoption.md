# A1 — API Client Adoption

**Track:** A — Architecture
**Effort:** 3 uur
**Status:** 🔲 Todo

## Probleem

40+ files bevatten hardcoded `fetch('/api/v1/...')` calls in plaats van de gecentraliseerde API client. Dit maakt het moeilijk om:
- Base URL te wijzigen
- Auth headers consistent toe te voegen
- Error handling te centraliseren

## Oplossing

Top-10 meest kritieke files migreren naar het `api` client pattern (uit `@/api`).

## Acceptatiecriteria

- [ ] Top-10 files gemigreerd van raw fetch → api client
- [ ] Consistent error handling via api client
- [ ] 0 TypeScript errors
