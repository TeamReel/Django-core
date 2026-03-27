# A1 — Core API Client

**Status:** 🔲 Todo
**Effort:** 3 uur
**Scope:** 1 module — uitbreiding van bestaande `apiFetch.ts`
**Vereist:** T1

---

## Doel

Er zijn 508 raw `fetch()` calls in 132 bestanden. Elke call herhaalt dezelfde patterns: base URL, credentials, headers, error handling, JSON parsing. Eén typed API client elimineert deze duplicatie.

## Huidige situatie

- `utils/apiFetch.ts` (188 regels) — helper, maar niet volledig typed
- `utils/apiBase.ts` (18 regels) — base URL config
- `utils/apiEnvelope.ts` (72 regels) — response unwrapping
- 132 files doen nog steeds `await fetch(\`${apiBaseUrl}/api/v1/...\`)` handmatig

## Ontwerp

```typescript
// utils/apiClient.ts
import { apiBaseUrl } from './apiBase';
import type { ApiEnvelope, PaginatedResponse } from '../types/api';

class ApiClient {
  private baseUrl = apiBaseUrl;

  async get<T>(path: string, options?: RequestInit): Promise<T> { ... }
  async post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> { ... }
  async patch<T>(path: string, body: unknown, options?: RequestInit): Promise<T> { ... }
  async delete(path: string, options?: RequestInit): Promise<void> { ... }

  // Paginated helper
  async list<T>(path: string, params?: Record<string, string>): Promise<PaginatedResponse<T>> { ... }

  // Fetch-all-pages helper (bestaande fetchAllPages logic)
  async listAll<T>(path: string, params?: Record<string, string>): Promise<T[]> { ... }
}

export const api = new ApiClient();
```

## Features

- Automatische auth headers + credentials
- Automatische JSON parsing + envelope unwrapping
- Typed generics: `api.get<Activity>(...)` retourneert `Activity`
- Error handling: throws typed `ApiError` met response body
- Request deduplication (optioneel, voor GET requests)

## Verificatie

- [ ] `api.get<T>()`, `.post<T>()`, `.patch<T>()`, `.delete()` werken
- [ ] Error handling: `ApiError` class met `status`, `message`, `data`
- [ ] Bestaande code nog niet geraakt (alleen nieuw module)
- [ ] Unit tests voor core client
