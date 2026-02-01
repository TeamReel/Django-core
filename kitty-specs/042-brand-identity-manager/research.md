# Phase 0: Research — B33 Brand Identity Manager

**Feature**: B33 Brand Identity Manager
**Date**: 2026-02-01
**Status**: ✅ Complete

## Research Questions

### 1. Brand Token System Best Practices

**Question**: What are industry best practices for design token systems in web applications?

**Findings**:
- **Design Tokens Standard**: W3C Community Group has a draft spec for design tokens
- **Key principles**:
  - Tokens as data (not code)
  - Hierarchical structure (primitives → semantic → component-specific)
  - JSON/YAML storage format
  - Type safety (color, dimension, font-family, etc.)
- **Popular implementations**:
  - Figma Tokens (JSON-based)
  - Style Dictionary (Amazon's token transformer)
  - Tailwind CSS config (JS-based)

**Decision**: Use simple key-value pairs with type field (color, font, spacing) stored in JSON for MVP. Extensible to full W3C spec later via migration.

### 2. Merge Inheritance Pattern Implementation

**Question**: How to implement merge inheritance where project brands override org brands?

**Research Areas**:
- **Django model patterns**:
  - Option A: Denormalization (copy tokens on create)
  - Option B: Runtime resolution (query org + project, merge on read)
  - Option C: Materialized views (database-level merge)

**Decision**: Runtime resolution (Option B)
- **Pros**: Always up-to-date when org changes, simpler migration
- **Cons**: Slightly more queries (mitigated by select_related)
- **Implementation**: `BrandProfile.get_tokens()` method merges org + project tokens

### 3. B22 File Integration

**Question**: How to integrate with B22 File model for brand assets?

**Findings**:
- B22 provides `File` model with S3/local storage
- Pattern: ForeignKey to File model
- File cleanup: Use Django signals or explicit cascade
- Access control: Inherit from File model permissions

**Decision**: BrandAsset has ForeignKey to File, cleanup via signal receiver on BrandAsset delete.

### 4. Token Validation Strategy

**Question**: What validation rules should apply to design tokens?

**Research**:
- **Color tokens**: Hex (#RRGGBB), RGB(A), HSL formats
- **Font tokens**: String validation (alphanumeric + spaces)
- **Spacing tokens**: CSS units (px, rem, em, %)
- **Generic tokens**: Max length for security

**Decision**: Length validation only (FR-VALIDATION). Type-specific validation deferred to product layer (Constitution compliant).

### 5. API Performance Optimization

**Question**: How to optimize token retrieval for frontend?

**Considerations**:
- Token sets can be 50-100 entries
- Frontend needs full set per page load
- Cache strategy needed

**Decision**:
- Single endpoint `/api/branding/tokens/` returns merged set
- Use `select_related('organisation', 'project')` to avoid N+1
- Add ETag support for browser caching
- Future: Redis caching for high-traffic scenarios

## Integration Points

### B06 Organisations
- BrandProfile has ForeignKey to Organisation
- Org-level brand as default fallback

### B07 Projects
- BrandProfile has optional ForeignKey to Project
- Project-level brand overrides org brand

### B22 Files
- BrandAsset has ForeignKey to File
- Asset types: logo_light, logo_dark, watermark, favicon

### B34 AI Content Generation (Downstream)
- B34 consumes token API to apply brand styles
- Example: AI-generated social posts use team colors from tokens

## Technical Decisions

| Decision | Rationale | Alternative Considered |
|----------|-----------|------------------------|
| Django app name: `branding` | Matches existing pattern (files, tasks), intuitive | `brand_identity` (too long) |
| Token storage: JSON field | Simple, flexible, Django native | Separate Token table (over-engineered for MVP) |
| Inheritance: Runtime merge | Always fresh, simple | Denormalization (stale data risk) |
| Validation: Length only | Product-agnostic per Constitution | Type-specific (product concern) |
| API: Single token endpoint | Frontend needs full set | Individual token endpoints (too many requests) |

## Dependencies

### Required
- Django 5.1+ (existing)
- Django REST Framework 3.15+ (existing)
- B06 Organisations (existing)
- B07 Projects (existing)
- B22 Files (existing)

### No New Dependencies
All requirements met by existing Core-App stack.

## Performance Targets

- Token retrieval: <100ms (single query with select_related)
- Asset lookup: <200ms (via B22 File system)
- Pagination: Standard DRF pagination for BrandProfile list
- Caching: Browser ETag support, future Redis layer

## Security Considerations

- **Permission model**: Org/project-level permissions (inherit from B06/B07)
- **Token access**: Read-only API for non-privileged users
- **Asset access**: Controlled via B22 File permissions
- **Input validation**: Max length 1000 chars per token value

## Extension Points for Products

- **Custom token types**: Products can add `type` enum values
- **Token validation**: Products can add type-specific validators
- **Asset types**: Products can extend asset_type choices
- **Token preprocessing**: Products can add transform logic before save
- **UI components**: Products build brand preview/editor interfaces

## Open Questions (Resolved)

1. ✅ **Token key naming convention?** → Products define their own (e.g., `primary_color`, `team_color_home`)
2. ✅ **Asset file size limits?** → Inherit from B22 File limits
3. ✅ **Token versioning?** → Deferred to future feature (audit log via B04)
4. ✅ **Multi-brand per org?** → MVP: 1 brand per org/project. Future: `is_active` flag + multi-brand

## Research Status

- [x] Design token best practices researched
- [x] Merge inheritance pattern selected
- [x] B22 integration approach defined
- [x] Validation strategy decided
- [x] API performance plan documented
- [x] Security model documented
- [x] Extension points identified

**Next Phase**: Phase 1 - Data Model Design
