---
name: conventional-commit
description: "Generate standards-compliant conventional commit messages for TeamReel — enforces commit types, scopes, and formatting"
argument-hint: "Describe the changes made (e.g. 'added member search to squad page')"
---

# Conventional Commit Generator

Generate properly formatted conventional commit messages for TeamReel following the project's established patterns.

## Commit Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types

| Type | When to use | Example |
|------|------------|---------|
| `feat` | New feature | `feat(squad): add member search filter` |
| `fix` | Bug fix | `fix(dashboard): prevent card overflow on mobile` |
| `refactor` | Code restructure (no behavior change) | `refactor(hooks): extract useApiQuery from adapters` |
| `style` | CSS/formatting only | `style(tokens): add --app-warning color token` |
| `docs` | Documentation changes | `docs: update ai-context-index with new features` |
| `test` | Test additions/changes | `test(members): add org-scoping unit tests` |
| `chore` | Build, config, tooling | `chore: update vite to 6.x` |
| `perf` | Performance improvement | `perf(activities): add select_related to queryset` |
| `ci` | CI/CD changes | `ci: add playwright e2e tests to pipeline` |

## Scopes (TeamReel-specific)

| Scope | Area |
|-------|------|
| `dashboard` | Dashboard page and cards |
| `squad` | Squad/members features |
| `activities` | Activities and participation |
| `match-day` | Match day mode |
| `brand` | Brand profile |
| `lineup` | Line-up builder |
| `settings` | Settings page |
| `auth` | Authentication |
| `ui` | Shared UI components |
| `tokens` | Design tokens / theming |
| `hooks` | Custom React hooks |
| `api` | Backend API / DRF |
| `models` | Django models |
| `video` | Video pipeline |
| `ai` | AI/generative features |
| `deploy` | Deployment config |
| `deps` | Dependencies |

## Rules

1. **Subject line** ≤ 72 characters
2. **Imperative mood**: "add feature" not "added feature" or "adds feature"
3. **No period** at end of subject line
4. **Body** wraps at 72 characters, separated by blank line
5. **Breaking changes**: `feat(api)!: rename endpoint` or `BREAKING CHANGE:` in footer
6. **Multi-line body** for complex changes:

```
feat(squad): add member search with debounced filtering

- SearchInput component with 300ms debounce
- useSearch hook for filter state management
- Mobile-responsive filter bar
- Keyboard accessible (Escape clears)

Roadmap #21 Phase H2
```

## Workflow

1. Review staged changes: `git diff --cached --stat`
2. Identify the primary type of change
3. Determine the scope from the files changed
4. Write a clear, imperative description
5. Add body if the change is non-trivial
6. Reference roadmap phase if applicable

## Examples from TeamReel History

```
feat(dashboard): add match-day mode with countdown and ReadinessRing
fix(lineup): prevent drag ghost disappearing on mobile Safari
refactor(api): split serializers into read/write/list variants
style(tokens): add reduced-motion safe transitions
docs: move roadmap #20 to done
chore(ai): add custom agents, skills, and hooks
perf(activities): add prefetch_related for participation queryset
```
