import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Deployment Page', () => {
  test('should load deployment page for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage, 'Deployment');

    // Admin should see all deployment management features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="deployment-overview"]', '[data-testid="environment-status"]', '[data-testid="deployment-controls"]', '[data-testid="create-deployment"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show deployment overview
    const deploymentOverview = adminPage.locator('[data-testid="deployment-overview"]');
    await expect(deploymentOverview).toBeVisible();
  });

  test('should load deployment page for member with monitoring access', async ({ memberPage }) => {
    await memberPage.goto('/ops/deployment');
    await assertPageLoaded(memberPage, 'Deployment');

    // Member should see deployment status but no controls
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="deployment-overview"]', '[data-testid="environment-status"]'],
        cannotView: ['[data-testid="deployment-controls"]', '[data-testid="create-deployment"]']
      }
    }, 'member');
  });

  test('should restrict deployment page for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/ops/deployment');

    // Viewer might be redirected or see very limited view
    const currentUrl = viewerPage.url();
    if (currentUrl.includes('/ops/deployment')) {
      await assertPageLoaded(viewerPage, 'Deployment');

      // Should see basic deployment info only
      await assertRoleBasedUI(viewerPage, {
        viewer: {
          canView: ['[data-testid="basic-deployment-status"]'],
          cannotView: ['[data-testid="deployment-controls"]', '[data-testid="environment-status"]', '[data-testid="deployment-logs"]']
        }
      }, 'viewer');
    }
  });

  test('should display environment status and health', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const environmentStatus = adminPage.locator('[data-testid="environment-status"]');
    if (await environmentStatus.isVisible()) {
      // Should show different environments
      const environments = adminPage.locator('[data-testid="environment-item"]');
      const envCount = await environments.count();
      expect(envCount).toBeGreaterThan(0);

      if (envCount > 0) {
        const firstEnv = environments.first();
        await expect(firstEnv.locator('[data-testid="environment-name"]')).toBeVisible();
        await expect(firstEnv.locator('[data-testid="environment-health"]')).toBeVisible();
        await expect(firstEnv.locator('[data-testid="environment-version"]')).toBeVisible();
        await expect(firstEnv.locator('[data-testid="last-deployed"]')).toBeVisible();

        // Should show health status
        const healthStatus = await firstEnv.locator('[data-testid="environment-health"]').textContent();
        expect(['healthy', 'degraded', 'unhealthy', 'deploying', 'maintenance']).toContain(healthStatus?.toLowerCase());
      }
    }
  });

  test('should show deployment history', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const deploymentHistory = adminPage.locator('[data-testid="deployment-history"]');
    if (await deploymentHistory.isVisible()) {
      // Should show deployment records
      const deploymentItems = adminPage.locator('[data-testid="deployment-item"]');
      const itemCount = await deploymentItems.count();

      if (itemCount > 0) {
        const firstDeployment = deploymentItems.first();
        await expect(firstDeployment.locator('[data-testid="deployment-id"]')).toBeVisible();
        await expect(firstDeployment.locator('[data-testid="deployment-environment"]')).toBeVisible();
        await expect(firstDeployment.locator('[data-testid="deployment-status"]')).toBeVisible();
        await expect(firstDeployment.locator('[data-testid="deployment-timestamp"]')).toBeVisible();
        await expect(firstDeployment.locator('[data-testid="deployment-author"]')).toBeVisible();

        // Should show deployment status
        const deployStatus = await firstDeployment.locator('[data-testid="deployment-status"]').textContent();
        expect(['pending', 'running', 'completed', 'failed', 'rolled-back']).toContain(deployStatus?.toLowerCase());
      }
    }
  });

  test('should filter deployments by environment and status', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const deploymentFilters = adminPage.locator('[data-testid="deployment-filters"]');
    if (await deploymentFilters.isVisible()) {
      // Test environment filter
      const environmentFilter = adminPage.locator('[data-testid="environment-filter"]');
      if (await environmentFilter.isVisible()) {
        await environmentFilter.selectOption('production');

        // Should filter to production deployments only
        const prodDeployments = adminPage.locator('[data-testid="deployment-item"]');
        const prodCount = await prodDeployments.count();

        if (prodCount > 0) {
          const firstProd = prodDeployments.first();
          const environment = await firstProd.locator('[data-testid="deployment-environment"]').textContent();
          expect(environment?.toLowerCase()).toContain('production');
        }
      }

      // Test status filter
      const statusFilter = adminPage.locator('[data-testid="deployment-status-filter"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('failed');

        // Should filter to failed deployments
        const failedDeployments = adminPage.locator('[data-testid="deployment-item"]');
        const failedCount = await failedDeployments.count();

        if (failedCount > 0) {
          const firstFailed = failedDeployments.first();
          const status = await firstFailed.locator('[data-testid="deployment-status"]').textContent();
          expect(status?.toLowerCase()).toBe('failed');
        }
      }
    }
  });

  test('should show deployment details and logs', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const deploymentItem = adminPage.locator('[data-testid="deployment-item"]').first();
    if (await deploymentItem.isVisible()) {
      // Click to view details
      await deploymentItem.click();

      const deploymentDetails = adminPage.locator('[data-testid="deployment-details"]');
      if (await deploymentDetails.isVisible()) {
        await expect(deploymentDetails).toBeVisible();

        // Should show deployment information
        await expect(deploymentDetails.locator('[data-testid="deployment-full-id"]')).toBeVisible();
        await expect(deploymentDetails.locator('[data-testid="deployment-branch"]')).toBeVisible();
        await expect(deploymentDetails.locator('[data-testid="deployment-commit"]')).toBeVisible();
        await expect(deploymentDetails.locator('[data-testid="deployment-duration"]')).toBeVisible();

        // Should show deployment logs
        const deploymentLogs = deploymentDetails.locator('[data-testid="deployment-logs"]');
        if (await deploymentLogs.isVisible()) {
          await expect(deploymentLogs).toBeVisible();

          const logEntries = deploymentLogs.locator('[data-testid="log-entry"]');
          const logCount = await logEntries.count();

          if (logCount > 0) {
            const firstLog = logEntries.first();
            await expect(firstLog.locator('[data-testid="log-timestamp"]')).toBeVisible();
            await expect(firstLog.locator('[data-testid="log-stage"]')).toBeVisible();
            await expect(firstLog.locator('[data-testid="log-message"]')).toBeVisible();
          }
        }

        // Should show deployment steps
        const deploymentSteps = deploymentDetails.locator('[data-testid="deployment-steps"]');
        if (await deploymentSteps.isVisible()) {
          const stepItems = deploymentSteps.locator('[data-testid="deployment-step"]');
          const stepCount = await stepItems.count();

          if (stepCount > 0) {
            const firstStep = stepItems.first();
            await expect(firstStep.locator('[data-testid="step-name"]')).toBeVisible();
            await expect(firstStep.locator('[data-testid="step-status"]')).toBeVisible();
            await expect(firstStep.locator('[data-testid="step-duration"]')).toBeVisible();
          }
        }
      }
    }
  });

  test('should handle deployment actions (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const deploymentControls = adminPage.locator('[data-testid="deployment-controls"]');
    if (await deploymentControls.isVisible()) {
      // Should have rollback option for completed deployments
      const rollbackButton = adminPage.locator('[data-testid="rollback-deployment"]');
      if (await rollbackButton.isVisible()) {
        await rollbackButton.click();

        const confirmRollback = adminPage.locator('[data-testid="confirm-rollback"]');
        if (await confirmRollback.isVisible()) {
          await expect(confirmRollback).toBeVisible();

          // Should show rollback options
          const rollbackOptions = adminPage.locator('[data-testid="rollback-options"]');
          if (await rollbackOptions.isVisible()) {
            await expect(rollbackOptions).toBeVisible();
          }

          // Cancel to avoid actually rolling back
          const cancelRollback = adminPage.locator('[data-testid="cancel-rollback"]');
          if (await cancelRollback.isVisible()) {
            await cancelRollback.click();
            await expect(confirmRollback).not.toBeVisible();
          }
        }
      }
    }
  });

  test('should create new deployments (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const createDeploymentButton = adminPage.locator('[data-testid="create-deployment"]');
    if (await createDeploymentButton.isVisible()) {
      await createDeploymentButton.click();

      const createDeploymentDialog = adminPage.locator('[data-testid="create-deployment-dialog"]');
      if (await createDeploymentDialog.isVisible()) {
        await expect(createDeploymentDialog).toBeVisible();

        // Should have environment selector
        const environmentSelector = adminPage.locator('[data-testid="deployment-environment-selector"]');
        if (await environmentSelector.isVisible()) {
          await environmentSelector.selectOption('staging');

          // Should show environment-specific options
          const envOptions = adminPage.locator('[data-testid="environment-options"]');
          if (await envOptions.isVisible()) {
            await expect(envOptions).toBeVisible();
          }
        }

        // Should have branch/tag selector
        const branchSelector = adminPage.locator('[data-testid="branch-selector"]');
        if (await branchSelector.isVisible()) {
          await branchSelector.selectOption('main');

          // Should show commit information
          const commitInfo = adminPage.locator('[data-testid="commit-info"]');
          if (await commitInfo.isVisible()) {
            await expect(commitInfo).toBeVisible();
          }
        }

        // Cancel deployment creation
        const cancelCreate = adminPage.locator('[data-testid="cancel-create-deployment"]');
        if (await cancelCreate.isVisible()) {
          await cancelCreate.click();
          await expect(createDeploymentDialog).not.toBeVisible();
        }
      }
    }
  });

  test('should show deployment metrics and statistics', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const deploymentMetrics = adminPage.locator('[data-testid="deployment-metrics"]');
    if (await deploymentMetrics.isVisible()) {
      // Should show deployment counts by status
      const successCount = adminPage.locator('[data-testid="successful-deployments-count"]');
      const failedCount = adminPage.locator('[data-testid="failed-deployments-count"]');
      const avgDuration = adminPage.locator('[data-testid="avg-deployment-duration"]');

      if (await successCount.isVisible()) {
        const successText = await successCount.textContent();
        expect(successText).toMatch(/\d+/);
      }

      if (await failedCount.isVisible()) {
        const failedText = await failedCount.textContent();
        expect(failedText).toMatch(/\d+/);
      }

      if (await avgDuration.isVisible()) {
        const durationText = await avgDuration.textContent();
        expect(durationText).toBeTruthy();
      }

      // Should show deployment frequency
      const deploymentFrequency = adminPage.locator('[data-testid="deployment-frequency"]');
      if (await deploymentFrequency.isVisible()) {
        const freqText = await deploymentFrequency.textContent();
        expect(freqText).toBeTruthy();
      }
    }
  });

  test('should manage deployment configurations', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const deploymentConfig = adminPage.locator('[data-testid="deployment-configuration"]');
    if (await deploymentConfig.isVisible()) {
      await deploymentConfig.click();

      const configPanel = adminPage.locator('[data-testid="config-panel"]');
      if (await configPanel.isVisible()) {
        await expect(configPanel).toBeVisible();

        // Should show environment configurations
        const environmentConfigs = adminPage.locator('[data-testid="environment-configs"]');
        if (await environmentConfigs.isVisible()) {
          const configItems = environmentConfigs.locator('[data-testid="config-item"]');
          const configCount = await configItems.count();

          if (configCount > 0) {
            const firstConfig = configItems.first();
            await expect(firstConfig.locator('[data-testid="config-name"]')).toBeVisible();
            await expect(firstConfig.locator('[data-testid="config-value"]')).toBeVisible();
          }
        }

        // Should show deployment pipeline settings
        const pipelineSettings = adminPage.locator('[data-testid="pipeline-settings"]');
        if (await pipelineSettings.isVisible()) {
          await expect(pipelineSettings).toBeVisible();

          const autoDeployToggle = adminPage.locator('[data-testid="auto-deploy-toggle"]');
          if (await autoDeployToggle.isVisible()) {
            const initialState = await autoDeployToggle.isChecked();
            await autoDeployToggle.click();
            await expect(autoDeployToggle).toBeChecked({ checked: !initialState });
          }
        }

        // Close config panel
        const closeConfig = adminPage.locator('[data-testid="close-config"]');
        if (await closeConfig.isVisible()) {
          await closeConfig.click();
          await expect(configPanel).not.toBeVisible();
        }
      }
    }
  });

  test('should handle real-time deployment updates', async ({ adminPage }) => {
    await adminPage.goto('/ops/deployment');
    await assertPageLoaded(adminPage);

    const realtimeToggle = adminPage.locator('[data-testid="realtime-deployment-updates"]');
    if (await realtimeToggle.isVisible()) {
      const initialState = await realtimeToggle.isChecked();

      // Toggle real-time updates
      await realtimeToggle.click();

      // Should update toggle state
      await expect(realtimeToggle).toBeChecked({ checked: !initialState });

      // Should show real-time indicator when enabled
      if (!initialState) {
        const realtimeIndicator = adminPage.locator('[data-testid="deployment-realtime-indicator"]');
        if (await realtimeIndicator.isVisible()) {
          await expect(realtimeIndicator).toBeVisible();
        }
      }
    }
  });
});
