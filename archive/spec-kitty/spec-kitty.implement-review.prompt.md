---
description: Implement + review a feature by processing ALL work packages (WP01..WPxx) in order and moving tasks to done.
---

*Path: [prompts/spec-kitty.implement-review.prompt.md](prompts/spec-kitty.implement-review.prompt.md)*

This combined command MUST follow the same conventions as:
- prompts/spec-kitty.implement.prompt.md
- prompts/spec-kitty.review.prompt.md

It automates the loop: implement → checks → review → fix → approve → mark done, for every task in every WP, in order.

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Location Pre-flight Check (CRITICAL for AI Agents)

**BEFORE PROCEEDING:** Verify you are working from inside the feature worktree.

**Check current working directory and branch:**
```bash
pwd
git branch --show-current
```

**Expected output:**
- `pwd`: `/path/to/project/.worktrees/<feature-slug>` (or similar)
- Branch: `<feature-slug>` (NOT `main` or `release/*`)

⛔ **STOP if you are not in the feature worktree.**
Tell the user to restart the session from inside `.worktrees/<feature>/`.
**Do not use `cd` to “fix it”.** File editing tools will still point to the wrong root.

---

## Outline

### 0) Resolve feature context and load artifacts

1) Run prerequisites from repo root and parse:
- `FEATURE_DIR` (absolute path)
- `AVAILABLE_DOCS`
- `TASKS_MD` path

[IF SCRIPT_TYPE=powershell]
```powershell
.\.kittify\scripts\powershell\check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
```
[ENDIF]

[IF SCRIPT_TYPE=bash]
```bash
./.kittify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```
[ENDIF]

2) Load feature artifacts from `FEATURE_DIR`:
- `spec.md`
- `plan.md`
- `tasks.md`

If any are missing: ⛔ **STOP** and request the smallest missing artifact.

3) Check checklists (if `FEATURE_DIR/checklists/` exists):
- Scan checklist files and compute PASS/FAIL based on incomplete items.
- If any checklist is incomplete: ⛔ **STOP** and ask the user: „Proceed anyway? (yes/no)”.
- If all complete: continue.

### 1) Build the WP queue (order matters)

1) Parse `tasks.md` and extract work packages in order: `WP01, WP02, …`.
2) For each WP, extract tasks in execution order:
- respect phases (Setup → Tests → Core → Integration → Polish) if present
- respect dependency notes and sequential order
- tasks marked `[P]` may be executed in parallel only if safe; default to sequential for reliability

If no WPs or no tasks are found: ⛔ **STOP** with an instructional message.

### 2) Execution loop: WP by WP, task by task (implement → review → done)

Process each WP strictly in order. Do not start WP02 until WP01 is fully done.

For each WP:

#### 2A) Build the task prompt queue for this WP

For each task ID from `tasks.md`, locate its prompt file under the feature directory, typically in:
- `tasks/planned/**/<TASK_ID>-*.md`
- or already in `tasks/doing/**/`, `tasks/for_review/**/`, `tasks/done/**/`

If a task is already in `done/`, treat it as complete and move on.

If you cannot map a task ID to a prompt file: ⛔ **STOP** and ask for the smallest clarification (naming/location).

#### 2B) For each task: run the full lifecycle to completion

For each task (in the WP-defined order), complete it before moving to the next task unless it is explicitly parallel-safe `[P]`.

##### Step 1) Review feedback gate (BLOCKING)

Open the task prompt file and check frontmatter:
- `review_status: has_feedback` → you MUST read `## Review Feedback` and treat Action Items as mandatory TODOs
- Set `review_status: acknowledged` when you begin addressing feedback
- If feedback is ignored, the task will be returned again

##### Step 2) Ensure task is in `doing/` (lane discipline)

If the task is currently in `planned/`, move it to `doing/` and commit the lane change.

Capture shell PID once per session (reuse it):
```bash
SHELL_PID=$(echo $$)
```

[IF SCRIPT_TYPE=powershell]
```powershell
$SHELL_PID = $PID
.\.kittify\scripts\powershell\tasks-move-to-lane.ps1 <FEATURE-SLUG> <TASK_ID> doing -ShellPid $SHELL_PID -Agent "<AGENT_ID>" -Note "Started implementation"
git status --short
git commit -m "Start <TASK_ID>: Move to doing lane"
```
[ENDIF]

[IF SCRIPT_TYPE=bash]
```bash
.kittify/scripts/bash/tasks-move-to-lane.sh <FEATURE-SLUG> <TASK_ID> doing \
  --shell-pid "$SHELL_PID" \
  --agent "<AGENT_ID>" \
  --note "Started implementation"
git status --short
git commit -m "Start <TASK_ID>: Move to doing lane"
```
[ENDIF]

Validation before coding:
- prompt file exists in `tasks/doing/...`
- frontmatter shows `lane: "doing"`, `agent`, `shell_pid`
- Activity Log has the “Started implementation” entry
- lane move is committed

If validation fails: ⛔ **STOP** and fix the workflow before implementing.

##### Step 3) Implement the task (small, safe steps)

- Read the entire prompt (Objective, Context, Guidance, DoD).
- Implement exactly what it asks for, nothing extra.
- Add/update tests for non-trivial behavior and regressions.
- Keep diffs minimal and reversible.
- Respect the plan’s architecture boundaries and integration points.

