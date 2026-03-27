---
mode: agent
description: "Debug issues across Django backend and React frontend"
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

# Debug — TeamReel

This prompt triggers the debugging workflow.

## Workflow

1. Read the **developer agent**: `.github/agents/developer.agent.md`
2. Follow a 4-step diagnosis framework:
   - **Classify**: Frontend / Backend / Full-stack / Infra
   - **Gather Evidence**: Read errors, logs, related code
   - **Fix**: Apply minimal targeted fix
   - **Verify**: Run `npx tsc --noEmit` + `npx vite build` (frontend) or `pytest` (backend)
3. Also read instructions based on the affected layer:
   - Frontend (`demo/src/**`): `.github/instructions/frontend.instructions.md`
   - Backend (`src/**`): `.github/instructions/backend.instructions.md`

## Data Hierarchy Context
```
Organisation → Project (club/team, nested via parent_project)
  → BrandProfile (inherits from parent)
  → Period (season/competition, nested via parent_period)
    → Activity (match/training/event)
      → ActivityParticipation (members + roles)
  → Members (players, coaches, staff)
```
