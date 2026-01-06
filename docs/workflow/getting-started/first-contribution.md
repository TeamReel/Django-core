# Your First Contribution

This guide walks you through making your first contribution to Django Core-App. By the end, you'll have submitted a pull request!

## Overview

1. [Set up your environment](#1-set-up-your-environment)
2. [Create a feature branch](#2-create-a-feature-branch)
3. [Make your change](#3-make-your-change)
4. [Run quality checks](#4-run-quality-checks)
5. [Commit your changes](#5-commit-your-changes)
6. [Push and create a PR](#6-push-and-create-a-pull-request)
7. [Address review feedback](#7-address-review-feedback)
8. [Celebrate! 🎉](#8-celebrate-)

---

## 1. Set Up Your Environment

If you haven't already, follow the [Quickstart Guide](quickstart.md) to get a running development environment.

### Fork the Repository (External Contributors)

If you're not a core team member:

1. Visit [github.com/TeamReel/django-core](https://github.com/TeamReel/django-core)
2. Click the **Fork** button in the top right
3. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/django-core.git
cd django-core
```

### Add Upstream Remote

```bash
git remote add upstream https://github.com/TeamReel/django-core.git
git fetch upstream
```

---

## 2. Create a Feature Branch

Always work on a feature branch, never directly on `main`.

```bash
# Make sure you're on main and up to date
git checkout main
git pull upstream main

# Create a new branch
git checkout -b feat/your-feature-name
```

### Branch Naming Conventions

| Prefix | Use For | Example |
|--------|---------|---------|
| `feat/` | New features | `feat/add-user-avatar` |
| `fix/` | Bug fixes | `fix/password-reset-email` |
| `docs/` | Documentation | `docs/update-api-examples` |
| `refactor/` | Code refactoring | `refactor/simplify-permissions` |
| `test/` | Test improvements | `test/add-audit-edge-cases` |
| `chore/` | Maintenance tasks | `chore/update-dependencies` |

---

## 3. Make Your Change

### Good First Issues

Not sure what to work on? Look for issues labeled **`good first issue`**:

- Documentation improvements
- Adding docstrings to functions
- Writing additional tests
- Fixing typos
- Improving error messages

### Example: Add a Docstring

Here's a simple first contribution - adding a docstring to a function:

```python
# Before
def get_user_permissions(user, resource):
    cache_key = f"perms:{user.id}:{resource.id}"
    # ... rest of function

# After
def get_user_permissions(user, resource):
    """
    Retrieve all permissions for a user on a given resource.

    Checks the permission cache first, falling back to database query
    if cache miss occurs.

    Args:
        user: The user to check permissions for.
        resource: The resource (Organization or Project) to check against.

    Returns:
        set[str]: Set of permission codenames the user has.

    Example:
        >>> perms = get_user_permissions(user, project)
        >>> 'projects.update' in perms
        True
    """
    cache_key = f"perms:{user.id}:{resource.id}"
    # ... rest of function
```

---

## 4. Run Quality Checks

Before committing, run all quality checks to ensure your code meets our standards.

### Run Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/permissions/test_api.py

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=src --cov-report=term-missing
```

### Type Checking

```bash
mypy src/
```

### Linting

```bash
# Check for issues
ruff check src/

# Auto-fix issues
ruff check --fix src/
```

### Formatting

```bash
# Check formatting
black --check src/

# Auto-format
black src/
```

### All Checks at Once

```bash
# Run pre-commit hooks
pre-commit run --all-files
```

!!! tip "Install Pre-commit Hooks"
    Install hooks to run automatically on every commit:
    ```bash
    pre-commit install
    ```

---

## 5. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear, consistent commit messages.

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no code change |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependencies |

### Examples

```bash
# Feature
git commit -m "feat(permissions): add project-level role assignment"

# Bug fix
git commit -m "fix(auth): handle expired tokens gracefully"

# Documentation
git commit -m "docs(api): add authentication examples"

# With body
git commit -m "feat(audit): add metadata search

Add GIN index on metadata JSONField for faster queries.
Improves search performance by 10x for typical queries.

Closes #123"
```

---

## 6. Push and Create a Pull Request

### Push Your Branch

```bash
git push origin feat/your-feature-name
```

### Create the Pull Request

1. Go to the repository on GitHub
2. You'll see a prompt to create a PR from your recently pushed branch
3. Click **Compare & pull request**

### Write a Good PR Description

Use this template:

```markdown
## Summary

Brief description of what this PR does.

## Changes

- Added X to handle Y
- Updated Z to improve W
- Fixed issue with A

## Testing

How did you test these changes?

- [ ] All existing tests pass
- [ ] Added new tests for feature X
- [ ] Manually tested scenario Y

## Screenshots (if applicable)

Add any relevant screenshots.

## Related Issues

Closes #123
Relates to #456
```

---

## 7. Address Review Feedback

Reviewers may request changes. Here's how to handle feedback:

### Make Requested Changes

```bash
# Make changes to your code
# ...

# Add and commit
git add .
git commit -m "fix: address review feedback"

# Push to update the PR
git push origin feat/your-feature-name
```

### If You Need to Rebase

If `main` has been updated:

```bash
# Fetch latest main
git fetch upstream main

# Rebase your branch
git rebase upstream/main

# Force push (safe because it's your branch)
git push --force-with-lease origin feat/your-feature-name
```

### Responding to Comments

- Respond to each comment, even if just to acknowledge
- Use GitHub's "Resolve conversation" when fixed
- Ask questions if feedback is unclear

---

## 8. Celebrate! 🎉

Once your PR is approved and merged:

1. **Delete your branch** (GitHub offers this after merge)
2. **Update your local main**:
   ```bash
   git checkout main
   git pull upstream main
   git branch -d feat/your-feature-name
   ```
3. **Share your success** - You're now a contributor!

---

## Common Issues

### Tests Fail in CI but Pass Locally

- Check if you're using the correct Python version (3.12+)
- Ensure all dependencies are installed: `pip install -r requirements/local.txt`
- Check for environment-specific settings in `.env`

### Merge Conflicts

```bash
# Update your branch with latest main
git fetch upstream main
git rebase upstream/main

# Resolve conflicts in your editor
# Then continue
git add .
git rebase --continue
```

### CI Takes Too Long

- Only relevant tests run on PR
- Full test suite runs on merge to main
- If CI seems stuck, ask a maintainer to check

---

## What's Next?

Now that you've made your first contribution:

- Read the [Code Style Guide](../contributing/code-style.md)
- Understand our [Testing Practices](../contributing/testing.md)
- Learn the [Spec Kitty Workflow](../contributing/spec-kitty-workflow.md) for larger features
- Explore the [Architecture](../architecture/index.md) to find more complex areas to contribute
