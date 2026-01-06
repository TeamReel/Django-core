# Scaffolding Quickstart Tutorial

## Introduction

This tutorial walks you through generating your first Django apps using the scaffolding CLI. You'll learn how to use built-in templates, customize generation with variables, and create your own custom templates.

**Time:** 30 minutes
**Prerequisites:** Django 5.1+, Python 3.12+

---

## Part 1: Generate Your First App (5 minutes)

### Step 1: Verify Installation

```bash
python manage.py scaffold --help
```

Output:
```
usage: manage.py scaffold [-h] {generate,list,validate} ...

Django app scaffolding CLI

commands:
  {generate,list,validate}
    generate            Generate app from template
    list                List available templates
    validate            Validate generated code
```

### Step 2: List Available Templates

```bash
python manage.py scaffold list
```

Output:
```
Available Templates:
┌────────────┬──────────────────────────────────────┬──────────────┐
│ Name       │ Description                          │ Extends      │
├────────────┼──────────────────────────────────────┼──────────────┤
│ minimal    │ Basic Django app with models, tests  │ -            │
│ api-first  │ DRF API with serializers, viewsets   │ minimal      │
│ service    │ Service layer for business logic     │ minimal      │
│ ui-backed  │ Full-stack with views, forms, HTML   │ minimal      │
└────────────┴──────────────────────────────────────┴──────────────┘
```

### Step 3: Generate a Minimal App

```bash
python manage.py scaffold generate minimal accounts
```

The CLI will:
1. Load the `minimal` template
2. Render all template files
3. Create the `accounts` directory
4. Generate Python files
5. Validate with Ruff and mypy

Output:
```
✓ Template loaded: minimal
✓ Rendering templates...
✓ Creating directory: accounts/
✓ Writing files...
  - accounts/__init__.py
  - accounts/apps.py
  - accounts/models.py
  - accounts/tests/test_models.py
✓ Running validation...
✓ Ruff: 0 errors
✓ mypy: 0 errors

✓ Successfully generated 'accounts' from 'minimal' template
  Files created: 7
  Lines of code: 120
```

### Step 4: Explore Generated Code

```bash
tree accounts/
```

Output:
```
accounts/
├── __init__.py
├── apps.py
├── models.py
├── tests/
│   ├── __init__.py
│   └── test_models.py
├── migrations/
│   └── __init__.py
└── locale/
    └── .gitkeep
```

View generated model:

```bash
cat accounts/models.py
```

---

## Part 2: Generate an API App (10 minutes)

### Step 1: Generate API-First App

```bash
python manage.py scaffold generate api-first products \
  --var model_name=Product
```

The `--var` flag customizes the model name from default "Item" to "Product".

### Step 2: Explore API Structure

```bash
tree products/
```

Output:
```
products/
├── __init__.py
├── apps.py
├── models.py              # From minimal template
├── serializers.py         # DRF serializers
├── views.py               # ViewSets
├── urls.py                # Router config
├── permissions.py         # Custom permissions
├── filters.py             # django-filters
└── tests/
    ├── __init__.py
    ├── test_models.py
    ├── test_api.py        # API endpoint tests
    ├── test_serializers.py
    └── test_permissions.py
```

### Step 3: View Generated Serializer

```bash
cat products/serializers.py
```

Notice how `model_name=Product` was used:

```python
from rest_framework import serializers
from .models import Product  # Uses custom model name

class ProductSerializer(serializers.ModelSerializer):
    """Serializer for Product model."""

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
```

### Step 4: Run Tests

```bash
cd products/
pytest tests/
```

---

## Part 3: Generate Service Layer (5 minutes)

### Step 1: Generate Service App

```bash
python manage.py scaffold generate service orders \
  --var service_name=OrderService
```

### Step 2: Explore Service Structure

```bash
tree orders/
```

Output:
```
orders/
├── __init__.py
├── apps.py
├── models.py
├── services.py          # Business logic layer
├── exceptions.py        # Custom exceptions
└── tests/
    ├── __init__.py
    ├── test_models.py
    └── test_services.py
```

