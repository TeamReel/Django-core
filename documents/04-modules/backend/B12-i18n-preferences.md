# B12: I18n Preferences

## 1. Purpose & Responsibility
The **I18n Preferences** module manages user and organisation language/locale preferences.

**Responsibilities:**
*   **Language Selection:** Store user's preferred language (en, nl, de, etc.).
*   **Locale Preferences:** Timezone, date format, number format.
*   **Scope:** User-level and Organisation-level defaults.

## 2. Domain-Agnostic Rationale
Global SaaS apps serve users in different countries. This module:
*   Stores language choice (not hardcoded).
*   Allows Org-wide defaults ("All users in this company see Dutch").
*   Uses the B10 Settings system for storage.

## 3. Key Concepts & Data Model

### 3.1 No Dedicated Models
Preferences are stored using **B10 Settings** with key `i18n.preferences`.

### 3.2 Storage Format
```json
{
  "language": "nl",
  "timezone": "Europe/Amsterdam",
  "date_format": "DD-MM-YYYY"
}
```

### 3.3 Resolution Order
1. Check User-scoped setting.
2. Fallback to Organisation-scoped setting.
3. Fallback to Django `LANGUAGE_CODE` default.

## 4. Public Interfaces (API)

### Service (`src/i18n_preferences/services.py`)
```python
from i18n_preferences.services import get_user_language
lang = get_user_language(user)
```

### Middleware (`src/i18n_preferences/middleware.py`)
Automatically applies language preference to each request.

## 5. Integrations & Dependencies
*   **Settings (B10)**: Stores preference data.
*   **Accounts (B05)**: User-level preferences.
*   **Organisations (B06)**: Org-level defaults.

## 6. Status & Phase History
*   **Phase:** 3 (Configuration)
*   **Status:** ✅ Complete
*   **Source Code:** `src/i18n_preferences/`
