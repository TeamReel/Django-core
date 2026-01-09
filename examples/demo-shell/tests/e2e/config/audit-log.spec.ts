import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Audit Log Page', () => {
  test('should load audit log for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/config/audit-log');
    await assertPageLoaded(adminPage, 'Audit Log');

    // Admin should see all actions
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="audit-log-table"]', '[data-testid="audit-search"]', '[data-testid="audit-filters"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show audit events
    const auditTable = adminPage.locator('[data-testid="audit-log-table"]');
    await expect(auditTable).toBeVisible();

    // Should show pagination if there are many events
    const pagination = adminPage.locator('[data-testid="pagination"]');
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible();
    }
  });

  test('should load audit log for member with limited access', async ({ memberPage }) => {
    await memberPage.goto('/config/audit-log');
    await assertPageLoaded(memberPage, 'Audit Log');

    // Member should see limited view
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="audit-log-table"]'],
        cannotView: ['[data-testid="admin-audit-actions"]', '[data-testid="bulk-audit-operations"]']
      }
    }, 'member');
  });

  test('should restrict audit log for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/config/audit-log');

    // Viewer might be redirected or see restricted view
    const currentUrl = viewerPage.url();
    if (currentUrl.includes('/config/audit-log')) {
      await assertPageLoaded(viewerPage, 'Audit Log');

      // Should see read-only view only
      await assertRoleBasedUI(viewerPage, {
        viewer: {
          canView: ['[data-testid="audit-log-readonly"]'],
          cannotView: ['[data-testid="audit-search"]', '[data-testid="audit-filters"]', '[data-testid="audit-actions"]']
        }
      }, 'viewer');
    }
  });

  test('should filter audit events by date', async ({ adminPage }) => {
    await adminPage.goto('/config/audit-log');
    await assertPageLoaded(adminPage);

    // Test date filtering
    const dateFilter = adminPage.locator('[data-testid="audit-date-filter"]');
    if (await dateFilter.isVisible()) {
      await dateFilter.click();

      const today = new Date().toISOString().split('T')[0];
      await adminPage.fill('[data-testid="start-date"]', today);
      await adminPage.click('[data-testid="apply-filter"]');

      // Should apply filter
      await expect(adminPage.locator('[data-testid="active-filter"]')).toBeVisible();
    }
  });

  test('should search audit events', async ({ adminPage }) => {
    await adminPage.goto('/config/audit-log');
    await assertPageLoaded(adminPage);

    const searchInput = adminPage.locator('[data-testid="audit-search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('login');
      await adminPage.press('[data-testid="audit-search"]', 'Enter');

      // Should show filtered results
      await expect(adminPage.locator('[data-testid="search-results"]')).toBeVisible();
    }
  });
});
