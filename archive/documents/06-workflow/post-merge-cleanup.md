# Post-Merge Cleanup Instructions

## Overview
After merging a feature branch created in a git worktree, follow these steps to clean up the worktree and maintain a clean repository structure.

## Prerequisites
- Feature branch has been merged to `main` via GitHub PR
- All CI checks have passed
- PR has been approved and merged

## Cleanup Steps

### 1. Switch Back to Main Repository
```powershell
cd C:\Users\brian\Documents\django-core
```

### 2. Update Main Branch
Pull the latest changes including the merged feature:
```powershell
git checkout main
git pull origin main
```

### 3. Remove the Worktree
Remove the worktree directory (this does NOT delete the branch):
```powershell
git worktree remove .worktrees\<branch-name>
```

Example:
```powershell
git worktree remove .worktrees\039-activities-period-hierarchy
```

**Note:** If you get an error about uncommitted changes, use `--force`:
```powershell
git worktree remove --force .worktrees\<branch-name>
```

### 4. Delete the Remote Branch
Delete the feature branch from GitHub:
```powershell
git push origin --delete <branch-name>
```

Example:
```powershell
git push origin --delete 039-activities-period-hierarchy
```

### 5. Delete the Local Branch
Delete your local branch reference:
```powershell
git branch -d <branch-name>
```

Example:
```powershell
git branch -d 039-activities-period-hierarchy
```

**Note:** If the branch hasn't been fully merged locally, use `-D`:
```powershell
git branch -D <branch-name>
```

### 6. Prune Worktree References
Clean up any stale worktree administrative files:
```powershell
git worktree prune
```

### 7. Verify Cleanup
Check that worktree is removed:
```powershell
git worktree list
```

Should only show:
```
C:/Users/brian/Documents/django-core  [main]
```

Check that branch is deleted:
```powershell
git branch -a
```

The feature branch should not appear in local or remote listings.

## Complete Cleanup Script

For convenience, here's a complete PowerShell script:

```powershell
# Configuration
$BRANCH_NAME = "039-activities-period-hierarchy"
$REPO_ROOT = "C:\Users\brian\Documents\django-core"

# Navigate to repo root
cd $REPO_ROOT

# Update main
git checkout main
git pull origin main

# Remove worktree
git worktree remove ".worktrees\$BRANCH_NAME" --force

# Delete remote branch
git push origin --delete $BRANCH_NAME

# Delete local branch
git branch -D $BRANCH_NAME

# Prune worktree references
git worktree prune

# Verify
Write-Host "`n=== Worktrees ===" -ForegroundColor Cyan
git worktree list

Write-Host "`n=== Branches ===" -ForegroundColor Cyan
git branch -a | Select-String $BRANCH_NAME
```

## Troubleshooting

### Worktree Remove Fails
**Error:** `fatal: '.worktrees\<branch>' is not a working tree`

**Solution:** The worktree directory may have already been manually deleted. Just run:
```powershell
git worktree prune
```

### Branch Delete Fails (Local)
**Error:** `error: The branch '<branch>' is not fully merged`

**Solution:** The branch was merged via GitHub but git doesn't recognize it locally. Force delete:
```powershell
git branch -D <branch-name>
```

### Branch Delete Fails (Remote)
**Error:** `error: unable to delete '<branch>': remote ref does not exist`

**Solution:** Branch was already deleted via GitHub UI. This is fine, continue with local cleanup.

### Directory Still Exists
If `.worktrees\<branch-name>` directory still exists after removal:

```powershell
# Manually remove directory
Remove-Item -Recurse -Force ".worktrees\<branch-name>"

# Prune worktree references
git worktree prune
```

## Best Practices

### When to Clean Up
- **Immediately after merge:** Clean up within 24 hours of merging to avoid confusion
- **Before starting new work:** Verify worktrees are clean before creating new feature branches

### What NOT to Delete
- Never delete the main repository worktree (`C:\Users\brian\Documents\django-core`)
- Never delete `.worktrees` directory itself (only subdirectories)
- Never delete `main` branch

### Verification Checklist
- [ ] `git worktree list` shows only main repository
- [ ] `git branch` does not list the feature branch
- [ ] `git branch -r` does not show `origin/<branch-name>`
- [ ] `.worktrees\<branch-name>` directory does not exist
- [ ] Main branch is up to date with origin

## Alternative: Keep Worktree for Reference

If you want to keep the worktree temporarily for reference:

1. **Do NOT remove worktree yet**
2. Delete only the remote branch:
   ```powershell
   git push origin --delete <branch-name>
   ```
3. Keep local worktree and branch for review
4. Clean up later when ready using steps 3-7 above

This is useful when:
- Documenting changes for release notes
- Reviewing implementation details
- Comparing with new features

## Related Documents
- [Spec Kitty Workflow](./spec-kitty.md)
- [CI/CD](./cicd.md)
