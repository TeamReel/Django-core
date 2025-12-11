# @django-core/api-client

Shared API client for Django Core frontend packages. Provides CSRF-protected fetch wrapper and B13 error normalization.

## Installation

```bash
pnpm add @django-core/api-client
```

## Usage

```typescript
import { createApiClient } from '@django-core/api-client';

const client = createApiClient({
  baseUrl: '/api',
  credentials: 'include', // Send cookies
});

// GET request
const { data, error } = await client.get('/organisations/');
if (error) {
  console.error(error.message);
} else {
  console.log(data);
}

// POST request (CSRF token auto-injected)
const result = await client.post('/context/set/', {
  organisationId: 'org_123',
  projectId: 'proj_456',
});
```

## API Reference

### `createApiClient(config?: ApiClientConfig)`

Creates an API client instance.

**Config**:
- `baseUrl?: string` - Base URL for all requests (default: '')
- `headers?: Record<string, string>` - Additional headers
- `credentials?: RequestCredentials` - Fetch credentials mode (default: 'include')

**Returns**: API client with methods: `request`, `get`, `post`, `put`, `patch`, `delete`

### CSRF Protection

CSRF tokens are automatically extracted from the `csrftoken` cookie and injected into `X-CSRFToken` header for POST/PUT/PATCH/DELETE requests.

### Error Handling

All errors follow B13 standard format:

```typescript
{
  code: number; // HTTP status code (0 for network errors)
  message: string; // User-friendly message
  fieldErrors?: Record<string, string[]>; // Validation errors
  formErrors?: string[]; // Form-level errors
  details?: unknown; // Raw response
}
```

## Requirements

- Django backend with CSRF middleware enabled
- `csrftoken` cookie set by backend

## License

MIT
