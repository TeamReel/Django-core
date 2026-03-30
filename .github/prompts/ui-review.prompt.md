---
mode: agent
description: "Review UI for accessibility, design tokens, mobile, dark mode, consistency"
tools:
  - semantic_search
  - grep_search
  - read_file
  - run_in_terminal
  - get_errors
  - manage_todo_list
---

# UI Review — TeamReel

This prompt triggers the UI review workflow.

## Workflow

1. Read the **canonical workflow**: `.github/skills/ui-review/SKILL.md`
2. Also read: `.github/instructions/frontend.instructions.md` + `.github/instructions/css.instructions.md`
3. Follow the skill's 5-dimension audit (tokens, a11y, motion, mobile, dark mode)
4. Use the skill's output format (summary table + issues table + passing items)

## Reference Documents
- Component library: `docs/frontend/component-library.md`
- CSS architecture: `docs/frontend/css-architecture.md`
- Theming: `docs/frontend/theming.md`
- Mobile patterns: `docs/frontend/mobile-patterns.md`
