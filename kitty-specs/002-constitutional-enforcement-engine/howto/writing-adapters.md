# How to Write Custom Adapters

Adapters provide project-type-specific context building.

## Adapter Pattern

```python
from constitution_engine.core.models import RepositoryContext

class MyProjectAdapter:
    """Adapter for MyProject framework."""
    
    def __init__(self, config):
        self.config = config
    
    def build_context(self) -> RepositoryContext:
        """Build context from project structure."""
        return RepositoryContext(
            root_path=self.config.project_root,
            detected_languages=self._detect_languages(),
            tags=self._detect_project_tags(),
            metadata=self._build_metadata()
        )
    
    def _detect_languages(self) -> set[str]:
        """Detect programming languages."""
        languages = set()
        
        if (self.config.project_root / "package.json").exists():
            languages.add("javascript")
        if (self.config.project_root / "requirements.txt").exists():
            languages.add("python")
        
        return languages
    
    def _detect_project_tags(self) -> set[str]:
        """Detect project type tags."""
        tags = set()
        
        # Check for framework markers
        if (self.config.project_root / "manage.py").exists():
            tags.add("django")
        if (self.config.project_root / "app" / "Http").exists():
            tags.add("laravel")
        
        return tags
    
    def _build_metadata(self) -> dict:
        """Build adapter-specific metadata."""
        return {
            "adapter": "myproject",
            "version": self._detect_version(),
            "structure": self._analyze_structure()
        }
```

## See Also

- [Django Adapter](../../../docs/django-adapter.md) - Complete adapter example
- [Writing Rules](./writing-rules.md)
