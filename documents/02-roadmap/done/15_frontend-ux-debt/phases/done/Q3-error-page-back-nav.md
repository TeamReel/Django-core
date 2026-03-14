# Q3 — Error Page Back Navigation ✅

**Track:** Q — Quick Fixes
**Effort:** 15 min
**Status:** ✅ Done

## Resultaat

NotFoundPage + ForbiddenPage: `window.history.back()` → `window.history.length > 1 ? navigate(-1) : navigate(routes.dashboard())`.