### Step 3: View Service Layer

```bash
cat orders/services.py
```

Notice transaction management and type hints:

```python
from typing import List, Optional
from django.db import transaction
from .models import Item

class OrderService:
    """Service layer for Order operations."""

    @staticmethod
    def get_all(active_only: bool = False) -> List[Item]:
        """Retrieve all items."""
        queryset = Item.objects.all()
        if active_only:
            queryset = queryset.filter(is_active=True)
        return queryset

    @staticmethod
    @transaction.atomic
    def create(name: str, description: str = "", **kwargs) -> Item:
        """Create new item with validation."""
        # Validation and business logic
        item = Item.objects.create(
            name=name,
            description=description,
            **kwargs
        )
        return item
```

---

## Part 4: Generate UI-Backed App (10 minutes)

### Step 1: Generate Full-Stack App

```bash
python manage.py scaffold generate ui-backed dashboard \
  --var model_name=Widget
```

### Step 2: Explore UI Structure

```bash
tree dashboard/
```

Output:
```
dashboard/
├── __init__.py
├── apps.py
├── models.py
├── views.py              # Class-based views
├── forms.py              # ModelForm
├── urls.py               # URL patterns
├── templates/
│   └── dashboard/
│       ├── base.html
│       ├── widget_list.html
│       ├── widget_detail.html
│       ├── widget_form.html
│       └── widget_confirm_delete.html
├── static/
│   └── dashboard/
│       ├── css/
│       │   └── style.css
│       └── js/
│           └── main.js
└── tests/
    ├── __init__.py
    ├── test_models.py
    ├── test_views.py
    └── test_forms.py
```

### Step 3: View Generated Views

```bash
cat dashboard/views.py
```

Notice the complete CRUD views:

```python
from django.views.generic import ListView, DetailView, CreateView, UpdateView, DeleteView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.urls import reverse_lazy
from .models import Widget
from .forms import WidgetForm

class WidgetListView(LoginRequiredMixin, ListView):
    """List all widgets."""
    model = Widget
    template_name = 'dashboard/widget_list.html'
    context_object_name = 'widgets'
    paginate_by = 20

class WidgetCreateView(LoginRequiredMixin, CreateView):
    """Create new widget."""
    model = Widget
    form_class = WidgetForm
    template_name = 'dashboard/widget_form.html'
    success_url = reverse_lazy('dashboard:widget-list')
```

### Step 4: Add to URLs

Add to your project's `urls.py`:

```python
from django.urls import path, include

urlpatterns = [
    # ... other patterns
    path('dashboard/', include('dashboard.urls', namespace='dashboard')),
]
```

### Step 5: Run Development Server

```bash
python manage.py runserver
```

Visit `http://localhost:8000/dashboard/` to see the UI.

---

## Part 5: Non-Interactive Mode for CI/CD

### Step 1: Generate Multiple Apps

Create a script for CI/CD:

```bash
#!/bin/bash
# generate_apps.sh

# Generate apps without prompts
python manage.py scaffold generate minimal accounts --non-interactive
python manage.py scaffold generate api-first products --var model_name=Product --non-interactive
python manage.py scaffold generate service orders --var service_name=OrderService --non-interactive
python manage.py scaffold generate ui-backed dashboard --var model_name=Widget --non-interactive

# Validate all apps
python manage.py scaffold validate --strict
```

### Step 2: Make Script Executable

```bash
chmod +x generate_apps.sh
```

### Step 3: Run Script

```bash
./generate_apps.sh
```

---

## Part 6: Custom Template Creation (Bonus)

### Step 1: Create Template Directory

```bash
mkdir -p custom_templates/microservice
cd custom_templates/microservice
```

### Step 2: Create Manifest

Create `__template__.yaml`:

