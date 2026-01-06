# Repository Structure

## Overview
The repository follows a **Monorepo** pattern, separating the Python/Django Backend from the TypeScript/React Frontend packages, while keeping them in a single version-controlled environment.

## Top-Level Directory Map

| Directory | Purpose | Technology |
| :--- | :--- | :--- |
| **`src/`** | **The Backend Core.** Contains all Django apps and business logic. | Python, Django |
| **`packages/`** | **The Frontend Core.** Reusable UI libraries and logic. | TypeScript, React |
| **`documents/`** | **Single Source of Truth.** Architecture, specs, and guides. | Markdown |
| **`examples/`** | **Reference Implementations.** Demos and integration guides. | Mixed |
| **`scripts/`** | Automation scripts (setup, seeding, maintenance). | Bash/PowerShell |
| **`k8s/`** | Kubernetes manifests (if applicable). | YAML |

## 1. The Backend (`src/`)
The backend is a standard Django project structure, but flattened for modularity.

*   **`config/`**: Global Django settings (`settings.py`, `urls.py`, `wsgi.py`).
*   **`core/`**: Abstract base classes and shared utilities.
*   **`accounts/`**: User authentication and identity (B05).
*   **`organisations/`**: Multi-tenancy logic (B06).
*   **`projects/`**: Workspace logic (B07).
*   **`api/`**: Global API configuration (DRF).
*   **`audit/`**: Audit logging system (B09).

**Key Pattern:** Each app (e.g., `organisations`) is self-contained with its own `models.py`, `api/` (views/serializers), and `tests/`.

## 2. The Frontend (`packages/`)
The frontend is structured as a workspace of npm packages, designed to be consumed by the Demo Shell or other frontend apps.

*   **`design-system/`**: Core UI components (Buttons, Inputs) (F01).
*   **`auth/`**: Login/Signup forms and logic (F02).
*   **`context-switcher/`**: Org/Project navigation (F03).
*   **`notifications-hub/`**: Notification bell and list (F04).
*   **`api-client/`**: Generated TypeScript client for the Backend API.

## 3. Documentation (`documents/`)
We follow a strict documentation hierarchy:

*   **`01-vision/`**: The "Why". Product goals.
*   **`02-roadmap/`**: The "When". Phasing and planning.
*   **`03-system/`**: The "How". Architecture and global rules.
*   **`04-modules/`**: The "What". Detailed specs for each module.
*   **`05-demo/`**: Validation. Reports and status of the demo environment.
*   **`06-workflow/`**: Developer guides.
*   **`07-operations/`**: Deployment and runbooks.

## 4. Configuration Files
*   **`docker-compose.*.yml`**: Orchestration for Local, Prod, and Demo environments.
*   **`pnpm-workspace.yaml`**: Defines the frontend package boundaries.
*   **`pyproject.toml`**: Python dependencies and tool config.
*   **`manage.py`**: Django CLI entry point.
