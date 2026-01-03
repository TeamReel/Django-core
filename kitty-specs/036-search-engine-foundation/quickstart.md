# Quickstart: Search Engine Foundation

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install django celery redis psycopg
    ```

2.  **Configure Database**:
    Ensure the `pg_trgm` extension is enabled in your PostgreSQL database.
    ```sql
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    ```

3.  **Register Models**:
    Create a `search_indexes.py` in your app and register your models.

    ```python
    # myapp/search_indexes.py
    from src.search.registry import register, SearchIndex
    from myapp.models import Project

    @register(Project)
    class ProjectIndex(SearchIndex):
        def get_vector(self, obj):
            return SearchVector('title', weight='A') + SearchVector('description', weight='B')
    ```

4.  **Populate Index**:
    Run the management command to build the initial index.
    ```bash
    python manage.py rebuild_search_index
    ```

## Usage

**Search API**:
`GET /api/search/?q=test`

**Filtering**:
`GET /api/search/?q=test&types=projects`