```yaml
name: microservice
description: Microservice template with health checks and monitoring
extends: api-first

variables:
  required:
    app_name:
      type: string
      validation: "^[a-z][a-z0-9_]*$"
  optional:
    model_name:
      type: string
      default: "Item"
    enable_monitoring:
      type: boolean
      default: true

files:
  - path: "health.py"
    template: "health.py.j2"
  - path: "monitoring.py"
    template: "monitoring.py.j2"
    condition: "{{ enable_monitoring }}"
  - path: "tests/test_health.py"
    template: "tests/test_health.py.j2"

author: "Your Name"
version: "1.0.0"
```

### Step 3: Create Template File

Create `health.py.j2`:

```jinja
"""
{{ app_name }} health check endpoints.
"""

from django.http import JsonResponse
from django.views import View


class HealthCheckView(View):
    """Health check endpoint for {{ app_name }}."""

    def get(self, request):
        """Return health status."""
        return JsonResponse({
            'status': 'healthy',
            'app': '{{ app_name }}',
            'version': '1.0.0'
        })


class ReadinessCheckView(View):
    """Readiness check endpoint for {{ app_name }}."""

    def get(self, request):
        """Return readiness status."""
        # Check database connectivity
        from .models import {{ model_name | default('Item') }}

        try:
            {{ model_name | default('Item') }}.objects.exists()
            ready = True
        except Exception:
            ready = False

        status_code = 200 if ready else 503
        return JsonResponse({
            'status': 'ready' if ready else 'not_ready',
            'app': '{{ app_name }}'
        }, status=status_code)
```

### Step 4: Generate from Custom Template

```bash
python manage.py scaffold generate microservice payments \
  --template-dir ./custom_templates/ \
  --var model_name=Payment \
  --var enable_monitoring=true
```

### Step 5: Verify Custom Files

```bash
tree payments/
```

Should include `health.py` and `monitoring.py`.

---

## Summary

### What You Learned

1. ✅ Generate apps from built-in templates
2. ✅ Customize generation with variables
3. ✅ Generate API, service, and UI apps
4. ✅ Use non-interactive mode for CI/CD
5. ✅ Create custom templates

### Generated Apps

```
project/
├── accounts/          # Minimal app
├── products/          # API-first app
├── orders/            # Service layer
├── dashboard/         # UI-backed app
└── payments/          # Custom microservice
```

### Next Steps

- **Production Setup:** Configure `settings.py` to include generated apps
- **Database:** Run `python manage.py migrate`
- **Tests:** Run `pytest` to verify all tests pass
- **Customization:** Modify generated code to match your requirements
- **Advanced:** Create more custom templates for your project patterns

### Quick Reference

```bash
# List templates
python manage.py scaffold list

# Generate minimal app
python manage.py scaffold generate minimal <app_name>

# Generate API app with custom model
python manage.py scaffold generate api-first <app_name> --var model_name=<ModelName>

# Generate with custom template directory
python manage.py scaffold generate <template> <app_name> --template-dir ./custom_templates/

# Non-interactive mode (CI/CD)
python manage.py scaffold generate <template> <app_name> --non-interactive

# Validate generated code
python manage.py scaffold validate --directory <app_dir>/ --strict
```

---

## Troubleshooting

### Issue: Template not found

**Solution:** Check available templates with `scaffold list`

### Issue: Invalid app name

**Solution:** Use snake_case without hyphens (e.g., `user_accounts`, not `user-accounts`)

### Issue: Validation failed

**Solution:** Review generated code or skip validation with `--no-validate`

### Issue: Permission denied

**Solution:** Check directory permissions or use `--output-dir` to specify writable location

---

## Additional Resources

- [CLI User Guide](cli-guide.md): Complete CLI documentation
- [Template Authoring Guide](template-authoring.md): Create custom templates
- [Architecture Overview](architecture.md): Understand how it works
- [Extension Guide](extension-guide.md): Advanced customization

---

## Feedback

Encountered issues or have suggestions? Please open an issue or contribute to the documentation.

Happy scaffolding! 🚀
