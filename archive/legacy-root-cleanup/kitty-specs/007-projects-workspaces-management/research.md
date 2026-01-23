# Research: Projects & Workspaces Management

**Feature**: 007-projects-workspaces-management
**Created**: 2025-11-25
**Status**: Complete

## Research Questions & Findings

### Q1: Audit Logging Integration Strategy

**Decision**: Stub interface initially, integrate Feature 009 when available

**Rationale**:
- Feature 009 (Audit Logging) doesn't exist yet - would block Feature 007 development
- Stub interface provides integration points without coupling
- Allows Feature 007 to proceed independently while maintaining extension path
- Follows Open-Closed Principle: Open for extension, closed for modification
- Easy to replace stub with real implementation via Django signals

**Alternatives Considered**:
- Block Feature 007 until Feature 009 is complete: Creates unnecessary dependency; delays value delivery
- No audit logging consideration: Requires refactoring later; violates constitution's extension principle
- Build audit logging in Feature 007: Violates single responsibility; duplicates future Feature 009 work

**Implementation Notes**:
- Create `projects/signals.py` with stub handlers for:
  - `post_save` signal: Log project creation/updates
  - `pre_delete` signal: Log project archival
  - Archive/restore custom actions: Log state transitions
- Stub implementation: Log to standard Python logging with structured messages
- When Feature 009 available: Replace stub with audit service calls
- Signal handlers remain unchanged (dependency inversion)

**References**:
- Django signals documentation: post_save, pre_delete patterns
- Constitution Principle II: "Extensions welcome via foreign keys, signals, or plugin hooks"
- Open-Closed Principle in Django: Signal-based extensibility

---

### Q2: Slug Collision Handling Strategy

**Decision**: Sequential suffix pattern (project-alpha, project-alpha-2, project-alpha-3)

**Rationale**:
- Predictable: Users can understand the pattern immediately
- Deterministic: Same input always produces same output sequence
- Simple implementation: Loop with counter until unique slug found
- Database-friendly: Single UNIQUE constraint handles enforcement
- Familiar pattern: Used by GitHub, GitLab, WordPress, etc.

**Alternatives Considered**:
- Random suffix (project-alpha-x7k9): Less user-friendly; harder to remember; breaks predictability
- UUID suffix (project-alpha-550e8400): Ugly; unusable in URLs without shortening
- Timestamp suffix (project-alpha-20251125): Exposes creation timing; still can collide
- User prompt to retry: Poor UX; requires frontend round-trip; breaks API contract

**Implementation Notes**:
- Slug generation in `Project.save()` method
- Base slug: `slugify(name)` using Django's `django.utils.text.slugify`
- Collision detection: Try base slug first, then append `-2`, `-3`, etc.
- Query: `Project.objects.filter(organisation=self.organisation, slug__startswith=base_slug).exists()`
- Extract existing numbers, find max, increment
- Database constraint ensures race condition safety: `UNIQUE(organisation_id, slug)`
- Max attempts: 100 iterations (reasonable limit, prevents infinite loops)

**Algorithm**:
```python
def generate_unique_slug(self, base_name: str, organisation_id: int) -> str:
    base_slug = slugify(base_name)
    slug = base_slug
    counter = 2
    max_attempts = 100

    while counter <= max_attempts:
        if not Project.objects.filter(
            organisation_id=organisation_id,
            slug=slug
        ).exists():
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1

    raise ValueError(f"Could not generate unique slug after {max_attempts} attempts")
```

**References**:
- GitHub repository slug handling
- Django slugify documentation
- PostgreSQL UNIQUE constraint behavior under concurrent INSERTs

---

### Q3: API Endpoint Structure Design

**Decision**: Dual endpoints - both nested and top-level

**Rationale**:
- **Nested** (`/api/organisations/{org_id}/projects/`): Natural hierarchy; scopes queries automatically; admin UI use case
- **Top-level** (`/api/projects/`): Cross-org queries; user dashboard use case; simpler bookmarking
- Flexibility: Different clients have different needs
- DRF viewsets make dual routing trivial: Same view, two URL patterns
- Minimal code duplication: Single viewset, queryset filtering handles scoping

**Alternatives Considered**:
- Nested only: Limits cross-org queries; harder to implement user dashboards showing "my projects"
- Top-level only: Loses hierarchical context; requires manual org_id filtering in every request
- Query parameters for filtering: Less RESTful; inconsistent with Feature 006 patterns

**Implementation Notes**:
- Single `ProjectViewSet` class with both URL patterns
- Nested route: Filter queryset by `org_id` from URL kwargs
- Top-level route: Filter by user's organisation memberships (via Feature 006)
- URL patterns in `projects/api/urls.py`:
  ```python
  # Nested under organisations
  router.register(
      r'organisations/(?P<organisation_id>[^/.]+)/projects',
      ProjectViewSet,
      basename='organisation-projects'
  )

  # Top-level
  router.register(r'projects', ProjectViewSet, basename='projects')
  ```
