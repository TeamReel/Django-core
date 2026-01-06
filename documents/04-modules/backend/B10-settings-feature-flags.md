# B10: Settings & Feature Flags

## 1. Purpose & Responsibility
The **Settings** module provides a unified system for configuration and feature toggling. It allows behavior to change without code deployments.

**Responsibilities:**
*   **Configuration:** Store typed values (String, Int, JSON) at different scopes.
*   **Feature Flags:** Boolean toggles for enabling/disabling features.
*   **Scoping:** Hierarchical resolution (Global -> Org -> Project -> User).

## 2. Domain-Agnostic Rationale
Hardcoding configuration is bad. Environment variables are good for infrastructure, but bad for runtime application settings (e.g., "Max upload size for this specific tenant"). This module fills that gap.

## 3. Key Concepts & Data Model

### 3.1 Scope
Both Settings and Flags support 4 levels of scope:
1.  **GLOBAL**: System-wide defaults.
2.  **ORGANISATION**: Tenant-specific overrides.
3.  **PROJECT**: Workspace-specific overrides.
4.  **USER**: User-specific preferences.

### 3.2 FeatureFlag (`src/settings/models.py`)
Boolean toggles.
*   **`key`**: Identifier (e.g., `feature.beta_dashboard`).
*   **`enabled`**: True/False.
*   **`scope_type`**: The level this flag applies to.

### 3.3 Setting (`src/settings/models.py`)
Typed configuration values.
*   **`key`**: Identifier (e.g., `limit.max_projects`).
*   **`value`**: JSON field storing the actual value.
*   **`value_type`**: Metadata (STRING, INTEGER, BOOLEAN, JSON).

## 4. Public Interfaces (API)
*   **Resolution Logic:** The system typically resolves from specific to general (User -> Project -> Org -> Global).
*   **API:** Endpoints to read/write settings for a given scope.

## 5. Integrations & Dependencies
*   **I18n Preferences (`i18n_preferences`)**: Uses this system (or a similar pattern) to store language choices.
*   **Frontend**: Consumes flags to toggle UI elements.

## 6. Status & Phase History
*   **Phase:** 3 (Configuration)
*   **Status:** ✅ Complete
*   **Source Code:** `src/settings/`
