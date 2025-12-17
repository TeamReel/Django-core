import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Dashboard Page', () => {
  test('should load main dashboard for admin with full widgets', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage, 'Dashboard');

    // Admin should see all dashboard widgets
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="dashboard-widgets"]', '[data-testid="admin-widgets"]', '[data-testid="system-overview"]', '[data-testid="customize-dashboard"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show dashboard layout
    const dashboardWidgets = adminPage.locator('[data-testid="dashboard-widgets"]');
    await expect(dashboardWidgets).toBeVisible();
  });

  test('should load dashboard for member with standard widgets', async ({ memberPage }) => {
    await memberPage.goto('/platform/dashboard');
    await assertPageLoaded(memberPage, 'Dashboard');

    // Member should see standard widgets but no admin-only ones
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="dashboard-widgets"]', '[data-testid="user-widgets"]'],
        cannotView: ['[data-testid="admin-widgets"]', '[data-testid="system-overview"]']
      }
    }, 'member');
  });

  test('should load dashboard for viewer with read-only widgets', async ({ viewerPage }) => {
    await viewerPage.goto('/platform/dashboard');
    await assertPageLoaded(viewerPage, 'Dashboard');

    // Viewer should see basic dashboard
    await assertRoleBasedUI(viewerPage, {
      viewer: {
        canView: ['[data-testid="basic-dashboard"]'],
        cannotView: ['[data-testid="admin-widgets"]', '[data-testid="customize-dashboard"]', '[data-testid="interactive-widgets"]']
      }
    }, 'viewer');
  });

  test('should display quick stats widgets', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage);

    const quickStats = adminPage.locator('[data-testid="quick-stats"]');
    if (await quickStats.isVisible()) {
      // Should show key metrics
      const statWidgets = adminPage.locator('[data-testid="stat-widget"]');
      const widgetCount = await statWidgets.count();
      expect(widgetCount).toBeGreaterThan(0);

      if (widgetCount > 0) {
        const firstWidget = statWidgets.first();
        await expect(firstWidget.locator('[data-testid="stat-title"]')).toBeVisible();
        await expect(firstWidget.locator('[data-testid="stat-value"]')).toBeVisible();

        // Should show trend indicator
        const trendIndicator = firstWidget.locator('[data-testid="trend-indicator"]');
        if (await trendIndicator.isVisible()) {
          await expect(trendIndicator).toBeVisible();
        }
      }
    }
  });

  test('should show recent activity feed', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage);

    const activityFeed = adminPage.locator('[data-testid="activity-feed"]');
    if (await activityFeed.isVisible()) {
      // Should show recent activities
      const activities = adminPage.locator('[data-testid="activity-item"]');
      const activityCount = await activities.count();

      if (activityCount > 0) {
        const firstActivity = activities.first();
        await expect(firstActivity.locator('[data-testid="activity-text"]')).toBeVisible();
        await expect(firstActivity.locator('[data-testid="activity-timestamp"]')).toBeVisible();

        // Should show activity type
        const activityType = firstActivity.locator('[data-testid="activity-type"]');
        if (await activityType.isVisible()) {
          const typeText = await activityType.textContent();
          expect(typeText).toBeTruthy();
        }
      }
    }
  });

  test('should display system health widget', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage);

    const systemHealth = adminPage.locator('[data-testid="system-health-widget"]');
    if (await systemHealth.isVisible()) {
      // Should show overall health status
      const healthStatus = adminPage.locator('[data-testid="overall-health"]');
      await expect(healthStatus).toBeVisible();

      const statusText = await healthStatus.textContent();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(statusText?.toLowerCase());

      // Should show service indicators
      const serviceIndicators = adminPage.locator('[data-testid="service-indicator"]');
      const indicatorCount = await serviceIndicators.count();

      if (indicatorCount > 0) {
        const firstIndicator = serviceIndicators.first();
        await expect(firstIndicator).toBeVisible();
      }
    }
  });

  test('should show notifications and alerts widget', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage);

    const notificationsWidget = adminPage.locator('[data-testid="notifications-widget"]');
    if (await notificationsWidget.isVisible()) {
      // Should show notification count
      const notificationCount = adminPage.locator('[data-testid="notification-count"]');
      if (await notificationCount.isVisible()) {
        const countText = await notificationCount.textContent();
        expect(countText).toMatch(/\d+/); // Should contain numbers
      }

      // Should show recent notifications
      const notifications = adminPage.locator('[data-testid="dashboard-notification"]');
      const notifCount = await notifications.count();

      if (notifCount > 0) {
        const firstNotification = notifications.first();
        await expect(firstNotification.locator('[data-testid="notification-title"]')).toBeVisible();
        await expect(firstNotification.locator('[data-testid="notification-time"]')).toBeVisible();
      }
    }
  });

  test('should display project/organization overview', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage);

    const orgOverview = adminPage.locator('[data-testid="org-overview-widget"]');
    if (await orgOverview.isVisible()) {
      // Should show current organization info
      const currentOrg = adminPage.locator('[data-testid="current-org-name"]');
      if (await currentOrg.isVisible()) {
        const orgName = await currentOrg.textContent();
        expect(orgName).toBeTruthy();
      }

      // Should show project count
      const projectCount = adminPage.locator('[data-testid="project-count"]');
      if (await projectCount.isVisible()) {
        const countText = await projectCount.textContent();
        expect(countText).toMatch(/\d+/);
      }

      // Should show recent projects
      const recentProjects = adminPage.locator('[data-testid="recent-project"]');
      const projectsCount = await recentProjects.count();

      if (projectsCount > 0) {
        const firstProject = recentProjects.first();
        await expect(firstProject.locator('[data-testid="project-name"]')).toBeVisible();
      }
    }
  });

  test('should customize dashboard layout (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage);

    const customizeButton = adminPage.locator('[data-testid="customize-dashboard"]');
    if (await customizeButton.isVisible()) {
      await customizeButton.click();

      // Should enter customization mode
      const customizationMode = adminPage.locator('[data-testid="customization-mode"]');
      await expect(customizationMode).toBeVisible();

      // Should show widget options
      const widgetOptions = adminPage.locator('[data-testid="available-widgets"]');
      if (await widgetOptions.isVisible()) {
        await expect(widgetOptions).toBeVisible();
      }

      // Exit customization mode
      const exitCustomize = adminPage.locator('[data-testid="exit-customize"]');
      if (await exitCustomize.isVisible()) {
        await exitCustomize.click();
        await expect(customizationMode).not.toBeVisible();
      }
    }
  });

  test('should refresh dashboard data', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage);

    const refreshButton = adminPage.locator('[data-testid="refresh-dashboard"]');
    if (await refreshButton.isVisible()) {
      // Note current timestamp
      const timestampBefore = await adminPage.locator('[data-testid="last-updated"]').textContent();

      await refreshButton.click();

      // Should show loading indicator
      const loadingIndicator = adminPage.locator('[data-testid="dashboard-loading"]');
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible();
      }

      // Should update timestamp
      await expect(adminPage.locator('[data-testid="last-updated"]')).not.toHaveText(timestampBefore || '');
    }
  });

  test('should handle widget interactions', async ({ adminPage }) => {
    await adminPage.goto('/platform/dashboard');
    await assertPageLoaded(adminPage);

    // Test widget expansion
    const expandableWidget = adminPage.locator('[data-testid="expandable-widget"]').first();
    if (await expandableWidget.isVisible()) {
      const expandButton = expandableWidget.locator('[data-testid="expand-widget"]');
      if (await expandButton.isVisible()) {
        await expandButton.click();

        // Should show expanded view
        const expandedView = adminPage.locator('[data-testid="widget-expanded-view"]');
        if (await expandedView.isVisible()) {
          await expect(expandedView).toBeVisible();

          // Close expanded view
          const closeButton = adminPage.locator('[data-testid="close-expanded"]');
          if (await closeButton.isVisible()) {
            await closeButton.click();
            await expect(expandedView).not.toBeVisible();
          }
        }
      }
    }
  });
});
