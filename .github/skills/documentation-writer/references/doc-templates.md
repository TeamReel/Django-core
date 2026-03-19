# Documentation Templates

Templates for generating TeamReel documentation.

## Feature Documentation

```markdown
# [Feature Name]

## Overview
One-paragraph description of what the feature does and why.

## User Flow
1. User navigates to [page]
2. User sees [UI state]
3. User interacts with [element]
4. System responds with [behavior]

## Components
| Component | Location | Purpose |
|-----------|----------|---------|

## Data Flow
```
API → Adapter → Hook → Component → User
```

## API Endpoints
| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|

## Design Decisions
- **Why X**: [explanation]
- **Trade-off**: [what we chose and why]

## Related Files
- Frontend: `demo/src/pages/[...]`
- Backend: `src/[app]/views.py`
- Styles: `demo/src/[...].module.css`
```

## Component Documentation

```markdown
# [Component Name]

## Purpose
[One sentence]

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|

## Usage
\`\`\`tsx
<ComponentName title="Example" onClick={handler} />
\`\`\`

## Accessibility
- Keyboard: [navigation pattern]
- Screen reader: [announcements]
- Focus: [management approach]

## Responsive
- Mobile: [behavior]
- Desktop: [behavior]
```

## API Endpoint Documentation

```markdown
# [Endpoint Name]

## `METHOD /api/v1/resource/`

### Authentication
Required. Org-scoped.

### Request
\`\`\`json
{ "field": "value" }
\`\`\`

### Response
\`\`\`json
{ "id": "uuid", "field": "value" }
\`\`\`

### Pagination
Page-based. Default 20, max 100.

### Errors
| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 403 | Not in organisation |
| 404 | Not found or inactive |
```
