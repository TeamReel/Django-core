import { test, expect, assertPageLoaded, assertSeedDataCounts, assertRoleBasedUI } from '../fixtures';

test.describe('Projects Page', () => {
  test('should load projects list for admin', async ({ adminPage }) => {
    await adminPage.goto('/identity/projects');
    await assertPageLoaded(adminPage, 'Projects');

    // Should show projects table with seed data (80+ projects expected)
    await assertSeedDataCounts(adminPage, 'projects', 20); // At least 20 visible

    // Admin should see create/edit actions
    await assertRoleBasedUI(adminPage, 'create');
    await assertRoleBasedUI(adminPage, 'edit');
  });

  test('should support organisation scoping', async ({ adminPage }) => {
    await adminPage.goto('/identity/projects');
    await assertPageLoaded(adminPage);

    // Projects should be scoped to current organisation context
    const contextSwitcher = adminPage.locator('[data-testid="context-switcher"]');
    await expect(contextSwitcher).toBeVisible();

    // Should show organisation-specific projects
    await assertSeedDataCounts(adminPage, 'projects', 5);
  });

  test('should support pagination', async ({ adminPage }) => {
    await adminPage.goto('/identity/projects');
    await assertPageLoaded(adminPage);

    const pagination = adminPage.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      // Check page navigation
      const nextButton = adminPage.locator('[data-testid="next-page"]');
      if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
        await nextButton.click();

        // Should update URL with page parameter
        await expect(adminPage.url()).toContain('page=2');

        // Should still show data
        await assertSeedDataCounts(adminPage, 'projects', 1);
      }
    }
  });

  test('should show member permissions correctly', async ({ memberPage }) => {
    await memberPage.goto('/identity/projects');
    await assertPageLoaded(memberPage, 'Projects');

    // Member should see projects but limited actions
    await assertSeedDataCounts(memberPage, 'projects', 5);

    // Check role-based UI
    await assertRoleBasedUI(memberPage, 'create');
  });

  test('should navigate to project detail', async ({ adminPage }) => {
    await adminPage.goto('/identity/projects');
    await assertPageLoaded(adminPage);

    // Click first project link
    const firstProjectLink = adminPage.locator('[data-testid="project-link"]').first();
    if (await firstProjectLink.isVisible()) {
      await firstProjectLink.click();

      // Should navigate to project detail page
      await adminPage.waitForURL(/\/identity\/projects\/\d+/);
      await assertPageLoaded(adminPage, 'Project');
    }
  });
});
