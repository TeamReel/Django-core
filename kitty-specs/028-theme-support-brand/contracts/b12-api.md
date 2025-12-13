# B12 Theme Preferences API Contract
# Purpose: Optional REST API for server-side theme preference persistence
# Version: 1.0.0
# Status: Optional (B12 implementation not required for F07 functionality)

openapi: 3.0.3
info:
  title: Theme Preferences API
  description: Optional B12 integration for persisting user/org theme preferences
  version: 1.0.0
  contact:
    name: Django Core-App Team

servers:
  - url: /api
    description: Django backend API

tags:
  - name: preferences
    description: User and organization preferences

paths:
  /preferences/theme:
    get:
      summary: Get theme preference
      description: |
        Retrieves the authenticated user's or organization's theme preference.

        Returns 404 if no preference is set (frontend should fall back to
        cookie/localStorage/system/default).

      tags:
        - preferences

      security:
        - sessionAuth: []
        - csrfToken: []

      responses:
        '200':
          description: Theme preference found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ThemePreference'
              examples:
                lightTheme:
                  value:
                    theme_mode: light
                    theme_brand: default
                darkCustomBrand:
                  value:
                    theme_mode: dark
                    theme_brand: brandX

        '404':
          description: No theme preference set (use frontend defaults)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error: "Theme preference not found"

        '401':
          description: Unauthenticated (user not logged in)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
              example:
                error: "Authentication required"

        '500':
          description: Server error (frontend should fall back gracefully)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

    post:
      summary: Set theme preference
      description: |
        Saves the authenticated user's or organization's theme preference.

        This is a non-blocking operation from the frontend's perspective.
        If the request fails, the frontend continues using cookie/localStorage.

      tags:
        - preferences

      security:
        - sessionAuth: []
        - csrfToken: []

      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ThemePreference'
            examples:
              setDarkMode:
                value:
                  theme_mode: dark
                  theme_brand: default
              setCustomBrand:
                value:
                  theme_mode: light
                  theme_brand: acme

      responses:
        '200':
          description: Preference updated successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ThemePreference'

        '201':
          description: Preference created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ThemePreference'

        '400':
          description: Invalid request body
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidationError'
              example:
                error: "Validation failed"
                details:
                  theme_mode:
                    - "Must be 'light' or 'dark'"

        '401':
          description: Unauthenticated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

        '500':
          description: Server error (frontend logs warning and continues)
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    ThemePreference:
      type: object
      required:
        - theme_mode
        - theme_brand
      properties:
        theme_mode:
          type: string
          enum: [light, dark]
          description: Base color mode
          example: dark

        theme_brand:
          type: string
          description: Brand variant identifier
          example: default
          pattern: '^[a-z0-9-]+$'
          minLength: 1
          maxLength: 50

      example:
        theme_mode: dark
        theme_brand: default

    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
          description: Human-readable error message
          example: "Theme preference not found"

    ValidationError:
      type: object
      required:
        - error
        - details
      properties:
        error:
          type: string
          example: "Validation failed"

        details:
          type: object
          description: Field-specific validation errors
          additionalProperties:
            type: array
            items:
              type: string
          example:
            theme_mode:
              - "Must be 'light' or 'dark'"
            theme_brand:
              - "Must be lowercase alphanumeric with hyphens"

  securitySchemes:
    sessionAuth:
      type: apiKey
      in: cookie
      name: sessionid
      description: Django session cookie

    csrfToken:
      type: apiKey
      in: header
      name: X-CSRFToken
      description: CSRF protection token
