# A3 — Raw fetch() Elimination

**Track:** A — API Centralisatie
**Status:** 📋 Todo
**Geschatte effort:** 2 uur

---

## Doel

Alle 9 files met raw `fetch()` calls (buiten `apiFetch.ts` en `client.ts`) migreren naar `api.*` of `apiFetch`.

## Scope

9 productiebestanden gebruiken `fetch()` direct in plaats van de gecentraliseerde wrappers. Dit omzeilt:
- Auth header injection
- CSRF token handling
- Error normalisatie
- Response parsing

## Aanpak

1. Per file: identificeer of `api.*` of `apiFetch` past
2. `api.*` voor standaard REST calls
3. `apiFetch` voor custom calls (file upload, streaming, etc.)
4. Verify: auth + error handling werkt via wrapper

## Acceptatiecriteria

- [ ] 0 raw `fetch()` calls buiten `apiFetch.ts` en `api/client.ts`
- [ ] Alle calls profiteren van auth/CSRF/error handling
- [ ] Tests groen
