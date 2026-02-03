# Research & Decisions: Hierarchical Search
**Feature**: B39 Hierarchical Search Navigation

## Architecture Decisions

### 1. Registry Pattern
**Decision**: Use `SEARCH_HIERARCHY_RESOLVERS` dict in `settings.py`.
**Rationale**:
- Provides explicit control over which models have hierarchy enabled.
- Easy to override in downstream projects (TeamReel vs Core).
- String-based paths avoid circular imports during startup.

### 2. Instantiation
**Decision**: Stateful Resolvers (`Resolver(request)`).
**Rationale**:
- Permissions often require `request.user`.
- Context (like 'active tournament') might come from session or query params.
- Matches Django's existing View/Serializer patterns.

### 3. Error Handling
**Decision**: Fail-Safe (Log & Continue).
**Rationale**:
- Search is a primary function; hierarchy is auxiliary ("nice to have").
- Prevents a bad plugin from breaking global site search.

### 4. Serialization
**Decision**: Use recursive `Serializer` class.
**Rationale**:
- Essential for OpenAPI schema generation (`drf-spectacular`).
- Provides validation of resolver output structure.
