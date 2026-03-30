# B05: Accounts & Authentication

## 1. Purpose & Responsibility
The **Accounts** module manages user identity, authentication, and global permissions. It is the entry point for all users and provides the security context for the rest of the system.

**Responsibilities:**
*   **Identity:** Stores user credentials (email/password) and profile data.
*   **Authentication:** Handles Login, Logout, and Session management.
*   **Lifecycle:** Registration, Email Verification, Password Reset.
*   **Global Access:** Defines `superuser` and `staff` flags (distinct from Organisation roles).

## 2. Domain-Agnostic Rationale
Every SaaS needs users. We use a custom User model (replacing Django's default) to enforce **Email as Username**, which is the standard for modern web applications.

## 3. Key Concepts & Data Model

### 3.1 User (`src/accounts/models.py`)
The custom user model inheriting from `AbstractBaseUser`.
*   **`email`**: Unique identifier (Username).
*   **`is_active`**: False by default until email verification.
*   **`is_superuser`**: Platform administrator (can see everything).
*   **`email_verified`**: Boolean flag for verification status.

**Key Behaviors:**
*   **Registration:** Creates an inactive user and sends a verification email.
*   **Verification:** Clicking the link sets `email_verified=True` and `is_active=True`.

## 4. Public Interfaces (API)

Implemented in `src/accounts/api/views.py`.

### Authentication
| Method | Endpoint | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/` | Sign up new user. | Public |
| `POST` | `/api/auth/login/` | Session login. | Public |
| `POST` | `/api/auth/logout/` | Session logout. | Authenticated |
| `GET` | `/api/auth/me/` | Get current user context. | Authenticated |
| `POST` | `/api/auth/verify-email/...` | Verify token. | Public |

### TeamReel Navigation Support
| Method | Endpoint | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/default-context/` | Returns a deterministic “navigation context” chain (Organisation → Club → Team → Season → Competition → Match) for the authenticated user. Used by the TeamReel demo Sidebar to avoid invalid/guessed routes. | Authenticated |

**Response shape:** Uses the global B13 response envelope: `{"status":"success","data":{...},"meta":{...}}`.

### Profile & Management
| Method | Endpoint | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `PATCH` | `/api/auth/profile/` | Update name/details. | Authenticated |
| `POST` | `/api/auth/password-reset/` | Request reset link. | Public |

### Platform Admin
| Method | Endpoint | Description | Permissions |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/users/` | List all platform users. | Superuser |
| `POST` | `/api/admin/users/{id}/activate/` | Force activate user. | Superuser |

## 5. Permissions & Access Rules
*   **Global vs Tenant:** This module handles *Global* identity. Tenant access is handled by **B06 Organisations**.
*   **Superuser:** Has implicit access to all APIs.

## 6. Integrations & Dependencies
*   **Notifications (`notifications`)**: Sends emails for verification and password reset.
*   **Audit (`audit`)**: Logs login/logout events.

## 7. Status & Phase History
*   **Phase:** 2 (Identity)
*   **Status:** ✅ Complete
*   **Source Code:** `src/accounts/`
