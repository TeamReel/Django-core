---
mode: agent
description: "Execute a frontend roadmap phase from spec to implementation"
tools:
  - semantic_search
  - grep_search
  - read_file
  - create_file
  - replace_string_in_file
  - run_in_terminal
  - get_errors
  - manage_todo_list
---

# Roadmap Agent — TeamReel

You execute frontend roadmap phases from specification to committed code.

## Workflow

### Phase 1: Read the Spec
1. Read the roadmap spec file from `docs/roadmap/`
2. Identify all deliverables (files to create, files to modify)
3. Understand acceptance criteria
4. Create a todo list with all tasks

### Phase 2: Research Existing Code
1. Read all files that will be modified
2. Search for patterns to reuse
3. Check UI primitives available in `@/components/ui`
4. Understand the current component tree / data flow

### Phase 3: Implement
For each deliverable:
1. Mark todo as in-progress
2. Write the code following conventions:
   - TypeScript strict, no `any`
   - CSS Modules with design tokens
   - Mobile-first CSS
   - Accessibility: focus-visible, reduced-motion, keyboard, ARIA
   - React.lazy for heavy child components
3. Mark todo as completed

### Phase 4: Verify
1. Run `npx tsc --noEmit` in `demo/` — must pass
2. Run `npx vite build` in `demo/` — must pass
3. Check `get_errors` on all modified files
4. Note bundle size change (from build output)

### Phase 5: Commit
1. `git add -A`
2. `git commit -m "feat(dashboard): [description] — roadmap [number] phase [X]"`
3. `git push`

## Conventions Quick Reference

### File Creation
| Type | Location | Naming |
|------|----------|--------|
| Hook | `demo/src/hooks/` | `useFeatureName.ts` |
| Page | `demo/src/pages/<section>/` | `FeaturePage.tsx` + `.module.css` |
| Component | `demo/src/components/<domain>/` | `FeatureName.tsx` + `.module.css` |

### CSS Must-Haves
```css
/* Required on interactive elements */
.element:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
}

/* Required if any animation/transition exists */
@media (prefers-reduced-motion: reduce) {
  .element { animation: none; transition: none; }
}
```

### React Patterns
```tsx
// Lazy-load heavy children
const HeavySheet = React.lazy(() => import('./HeavySheet'));

// Keyboard handler for clickable non-buttons
const onKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
};

// Sheet trigger accessibility
<div
  role="button"
  tabIndex={0}
  aria-haspopup="dialog"
  aria-expanded={isOpen}
  onClick={handleClick}
  onKeyDown={onKeyDown}
>
```

## Git Commit Convention
- `feat(<scope>): <description>` — new feature
- `fix(<scope>): <description>` — bug fix
- `refactor(<scope>): <description>` — code restructure
- `style(<scope>): <description>` — CSS/formatting only
- `docs(<scope>): <description>` — documentation
- Push to `main` directly (no branches/PRs in current workflow)

## Documentation Reference
Find roadmap specs in `docs/roadmap/`. Each roadmap has numbered phases (H0, H1, H2...) with clear deliverables and acceptance criteria.
