---
work_package_id: "WP10"
subtasks:
  - "T055"
  - "T056"
  - "T057"
  - "T058"
  - "T059"
  - "T060"
  - "T061"
title: "Polish & Integration"
phase: "Phase 4 - Integration"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-01-30T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP10 – Polish & Integration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

1. Create unified sport-config navigation
2. Add E2E tests for critical paths
3. Verify integration with B07 Projects
4. Create seed data script for demo
5. Update documentation
6. Final code quality pass

**Success Test**: All pages accessible from unified nav. E2E tests pass. Demo works end-to-end.

## Context & Constraints

- **Constitution**: Follow `.kittify/memory/constitution.md` principles
- **Dependencies**: All previous WPs (WP01-WP09)
- **Integration Points**: B07 Projects, B30 Activities, B31 Content Templates
- **Constraints**:
  - No seed data in migrations
  - Separate seed script for demo
  - Documentation in both code and docs/

## Subtasks & Detailed Guidance

### T055 – Create sport-config navigation component
- **Purpose**: Unified sub-navigation for sport-config pages
- **Steps**:
  1. Create `demo/src/components/sport-config/SportConfigNav.tsx`:
     ```typescript
     import { NavLink } from 'react-router-dom';

     const NAV_ITEMS = [
       { path: '/sport-config', label: '⚽ Sports', exact: true },
       { path: '/sport-config/outfits', label: '👕 Outfits' },
       { path: '/sport-config/positions', label: '📍 Positions' },
       { path: '/sport-config/validation', label: '✅ Validation' },
     ];

     export function SportConfigNav() {
       return (
         <nav className="bg-gray-100 border-b mb-6">
           <div className="container mx-auto">
             <ul className="flex">
               {NAV_ITEMS.map(item => (
                 <li key={item.path}>
                   <NavLink
                     to={item.path}
                     end={item.exact}
                     className={({ isActive }) =>
                       `block px-4 py-3 text-sm font-medium transition ${
                         isActive
                           ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                           : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                       }`
                     }
                   >
                     {item.label}
                   </NavLink>
                 </li>
               ))}
             </ul>
           </div>
         </nav>
       );
     }
     ```
  2. Create layout wrapper `demo/src/pages/sport-config/SportConfigLayout.tsx`:
     ```typescript
     import { Outlet } from 'react-router-dom';
     import { SportConfigNav } from '../../components/sport-config/SportConfigNav';

     export function SportConfigLayout() {
       return (
         <div>
           <SportConfigNav />
           <Outlet />
         </div>
       );
     }
     ```
  3. Update App.tsx to use nested routes:
     ```typescript
     {
       path: '/sport-config',
       element: <SportConfigLayout />,
       children: [
         { index: true, element: <SportsPage /> },
         { path: 'outfits', element: <OutfitsPage /> },
         { path: 'positions', element: <PositionsPage /> },
         { path: 'validation', element: <ValidationPage /> },
       ]
     }
     ```
- **Files**: `demo/src/components/sport-config/SportConfigNav.tsx`, `demo/src/pages/sport-config/SportConfigLayout.tsx`, `demo/src/App.tsx`
- **Parallel?**: Yes

