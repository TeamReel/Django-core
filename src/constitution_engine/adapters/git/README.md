# Git Adapter

The Git Adapter provides read-only access to Git repository information for the Constitutional Enforcement Engine. It enables the engine to inspect repository state, including the current branch, commit hash, and changed files.

## Features

- **Lightweight**: Uses subprocess calls to Git; no heavy dependencies
- **Cross-platform**: Works on Windows, Linux, and macOS
- **Optional**: Gracefully degrades when Git is unavailable
- **Read-only**: Never modifies the repository
- **Testable**: Easy to mock and test in isolation

## Installation

The Git adapter is included in the `constitution_engine` package. No additional dependencies are required beyond having Git installed on your system.

## Basic Usage

```python
from pathlib import Path
from constitution_engine.adapters.git import GitAdapter, GitNotAvailableError

# Initialize the adapter
try:
    adapter = GitAdapter(repo_path=Path("/path/to/repo"))
except GitNotAvailableError as e:
    print(f"Git not available: {e}")
    exit(1)

# Get comprehensive repository information
git_info = adapter.get_info()

print(f"Branch: {git_info.branch}")
print(f"Commit: {git_info.commit_hash} ({git_info.commit_hash_full})")
print(f"Changed files: {len(git_info.changed_files)}")
print(f"Is dirty: {git_info.is_dirty}")
print(f"Remote URL: {git_info.remote_url}")
```

## API Reference

### GitAdapter

Main class for interacting with Git repositories.

**Constructor:**
```python
GitAdapter(repo_path: Path, timeout: int = 10)
```

**Parameters:**
- `repo_path`: Absolute or relative path to the repository root
- `timeout`: Timeout in seconds for Git operations (default: 10)

**Raises:**
- `GitNotAvailableError`: If Git is not installed or path is not a Git repository

**Methods:**

#### get_info() → GitInfo

Get comprehensive repository information in a single call.

**Returns:** `GitInfo` dataclass with all repository state

#### get_current_branch() → str | None

Get the current branch name.

**Returns:** Branch name, or `None` if in detached HEAD state

#### get_commit_hash(short: bool = True) → str

Get the current commit hash.

**Parameters:**
- `short`: If True, return 7-character hash; otherwise return full 40-character hash

**Returns:** Commit hash string

#### get_changed_files() → list[Path]

Get list of files with uncommitted changes (staged, unstaged, or untracked).

**Returns:** List of Path objects relative to repository root

#### is_dirty() → bool

Check if the repository has uncommitted changes.

**Returns:** True if there are uncommitted changes, False otherwise

#### get_remote_url(remote_name: str = "origin") → str | None

Get the URL of the specified remote.

**Parameters:**
- `remote_name`: Name of the remote (default: "origin")

**Returns:** Remote URL, or `None` if remote doesn't exist

### GitInfo

Immutable dataclass containing repository state information.

**Attributes:**
- `branch: str | None` - Current branch name (None if detached HEAD)
- `commit_hash: str` - Short (7-char) commit hash
- `commit_hash_full: str` - Full (40-char) commit hash
- `changed_files: list[Path]` - List of files with uncommitted changes
- `is_dirty: bool` - Whether there are uncommitted changes
- `remote_url: str | None` - Primary remote URL (if available)

### GitNotAvailableError

Exception raised when Git operations fail or Git is not available.

## Integration with RepositoryContextBuilder

The Git adapter is automatically used by `RepositoryContextBuilder` when building repository context:

```python
from constitution_engine.core.context import RepositoryContextBuilder

# Build context with Git metadata (default)
builder = RepositoryContextBuilder(include_git_metadata=True)
context = builder.build_context(repo_path=Path("/path/to/repo"))

print(f"Git branch: {context.git_branch}")
print(f"Git commit: {context.git_commit}")
print(f"Changed files: {context.metadata.get('git_metadata', {}).get('changed_files', [])}")
```

The builder automatically falls back to legacy `GitMetadata` implementation if `GitAdapter` is unavailable.

## Error Handling

The Git adapter handles errors gracefully:

```python
from constitution_engine.adapters.git import GitAdapter, GitNotAvailableError

try:
    adapter = GitAdapter(repo_path=Path("/path/to/repo"))
    git_info = adapter.get_info()
except GitNotAvailableError as e:
    # Git not installed or not a Git repository
    print(f"Error: {e}")
except Exception as e:
    # Unexpected error (e.g., permission denied, timeout)
    print(f"Unexpected error: {e}")
```

## Testing

The Git adapter is thoroughly tested with temporary Git repositories:

```python
import subprocess
from pathlib import Path
from constitution_engine.adapters.git import GitAdapter

# Create a temporary Git repository for testing
def create_test_repo(path: Path) -> None:
    subprocess.run(["git", "init"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=path, check=True)
    subprocess.run(["git", "config", "user.name", "Test User"], cwd=path, check=True)

    # Create initial commit
    (path / "README.md").write_text("# Test\n")
    subprocess.run(["git", "add", "README.md"], cwd=path, check=True)
    subprocess.run(["git", "commit", "-m", "Initial commit"], cwd=path, check=True)

# Use the test repository
test_path = Path("/tmp/test_repo")
create_test_repo(test_path)

adapter = GitAdapter(test_path)
assert adapter.get_current_branch() in ("main", "master")
```

## Limitations

- **Read-only**: The adapter does not support writing to the repository (commits, branches, etc.)
- **Local only**: Does not support remote operations (fetch, push, pull)
- **No annotations**: While Git supports annotations via `git notes`, the adapter does not currently expose this functionality
- **Subprocess overhead**: Each Git operation spawns a subprocess, which may be slower than using a Git library

## Future Enhancements

Potential future improvements:

- Support for Git notes/annotations for local workflow integration
- Caching of Git information to reduce subprocess calls
- Optional integration with GitPython library for better performance
- Support for Git worktrees and submodules
- Diff viewing and file content retrieval

## See Also

- [RepositoryContextBuilder](../core/context.py) - Builds repository context using Git adapter
- [GitMetadata](../core/context.py) - Legacy Git metadata helper (fallback)
- [Git Documentation](https://git-scm.com/docs) - Official Git documentation
