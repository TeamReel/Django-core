---
name: documentation-writer
description: "Generate and update TeamReel documentation from code changes — feature docs, API docs, component docs, and the AI context index"
argument-hint: "What to document (e.g. 'new squad search feature' or 'audit all docs')"
---

# Documentation Writer

Generate, update, and audit TeamReel documentation to keep it in sync with the codebase.

## Documentation Structure

```
documents/
├── 05-demo/
│   ├── ai-context-index.md          ← Master index (ALWAYS update)
│   ├── features/                    ← Feature documentation
│   │   ├── application-architecture.md
│   │   ├── ux-flows.md
│   │   └── [feature-name].md
│   ├── frontend-design/             ← Design system docs
│   │   ├── code-conventions.md
│   │   ├── component-library.md
│   │   ├── css-architecture.md
│   │   └── theming.md
│   ├── data/                        ← Data model docs
│   │   └── tables.md
│   └── media/                       ← Media/video pipeline docs
├── 02-roadmap/                      ← Active roadmap specs
│   └── done/                        ← Completed roadmaps
└── 04-modules/                      ← Module documentation
```

## Document Templates

### Feature Documentation
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

### Component Documentation
```markdown
# [Component Name]

## Purpose
[One sentence]

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|

## Usage
```tsx
<ComponentName title="Example" onClick={handler} />
```

## Accessibility
- Keyboard: [navigation pattern]
- Screen reader: [announcements]
- Focus: [management approach]

## Responsive
- Mobile: [behavior]
- Desktop: [behavior]
```

### API Endpoint Documentation
```markdown
# [Endpoint Name]

## `METHOD /api/v1/resource/`

### Authentication
Required. Org-scoped.

### Request
```json
{ "field": "value" }
```

### Response
```json
{ "id": "uuid", "field": "value" }
```

### Pagination
Page-based. Default 20, max 100.

### Errors
| Code | Meaning |
|------|---------|
| 400 | Validation error |
| 403 | Not in organisation |
| 404 | Not found or inactive |
```

## Audit Workflow

### Find Documentation Gaps
1. List all components: `ls demo/src/components/`
2. List all pages: `ls demo/src/pages/`
3. List all API views: `grep -rn "class.*ViewSet" src/`
4. Compare against documented items in `ai-context-index.md`
5. Identify undocumented code

### Update After Code Changes
1. Read the changed files
2. Determine which docs are affected
3. Update or create documentation
4. **Always update** `documents/05-demo/ai-context-index.md`

## Writing Guidelines
- **Concise**: No filler words
- **Accurate**: Match the actual code, not aspirational
- **Structured**: Use tables and lists, not prose walls
- **Linked**: Reference source files with relative paths
- **Current**: Date or version-stamp significant decisions
