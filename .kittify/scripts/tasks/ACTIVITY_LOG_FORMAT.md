# Activity Log Format Guide

## ⚠️ CRITICAL: Correct Format Required for Acceptance

The acceptance validator (`acceptance_support.py`) **ONLY** parses activity log entries in the **inline dash-separated format**. Using any other format will cause acceptance validation to fail.

## ✅ Correct Format (Inline Dash-Separated)

Activity log entries in the `## Activity Log` section **MUST** use this format:

```markdown
## Activity Log

- 2025-12-12T13:05:00Z – claude-reviewer – shell_pid=26336 – lane=done – WP01 approved and moved to done lane
- 2025-12-12T12:33:28Z – claude-implementer – shell_pid=26336 – lane=for_review – Addressed 6/7 feedback items
- 2025-12-12T12:27:26Z – claude-implementer – shell_pid=26336 – lane=doing – Started addressing review feedback
```

### Format Specification

```
- <TIMESTAMP> – <AGENT> – shell_pid=<PID> – lane=<LANE> – <NOTE>
```

- **TIMESTAMP**: ISO 8601 format ending with `Z` (e.g., `2025-12-12T13:05:00Z`)
- **AGENT**: Agent name (e.g., `claude-reviewer`, `copilot`, `system`)
- **PID**: Shell process ID (can be empty: `shell_pid=`)
- **LANE**: One of: `planned`, `doing`, `for_review`, `done`
- **NOTE**: Free-text description of the activity
- **SEPARATOR**: Use en-dash `–` (U+2013) or hyphen `-` surrounded by spaces

### Using the Helper Function

In Python scripts, always use `format_activity_entry()`:

```python
from task_helpers import format_activity_entry, now_utc

entry = format_activity_entry(
    timestamp=now_utc(),
    agent="claude-reviewer",
    lane="done",
    note="WP01 approved and moved to done lane",
    shell_pid="26336"
)
# Returns: "- 2025-12-12T13:05:00Z – claude-reviewer – shell_pid=26336 – lane=done – WP01 approved..."
```

## ❌ WRONG Formats (Will Cause Acceptance Failure)

### ❌ YAML Multi-Line Format in Frontmatter

**DO NOT** add entries like this in the frontmatter `history:` section:

```yaml
---
work_package_id: "WP01"
title: "My Work Package"
history:
  - date: 2025-12-12T13:05:00Z      # ❌ WRONG!
    action: moved_to_done            # ❌ WRONG!
    by: claude-reviewer              # ❌ WRONG!
    agent: claude-reviewer           # ❌ WRONG!
    shell_pid: 26336                 # ❌ WRONG!
    lane: done                       # ❌ WRONG!
    note: "Approved"                 # ❌ WRONG!
---
```

**Why it's wrong**: The validator parses `activity_entries(wp.body)`, which only reads the markdown body, not the frontmatter YAML.

### ❌ Missing Activity Log Section

**DO NOT** omit the `## Activity Log` section entirely. Every work package in `done/` lane must have at least one entry with `lane=done`.

## Validator Behavior

The acceptance validator (`acceptance_support.py` lines 404-440) performs these checks:

1. **Parse entries**: Calls `activity_entries(wp.body)` to extract all entries from `## Activity Log` section
2. **Check lane coverage**: Verifies that `wp.current_lane` appears in at least one entry's `lane=` field
3. **Check latest entry**: For work packages in `done/` lane, verifies the last entry has `lane=done`

### Common Validation Errors

```
Outstanding items:
  activity:
    - WP01: Activity Log missing entry for lane=done
    - WP01: latest Activity Log entry not lane=done
```

**Root Cause**: Either:
- No `## Activity Log` section exists in the markdown body
- Activity Log exists but has no entries with `lane=done`
- Entries are in YAML format in frontmatter instead of inline format in body

## Regex Pattern

The validator uses this regex pattern (from `task_helpers.py`):

```python
pattern = re.compile(
    r"^\s*-\s*"                                    # Line starts with "- "
    r"(?P<timestamp>[0-9T:-]+Z)\s+[–-]\s+"        # Timestamp ending with Z
    r"(?P<agent>\S+(?:\s+\S+)*?)\s+[–-]\s+"       # Agent name
    r"(?:shell_pid=(?P<shell>\S*)\s+[–-]\s+)?"    # Optional shell_pid=VALUE
    r"lane=(?P<lane>[a-z_]+)\s+[–-]\s+"           # Required lane=VALUE
    r"(?P<note>.*)$",                              # Note text (rest of line)
    flags=re.MULTILINE,
)
```

**Key points**:
- Matches both en-dash `–` and hyphen `-` as separators
- `shell_pid=` is optional but `lane=` is required
- Timestamp must end with `Z`
- Lane must be lowercase (`planned`, `doing`, `for_review`, `done`)

## Migration Guide

If you have work packages with YAML-formatted entries in frontmatter:

1. **Locate the frontmatter entries**: Look for `history:` section in frontmatter
2. **Find or create Activity Log section**: Search for `## Activity Log` in markdown body
3. **Convert each entry**: Transform YAML to inline format:

   ```yaml
   # FROM (frontmatter):
   - date: 2025-12-12T13:05:00Z
     agent: claude-reviewer
     shell_pid: 26336
     lane: done
     note: "Approved"
   ```

   ```markdown
   # TO (body):
   ## Activity Log

   - 2025-12-12T13:05:00Z – claude-reviewer – shell_pid=26336 – lane=done – Approved
   ```

4. **Remove frontmatter entries**: The YAML entries can be deleted after migration
5. **Verify**: Run `python3 tasks_cli.py verify <feature>` to check format

## Testing

To verify activity log entries are correctly formatted:

```bash
# Verify entire feature
python3 .kittify/scripts/tasks/tasks_cli.py verify --feature 026-b08-permissions-acl

# Check specific work package
python3 -c "
from task_helpers import activity_entries
with open('kitty-specs/026-b08-permissions-acl/tasks/done/WP01.md') as f:
    content = f.read()
entries = activity_entries(content)
print(f'Found {len(entries)} entries')
for e in entries:
    print(f'  {e[\"timestamp\"]} -> lane={e[\"lane\"]}')
"
```

## References

- **Parser**: `.kittify/scripts/tasks/task_helpers.py` → `activity_entries()`
- **Formatter**: `.kittify/scripts/tasks/task_helpers.py` → `format_activity_entry()`
- **Validator**: `.kittify/scripts/tasks/acceptance_support.py` → `collect_feature_summary()`
- **CLI**: `.kittify/scripts/tasks/tasks_cli.py` → `stage_move()`

## Summary

✅ **Always use inline dash-separated format in `## Activity Log` section**
❌ **Never use YAML multi-line format in frontmatter `history:`**
🛠️ **Use `format_activity_entry()` helper in Python scripts**
✅ **Ensure every work package in `done/` has at least one `lane=done` entry**
