# Credits (B11 - Credits & Usage Tracking)

**Status**: ✅ Complete
**Location**: `src/credits/`

## Purpose

Provides organisation-scoped credit balance tracking for usage-based features and metering.

## Scope

**✅ Included**:
- Organisation-level credit balance storage
- Credit balance retrieval API
- Multi-tenant credit isolation
- Basic credit balance management

**❌ Excluded** (Product-Agnostic Constraint):
- Product-specific pricing logic
- Payment processing or billing
- Credit purchase flows
- Usage calculation algorithms (handled by product layer)
- Credit expiration rules

## Key Components

### Models
- **`CreditsBalance`**: Organisation-scoped credit balance with current balance and timestamps

### APIs/Views
- **`GET /api/credits/balance/`**: Retrieve credits balance for current organisation context

### Serializers
- **`CreditsBalanceSerializer`**: Serializes credit balance data for API responses

## Public Interface

**Safe to Import** (Stable API):
```python
from credits.models import CreditsBalance
from credits.serializers import CreditsBalanceSerializer
```

**Internal Use Only** (May change):
```python
# Do NOT import these from downstream projects
from credits.views import get_organisation_credits  # Use API endpoint instead
```

## Integration Example

**Check Organisation Credits**:
```python
from credits.models import CreditsBalance

# Get credits balance for organisation
balance = CreditsBalance.objects.get(organisation=org)
current_credits = balance.current_balance

# Check if organisation has sufficient credits
if current_credits >= required_credits:
    # Proceed with operation
    pass
```

**API Usage**:
```bash
# Retrieve credits balance for organisation
GET /api/credits/balance/?organisation_id=123
Authorization: Bearer <token>

# Response
{
    "id": 1,
    "organisation": 123,
    "current_balance": 1000,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
}
```

## Related Modules

**Dependencies** (This module requires):
- [B06 Organisations] - Multi-tenancy and organisation context
- [B05 Accounts] - User authentication for API access
- [B11 Transactions] - Transaction ledger for credit changes (sibling module)

**Used By** (Modules that depend on this):
- Product applications - Usage metering and feature gating
- [B11 Transactions] - Records credit transactions

## Extension Points

**How Downstream Products Can Extend**:

1. **Custom Credit Logic**:
   ```python
   # your_product/models.py
   from credits.models import CreditsBalance
   from django.db import models

   class ProductCreditsPolicy(models.Model):
       """Product-specific credit policies."""
       balance = models.ForeignKey(CreditsBalance, on_delete=models.CASCADE)
       feature_cost = models.IntegerField()
       monthly_allocation = models.IntegerField()
   ```

2. **Custom API Endpoints**:
   ```python
   # your_product/views.py
   from credits.models import CreditsBalance
   from rest_framework.decorators import api_view

   @api_view(["POST"])
   def deduct_credits(request):
       """Deduct credits for product usage."""
       balance = CreditsBalance.objects.get(organisation=org)
       balance.current_balance -= amount
       balance.save()
       return Response({"new_balance": balance.current_balance})
   ```

3. **Credit Balance Signals**:
   ```python
   # your_product/signals.py
   from django.db.models.signals import post_save
   from django.dispatch import receiver
   from credits.models import CreditsBalance

   @receiver(post_save, sender=CreditsBalance)
   def handle_balance_change(sender, instance, **kwargs):
       """React to credit balance changes."""
       if instance.current_balance < 100:
           send_low_balance_alert(instance.organisation)
   ```

## Configuration

**Required Settings**:
```python
# settings.py
INSTALLED_APPS = [
    # ...
    "credits",
]
```

**Environment Variables**:
```bash
# No environment variables required
```

**Optional Settings**:
```python
# settings.py (optional)
CREDITS_LOW_BALANCE_THRESHOLD = 100  # Warning threshold
CREDITS_ENABLE_NEGATIVE_BALANCE = False  # Allow overdraft
```

## Testing

**Run Module Tests**:
```bash
pytest tests/credits/ -v
```

**Key Test Coverage**:
- ✅ Credit balance CRUD operations
- ✅ Organisation isolation (user can only access their org's credits)
- ✅ API endpoint authentication and authorization
- ✅ Balance retrieval with missing organisation context

## References

- **Spec**: [documents/02-roadmap/modules/done/011-Bxx-core-transactions-credits.md](../../documents/02-roadmap/modules/done/011-Bxx-core-transactions-credits.md)
- **Module Doc**: [documents/04-modules/backend/B11-transactions-credits.md](../../documents/04-modules/backend/B11-transactions-credits.md)
- **Constitution**: [Article II - Architecture and Modularity](../../.kittify/memory/constitution.md#ii-architecture-and-modularity)

## Troubleshooting

**Common Issues**:

1. **Issue**: 404 when fetching credits balance
   - **Cause**: No `CreditsBalance` record exists for organisation
   - **Solution**: Create initial balance record in Django admin or via migration

2. **Issue**: 403 Forbidden when accessing credits
   - **Cause**: User not a member of requested organisation
   - **Solution**: Verify user has active membership in organisation

3. **Issue**: Missing `organisation_id` parameter error
   - **Cause**: Frontend not passing organisation context
   - **Solution**: Include `organisation_id` query parameter in API request

## Migration Notes

**Breaking Changes**:
- None - module stable since initial release

**Deprecations**:
- None