- Permission class checks organisation membership regardless of route

**Use Cases by Endpoint**:
- **Nested**:
  - Admin: "Show me all projects for Organisation X"
  - Creation: "Create project in Organisation Y"
  - Org context: URLs clearly show org ownership

- **Top-level**:
  - User dashboard: "Show me all projects I can access across all my orgs"
  - Search: "Find projects matching 'analytics'"
  - Bookmarks: Shorter, more stable URLs

**References**:
- RESTful API design: Resource nesting patterns
- DRF viewsets documentation: Multiple URL registrations
- Feature 006 Organisation API structure (follows existing pattern)

---

### Q4: Project Structure Pattern (Flat vs Nested)

**Decision**: Flat structure - no project hierarchy

**Rationale**:
- **Simplicity**: Eliminates tree traversal, recursive queries, permission inheritance complexity
- **Performance**: No self-referential foreign keys; no CTEs or recursive queries required
- **Constitution alignment**: Principle III.5 "Choose the simplest tool that will work"
- **Sufficient for MVP**: Specification has no nested use cases
- **Future extension**: Can add later via migration if product needs prove it necessary

**Alternatives Considered**:
- Hierarchical (parent FK): Adds complexity immediately; YAGNI violation; harder to query; permission inheritance challenges
- Tagging/categorization: Different concern; can be added later as separate feature
- External grouping service: Over-engineering; adds distributed system complexity

**Implementation Notes**:
- `Project` model has NO `parent` field
- Flat list queries: Simple `filter(organisation=org)` with pagination
- No circular dependency checks needed
- Future extension path: Add nullable `parent` FK in migration if needed

**Impact on Requirements**:
- ✅ FR-001 (Create project): No parent selection needed - simpler form
- ✅ FR-002 (List projects): Simple flat queries
- ✅ FR-003 (Retrieve details): No parent chain traversal
- ✅ FR-010 (Organisation scoping): Enforced via single FK, not tree paths

**References**:
- YAGNI principle: "You Aren't Gonna Need It"
- PostgreSQL ltree extension (future option if hierarchy needed)
- Django MPTT library analysis (complexity assessment)

---

### Q5: Permission Model Decision

**Decision**: Organisation-level permissions only (no project-specific memberships)

**Rationale**:
- **Simplicity**: Reuse Feature 006's `IsOrganisationAdmin` and membership checks
- **Consistency**: Same permission model as organisations feature
- **MVP scope**: Specification explicitly states organisation-level access control
- **Future extension**: Product can add project memberships later if needed via foreign keys

**Alternatives Considered**:
- Project-specific membership: Adds new models (ProjectMembership, ProjectRole); premature for MVP scope
- Hybrid model: Complex; violates YAGNI; harder to reason about
- No permissions: Violates security requirements

**Implementation Notes**:
- Reuse `IsOrganisationAdmin` permission class from Feature 006
- All project CRUD operations check: "Is user an admin of this project's organisation?"
- Queryset filtering: `Project.objects.filter(organisation__in=user_organisations)`
- No new permission classes needed for MVP
- Future extension: Add `ProjectMembership` model with FK to Project if product requires granular access

**Permission Matrix**:
| Action | Required Permission |
|--------|---------------------|
| Create project | Organisation Admin |
| View project | Organisation Member (any role) |
| Update project | Organisation Admin |
| Archive project | Organisation Admin |
| Restore project | Organisation Admin |

**References**:
- Feature 006 permission implementation: `organisations/api/permissions.py`
- DRF permission classes documentation
- Constitution Principle V.3: "Authorisation centralised in each service"

---

### Q6: Soft Deletion Implementation Pattern

**Decision**: `is_active` flag + `archived_at` timestamp (matches Feature 006 pattern)

**Rationale**:
- **Consistency**: Same pattern as Feature 006 Organisation soft deletion
- **Data preservation**: No data loss; supports audit requirements
- **Recovery**: Archive/restore actions via custom API endpoints
- **Simple queries**: Django manager filters handle active/archived automatically
- **Performance**: Indexed boolean field for fast filtering

**Alternatives Considered**:
- `deleted_at` only: Ambiguous semantics (active when NULL?); no explicit flag
- Status enum (active/archived/deleted): Over-engineering; three states not needed
- Hard deletion: Data loss; breaks foreign key relationships; violates audit needs

**Implementation Notes**:
- Model fields:
  ```python
  is_active = models.BooleanField(default=True, db_index=True)
  archived_at = models.DateTimeField(null=True, blank=True)
  ```
