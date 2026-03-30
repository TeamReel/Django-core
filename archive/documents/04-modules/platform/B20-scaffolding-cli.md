# B20: Scaffolding CLI

## 1. Purpose & Responsibility
The **Scaffolding CLI** is a code generation tool that automates the creation of Django apps, models, and views following Core-App conventions.

**Responsibilities:**
*   **App Generation:** Creates new Django apps with boilerplate (models, views, tests).
*   **Template System:** Extensible templates for different patterns (API-first, CRUD, etc.).
*   **Constitutional Validation:** Ensures generated code follows Core-App rules.

## 2. Domain-Agnostic Rationale
Typing the same boilerplate for every new model is error-prone. This CLI generates correct, consistent code that matches the repository patterns.

## 3. Key Concepts

### 3.1 CLI Entry (`src/scaffolding/cli.py`)
Click-based CLI with commands:
```bash
django-core-scaffold app payments --template api-first
```

### 3.2 Templates (`src/scaffolding/templates/`)
Jinja2 templates for generating files (models, serializers, views).

### 3.3 Validation (`src/scaffolding/validation/`)
Checks generated code against the Constitutional Engine rules.

## 4. Public Interfaces (CLI)

**Console Command:** `django-core-scaffold`
**Django Command:** `python manage.py scaffold`

Both interfaces are identical (Click delegates to Django).

## 5. Integrations & Dependencies
*   **Constitutional Engine (B02):** Validates generated code.
*   **All Backend Modules:** Generates code following their patterns.

## 6. Status & Phase History
*   **Phase:** 5 (Operationalisation)
*   **Status:** ✅ Complete (CLI structure, templates WIP)
*   **Source Code:** `src/scaffolding/`