##### Step 4) Run checks (minimum bar)

Prefer repo-native commands. If unclear, run at minimum:

```bash
pytest
ruff check .
# run mypy only if configured in this repo
```

If any check fails:
- fix
- re-run
- do not proceed until green

##### Step 5) Move to `for_review/` and commit

Update Activity Log with a completion entry (timestamp, agent, shell_pid, lane=doing, note).

[IF SCRIPT_TYPE=powershell]
```powershell
.\.kittify\scripts\powershell\tasks-move-to-lane.ps1 <FEATURE-SLUG> <TASK_ID> for_review -ShellPid $SHELL_PID -Agent "<AGENT_ID>" -Note "Ready for review"
git status --short
git commit -m "Complete <TASK_ID>: Move to for_review lane"
```
[ENDIF]

[IF SCRIPT_TYPE=bash]
```bash
.kittify/scripts/bash/tasks-move-to-lane.sh <FEATURE-SLUG> <TASK_ID> for_review \
  --shell-pid "$SHELL_PID" \
  --agent "<AGENT_ID>" \
  --note "Ready for review"
git status --short
git commit -m "Complete <TASK_ID>: Move to for_review lane"
```
[ENDIF]

##### Step 6) Review immediately (self-review) and decide outcome

Conduct a structured review against:
- the task’s Definition of Done
- feature `spec.md` + `plan.md` + `tasks.md`
- correctness, tests, security, performance, and maintainability

Outcome A: ❌ Needs changes
1) Insert `## Review Feedback` immediately after frontmatter with:
```markdown
## Review Feedback

**Status**: ❌ **Needs Changes**

**Key Issues**:
1. [Issue 1] - Why it's a problem and what to do about it
2. [Issue 2] - Why it's a problem and what to do about it

**What Was Done Well**:
- [Positive note 1]
- [Positive note 2]

**Action Items** (must complete before re-review):
- [ ] Fix [specific thing 1]
- [ ] Add [missing thing 2]
- [ ] Verify [validation point 3]
```

2) Update frontmatter:
- `lane: "planned"`
- `review_status: "has_feedback"`
- `reviewed_by: "<AGENT_ID>"`
- clear `assignee` if needed

3) Append Activity Log entry for the review feedback (timestamp, reviewer agent, reviewer shell pid).

4) Move the prompt back to `planned/` and commit the move.

[IF SCRIPT_TYPE=powershell]
```powershell
.\.kittify\scripts\powershell\tasks-move-to-lane.ps1 <FEATURE-SLUG> <TASK_ID> planned -ShellPid $SHELL_PID -Agent "<AGENT_ID>" -Note "Code review complete: Needs changes"
git status --short
git commit -m "Review <TASK_ID>: Return to planned with feedback"
```
[ENDIF]

[IF SCRIPT_TYPE=bash]
```bash
.kittify/scripts/bash/tasks-move-to-lane.sh <FEATURE-SLUG> <TASK_ID> planned \
  --shell-pid "$SHELL_PID" \
  --agent "<AGENT_ID>" \
  --note "Code review complete: Needs changes"
git status --short
git commit -m "Review <TASK_ID>: Return to planned with feedback"
```
[ENDIF]

5) Immediately loop back to Step 1 for the SAME TASK_ID and address all Action Items.

Hard stop rule:
- If the same task reaches “Needs changes” twice: ⛔ **STOP** and report the smallest decision needed (with exact issues).

Outcome B: ✅ Approved
1) Use the dedicated approval command for correct reviewer attribution:

```bash
REVIEWER_AGENT="<AGENT_ID>"
REVIEWER_SHELL_PID=$$

python3 .kittify/scripts/tasks/tasks_cli.py approve <FEATURE-SLUG> <TASK_ID> \
  --review-status "approved without changes" \
  --reviewer-agent "$REVIEWER_AGENT" \
  --reviewer-shell-pid "$REVIEWER_SHELL_PID"
```

2) Mark the task as done in `tasks.md` using the repo helper script and verify the checkbox flips to `[x]` / `[X]`.

[IF SCRIPT_TYPE=powershell]
```powershell
.\.kittify\scripts\powershell\Set-TaskStatus.ps1 -TaskId <TASK_ID> -Status done
```
[ENDIF]

[IF SCRIPT_TYPE=bash]
```bash
.kittify/scripts/bash/mark-task-status.sh --task-id <TASK_ID> --status done
```
[ENDIF]

3) Commit any resulting changes if they are not already committed by the approval tooling:
```bash
git status --short
git commit -m "Approve <TASK_ID>: Mark done"
```

##### Step 7) Proceed to next task

Only proceed when:
- prompt is in `tasks/done/...`
- `tasks.md` shows the task as done
- checks are green

If blocked anywhere: ⛔ **STOP** and report:
- exact error output
- where it happened
- smallest decision needed

#### 2C) WP completion gate

Only proceed to the next WP when all tasks in the current WP are done and the WP acceptance criteria are satisfied.

### 3) Final report (concise)

At the end, output briefly:
- which WPs are complete
- how many tasks were approved and moved to done
- checks executed and status
- any blockers or deferred items

Do NOT run `/spec-kitty.accept` or `/spec-kitty.merge` unless the user explicitly instructs it.
