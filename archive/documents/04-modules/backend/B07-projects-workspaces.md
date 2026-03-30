# B07: Projects & Workspaces

## 1. Purpose & Responsibility
The **Projects** module provides the primary workspace for collaboration. While Organisations represent the "Tenant" (Billing/Legal), Projects represent the "Work" (Teams/Seasons/Campaigns).

**Responsibilities:**
*   **Resource Scoping:** All application resources (Files, Tasks, etc.) belong to a Project.
*   **Access Control:** Granular permissions (`viewer`, `editor`, `admin`) per project.
*   **Isolation:** Projects are isolated containers within an Organisation.

## 2. Domain-Agnostic Rationale
Most B2B apps need a level of hierarchy below the Tenant.
*   Slack: Workspace -> Channels
*   Jira: Site -> Projects
*   GitHub: Org -> Repositories

We call this "Projects".

## 3. Key Concepts & Data Model

### 3.1 Project (`src/projects/models/project.py`)
The workspace container.
*   **`organisation`**: Parent tenant.
*   **`slug`**: URL identifier (unique per organisation).
*   **`is_private`**: If true, only explicit members can access. If false, all Org members can access (depending on Org settings).
*   **`is_active`**: Soft-delete flag.

### 3.2 ProjectMembership (`src/projects/models/project_membership.py`)
Explicit link between User and Project.
*   **`role`**:
    *   `viewer`: Read-only access.
    *   `editor`: Can create/edit resources.
    *   `admin`: Can manage project settings and members.
*   **`assignment_reason`**: Audit trail (Manual, Invite, Promotion).

## 4. Public Interfaces (API)

Implemented in `src/projects/api/views.py`.

| Method | Endpoint | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/organisations/{org}/projects/` | List projects in org. | Org Member |
| `POST` | `/api/organisations/{org}/projects/` | Create new project. | Org Admin |
| `GET` | `/api/projects/{slug}/` | Get project details. | Project Member |
| `POST` | `/api/projects/{slug}/archive/` | Archive project. | Project Admin |

## 5. Permissions & Access Rules
*   **Hierarchy:** Org Admins have implicit access to all Projects.
*   **Privacy:** Private projects require explicit `ProjectMembership`. Public projects are accessible to all Org members.

## 6. Integrations & Dependencies
*   **Organisations (`organisations`)**: Parent entity.
*   **Permissions (`permissions`)**: RBAC enforcement.
*   **Audit (`audit`)**: Logs membership changes.

## 7. Status & Phase History
*   **Phase:** 2 (Identity & Multi-Tenancy)
*   **Status:** ✅ Complete
*   **Source Code:** `src/projects/`
