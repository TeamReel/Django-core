# Demo Data Seeding Guide

This guide explains how to seed the Django Core-App with demonstration data for the football organizations reference implementation.

## Overview

The demo dataset creates a realistic multi-tenant environment featuring 5 European football leagues with users, credit transactions, and notifications.

**Included Data**:
- 5 Football Organizations (Premier League, Bundesliga, Serie A, Ligue 1, Eredivisie)
- 15 Users (3 per organization: admin, coach, player)
- 17 Credit Transactions (deposits, withdrawals, adjustments)
- 5 Credit Balances (calculated from transactions)
- 6 Notifications (various types)
- 4 Notification Types (with retry policies)

---

## Prerequisites

1. **Migrations Applied**:
   ```bash
   python manage.py migrate
   ```

2. **Default Roles Seeded** (required for user role assignments):
   ```bash
   python manage.py seed_default_roles
   ```
   This creates:
   - Global Admin (wildcard permission)
   - Organization Admin (15 permissions)
   - Organization Member (6 permissions)
   - Organization Viewer (3 permissions)
   - Project Admin (7 permissions)
   - Project Member (2 permissions)
   - Project Viewer (1 permission)

---

## Seeding Demo Data

### Command
```bash
python manage.py seed_football_data
```

### Expected Output
```
Creating football organisations...
  Created: Premier League (premier-league)
  Created: Bundesliga (bundesliga)
  Created: Serie A (serie-a)
  Created: Ligue 1 (ligue-1)
  Created: Eredivisie (eredivisie)

Creating users for each organisation...
  Created admin: admin@premierleague.com
  Created coach: coach@premierleague.com
  Created player: player@premierleague.com
  [... similar for other orgs]

Creating transactions...
  Created 17 transactions across 5 organisations

Updating credit balances...
  Premier League: 10,698 credits (sum of transactions)
  Bundesliga: 13,299 credits (sum of transactions)
  Serie A: 8,249 credits (sum of transactions)
  Ligue 1: 14,299 credits (sum of transactions)
  Eredivisie: 3,529 credits (sum of transactions)

Creating notification types...
  Created: credit_low
  Created: project_invite
  Created: transaction_complete
  Created: match_data_ready

Creating notifications...
  Created 6 notifications

Football demo data seeded successfully!
```

### Idempotency
The seed command is **idempotent** - running it multiple times will not create duplicates:
- Organizations checked by slug
- Users checked by email
- Transactions checked by idempotency_key
- Notifications checked by idempotency_key

---

## Demo Accounts

### User Credentials

All demo users have password: `Basis123.`

#### Premier League
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@premierleague.com` | `Basis123.` |
| Coach | `coach@premierleague.com` | `Basis123.` |
| Player | `player@premierleague.com` | `Basis123.` |

#### Bundesliga
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@bundesliga.com` | `Basis123.` |
| Coach | `coach@bundesliga.com` | `Basis123.` |
| Player | `player@bundesliga.com` | `Basis123.` |

#### Serie A
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@seriea.com` | `Basis123.` |
| Coach | `coach@seriea.com` | `Basis123.` |
| Player | `player@seriea.com` | `Basis123.` |

#### Ligue 1
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@ligue1.com` | `Basis123.` |
| Coach | `coach@ligue1.com` | `Basis123.` |
| Player | `player@ligue1.com` | `Basis123.` |