- Custom managers:
  ```python
  class ActiveProjectManager(models.Manager):
      def get_queryset(self):
          return super().get_queryset().filter(is_active=True)

  class AllProjectManager(models.Manager):
      pass  # Returns all projects including archived
  ```
- Default manager: `objects = ActiveProjectManager()`
- All projects: `all_objects = AllProjectManager()`
- Custom actions in viewset:
  ```python
  @action(detail=True, methods=['post'])
  def archive(self, request, pk=None):
      project = self.get_object()
      project.is_active = False
      project.archived_at = timezone.now()
      project.save()
      return Response(status=status.HTTP_204_NO_CONTENT)
  ```

**Database Implications**:
- Index on `is_active` for query performance
- `archived_at` NOT NULL when `is_active=False` (enforced in clean())
- `archived_at` NULL when `is_active=True`
- No database cascade deletion: FK relationships preserved

**References**:
- Feature 006 Organisation model: Same pattern
- Django managers documentation: Custom manager inheritance
- Soft delete patterns in Django: Manager-based filtering

---

### Q7: Slug Generation Timing Strategy

**Decision**: Auto-generate on save() if empty, allow manual override

**Rationale**:
- **Flexibility**: API can optionally accept custom slug; auto-generates if missing
- **UX**: Clients don't need to compute slugs; just provide name
- **Safety**: Validation ensures uniqueness regardless of source
- **Convention**: Follows Django best practices for slug fields

**Implementation Notes**:
- Override `Project.save()` method:
  ```python
  def save(self, *args, **kwargs):
      if not self.slug:
          self.slug = self._generate_unique_slug(self.name, self.organisation_id)
      super().save(*args, **kwargs)
  ```
- Serializer accepts optional `slug` field
- Validator ensures slug matches `^[a-z0-9]+(?:-[a-z0-9]+)*$` pattern
- Database constraint enforces uniqueness: `UNIQUE(organisation_id, slug)`

**API Behavior**:
```json
// Request (slug auto-generated)
POST /api/organisations/1/projects/
{
  "name": "Project Alpha",
  "description": "..."
}
// Response
{
  "id": 42,
  "slug": "project-alpha",  // auto-generated
  "name": "Project Alpha",
  ...
}

// Request (custom slug)
POST /api/organisations/1/projects/
{
  "name": "Project Alpha",
  "slug": "alpha-v2",  // custom
  "description": "..."
}
// Response
{
  "id": 43,
  "slug": "alpha-v2",  // accepted
  ...
}
```

**Collision Handling**:
- Auto-generated slugs use sequential suffix (Q2 decision)
- Custom slugs: Return 400 Bad Request if collision detected
- Database constraint: Final safety net (IntegrityError if logic fails)

**References**:
- Django slug field documentation
- DRF serializer validation
- PostgreSQL UNIQUE constraint behavior

---

### Q8: Name Uniqueness Enforcement

**Decision**: Case-insensitive unique constraint per organisation

**Rationale**:
- **User expectation**: "Project Alpha" and "project alpha" should be treated as same project
- **Slug collision**: Case-insensitive names prevent slug collisions (both become "project-alpha")
- **Database support**: PostgreSQL supports case-insensitive constraints via CITEXT or functional indexes
- **Validation**: Enforced at both serializer and database levels

**Alternatives Considered**:
- Case-sensitive: Allows confusing duplicates ("Project Alpha" vs "project alpha")
- No uniqueness: Slug uniqueness not enough (different names can generate same slug)
- Application-level only: Race conditions possible without database constraint

**Implementation Notes**:
- PostgreSQL constraint using functional index:
  ```python
  class Meta:
      constraints = [
          models.UniqueConstraint(
              Lower('name'),
              'organisation',
              name='unique_project_name_per_org_case_insensitive'
          )
      ]
  ```
- Serializer validation: Check case-insensitive existence before save
- Error message: "A project with this name already exists in this organisation"
- Admin UI: Same validation via model clean() method

**Migration**:
```python
migrations.AddConstraint(
    model_name='project',
    constraint=models.UniqueConstraint(
        Lower('name'),
        'organisation',
        name='unique_project_name_per_org_case_insensitive'
    )
)
```

**References**:
- PostgreSQL LOWER() function in constraints
- Django 4.0+ constraints with database functions
- DRF UniqueTogetherValidator with transforms

---

### Q9: Description Field Length Determination

**Decision**: 2000 characters (TextField with max_length validator)

**Rationale**:
- **Sufficient**: ~300-400 words; covers typical project descriptions
- **Not excessive**: Prevents abuse; encourages concise descriptions
- **Database efficiency**: VARCHAR(2000) vs TEXT performs better for typical queries
- **UX**: Frontend can show character counter; prevents essay submissions
- **Flexibility**: Optional field (blank=True); not all projects need descriptions

