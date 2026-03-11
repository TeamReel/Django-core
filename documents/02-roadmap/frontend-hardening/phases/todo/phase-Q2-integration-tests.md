# Q2 — Integration Tests

**Status:** 🔲 Todo
**Effort:** 8 uur
**Scope:** +20 integration test files voor user flows

---

## Doel

Test de belangrijkste user flows end-to-end (component + hook + routing) met integration tests.

## Current State

- Huidige tests zijn unit tests: component óf hook in isolatie
- Geen tests voor complete user flows (form → submit → redirect)
- Geen tests voor multi-step wizards
- Geen tests voor CRUD flows

## Target Flows

### Authentication (~3 files)
| Flow | Test Scenario |
|------|---------------|
| Login → Dashboard | Credentials → redirect, error handling |
| Register → Login | Form submit → success → redirect |
| Logout → Login | Sign out → redirect to login |

### CRUD Operations (~6 files)
| Flow | Test Scenario |
|------|---------------|
| Create Project | Open modal → fill form → submit → appears in list |
| Edit User | Open detail → edit → save → updated |
| Delete Season | Select → confirm → removed from list |
| Invite Member | Modal → email → role → submit |
| Create Activity | Wizard steps → match details → save |
| Content Generation | Select template → configure → generate |

### Navigation (~4 files)
| Flow | Test Scenario |
|------|---------------|
| Breadcrumb navigation | Click breadcrumb → correct page |
| Context switching | Switch org → data refreshes |
| Search → Result | Type query → see results → click → detail page |
| Back navigation | Navigate deep → back → correct page |

### Multi-step Wizards (~3 files)
| Flow | Test Scenario |
|------|---------------|
| Match Wizard | Step 1 → 2 → 3 → submit |
| Content Generation Wizard | Members → template → preview → generate |
| Batch Generation | Select items → configure → execute |

### Filters & Lists (~4 files)
| Flow | Test Scenario |
|------|---------------|
| Directory filtering | Apply filters → list updates → clear → reset |
| Approvals workflow | Filter by status → approve → status changes |
| Media library browse | Category → type → search → results |
| Season squad management | Add member → assign role → save |

## Aanpak

1. Use `renderWithProviders` met echte (niet gemockte) child components
2. Mock alleen API layer (`installFetchMock` met realistic responses)
3. Use `userEvent` (niet `fireEvent`) voor realistic user interactions
4. Test volledige flow van user action → state change → DOM update

```tsx
// Pattern
it('creates a project via modal', async () => {
  const user = userEvent.setup();
  installFetchMock([
    { url: '/api/projects/', method: 'GET', body: [] },
    { url: '/api/projects/', method: 'POST', body: { id: '1', name: 'New' } },
  ]);

  renderWithProviders(<ProjectsPage />);

  await user.click(screen.getByRole('button', { name: 'Create Project' }));
  await user.type(screen.getByLabelText('Name'), 'New Project');
  await user.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByText('New Project')).toBeInTheDocument();
});
```

## Verificatie

- [ ] +20 integration test files
- [ ] Key user flows covered (auth, CRUD, nav, wizards, filters)
- [ ] File coverage ratio ≥ 40%
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
