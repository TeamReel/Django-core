# B06: Organizations

## 1. Purpose & Responsibility
The **Organisations** module is the root of multi-tenancy in the Core-App. It provides the boundary for data isolation, user membership, and resource ownership.

**Responsibilities:**
*   **Identity Boundary:** Users belong to Organisations.
*   **Resource Container:** Projects and other resources belong to an Organisation.
*   **Access Control:** Defines `admin` vs `member` roles at the tenant level.
*   **Lifecycle:** Handles creation, soft-deletion, and restoration of tenants.

## 2. Domain-Agnostic Rationale
Every SaaS needs a "Tenant" concept. Whether it's a "Company", "Team", "Workspace", or "League", the technical requirement is the same: a container for resources and users. We call this `Organisation` to be generic.

## 3. Key Concepts & Data Model

### 3.1 Organisation (`src/organisations/models.py`)
The core entity.
*   **`id`**: UUID (Primary Key).
*   **`name`**: Unique display name.
*   **`slug`**: URL-friendly identifier (auto-generated from name).
*   **`is_active`**: Boolean for soft-delete status.
*   **`creator`**: Link to the User who created it.
*   **`enable_theme_toggle`**: Feature flag example stored on the org.

**Key Behaviors:**
*   **Soft Delete:** Sets `is_active=False`, appends `_del_{timestamp}` to name/slug to allow reuse.
*   **Slug Generation:** Auto-handles duplicates by appending counters.

### 3.2 Membership
Many-to-Many link between `User` and `Organisation`.
*   **`role`**:
    *   `admin`: Full control over the organisation.
    *   `member`: Read/Write access to resources (subject to Project permissions).
*   **`is_active`**: Allows disabling a user without deleting history.

## 4. Public Interfaces (API)

Implemented in `src/organisations/api/views.py` using DRF ViewSets.

| Method | Endpoint | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/organisations/` | List user's organisations. | `IsAuthenticated` |
| `POST` | `/api/organisations/` | Create new organisation. | `IsAuthenticated` |
| `GET` | `/api/organisations/{slug}/` | Get details (includes member counts). | Member of Org |
| `PATCH` | `/api/organisations/{slug}/` | Update settings/name. | Org Admin |
| `DELETE` | `/api/organisations/{slug}/` | Soft-delete organisation. | Org Admin |

**Serializers:**
*   `OrganisationListSerializer`: Lightweight (ID, Name, Slug, Counts).
*   `OrganisationSerializer`: Full details (Description, Timestamps).

## 5. Permissions & Access Rules
*   **List Filtering:** Users only see organisations they belong to (unless Superuser).
*   **Creation:** Any authenticated user can create an organisation (becoming its first Admin).
*   **Modification:** Only `admin` role members can update/delete.

## 6. Integrations & Dependencies
*   **Auth (`accounts`)**: Depends on `User` model.
*   **Audit (`audit`)**: Logs creation and deletion events.
*   **Projects (`projects`)**: Organisations are the parent of Projects.

## 7. Demo-Shell Representation
In the Demo Shell (Football League scenario), an **Organisation** represents a **League** (e.g., "Premier League").

## 8. Status & Phase History
*   **Phase:** 2 (Identity & Multi-Tenancy)
*   **Status:** ✅ Complete & Audited (Jan 2026)
*   **Source Code:** `src/organisations/`
