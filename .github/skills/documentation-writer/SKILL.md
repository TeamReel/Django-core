---
name: documentation-writer
description: "Generates and updates documentation from code changes: feature docs, API docs, component docs, and the AI context index. Use when documenting a feature, updating docs after code changes, or auditing documentation freshness."
metadata:
  author: teamreel
  argument-hint: "What to document (e.g. 'new squad search feature' or 'audit all docs')"
---

# Documentation Writer

Generate, update, and audit TeamReel documentation to keep it in sync with the codebase.

## Documentation Structure

```
docs/
├── ai-context-index.md                  ← Master index (ALWAYS update)
├── architecture/
│   ├── overview.md                      ← Full app architecture
│   ├── features/                    ← Feature documentation
│   │   ├── api-reference.md
│   │   ├── celery-tasks.md
│   │   └── [feature-name].md
│   ├── frontend-design/             ← Design system docs
│   │   ├── code-conventions.md
│   │   ├── component-library.md
│   │   ├── css-architecture.md
│   │   ├── theming.md
│   │   └── ux-flows.md
│   ├── security/                    ← Access control docs
│   │   ├── permission-layers.md
│   │   └── permission-testing-guide.md
│   ├── data/                        ← Data model docs
│   │   └── tables.md
│   ├── media/                       ← Media/video pipeline docs
│   └── plans/                       ← Analyses & strategic plans
├── 02-roadmap/                      ← Active roadmap specs
│   └── done/                        ← Completed roadmaps
└── 04-modules/                      ← Module documentation
```

## Document Templates

**Full templates**: See [references/doc-templates.md](references/doc-templates.md) for feature, component, and API endpoint templates.

Quick reference — each document type:

| Type | Key Sections | Template |
|------|-------------|----------|
| Feature doc | Overview, User Flow, Components, Data Flow, API, Design Decisions | [doc-templates.md](references/doc-templates.md#feature-documentation) |
| Component doc | Purpose, Props, Usage, Accessibility, Responsive | [doc-templates.md](references/doc-templates.md#component-documentation) |
| API endpoint doc | Method, Auth, Request, Response, Pagination, Errors | [doc-templates.md](references/doc-templates.md#api-endpoint-documentation) |

## Audit Workflow

### Find Documentation Gaps
1. List all components: `Get-ChildItem demo/src/components/`
2. List all pages: `Get-ChildItem demo/src/pages/`
3. List all API views: `Select-String -Path "src/**/*.py" -Pattern "class.*ViewSet" -Recurse`
4. Compare against documented items in `ai-context-index.md`
5. Identify undocumented code

### Update After Code Changes
1. Read the changed files
2. Determine which docs are affected
3. Update or create documentation
4. **Always update** `docs/ai-context-index.md`

## Writing Guidelines
- **Concise**: No filler words
- **Accurate**: Match the actual code, not aspirational
- **Structured**: Use tables and lists, not prose walls
- **Linked**: Reference source files with relative paths
- **Current**: Date or version-stamp significant decisions