### T056 – Create seed data script
- **Purpose**: Populate demo with sample sports
- **Steps**:
  1. Create `scripts/seed_sports.py`:
     ```python
     """
     Seed script for sport configuration demo data.
     Run with: python manage.py runscript seed_sports
     """
     from sport_configuration.models import Sport, SportConfiguration

     SPORTS_DATA = [
         {
             'name': 'Football (11v11)',
             'slug': 'football-11',
             'sport_icon': '⚽',
             'config': {
                 'team_size_min': 11,
                 'team_size_max': 11,
                 'max_substitutes': 7,
                 'positions': ['GK', 'LB', 'CB', 'RB', 'LWB', 'RWB', 'DM', 'CM', 'AM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'],
                 'formations': {
                     '4-3-3': {'defenders': 4, 'midfielders': 3, 'forwards': 3},
                     '4-4-2': {'defenders': 4, 'midfielders': 4, 'forwards': 2},
                     '3-5-2': {'defenders': 3, 'midfielders': 5, 'forwards': 2},
                 },
                 'outfit_types': ['home', 'away', 'goalkeeper', 'third_kit'],
                 'has_goalkeeper': True,
             }
         },
         {
             'name': 'Futsal (5v5)',
             'slug': 'futsal-5',
             'sport_icon': '⚽',
             'config': {
                 'team_size_min': 5,
                 'team_size_max': 5,
                 'max_substitutes': 7,
                 'positions': ['GK', 'FIXO', 'ALA', 'PIVOT'],
                 'formations': {
                     '1-2-2': {'defenders': 1, 'midfielders': 2, 'forwards': 2},
                     '2-2': {'defenders': 2, 'forwards': 2},
                 },
                 'outfit_types': ['home', 'away', 'goalkeeper'],
                 'has_goalkeeper': True,
             }
         },
         {
             'name': 'Handball',
             'slug': 'handball',
             'sport_icon': '🤾',
             'config': {
                 'team_size_min': 7,
                 'team_size_max': 7,
                 'max_substitutes': 7,
                 'positions': ['GK', 'LW', 'LB', 'CB', 'RB', 'RW', 'P'],
                 'formations': {
                     '6-0': {'defenders': 6, 'forwards': 0},
                     '5-1': {'defenders': 5, 'forwards': 1},
                 },
                 'outfit_types': ['home', 'away', 'goalkeeper'],
                 'has_goalkeeper': True,
             }
         },
         {
             'name': 'Basketball',
             'slug': 'basketball',
             'sport_icon': '🏀',
             'config': {
                 'team_size_min': 5,
                 'team_size_max': 5,
                 'max_substitutes': 7,
                 'positions': ['PG', 'SG', 'SF', 'PF', 'C'],
                 'formations': {},
                 'outfit_types': ['home', 'away'],
                 'has_goalkeeper': False,
             }
         },
     ]


     def run():
         for sport_data in SPORTS_DATA:
             config_data = sport_data.pop('config')

             sport, created = Sport.objects.update_or_create(
                 slug=sport_data['slug'],
                 defaults=sport_data
             )
             print(f"{'Created' if created else 'Updated'} sport: {sport.name}")

             SportConfiguration.objects.update_or_create(
                 sport=sport,
                 defaults=config_data
             )
             print(f"  -> Configuration set")
     ```
  2. Ensure `django-extensions` is installed for `runscript`
  3. Document in README how to run seed script
- **Files**: `scripts/seed_sports.py`
- **Parallel?**: Yes

### T057 – Write E2E tests
- **Purpose**: End-to-end tests for critical flows
- **Steps**:
  1. Create `demo/tests/sport-config.spec.ts`:
     ```typescript
     import { test, expect } from '@playwright/test';

     test.describe('Sport Configuration', () => {
       test.beforeEach(async ({ page }) => {
         // Login if needed
         await page.goto('/sport-config');
       });

       test('can view sports list', async ({ page }) => {
         await expect(page.getByRole('heading', { name: 'Sports Configuration' })).toBeVisible();
         // Check for at least one sport card
         await expect(page.locator('[data-testid="sport-card"]').first()).toBeVisible();
       });

       test('can navigate to outfits page', async ({ page }) => {
         await page.click('text=Outfits');
         await expect(page).toHaveURL('/sport-config/outfits');
         await expect(page.getByRole('heading', { name: 'Outfit Configurations' })).toBeVisible();
       });

       test('can run validation', async ({ page }) => {
         await page.click('text=Validation');
         await page.selectOption('select', { label: 'Football (11v11)' });
         await page.fill('input[type="number"]', '8');
         await page.click('text=Validate Team Size');

         // Should see warning about team being too small
         await expect(page.locator('text=TEAM_TOO_SMALL')).toBeVisible();
       });

       test('positions page shows position grid', async ({ page }) => {
         await page.click('text=Positions');
         await page.click('button:has-text("Football")');

         // Should see position badges
         await expect(page.locator('text=GK')).toBeVisible();
         await expect(page.locator('text=ST')).toBeVisible();
       });
     });
     ```
- **Files**: `demo/tests/sport-config.spec.ts`
- **Parallel?**: Yes

