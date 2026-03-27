# [Module Name] ([Bxx/Fxx])

**Status**: [✅ Complete | 🚧 In Progress | 📋 Planned]
**Location**: `src/[module_name]/`

## Purpose

[Single sentence describing what this module does and its core responsibility]

## Scope

**✅ Included**:
- [Key capability 1]
- [Key capability 2]
- [Key capability 3]

**❌ Excluded** (Product-Agnostic Constraint):
- [Product-specific logic explicitly NOT in scope]
- [Domain-specific business rules]
- [Client-specific workflows]

## Key Components

### Models
- **`ModelName`**: [Brief description of model purpose]
- **`AnotherModel`**: [Brief description]

### APIs/Views
- **`GET /api/endpoint/`**: [What it does]
- **`POST /api/endpoint/`**: [What it does]

### Services/Managers
- **`ServiceClass`**: [Core business logic]
- **`CustomManager`**: [Query helpers]

### Utilities
- **`utility_function()`**: [Helper functions]

## Public Interface

**Safe to Import** (Stable API):
```python
from [module_name].models import ModelName
from [module_name].services import ServiceClass
from [module_name].serializers import ModelSerializer
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from [module_name].utils.internal import ...
```

## Integration Example

**Minimal Working Example**:
```python
# Example showing how to use this module
from [module_name].models import ModelName

# Create instance
instance = ModelName.objects.create(
    field="value"
)

# Use service
from [module_name].services import ServiceClass
result = ServiceClass.do_something(instance)
```

## Related Modules

**Dependencies** (This module requires):
- [B05 Accounts] - User model
- [B06 Organisations] - Multi-tenancy
- [Other module] - [Why needed]

**Used By** (Modules that depend on this):
- [B13 API] - Exposes endpoints
- [Other module] - [How it's used]

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Models**:
   ```python
   # your_product/models.py
   from [module_name].models import BaseModel

   class CustomModel(models.Model):
       base = models.ForeignKey(BaseModel, on_delete=models.CASCADE)
       custom_field = models.CharField(max_length=100)
   ```

2. **Custom API Endpoints**:
   ```python
   # your_product/views.py
   from [module_name].serializers import BaseSerializer

   class CustomViewSet(viewsets.ModelViewSet):
       serializer_class = BaseSerializer
       # Add custom logic
   ```

3. **Signals/Hooks**:
   ```python
   # your_product/signals.py
   from django.dispatch import receiver
   from [module_name].signals import custom_signal

   @receiver(custom_signal)
   def handle_signal(sender, **kwargs):
       # Custom handling
   ```

## Configuration

**Required Settings**:
```python
# settings.py
MODULE_NAME_SETTING = "value"  # Description
MODULE_NAME_TIMEOUT = 30  # Seconds, default: 30
```

**Environment Variables**:
```bash
MODULE_NAME_API_KEY=xxx  # Required for external integration
MODULE_NAME_DEBUG=false  # Optional, default: false
```

**Optional Settings**:
```python
# settings.py (optional)
MODULE_NAME_FEATURE_FLAG = True  # Enable advanced features
```

## Testing

**Run Module Tests**:
```bash
pytest tests/[module_name]/ -v
```

**Key Test Coverage**:
- ✅ Model CRUD operations
- ✅ API endpoint responses
- ✅ Service business logic
- ✅ Permission checks
- ✅ Edge cases and validation

## References

- **Spec**: [documents/02-roadmap/modules/done/XXX-Bxx-module-name/index.md](../../documents/02-roadmap/modules/done/XXX-Bxx-module-name/index.md)
- **Module Doc**: [documents/04-modules/backend/Bxx-module-name.md](../../documents/04-modules/backend/Bxx-module-name.md)
- **API Docs**: [Auto-generated API docs](../api/docs/)
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: [Description of problem]
   - **Cause**: [Why it happens]
   - **Solution**: [How to fix]

2. **Issue**: [Another common problem]
   - **Cause**: [Why it happens]
   - **Solution**: [How to fix]

## Migration Notes

**Breaking Changes**:
- **v1.1.0**: [Description of breaking change and migration path]
- **v1.0.0**: Initial release

**Deprecations**:
- `old_function()` deprecated in v1.1.0, use `new_function()` instead
