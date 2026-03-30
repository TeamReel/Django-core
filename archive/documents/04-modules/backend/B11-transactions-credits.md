# B11: Transactions & Credits

## 1. Purpose & Responsibility
The **Transactions** module provides a financial ledger system for tracking credits, usage events, and balance policies.

**Responsibilities:**
*   **Usage Tracking:** Records billable actions (API calls, storage, compute).
*   **Ledger:** Immutable transaction log (single-ledger with signed amounts).
*   **Balance Management:** Tracks Organisation credit balances.
*   **Policies:** Enforces prepaid vs postpaid billing modes.

## 2. Domain-Agnostic Rationale
SaaS apps need usage-based billing. This module provides:
*   **Usage Events:** "User X uploaded a file" → record event.
*   **Transactions:** Convert usage to credit deductions.
*   **Balance Policies:** Block actions when credits run out (prepaid) or allow negatives (postpaid).

## 3. Key Concepts & Data Model

### 3.1 UsageEvent (`src/transactions/models.py`)
Immutable record of a billable action.
*   **`event_type`**: What happened (e.g., `file.upload`, `api.request`).
*   **`user`**: Who triggered it.
*   **`organization`**: Billing scope.
*   **`metadata`**: Event-specific details (file size, API endpoint).
*   **`idempotency_key`**: Prevents duplicate billing.

### 3.2 Transaction
Financial ledger entry.
*   **`amount`**: Signed decimal (positive = credit, negative = debit).
*   **`source_type`**: Origin (`usage_event`, `adjustment`, `external_billing`).
*   **`idempotency_key`**: Prevents duplicate transactions.

### 3.3 CreditsBalance (`src/credits/models.py`)
Current balance per Organisation.
*   **`organisation`**: OneToOne link.
*   **`current_balance`**: Integer credit count.

### 3.4 BalancePolicy
Billing enforcement rules.
*   **`allow_negative`**: False = prepaid (block at zero), True = postpaid (allow negative).
*   **`warn_threshold`**: Balance level to trigger warnings.
*   **`enforcement_mode`**: `block`, `warn`, or `allow`.

## 4. Public Interfaces (API)
*   **Usage Recording:** Internal service called by other modules.
*   **Balance Check:** Before expensive operations (file upload, API calls).
*   **Transaction History:** API endpoint for viewing ledger.

## 5. Integrations & Dependencies
*   **Organisations (B06)**: Balance is per Organisation.
*   **Audit (B09)**: Logs all transactions.
*   **Files (B22)**: Records file upload events.

## 6. Status & Phase History
*   **Phase:** 3 (Configuration & Audit)
*   **Status:** ✅ Complete
*   **Source Code:** `src/transactions/`, `src/credits/`