### T058 – Verify B07 Projects integration
- **Purpose**: Ensure sport FK on Project works correctly
- **Steps**:
  1. Test that Project.sport FK works:
     ```python
     # In Django shell or test
     from projects.models import Project
     from sport_configuration.models import Sport

     sport = Sport.objects.get(slug='football-11')
     club = Project.objects.create(name='Test Club', sport=sport)
     team = Project.objects.create(name='Test Team', parent_project=club)

     assert team.get_sport() == sport  # Inherits from parent
     ```
  2. Add test case in `tests/sport_configuration/test_integration.py`:
     ```python
     import pytest
     from projects.models import Project
     from sport_configuration.models import Sport, SportConfiguration

     @pytest.mark.django_db
     class TestProjectSportIntegration:
         def test_project_sport_inheritance(self):
             sport = Sport.objects.create(name='Football', slug='football')
             SportConfiguration.objects.create(sport=sport)

             club = Project.objects.create(name='Club', sport=sport)
             team = Project.objects.create(name='Team', parent_project=club)

             assert club.get_sport() == sport
             assert team.get_sport() == sport

         def test_team_can_override_sport(self):
             football = Sport.objects.create(name='Football', slug='football')
             futsal = Sport.objects.create(name='Futsal', slug='futsal')

             club = Project.objects.create(name='Club', sport=football)
             team = Project.objects.create(name='Futsal Team', parent_project=club, sport=futsal)

             assert club.get_sport() == football
             assert team.get_sport() == futsal  # Overridden
     ```
- **Files**: `tests/sport_configuration/test_integration.py`
- **Parallel?**: Yes

### T059 – Update documentation
- **Purpose**: Document the sport configuration module
- **Steps**:
  1. Update `documents/04-modules/sport-configuration.md`:
     - Module overview
     - API endpoints
     - Data model diagram
     - Usage examples
     - Integration points
  2. Update `documents/02-roadmap/` with B32 completion
  3. Add migration notes if needed
  4. Update `README.md` in `src/sport_configuration/`
- **Files**: `documents/04-modules/sport-configuration.md`, `src/sport_configuration/README.md`
- **Parallel?**: Yes

### T060 – Code quality pass
- **Purpose**: Ensure code meets quality standards
- **Steps**:
  1. Run linting:
     ```bash
     ruff check src/sport_configuration/
     ruff format src/sport_configuration/
     ```
  2. Run type checking:
     ```bash
     mypy src/sport_configuration/
     ```
  3. Run tests with coverage:
     ```bash
     pytest tests/sport_configuration/ --cov=sport_configuration --cov-report=html
     ```
  4. Fix any issues found
  5. Ensure coverage is ≥80%
- **Files**: Various in `src/sport_configuration/`
- **Parallel?**: No (run after other tasks)

### T061 – Final review and PR preparation
- **Purpose**: Prepare for merge
- **Steps**:
  1. Review all changes:
     ```bash
     git diff main...HEAD --stat
     ```
  2. Ensure all tests pass:
     ```bash
     pytest
     npm run test --prefix demo
     ```
  3. Update CHANGELOG.md with B32 entry
  4. Create PR description with:
     - Summary of changes
     - Breaking changes (none expected)
     - Migration steps
     - Demo screenshots
  5. Mark all tasks as complete in tasks.md
  6. Update spec.md status to "Ready for Review"
- **Files**: `CHANGELOG.md`, `kitty-specs/041-sport-configuration-templates/spec.md`
- **Parallel?**: No (final task)

## Definition of Done Checklist

- [ ] Sport-config navigation component
- [ ] Layout with nested routes
- [ ] Seed data script working
- [ ] E2E tests for critical paths
- [ ] B07 integration verified
- [ ] Documentation updated
- [ ] Code quality pass (lint, types, coverage)
- [ ] CHANGELOG updated
- [ ] PR prepared
- [ ] All tasks marked complete
- [ ] `tasks.md` updated with completion status

## Review Guidance

- Verify navigation works on mobile
- Check E2E tests are reliable (no flaky tests)
- Ensure seed data is idempotent
- Review documentation for accuracy
- Verify coverage meets threshold

## Activity Log

- 2026-01-30T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
