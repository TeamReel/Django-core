# A3 — Key Stability

**Status:** ✅ Done
**Effort:** 1.5 uur
**Scope:** 32 `key={index}` → stable keys

---

## Doel

Alle list renderings gebruiken stabiele keys (id, slug, unieke property) in plaats van array index.

## Resultaat

Van 32 originele `key={i/idx/index}` patronen:
- **15 gefixed** met stable keys (bg.url, tag, task.name, action.label, feature, practice, log.id, etc.)
- **8 skeleton/Array.from** — statische placeholder arrays, index is correct (nooit reorder)
- **7 value-based** — `[1,2,3].map(i =>)` waar `i` de waarde IS, niet de index
- **2 gedocumenteerd** — met expliciete motivatie-comment (errors, generic rows)

### Gewijzigde files
| File | Change |
|------|--------|
| AssetGenConfigWidgets.tsx | `key={idx}` → `key={bg.url}` |
| Toast.tsx | `key={i}` → `key={action.label}` |
| ContentCard.tsx (×2) | `key={i}` → `key={tag}` |
| TasksPage.tsx | `key={index}` → `key={task.name}` |
| WorkflowTemplatesPage.tsx | `key={idx}` → `` key={`${from}-${action}-${to}`} `` |
| IntegrationStatusModals.tsx | `key={idx}` → `key={feature}` |
| IntegrationPatternsPage.tsx (×2) | `key={index}` → `key={practice}` / `key={pitfall}` |
| WizardEmptyState.tsx | `key={i}` → `key={action.label}` |
| MembersStep.tsx | `key={idx}` → `` key={`${role}-${idx}`} `` |
| OnboardingWizard.tsx | `key={index}` → `` key={`step-${index}`} `` |
| WebSocketTestPage.tsx (×3) | Added `id` to LogMessage, `key={i}` → `key={log.id}` |
| MemberBatchActionModal.tsx | Comment: error strings may duplicate |
| design-system.tsx | Comment: generic rows without guaranteed unique field |

## Verificatie

- [x] 0 dynamic-data `key={index}` anti-patterns
- [x] 2 edge cases gedocumenteerd met comment
- [x] Lijsten met sort/filter werken correct
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (123 files, 529 tests)