#### Eredivisie
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@eredivisie.com` | `Basis123.` |
| Coach | `coach@eredivisie.com` | `Basis123.` |
| Player | `player@eredivisie.com` | `Basis123.` |

---

## Transaction Examples

### Premier League
- +10,000 credits: Monthly subscription - Liverpool FC
- -2,500.50 credits: Video streaming usage - match highlights
- -1,800.75 credits: API calls - player statistics
- +5,000 credits: Promotional credit - new season kickoff
- **Final Balance**: 10,698 credits

### Bundesliga
- +15,000 credits: Premium subscription - Bayern München
- -3,200 credits: Data processing - match analytics
- -1,500.25 credits: Storage usage - video archive
- +3,000 credits: Compensation for service outage
- **Final Balance**: 13,299 credits

### Serie A
- +12,000 credits: Annual subscription - Juventus
- -2,100.50 credits: API usage - tactical analysis
- -1,650 credits: Video processing - match review
- **Final Balance**: 8,249 credits

### Ligue 1
- +20,000 credits: Enterprise subscription - PSG
- -4,500.75 credits: Premium API access - player tracking
- -1,200 credits: Cloud storage - training videos
- **Final Balance**: 14,299 credits

### Eredivisie
- +5,000 credits: Standard subscription - Ajax
- -850.50 credits: Basic API usage - statistics
- -620.25 credits: Storage - match recordings
- **Final Balance**: 3,529 credits

**Balance Formula**: `Balance = Σ(transaction amounts)` - No starting balance, pure transaction sum

---

## Notification Examples

### Credit Low Warning
- **Recipient**: Premier League admin
- **Type**: credit_low
- **Status**: Unread
- **Message**: "Your organisation's credit balance is running low (10,698 credits remaining)"

### Project Invitation
- **Recipient**: Bundesliga coach
- **Type**: project_invite
- **Status**: Unread
- **Message**: "You have been invited to join the project 'Season Planning 2024'"

### Transaction Complete
- **Recipient**: Serie A admin
- **Type**: transaction_complete
- **Status**: Read
- **Message**: "Your transaction of 12,000 credits has been processed successfully"

(+ 3 more notifications for other users)

---

## Testing Scenarios

### 1. Login & Context Switching
```bash
# Login as Premier League admin
POST /api/v1/accounts/auth/login/
{
  "email": "admin@premierleague.com",
  "password": "Basis123."
}

# List user's organizations
GET /api/v1/organisations/

# Switch context to Premier League
# (Frontend: useContextSwitcher hook)
```

### 2. View Credit Balance
```bash
# Get Premier League balance
GET /api/v1/organisations/premier-league/credits/balance/

# Expected response:
{
  "current_balance": 10698,
  "currency": "EUR",
  "policy_type": "prepaid"
}
```

### 3. View Transactions
```bash
# List Premier League transactions
GET /api/v1/organisations/premier-league/transactions/

# Expected: 4 transactions with correct amounts
```

### 4. View Notifications
```bash
# Login as Premier League admin
# Get notifications (in-app)
GET /api/v1/notifications/?channel=in_app

# Expected: 1 unread notification about low credits
```

### 5. Test Permission Boundaries
```bash
# Login as Premier League admin
# Try to access Bundesliga resources
GET /api/v1/organisations/bundesliga/projects/

# Expected: 403 Forbidden (cross-org access denied)
```

### 6. Feature Flag with Org Override
```bash
# Check theme toggle availability
GET /api/v1/settings/feature-flags/resolve-all/?organisation_id=<premier_league_id>

# Expected:
{
  "theme_toggle": {
    "key": "theme_toggle",
    "enabled": true,
    "global_value": true,
    "scope": "GLOBAL"
  }
}

# Frontend checks:
# - Superadmin: always uses global_value
# - Regular user: checks organisation.enable_theme_toggle
```

---

## Data Consistency Verification

### Check Balances Match Transactions
```bash
# Run verification script
python check_balances.py
```

Expected output:
```
=== Balance verification ===

Premier League:
  Balance in DB: 10698
  Transactions sum: 10698
  Transaction count: 4
  Match: ✓

Bundesliga:
  Balance in DB: 13299
  Transactions sum: 13299
  Transaction count: 4
  Match: ✓

Serie A:
  Balance in DB: 8249
  Transactions sum: 8249
  Transaction count: 3
  Match: ✓

Ligue 1:
  Balance in DB: 14299
  Transactions sum: 14299
  Transaction count: 3
  Match: ✓

Eredivisie:
  Balance in DB: 3529
  Transactions sum: 3529
  Transaction count: 3
  Match: ✓
```

All balances should show `Match: ✓` - this confirms data integrity.

---

## Cleanup / Reset

### Clear Demo Data (Careful!)
```bash
# This will DELETE all demo data
python manage.py shell

