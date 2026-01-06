# B24: Full-Text Search

## 1. Purpose & Responsibility
The **Search** module provides full-text search across Projects, Files, and other resources.

**Responsibilities:**
*   **Indexing:** Maintains search index (PostgreSQL full-text or Elasticsearch).
*   **Query API:** Unified search endpoint.
*   **Ranking:** Relevance scoring and filtering.

## 2. Domain-Agnostic Rationale
`LIKE '%keyword%'` doesn't scale. This module provides:
*   Fast full-text search.
*   Relevance ranking.
*   Multi-field search (title, description, content).

## 3. Key Concepts

### 3.1 Search Backend
Currently uses **PostgreSQL Full-Text Search** (can be swapped for Elasticsearch).

### 3.2 Indexed Models
*   Projects (name, description).
*   Files (filename, metadata).
*   Future: Comments, Tasks.

## 4. Public Interfaces (API)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/search/?q=keyword` | Search across all resources. |

## 5. Integrations & Dependencies
*   **Projects (B07)**: Indexed.
*   **Files (B22)**: Indexed.

## 6. Status & Phase History
*   **Phase:** 9 (Backend Infrastructure)
*   **Status:** ✅ Complete
*   **Source Code:** `src/search/`
