# Q2 — Integration Tests

**Status:** ✅ Done
**Effort:** 8 uur
**Scope:** +23 integration test files voor user flows

---

## Resultaat

23 integration test files covering all target categories:

### Authentication (4 files)
| File | Tests | Flows |
|------|-------|-------|
| LoginPage.integration.test.tsx | 4 | Credentials → redirect, error handling |
| RegisterPage.integration.test.tsx | 6 | Form submit → validation → feedback |
| LogoutFlow.integration.test.tsx | 2 | Sign out → navigate to login |
| InviteMemberModal.integration.test.tsx | 5 | Email → role → submit → API call |

### CRUD Operations (5 files)
| File | Tests | Flows |
|------|-------|-------|
| MatchCreateModal.integration.test.tsx | 5 | Open modal → form fields → submit |
| EntityEditModal.integration.test.tsx | 4 | Open → edit entity → save |
| AssetGenerationModal.integration.test.tsx | 5 | Template select → configure → generate |
| WorkflowActionButtons.integration.test.tsx | 4 | Approve/reject → comment dialog |
| ApprovalsWorkflowList.integration.test.tsx | 4 | Render instances → status → actions |

### Navigation (4 files)
| File | Tests | Flows |
|------|-------|-------|
| BreadcrumbNav.integration.test.tsx | 5 | iOS-style back navigation |
| NavigationFlow.integration.test.tsx | 4 | Breadcrumb + sidebar navigation |
| SearchBar.integration.test.tsx | 4 | Type query → results panel |
| Sidebar.integration.test.tsx | 4 | Panel sections → nav links |

### Multi-step Wizards (4 files)
| File | Tests | Flows |
|------|-------|-------|
| MatchWizard.integration.test.tsx | 4 | Match selection → content steps |
| CreateWizard.integration.test.tsx | 3 | Flow selection → sub-flow render |
| ContentFlow.integration.test.tsx | 4 | Wizard shell → smart match → content |
| MatchCreateFlow.integration.test.tsx | 2 | Choose → details → confirm steps |

### Pages & Filters (6 files)
| File | Tests | Flows |
|------|-------|-------|
| DashboardPage.integration.test.tsx | 4 | Welcome msg → cards → feed |
| ApprovalsPage.integration.test.tsx | 3 | Filter tabs → workflow content |
| MediaLibraryPage.integration.test.tsx | 4 | Search → filter → asset cards |
| DirectoryFilterBar.integration.test.tsx | 5 | Sport/role/status → clear filters |
| MobileBottomNav.integration.test.tsx | 4 | Bottom nav → route links |
| MemberAddFlow.integration.test.tsx | 2 | Wizard shell → member steps |

## Statistieken

| Metric | Value |
|--------|-------|
| Integration test files | 23 (target: 20) |
| Integration tests | 91 |
| Total test files | 187 |
| Total tests | 892 |
| `tsc --noEmit` | ✅ clean |
| `vitest run` | ✅ all green |

## Verificatie

- [x] +20 integration test files (23 created)
- [x] Key user flows covered (auth, CRUD, nav, wizards, filters)
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green
