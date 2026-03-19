---
mode: agent
description: "Build a backend module from spec — discovery, convention check, phased implementation, verification. Usage: 'build module B62' or 'implementeer B50'"
tools:
  - semantic_search
  - grep_search
  - read_file
  - replace_string_in_file
  - create_file
  - run_in_terminal
  - get_errors
  - manage_todo_list
---

# Build Backend Module — TeamReel

This prompt triggers the module builder pipeline.

## Input
```
$ARGUMENTS
```

## Workflow

1. Read the **canonical workflow**: `.github/skills/backend-module/SKILL.md`
2. Read conventions: `.github/instructions/backend.instructions.md`
3. Follow the skill's 4 quality gates exactly:
   - **Gate 0**: Discovery — read spec, check for ambiguity, clarify
   - **Gate 1**: Convention check — validate against TeamReel patterns
   - **Gate 2**: Phase plan — auto-split, show to user, wait for confirmation
   - **Gate 3**: Verification — `manage.py check`, `makemigrations --check`, `pytest`
   - **Gate 4**: Update spec — mark as implemented
4. Use code templates from `.github/skills/backend-module/templates/`
5. Reference architecture: `src/activities/` (gold standard)
