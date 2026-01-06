# Config (Django Settings)

**Status**: ✅ Complete
**Location**: `src/config/`

## Purpose

Provides centralized Django settings configuration, ASGI/WSGI server setup, and middleware stack for the Core-App.

## Scope

**✅ Included**:
- Django project settings (development, staging, production)
- ASGI/WSGI application entrypoints
- Middleware configuration and custom middleware
- URL routing configuration
- Environment-based settings management

**❌ Excluded** (Product-Agnostic Constraint):
- Product-specific middleware logic
- Domain-specific URL patterns (those live in feature modules)
- Application-specific business rules

## Key Components

### Settings
- **`settings.py`**: Main Django settings file with environment-aware configuration
- **`settings/`**: Split settings directory for environment-specific overrides

### Server Configuration
- **`asgi.py`**: ASGI application for async server deployment (Daphne, Uvicorn)
- **`wsgi.py`**: WSGI application for traditional server deployment (Gunicorn, uWSGI)

### URL Configuration
- **`urls.py`**: Root URL configuration including all module routes

### Middleware
- **`middleware/`**: Custom middleware for request/response processing

## Public Interface

**Safe to Import** (Stable API):
```python
from django.conf import settings
from config.wsgi import application as wsgi_app
from config.asgi import application as asgi_app
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from config.settings import SECRET_KEY  # Use django.conf.settings instead
```

## Integration Example

**Access Settings**:
```python
from django.conf import settings

# Access configuration
debug_mode = settings.DEBUG
database_name = settings.DATABASES["default"]["NAME"]
secret_key = settings.SECRET_KEY
```

**Custom Middleware**:
```python
# config/middleware/custom.py
class CustomMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Process request
        response = self.get_response(request)
        # Process response
        return response

# settings.py
MIDDLEWARE = [
    # ...
    "config.middleware.custom.CustomMiddleware",
]
```

## Related Modules

**Dependencies** (This module requires):
- All Core-App modules - imports and configures all installed apps

**Used By** (Modules that depend on this):
- All modules - provides Django framework configuration

## Extension Points

**How Downstream Products Can Extend**:

1. **Override Settings**:
   ```python
   # your_product/settings.py
   from config.settings import *

   # Override specific settings
   INSTALLED_APPS += [
       "your_product.custom_app",
   ]

   CUSTOM_SETTING = "your-value"
   ```

2. **Add Custom Middleware**:
   ```python
   # your_product/middleware.py
   class ProductMiddleware:
       def __init__(self, get_response):
           self.get_response = get_response

       def __call__(self, request):
           # Add product-specific logic
           return self.get_response(request)

   # settings.py
   MIDDLEWARE.insert(0, "your_product.middleware.ProductMiddleware")
   ```

3. **Extend URL Configuration**:
   ```python
   # your_product/urls.py
   from django.urls import path, include
   from config.urls import urlpatterns as core_patterns

   urlpatterns = core_patterns + [
       path("custom/", include("your_product.urls")),
   ]
   ```

## Configuration

**Required Settings**:
```python
# settings.py
SECRET_KEY = "your-secret-key"  # Required for Django
DEBUG = False  # Set to False in production
ALLOWED_HOSTS = ["example.com"]  # Required for production
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "database_name",
    }
}
```

**Environment Variables**:
```bash
SECRET_KEY=your-secret-key-here
DEBUG=false
DATABASE_URL=postgresql://user:pass@host:5432/dbname
ALLOWED_HOSTS=example.com,www.example.com
```

**Optional Settings**:
```python
# settings.py (optional)
LANGUAGE_CODE = "en-us"  # Default language
TIME_ZONE = "UTC"  # Default timezone
USE_TZ = True  # Use timezone-aware datetimes
```

## Testing

**Run Module Tests**:
```bash
pytest tests/config/ -v
```

**Key Test Coverage**:
- ✅ Settings load correctly in different environments
- ✅ ASGI/WSGI applications initialize properly
- ✅ Middleware stack processes requests correctly
- ✅ URL routing resolves as expected

## References

- **Django Settings**: https://docs.djangoproject.com/en/stable/ref/settings/
- **ASGI Spec**: https://asgi.readthedocs.io/
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: `SECRET_KEY` not found error
   - **Cause**: Missing environment variable or settings configuration
   - **Solution**: Set `SECRET_KEY` in environment or settings file

2. **Issue**: 400 Bad Request in production
   - **Cause**: Domain not in `ALLOWED_HOSTS`
   - **Solution**: Add your domain to `ALLOWED_HOSTS` setting

3. **Issue**: Static files not serving in production
   - **Cause**: `STATIC_ROOT` not configured or `collectstatic` not run
   - **Solution**: Configure `STATIC_ROOT` and run `python manage.py collectstatic`

## Migration Notes

**Breaking Changes**:
- None - module stable since initial release

**Deprecations**:
- None