```

---

## Backend Implementation Guidance

### Django Example

```python
# preferences/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def theme_preference(request):
    """
    Get or set user theme preference.

    GET: Returns stored preference or 404 if not set
    POST: Saves preference and returns it
    """

    if request.method == 'GET':
        # Retrieve from user preferences JSON field or related model
        theme_pref = request.user.preferences.get('theme')

        if not theme_pref:
            return Response(
                {'error': 'Theme preference not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'theme_mode': theme_pref.get('mode', 'light'),
            'theme_brand': theme_pref.get('brand', 'default')
        })

    elif request.method == 'POST':
        # Validate input
        theme_mode = request.data.get('theme_mode')
        theme_brand = request.data.get('theme_brand')

        if theme_mode not in ['light', 'dark']:
            return Response(
                {
                    'error': 'Validation failed',
                    'details': {
                        'theme_mode': ["Must be 'light' or 'dark'"]
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not theme_brand or not theme_brand.replace('-', '').isalnum():
            return Response(
                {
                    'error': 'Validation failed',
                    'details': {
                        'theme_brand': ["Must be lowercase alphanumeric with hyphens"]
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save to user preferences
        if not hasattr(request.user, 'preferences'):
            request.user.preferences = {}

        request.user.preferences['theme'] = {
            'mode': theme_mode,
            'brand': theme_brand
        }
        request.user.save()

        # Return saved preference
        return Response({
            'theme_mode': theme_mode,
            'theme_brand': theme_brand
        }, status=status.HTTP_200_OK)
```

### Database Schema (Example)

```python
# Option 1: JSON field on User model
class User(AbstractUser):
    preferences = models.JSONField(default=dict, blank=True)
    # preferences['theme'] = {'mode': 'dark', 'brand': 'default'}

# Option 2: Separate UserPreference model
class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='theme_preference')
    theme_mode = models.CharField(max_length=10, choices=[('light', 'Light'), ('dark', 'Dark')])
    theme_brand = models.CharField(max_length=50, default='default')
    updated_at = models.DateTimeField(auto_now=True)
```

---

## Frontend Integration

```typescript
// storage/B12Storage.ts
import { apiClient } from '@django-core/api-client';

export class B12ThemeStorage implements ThemeStorage {
  private readonly endpoint = '/api/preferences/theme';

  async loadTheme(): Promise<ThemeConfiguration | null> {
    try {
      const response = await apiClient.get<B12ThemeResponse>(this.endpoint);

      return {
        mode: response.data.theme_mode,
        brand: response.data.theme_brand
      };
    } catch (error) {
      if (error.response?.status === 404) {
        // No preference set - this is expected, not an error
        return null;
      }

      if (error.response?.status === 401) {
        // User not logged in - fall back to local storage
        console.info('[F07] B12 theme load: user not authenticated');
        return null;
      }

      // Server error or network failure - log warning and fall back
      console.warn('[F07] B12 theme load failed:', error.message);
      return null;
    }
  }

  async saveTheme(theme: ThemeConfiguration): Promise<void> {
    try {
      await apiClient.post<B12ThemeResponse>(this.endpoint, {
        theme_mode: theme.mode,
        theme_brand: theme.brand
      });
    } catch (error) {
      // Non-blocking: cookie + localStorage already updated
      console.warn('[F07] B12 theme save failed:', error.message);
    }
  }
}

interface B12ThemeResponse {
  theme_mode: 'light' | 'dark';
  theme_brand: string;
}
```

---

## Error Handling Requirements

### Frontend Requirements

1. **404 (No Preference)**: Normal case, return null and use local fallback
2. **401 (Unauthenticated)**: Expected for logged-out users, return null
3. **500 (Server Error)**: Log warning, return null, continue with local storage
4. **Network Failure**: Log warning, return null, continue with local storage

All errors MUST be non-blocking. Theme system continues functioning with cookie/localStorage even if B12 is completely unavailable.

### Backend Requirements

1. **Authentication**: Require authenticated user (401 if not logged in)
2. **Validation**: Return 400 with field-specific errors for invalid input
3. **Scope**: Preference scoped to authenticated user or organization
4. **Idempotency**: POST should be idempotent (same result for multiple calls with same data)
5. **Performance**: Response time <100ms for GET, <200ms for POST (non-critical, best effort)

---

## Testing

### Frontend Tests

```typescript
describe('B12ThemeStorage', () => {
  test('loads theme from API', async () => {
    mockApiClient.get.mockResolvedValue({
      data: { theme_mode: 'dark', theme_brand: 'default' }
    });

    const theme = await storage.loadTheme();
    expect(theme).toEqual({ mode: 'dark', brand: 'default' });
  });

  test('returns null on 404', async () => {
    mockApiClient.get.mockRejectedValue({ response: { status: 404 } });

    const theme = await storage.loadTheme();
    expect(theme).toBeNull();
  });

  test('saves theme to API', async () => {
    await storage.saveTheme({ mode: 'dark', brand: 'brandX' });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/preferences/theme', {
      theme_mode: 'dark',
      theme_brand: 'brandX'
    });
  });

  test('handles save failure gracefully', async () => {
    mockApiClient.post.mockRejectedValue(new Error('Network error'));

    // Should not throw
    await expect(storage.saveTheme({ mode: 'dark', brand: 'default' }))
      .resolves.toBeUndefined();
  });
});
```

### Backend Tests (Django Example)

```python
class ThemePreferenceTestCase(APITestCase):
    def test_get_theme_preference(self):
        self.user.preferences = {'theme': {'mode': 'dark', 'brand': 'default'}}
        self.user.save()

        response = self.client.get('/api/preferences/theme')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['theme_mode'], 'dark')
        self.assertEqual(response.data['theme_brand'], 'default')

    def test_get_returns_404_when_not_set(self):
        response = self.client.get('/api/preferences/theme')
        self.assertEqual(response.status_code, 404)

    def test_post_saves_theme_preference(self):
        response = self.client.post('/api/preferences/theme', {
            'theme_mode': 'dark',
            'theme_brand': 'brandX'
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.preferences['theme']['mode'], 'dark')

    def test_post_validates_theme_mode(self):
        response = self.client.post('/api/preferences/theme', {
            'theme_mode': 'invalid',
            'theme_brand': 'default'
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertIn('theme_mode', response.data['details'])
```

---

## Versioning

**Current Version**: 1.0.0

**Future Enhancements** (breaking = major version bump):
- Organization-level theme preferences (scoped to org, not user)
- Theme preference history/audit log
- Scheduled theme switching (auto-dark at night)
- Per-device theme preferences

**Deprecation Policy**: If API contract changes, provide 6-month deprecation period with backwards-compatible middleware supporting both old and new formats.
