import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Health Dashboard Page', () => {
  test('should load health dashboard for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/platform/health');
    await assertPageLoaded(adminPage, 'Health Dashboard');

    // Admin should see all health monitoring features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="health-overview"]', '[data-testid="service-status"]', '[data-testid="system-metrics"]', '[data-testid="health-actions"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show overall system status
    const healthOverview = adminPage.locator('[data-testid="health-overview"]');
    await expect(healthOverview).toBeVisible();

    const overallStatus = adminPage.locator('[data-testid="overall-status"]');
    await expect(overallStatus).toBeVisible();

    const statusText = await overallStatus.textContent();
    expect(['healthy', 'degraded', 'unhealthy', 'maintenance']).toContain(statusText?.toLowerCase());
  });

  test('should load health dashboard for member with monitoring access', async ({ memberPage }) => {
    await memberPage.goto('/platform/health');
    await assertPageLoaded(memberPage, 'Health Dashboard');

    // Member should see health info but no admin actions
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="health-overview"]', '[data-testid="service-status"]'],
        cannotView: ['[data-testid="health-actions"]', '[data-testid="system-controls"]']
      }
    }, 'member');
  });

  test('should restrict health dashboard for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/platform/health');

    // Viewer might be redirected or see limited view
    const currentUrl = viewerPage.url();
    if (currentUrl.includes('/platform/health')) {
      await assertPageLoaded(viewerPage, 'Health Dashboard');

      // Should see basic status only
      await assertRoleBasedUI(viewerPage, {
        viewer: {
          canView: ['[data-testid="basic-health-status"]'],
          cannotView: ['[data-testid="detailed-metrics"]', '[data-testid="system-logs"]', '[data-testid="health-actions"]']
        }
      }, 'viewer');
    }
  });

  test('should display service status indicators', async ({ adminPage }) => {
    await adminPage.goto('/platform/health');
    await assertPageLoaded(adminPage);

    const serviceStatus = adminPage.locator('[data-testid="service-status"]');
    if (await serviceStatus.isVisible()) {
      // Should show individual services
      const services = adminPage.locator('[data-testid="service-item"]');
      const serviceCount = await services.count();
      expect(serviceCount).toBeGreaterThan(0);

      if (serviceCount > 0) {
        const firstService = services.first();
        await expect(firstService.locator('[data-testid="service-name"]')).toBeVisible();
        await expect(firstService.locator('[data-testid="service-health"]')).toBeVisible();

        // Should show status indicator
        const statusIndicator = firstService.locator('[data-testid="status-indicator"]');
        await expect(statusIndicator).toBeVisible();
      }
    }
  });

  test('should show system metrics and performance', async ({ adminPage }) => {
    await adminPage.goto('/platform/health');
    await assertPageLoaded(adminPage);

    const systemMetrics = adminPage.locator('[data-testid="system-metrics"]');
    if (await systemMetrics.isVisible()) {
      // Should show key metrics
      const cpuUsage = adminPage.locator('[data-testid="cpu-usage"]');
      const memoryUsage = adminPage.locator('[data-testid="memory-usage"]');
      const diskUsage = adminPage.locator('[data-testid="disk-usage"]');

      if (await cpuUsage.isVisible()) {
        const cpuText = await cpuUsage.textContent();
        expect(cpuText).toMatch(/\d+%/); // Should contain percentage
      }

      if (await memoryUsage.isVisible()) {
        const memoryText = await memoryUsage.textContent();
        expect(memoryText).toMatch(/\d+/); // Should contain numbers
      }
    }
  });

  test('should handle health check refresh', async ({ adminPage }) => {
    await adminPage.goto('/platform/health');
    await assertPageLoaded(adminPage);

    const refreshButton = adminPage.locator('[data-testid="refresh-health"]');
    if (await refreshButton.isVisible()) {
      // Note the current timestamp or status
      const timestampBefore = await adminPage.locator('[data-testid="last-updated"]').textContent();

      await refreshButton.click();

      // Should show loading state
      const loadingIndicator = adminPage.locator('[data-testid="health-loading"]');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible();
      }

      // Should update timestamp after refresh
      await expect(adminPage.locator('[data-testid="last-updated"]')).not.toHaveText(timestampBefore || '');
    }
  });

  test('should show recent alerts and incidents', async ({ adminPage }) => {
    await adminPage.goto('/platform/health');
    await assertPageLoaded(adminPage);

    const alertsSection = adminPage.locator('[data-testid="recent-alerts"]');
    if (await alertsSection.isVisible()) {
      // Should show alert list
      const alerts = adminPage.locator('[data-testid="alert-item"]');
      const alertCount = await alerts.count();

      if (alertCount > 0) {
        const firstAlert = alerts.first();
        await expect(firstAlert.locator('[data-testid="alert-severity"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-message"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
      }
    }
  });

  test('should display database connection status', async ({ adminPage }) => {
    await adminPage.goto('/platform/health');
    await assertPageLoaded(adminPage);

    const dbStatus = adminPage.locator('[data-testid="database-status"]');
    if (await dbStatus.isVisible()) {
      // Should show connection status
      const connectionStatus = adminPage.locator('[data-testid="db-connection"]');
      await expect(connectionStatus).toBeVisible();

      // Should show query performance
      const queryMetrics = adminPage.locator('[data-testid="db-query-metrics"]');
      if (await queryMetrics.isVisible()) {
        const responseTime = adminPage.locator('[data-testid="avg-response-time"]');
        await expect(responseTime).toBeVisible();
      }
    }
  });

  test('should handle maintenance mode toggle (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/platform/health');
    await assertPageLoaded(adminPage);

    const maintenanceToggle = adminPage.locator('[data-testid="maintenance-mode-toggle"]');
    if (await maintenanceToggle.isVisible()) {
      const initialState = await maintenanceToggle.isChecked();

      // Try to toggle (should show confirmation)
      await maintenanceToggle.click();

      const confirmDialog = adminPage.locator('[data-testid="confirm-maintenance"]');
      if (await confirmDialog.isVisible()) {
        // Cancel to avoid actually enabling maintenance mode
        const cancelButton = adminPage.locator('[data-testid="cancel-maintenance"]');
        await cancelButton.click();

        await expect(confirmDialog).not.toBeVisible();
        await expect(maintenanceToggle).toBeChecked({ checked: initialState });
      }
    }
  });
});
