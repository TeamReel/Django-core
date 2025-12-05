# Pull Request Guidelines

This guide documents the pull request process and review expectations for Django Core-App.

## Branch Naming

Use descriptive branch names following this pattern:

```
<feature-id>-<short-description>
```

### Examples

| Branch Name | Description |
|-------------|-------------|
| `021-docs-examples` | Feature 021: Docs and Examples |
| `fix/password-reset-email` | Bug fix: Password reset email |
| `docs/update-api-examples` | Documentation: API examples |
| `chore/update-dependencies` | Chore: Update dependencies |

### Prefixes

| Prefix | Use For |
|--------|---------|
| `<nnn>-*` | Feature branches (via Spec Kitty) |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation only |
| `chore/*` | Maintenance tasks |
| `hotfix/*` | Production fixes |

---

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear, consistent commit history.

### Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add JWT refresh token` |
| `fix` | Bug fix | `fix(permissions): handle null resource` |
| `docs` | Documentation | `docs(api): add authentication examples` |
| `style` | Formatting | `style: fix import ordering` |
| `refactor` | Code refactoring | `refactor(audit): simplify event logging` |
| `test` | Tests | `test(accounts): add login edge cases` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance | `perf(cache): reduce Redis calls` |

### Scope

The scope indicates which module is affected:

- `accounts`, `organisations`, `projects`, `permissions`
- `audit`, `tasks`, `notifications`, `transactions`
- `api`, `docs`, `ci`, `deps`

### Examples

```bash
# Feature
git commit -m "feat(permissions): add project-level role inheritance

Implements additive permission model where project permissions
inherit from organisation level.

Closes #123"

# Bug fix
git commit -m "fix(auth): handle expired refresh token gracefully

Returns 401 instead of 500 when refresh token has expired.

Fixes #456"

# Documentation
git commit -m "docs(contributing): add PR guidelines"

# Chore
git commit -m "chore(deps): update Django to 5.1.2"
```

---

## PR Title and Description

### Title Format

Match the primary commit type:

```
<type>(<scope>): <short description>
```

Examples:
- `feat(docs): add getting started documentation`
- `fix(permissions): correct cache key generation`
- `docs(api): update authentication examples`

### Description Template

```markdown
## Summary

Brief description of what this PR does and why.

## Changes

- Added X to handle Y
- Updated Z to improve performance
- Fixed issue with A causing B

## Testing

How did you test these changes?

- [ ] All existing tests pass
- [ ] Added new tests for [feature]
- [ ] Manually tested [scenario]

## Screenshots (if applicable)

Add screenshots for UI changes.

## Checklist

- [ ] Code follows project style guide
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] Commit messages follow conventions

## Related Issues

Closes #123
Relates to #456
```

---

## Required Checks

All PRs must pass these checks before merging:

### CI Pipeline

| Check | Description | Required |
|-------|-------------|----------|
| **Tests** | All pytest tests pass | ✅ Yes |
| **Coverage** | Minimum 80% coverage | ✅ Yes |
| **Type Check** | mypy passes | ✅ Yes |
| **Lint** | Ruff passes | ✅ Yes |
| **Format** | Black passes | ✅ Yes |

### Manual Checks

| Check | Description |
|-------|-------------|
| **Review** | At least 1 approving review |
| **Conflicts** | No merge conflicts |
| **Branch** | Up to date with target |

---

## Review Process

### What Reviewers Look For

1. **Correctness**
   - Does the code do what it claims?
   - Are edge cases handled?
   - Are error conditions covered?

2. **Tests**
   - Are there sufficient tests?
   - Do tests cover the new functionality?
   - Are tests readable and maintainable?

3. **Code Quality**
   - Does code follow style guide?
   - Is the code readable?
   - Are functions/methods reasonably sized?
   - Is there appropriate documentation?

4. **Architecture**
   - Does this fit the existing architecture?
   - Are there better alternatives?
   - Will this scale appropriately?

5. **Security**
   - Are there security implications?
   - Is input validated?
   - Are permissions checked?

### Responding to Reviews

**Do:**
- Respond to every comment
- Ask for clarification if needed
- Explain your reasoning
- Mark resolved conversations

**Don't:**
- Ignore feedback
- Take criticism personally
- Dismiss suggestions without consideration

### Making Changes

```bash
# Make requested changes
# ...

# Commit with descriptive message
git add .
git commit -m "fix: address review feedback - update validation logic"

# Push to update PR
git push
```

---

## Merge Strategy

### Squash and Merge (Default)

We squash all commits into a single commit when merging.

**Benefits:**
- Clean history on main
- Easier to revert if needed
- PR title becomes commit message

**Process:**
1. All checks pass
2. At least 1 approval
3. Click "Squash and merge"
4. Edit commit message if needed
5. Confirm merge

### When to Use Merge Commit

Only for large features with meaningful commit history:
- Multi-phase implementations
- Significant refactoring
- When individual commits tell a story

Discuss with maintainers before using merge commit.

---

## After Merging

### Cleanup

1. **Delete branch** (GitHub offers this after merge)

2. **Update local repository:**
   ```bash
   git checkout main
   git pull origin main
   git branch -d <your-branch>
   ```

3. **Clean up worktree** (for Spec Kitty features):
   ```bash
   git worktree remove .worktrees/<feature>
   ```

### Celebrate! 🎉

You've successfully contributed to Django Core-App!

---

## PR Size Guidelines

### Keep PRs Small

| Size | Lines Changed | Review Time |
|------|---------------|-------------|
| **XS** | < 50 | Minutes |
| **S** | 50-200 | 30 min |
| **M** | 200-500 | 1-2 hours |
| **L** | 500-1000 | Half day |
| **XL** | > 1000 | Avoid |

### Breaking Up Large PRs

If your PR is too large:

1. **Split by functionality**: Separate backend/frontend
2. **Split by layer**: Models, then views, then tests
3. **Use stacked PRs**: Depend on each other
4. **Feature flags**: Ship incrementally

---

## Special Cases

### Draft PRs

Use draft PRs when:
- Work in progress
- Seeking early feedback
- Blocked on something

Convert to ready when complete.

### Dependent PRs

When PRs depend on each other:

1. Base second PR on first PR's branch
2. Mention dependency in description
3. Update after first PR merges
4. Rebase on main

### Reverting PRs

If something goes wrong:

```bash
# Create revert PR
git revert -m 1 <merge-commit-sha>
git push origin revert-<original-branch>
```

Then create a PR to merge the revert.

---

## Checklist Summary

Before submitting:

- [ ] Branch name follows convention
- [ ] Commits use conventional commits
- [ ] PR title is descriptive
- [ ] Description explains changes
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No merge conflicts

During review:

- [ ] Respond to all comments
- [ ] Address requested changes
- [ ] Keep PR updated with target branch

After approval:

- [ ] Squash and merge
- [ ] Delete branch
- [ ] Update local repository

---

## Next Steps

- Follow [Code Style](code-style.md) guidelines
- Understand [Testing](testing.md) requirements
- Learn the [Spec Kitty Workflow](spec-kitty-workflow.md)
