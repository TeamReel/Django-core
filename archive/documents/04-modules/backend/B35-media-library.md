# B35: Smart Asset Library

## 1. Purpose & Responsibility
The **Smart Asset Library** extends file management with semantic understanding, AI-powered search, and organization-specific metadata (tags, collections).

**Responsibilities:**
*   **Semantic Search:** Full-text search and filtering via `SearchVector`.
*   **Organization:** Hierarchical collections and tagging system.
*   **AI Metadata:** Stores extraction metadata (transcript, analysis) for generative workflows.

## 2. Domain-Agnostic Rationale
While B22 handles storage, B35 handles *intelligence* and *organization*. It allows users to find "that video with the goal" rather than "VID_2023.mp4".

## 3. Key Concepts & Data Model

### 3.1 MediaItem (`src/medialib/models.py`)
The core asset record, linking to a B22 `FileAsset` or external source.
*   **`project`**: The owning project.
*   **`file`**: Foreign Key to `files.FileAsset`.
*   **`search_vector`**: PostgreSQL TSVector for full-text search (title, description, tags).
*   **`extraction_metadata`**: JSON field for AI-generated data.

### 3.2 MediaTag (`src/medialib/models.py`)
Categorization labels.
*   **`name`**: Display name.
*   **`slug`**: Normalized identifier.

## 4. Public Interfaces (API)
*   `GET /api/v1/media/items/`: List and filter media items.
    *   **Filters:** `q` (full-text), `tags`, `project`, `state`, `file_type`.
    *   **Pagination:** Cursor-based for performance.

## 5. Integrations & Dependencies
*   **B22 Files:** Underlying storage.
*   **B24 Search:** PostgreSQL search configuration.
*   **Generative Pipelines:** Consumer of assets for content creation.
