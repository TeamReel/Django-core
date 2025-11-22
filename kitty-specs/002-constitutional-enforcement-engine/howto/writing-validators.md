# How to Write Custom Validators

Validators post-process check results before reporting.

## Validator Interface

```python
from typing import Protocol
from constitution_engine.core.models import CheckResult, RepositoryContext

class ValidatorProtocol(Protocol):
    identifier: str
    description: str
    
    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext
    ) -> list[CheckResult]:
        """Post-process results."""
        ...
```

## Example: Severity Normalizer

```python
from constitution_engine.core.models import Severity

class SeverityNormalizer:
    """Normalizes severity levels across results."""
    
    identifier = "severity-normalizer"
    description = "Normalizes and validates severity levels"
    
    def validate(self, results, context):
        normalized = []
        
        for result in results:
            # Upgrade security issues to CRITICAL
            if result.category == "security" and result.severity != Severity.CRITICAL:
                result = dataclasses.replace(result, severity=Severity.CRITICAL)
            
            normalized.append(result)
        
        return normalized
```

## Example: Duplicate Remover

```python
class DuplicateRemover:
    """Removes duplicate results."""
    
    identifier = "dedup"
    description = "Removes duplicate check results"
    
    def validate(self, results, context):
        seen = set()
        unique = []
        
        for result in results:
            key = (result.rule_identifier, result.message, result.status)
            if key not in seen:
                seen.add(key)
                unique.append(result)
        
        return unique
```

## See Also

- [Writing Rules](./writing-rules.md)
- [Writing Reporters](./writing-reporters.md)