# In Django shell:
from organisations.models import Organisation
Organisation.objects.filter(
    slug__in=['premier-league', 'bundesliga', 'serie-a', 'ligue-1', 'eredivisie']
).delete()

# This cascades to:
# - Users (memberships)
# - Projects
# - Transactions
# - Credit balances
# - Notifications
```

### Re-seed After Cleanup
```bash
# Seed roles (if not already present)
python manage.py seed_default_roles

# Seed demo data
python manage.py seed_football_data
```

---

## Production Considerations

### Do NOT Use Demo Data in Production
The demo dataset is for **development, testing, and demonstration purposes only**:
- Passwords are weak and publicly known (`Basis123.`)
- Users have predictable email patterns
- Organizations use demo names
- Transactions are not real financial data

### For Production
1. **Disable demo seeding** in production settings
2. **Create real superuser**:
   ```bash
   python manage.py createsuperuser
   ```
3. **Seed only default roles**:
   ```bash
   python manage.py seed_default_roles
   ```
4. Let real users create organizations through the application

---

## Troubleshooting

### "Permission denied" when seeding
**Cause**: Default roles not seeded first
**Fix**: Run `python manage.py seed_default_roles` before `seed_football_data`

### "Organisation.creator" constraint error
**Cause**: User models don't exist yet
**Fix**: Ensure migrations are applied (`python manage.py migrate`)

### Transactions don't match balances
**Cause**: Manual data modification or incomplete seeding
**Fix**: Delete all demo organisations and re-seed from scratch

### Duplicate key errors
**Cause**: Data already exists
**Fix**: Idempotency should handle this - if not, check idempotency_key uniqueness

---

## Advanced: Customizing Demo Data

### Modify Organizations
Edit `src/organisations/management/commands/seed_football_data.py`:

```python
ORGANISATIONS = [
    {
        "name": "Your League Name",
        "slug": "your-league-slug",
        "description": "Your description",
        "default_language": "en",
    },
    # ... more organizations
]
```

### Modify Transactions
```python
TRANSACTIONS = [
    {
        "organization_slug": "your-league-slug",
        "amount": Decimal("1000.00"),
        "source_type": "SUBSCRIPTION",
        "description": "Your transaction description",
        "idempotency_key": "your-unique-key",
    },
    # ... more transactions
]
```

### Modify User Roles
```python
# In seed_football_data.py, change role assignments:
for role_name in ["admin", "coach", "player"]:  # Add/remove roles
    # ...
```

---

## API Endpoints for Demo Data

### Organizations
- `GET /api/v1/organisations/` - List all (filtered by user access)
- `GET /api/v1/organisations/premier-league/` - Get specific org
- `PATCH /api/v1/organisations/premier-league/` - Update (admin only)

### Users
- `GET /api/v1/organisations/premier-league/members/` - List members
- `POST /api/v1/organisations/premier-league/members/` - Invite user (admin only)

### Credits
- `GET /api/v1/organisations/premier-league/credits/balance/` - Current balance
- `GET /api/v1/organisations/premier-league/transactions/` - Transaction history
- `POST /api/v1/organisations/premier-league/transactions/` - Create transaction (admin only)

### Notifications
- `GET /api/v1/notifications/` - User's notifications
- `PATCH /api/v1/notifications/{id}/` - Mark as read
- `GET /api/v1/notifications/unread-count/` - Unread count

---

## Summary

**To seed demo data**:
1. Apply migrations: `python manage.py migrate`
2. Seed roles: `python manage.py seed_default_roles`
3. Seed demo: `python manage.py seed_football_data`
4. Verify: Login with any demo account (password: `Basis123.`)

**Demo accounts ready to use**:
- 5 organizations × 3 users = 15 accounts
- Each org has realistic credit transactions
- Notifications demonstrate in-app delivery
- Permission boundaries enforced

See [SMOKE_TEST_RESULTS.md](SMOKE_TEST_RESULTS.md) for verification checklist.
