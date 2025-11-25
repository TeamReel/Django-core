# WP07: Django Admin, Signals, and Final Documentation

**Work Package ID**: WP07
**Status**: Planned
**Priority**: Medium (polish and observability)
**Estimated Effort**: 4-5 hours

## Objective
Configure Django admin interface, implement audit logging signal stubs, and finalize documentation.

## Dependencies
All previous work packages

## Subtasks

### T038-T039: Django Admin
- Create `ProjectAdmin` in `projects/admin.py` with search/filters
- Add `ProjectInline` to `OrganisationAdmin` in organisations app

### T040-T041: Signal Stubs
- Implement handlers in `projects/signals.py`: post_save, pre_delete
- Register signals in `projects/apps.py` ready() method
- Stub handlers log to Python logging (ready for Feature 009)

### T042-T044: Final Polish
- Add `py.typed` file for type hints
- Add docstrings to all classes/methods
- Run: `python manage.py check --deploy`, `ruff check`, `black --check`

## Success Criteria
- Django admin shows projects with search/filters
- Signals log project events (stub implementation)
- All code quality checks pass
- Documentation complete with docstrings
