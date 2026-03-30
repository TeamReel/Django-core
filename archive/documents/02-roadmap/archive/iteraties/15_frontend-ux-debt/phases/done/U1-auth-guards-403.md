# U1 — Auth Guards → /403 ForbiddenPage ✅

**Track:** U — UX Correctness
**Effort:** 1 uur
**Status:** ✅ Done

## Resultaat

3 guards (`AdminOnlyRoute`, `OrgAdminRoute`, `SecurityRoute`): silent redirect → dashboard vervangen door redirect naar `/403?from=<pathname>`.
ForbiddenPage enhanced: leest `?from=` param, toont context ("You don't have permission to access `/flags`").
`.path` CSS class toegevoegd voor monospace styling.
