---
mode: agent
description: "Restructure code while preserving behavior and following TeamReel conventions"
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

# Refactor — TeamReel

This prompt triggers the refactoring workflow.

## Workflow

1. Read the **developer agent**: `.github/agents/developer.agent.md`
2. Also read the relevant instructions based on file location:
   - Frontend (`demo/src/**`): `.github/instructions/frontend.instructions.md`
   - Backend (`src/**`): `.github/instructions/backend.instructions.md`
   - CSS (`**/*.css`): `.github/instructions/css.instructions.md`
3. Follow the refactoring safety protocol:
   - Analyze current behavior before changing
   - Preserve all existing functionality
   - Run tests after each change
4. Commit with `refactor(<scope>): <description>`
