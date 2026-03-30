# Credits & Transactions System

> Last updated: 2026-03-12

## Overview

TeamReel gebruikt een **credit-based billing systeem** voor AI-generatie. Credits worden beheerd op drie niveaus: organisatie, project/team, en individuele gebruiker. Alle financiële mutaties zijn **immutable ledger entries** (single-ledger met signed amounts).

**Twee apps, gescheiden verantwoordelijkheid:**

| App | Doel |
|-----|------|
| `credits` | Balance-beheer — read-only endpoints voor saldo opvragen |
| `transactions` | Financieel ledger — usage events, transacties, balance policies |

---

## Data Model

### credits app (3 models)

```
CreditsBalance  ←→  Organisation (OneToOne)
  └── current_balance: int
  └── updated_at, created_at

ProjectCreditsBalance  ←→  Project (OneToOne)
  └── current_balance: Decimal(14,4)

UserCreditsBalance  ←→  Organisation × User (unique together)
  └── current_balance: Decimal(14,4)
```

**Hiërarchie:** Organisation → Project → User. Elke scope heeft een eigen balance.

### transactions app (3 models)

```
UsageEvent (immutable)
  ├── id: UUID
  ├── event_type: str (bijv. "ai_generation", "video_transcode")
  ├── user → User (PROTECT)
  ├── organization → Organisation (PROTECT)
  ├── project → Project (nullable, PROTECT)
  ├── metadata: JSON
  ├── idempotency_key: str (unique, nullable)
  └── timestamp

Transaction (immutable ledger entry)
  ├── id: UUID
  ├── amount: Decimal(14,4) — positief = credit, negatief = debit
  ├── organization → Organisation (PROTECT)
  ├── wallet_scope: "organization" | "project" | "user"
  ├── project → Project (nullable)
  ├── charged_user → User (nullable, voor user-scope)
  ├── source_type: "usage_event" | "adjustment" | "external_billing"
  ├── usage_event → UsageEvent (nullable)
  ├── external_reference_id: str (nullable)
  ├── idempotency_key: str (unique, verplicht)
  ├── notes: text
  ├── created_by → User
  └── timestamp

BalancePolicy (mutable config)
  ├── id: UUID
  ├── organization → Organisation
  ├── project → Project (nullable)
  ├── allow_negative: bool (False=prepaid, True=postpaid)
  ├── warn_threshold: Decimal (nullable)
  └── enforcement_mode: "block" | "warn" | "allow"
```

### DB Constraints

- `Transaction.amount ≠ 0` (CheckConstraint)
- `source_type=usage_event → usage_event IS NOT NULL` (CheckConstraint)
- `BalancePolicy(organization, project)` unique together
- `UsageEvent.idempotency_key` unique (wanneer niet null)

---

## API Endpoints

### Credits (read-only balances)

| Method | Endpoint | Doel |
|--------|----------|------|
| GET | `/api/v1/credits/?organisation_id=X` | Organisatie saldo |
| GET | `/api/v1/credits/me/?organisation_id=X` | Persoonlijk saldo |
| GET | `/api/v1/credits/projects/{id}/` | Project/team saldo |

### Transactions (CRUD + actions)

| Method | Endpoint | Doel |
|--------|----------|------|
| GET | `/api/v1/transactions/transactions/` | Lijst transacties (filterable) |
| POST | `/api/v1/transactions/transactions/` | Maak transactie |
| POST | `/api/v1/transactions/usage-events/` | Registreer usage event |
| GET | `/api/v1/transactions/balance-policies/` | Lijst policies |
| GET | `/api/v1/transactions/balance-policies/organization/{orgId}/` | Org policy |
| PATCH | `/api/v1/transactions/balance-policies/organization/{orgId}/` | Update policy |
| GET | `/api/v1/transactions/balance-policies/effective/?...` | Effectieve policy |

---

## Business Flow: AI Generation Credits

De `GenerationCreditService` (`src/generative/credit_service.py`) koppelt het generatieve AI-systeem aan het transactie-ledger:

```
1. User submit GenerationRequest
   │
   ├── GenerationCreditService.reserve_credits()
   │   └── create_transaction(amount=-X)  ← negatief = debit
   │       └── Controleert BalancePolicy (block/warn/allow)
   │       └── Idempotency key: "gen-req-{request_id}"
   │
2. AI provider verwerkt request
   │
   ├── ✅ Succes → settle_credits(actual_amount)
   │   ├── actual == reserved → geen actie
   │   ├── actual < reserved → refund verschil
   │   └── actual > reserved → log warning (geen extra charge)
   │
   ├── ❌ Failure → refund_credits(transaction_id, reason)
   │   └── create_transaction(amount=+X)  ← positief = credit (volledige refund)
   │
   └── Alle operaties zijn idempotent via idempotency_key
```

### Wallet Scope Auto-detection

`Transaction.save()` normaliseert automatisch:
- `charged_user` gezet → `wallet_scope = "user"`
- `project` gezet (zonder user) → `wallet_scope = "project"`
- Geen project, geen user → `wallet_scope = "organization"`

---

## Service Layer

`src/transactions/services.py` (713 regels) bevat:

- **Balance queries** met Redis caching (key: `balance:org:{id}`, TTL 60s)
- **SELECT FOR UPDATE** locking voor transactional integrity
- **Policy enforcement** (prepaid/postpaid controle)
- **Prometheus metrics** voor observability

Belangrijke functies:
- `get_organization_balance()` / `get_project_balance()` / `get_user_balance()`
- `create_transaction()` — core schrijf-operatie met policy check
- `get_policy()` — resolves effectieve policy (project → org fallback)

---

## Frontend Integratie

| Bestand | Doel |
|---------|------|
| `demo/src/api/credits.ts` | API client: `creditsApi` + `transactionsApi` |
| `demo/src/hooks/useTransactions.ts` | Hook voor transactie-lijst |
| `demo/src/constants/assetTemplatesBrand.ts` | `creditsCost` per template type |

**Sidebar navigatie:**
- "My Wallet" (`/credits?wallet=personal`)
- "Organisation Wallet" (`/credits?wallet=org`)
- "Transactions" tab op org/club/team/season detail pages

---

## Gerelateerde docs

- [generation-queue.md](generation-queue.md) — GenerationJob lifecycle (triggert credit reserve/settle)
- [architecture.md](../architecture/overview.md) — Overzicht alle apps
- [../media/ai-models-pricing.md](../media/ai-models-pricing.md) — AI model kosten per provider