**Alternatives Considered**:
- Unlimited (TextField, no max): Risk of abuse; no guidance for users
- 500 chars: Too restrictive for detailed projects
- 5000 chars: Excessive; descriptions should be concise

**Implementation Notes**:
- Model field:
  ```python
  description = models.TextField(
      max_length=2000,
      blank=True,
      help_text="Optional project description (up to 2000 characters)"
  )
  ```
- Serializer validation: MaxLengthValidator automatically applied
- Frontend guidance: "300-400 words recommended"

**References**:
- GitHub repository descriptions: ~500 chars typical
- GitLab project descriptions: No hard limit but recommend brevity
- UX best practices: Concise descriptions improve scannability

---

### Q10: Pagination Strategy for Large Project Lists

**Decision**: Cursor-based pagination with 50 items per page default

**Rationale**:
- **Performance**: Cursor pagination avoids OFFSET performance degradation on large datasets
- **Consistency**: No page drift when items added/deleted during browsing
- **Scale**: Handles 1000+ projects per organisation efficiently
- **DRF support**: Built-in CursorPagination class
- **Ordering**: Natural ordering by created_at (immutable, indexed)

**Alternatives Considered**:
- Offset/limit pagination: Simple but degrades with large offsets; page drift issues
- Page number pagination: User-friendly but inconsistent results during updates
- No pagination: Fails for orgs with 1000+ projects; violates performance requirements

**Implementation Notes**:
- Configure in settings:
  ```python
  REST_FRAMEWORK = {
      'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.CursorPagination',
      'PAGE_SIZE': 50
  }
  ```
- Ordering: `-created_at` (newest first)
- Response format:
  ```json
  {
    "next": "http://api.example.org/projects/?cursor=cD0yMDI1LTEx...",
    "previous": "http://api.example.org/projects/?cursor=cj0xJnA9MjAyNS0x...",
    "results": [ /* 50 projects */ ]
  }
  ```
- Support custom page size via query param: `?page_size=100` (max 200)

**Performance Targets**:
- 100 projects: <100ms query time
- 1000 projects: <500ms query time
- 10000 projects: <1s query time (with cursor pagination)

**References**:
- DRF pagination documentation: CursorPagination
- PostgreSQL KEYSET pagination patterns
- Feature 006 pagination approach (consistency)

---

## Technology Stack Summary

| Component | Technology | Version | Justification |
|-----------|-----------|---------|---------------|
| Language | Python | 3.12+ | Project standard, type hints support |
| Framework | Django | 5.1+ | Project standard, mature ORM |
| API Framework | Django REST Framework | 3.14+ | REST API standard, Feature 006 consistency |
| Type Hints | django-stubs | Latest | Type safety, IDE support |
| Database | PostgreSQL | 14+ | UNIQUE constraints, functional indexes, CITEXT support |
| Testing | pytest + pytest-django | Latest | Project standard, Feature 006 consistency |
| Code Quality | Black + Ruff | Latest | Project standard |

## Performance Targets

| Operation | Target | Justification |
|-----------|--------|---------------|
| List projects (100 items) | <1 second | Success criteria SC-008 |
| Create project | <30 seconds | Success criteria SC-008 (includes slug generation, validation) |
| Update project | <30 seconds | Success criteria SC-008 |
| Archive/restore | <5 seconds | State transition only, no complex validation |
| Pagination (1000+ projects) | <1 second/page | Cursor pagination efficiency |

## Dependencies Validated

| Feature | Dependency Type | Status | Notes |
|---------|----------------|--------|-------|
| 005 (Accounts) | Hard dependency | ✅ Complete | User model, authentication required |
| 006 (Organisations) | Hard dependency | ✅ Complete | Organisation model, membership, permissions required |
| 009 (Audit Logging) | Soft dependency | ⏳ Pending | Stub interface for now, integrate when available |

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Slug collisions under high concurrency | Low | Medium | Database UNIQUE constraint as safety net; sequential suffix algorithm tested |
| Performance degradation with 10,000+ projects | Medium | High | Cursor pagination + database indexes; monitoring via Feature 006 metrics |
| Audit logging stub forgotten | Low | Low | Documentation in code comments; tracked in Feature 009 integration checklist |
| Case-insensitive constraint fails on MySQL | Low | Medium | PostgreSQL only (per constitution); document constraint in migration |

## Phase 0 Completion Checklist

- [x] All research questions answered with decisions
- [x] Alternatives considered and documented
- [x] Implementation notes provided for each decision
- [x] Technology stack validated against existing features
- [x] Performance targets defined
- [x] Dependencies confirmed
- [x] Risks identified with mitigations

**Phase 0 Status**: ✅ Complete - Ready for Phase 1 (Design & Contracts)
