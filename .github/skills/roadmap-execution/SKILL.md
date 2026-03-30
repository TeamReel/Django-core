````skill
---
name: roadmap-execution
description: "Executes a roadmap phase end-to-end: reads the spec, plans tasks, implements code, verifies quality, and commits. Use when executing a roadmap, implementing a phase, or working through a spec."
compatibility: "Requires PowerShell terminal, git, Node.js (for frontend builds), Python/Django (for backend)."
metadata:
  author: teamreel
  argument-hint: "Roadmap number and phase (e.g. 'Roadmap #21 Phase H0')"
---

# Roadmap Execution Skill

Execute a roadmap phase from spec to production-ready code.

## Phase Execution Workflow

### Step 1: Read the Spec

Roadmap specs live in:
- Feature modules: `docs/roadmap/modules/ready/{number}-{code}-{name}/index.md` (or `active/` if already started)
- Phase specs: `phases/todo/H{n}_name.md` within the module folder

Each phase has two sections:
- **To do:** — checklist of tasks to implement
- **Done criteria:** — checklist of conditions that prove the phase is complete

Extract:
- **Phase name** and scope
- **To do items** — your implementation tasks
- **Done criteria** — what to verify after implementing
- **Dependencies** on previous phases

### Step 2: Research Current State

Before writing any code:
1. Read all files that will be modified
2. Search for patterns to reuse
3. Check UI primitives available in `demo/src/components/ui/`
4. Understand current data flow end-to-end
5. Identify risks or blockers

### Step 3: Create Task Plan

Use `manage_todo_list` to break the phase into specific tasks:

```
1. [Backend] Create/update model
2. [Backend] Add serializer + viewset
3. [Frontend] Create component(s)
4. [Frontend] Wire up API adapter
5. [Frontend] Add page/route
6. [Verify] Type check + build
7. [Commit] Conventional commit + push
```

### Step 4: Implement

Execute each task following conventions:
- **Backend**: Org-scoped, `select_related`, safe migrations
- **Frontend**: TypeScript strict, CSS Modules + tokens, a11y
- Mark tasks in-progress → completed as you go

### Step 5: Verify

```powershell
# Frontend
Push-Location demo
npx tsc --noEmit    # Zero type errors
npx vite build      # Build succeeds
Pop-Location

# Backend
Push-Location src
python manage.py check       # System check
python manage.py migrate     # Migrations apply
pytest                       # Tests pass
Pop-Location
```

### Step 6: Commit

```powershell
git add -A
git commit -m "feat(<scope>): <description>

- Detail 1
- Detail 2

Roadmap #XX Phase HY"

git push origin main
```

### Step 7: Update Spec & Move to Done

After each phase, update the spec:
1. Check off completed "To do" items (`- [x]`)
2. Check off satisfied "Done criteria" (`- [x]`)

After ALL phases of a module are complete:
```powershell
# Move module from active to done
git mv docs/roadmap/modules/active/{folder}/ docs/roadmap/modules/done/
git commit -m "docs: move module to done"
git push
```

## Phase Naming Convention

| Phase | Purpose |
|-------|---------|
| H0 | Foundation — models, types, basic structure |
| H1 | Core features — main functionality |
| H2 | UI polish — responsive, a11y, animations |
| H3 | Integration — connect frontend <> backend |
| H4 | Advanced — edge cases, performance |
| H5 | Final — lazy loading, a11y audit, bundle optimization |

## Quality Gates (must pass before commit)

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vite build` — builds successfully
- [ ] No `any` types introduced
- [ ] All new interactive elements are keyboard accessible
- [ ] Design tokens only (no hardcoded values)
- [ ] Mobile layout works (no overflow)
- [ ] Dark mode tokens used (no hardcoded colors)

````
