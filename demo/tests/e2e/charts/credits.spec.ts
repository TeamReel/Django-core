import { test, expect, assertPageLoaded, assertRoleBasedUI, assertChartLoads } from '../fixtures';

test.describe('Credits Chart Page', () => {
  test('should load credits chart for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage, 'Credits Chart');

    // Admin should see all chart features and controls
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="credits-chart-container"]', '[data-testid="chart-controls"]', '[data-testid="chart-export"]', '[data-testid="chart-settings"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show credits chart
    const creditsChartContainer = adminPage.locator('[data-testid="credits-chart-container"]');
    await expect(creditsChartContainer).toBeVisible();
  });

  test('should load credits chart for member with view access', async ({ memberPage }) => {
    await memberPage.goto('/charts/credits');
    await assertPageLoaded(memberPage, 'Credits Chart');

    // Member should see chart but limited controls
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="credits-chart-container"]', '[data-testid="chart-filters"]'],
        cannotView: ['[data-testid="chart-settings"]', '[data-testid="admin-chart-controls"]']
      }
    }, 'member');
  });

  test('should restrict credits chart for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/charts/credits');
    await assertPageLoaded(viewerPage, 'Credits Chart');

    // Viewer should see basic chart only
    await assertRoleBasedUI(viewerPage, {
      viewer: {
        canView: ['[data-testid="basic-credits-chart"]'],
        cannotView: ['[data-testid="chart-controls"]', '[data-testid="chart-export"]', '[data-testid="detailed-chart-options"]']
      }
    }, 'viewer');
  });

  test('should render Chart.js credits usage chart', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    // Test Chart.js integration for credits usage
    const chartContainer = adminPage.locator('[data-testid="credits-usage-chart"]');
    if (await chartContainer.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="credits-usage-chart"]');

      // Should show chart canvas element
      const canvas = chartContainer.locator('canvas');
      await expect(canvas).toBeVisible();

      // Canvas should have dimensions
      const canvasRect = await canvas.boundingBox();
      expect(canvasRect?.width).toBeGreaterThan(0);
      expect(canvasRect?.height).toBeGreaterThan(0);
    }
  });

  test('should display credits balance over time chart', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    const balanceChart = adminPage.locator('[data-testid="credits-balance-chart"]');
    if (await balanceChart.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="credits-balance-chart"]');

      // Should show line chart for balance trends
      const chartCanvas = balanceChart.locator('canvas');
      await expect(chartCanvas).toBeVisible();

      // Should show chart legend
      const chartLegend = adminPage.locator('[data-testid="balance-chart-legend"]');
      if (await chartLegend.isVisible()) {
        await expect(chartLegend).toBeVisible();

        const legendItems = chartLegend.locator('[data-testid="legend-item"]');
        const itemCount = await legendItems.count();
        expect(itemCount).toBeGreaterThan(0);
      }
    }
  });

  test('should show credits consumption by service chart', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    const consumptionChart = adminPage.locator('[data-testid="credits-consumption-chart"]');
    if (await consumptionChart.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="credits-consumption-chart"]');

      // Should show pie/doughnut chart for service breakdown
      const chartCanvas = consumptionChart.locator('canvas');
      await expect(chartCanvas).toBeVisible();

      // Should show service labels
      const serviceLabels = adminPage.locator('[data-testid="service-label"]');
      const labelCount = await serviceLabels.count();

      if (labelCount > 0) {
        const firstLabel = serviceLabels.first();
        await expect(firstLabel).toBeVisible();

        const labelText = await firstLabel.textContent();
        expect(labelText).toBeTruthy();
      }
    }
  });

  test('should filter chart data by date range', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    const chartFilters = adminPage.locator('[data-testid="chart-filters"]');
    if (await chartFilters.isVisible()) {
      // Test date range filter
      const dateRangeFilter = adminPage.locator('[data-testid="date-range-filter"]');
      if (await dateRangeFilter.isVisible()) {
        await dateRangeFilter.selectOption('7days');

        // Should update chart with filtered data
        await adminPage.waitForTimeout(1000); // Allow chart to update

        const chartContainer = adminPage.locator('[data-testid="credits-usage-chart"]');
        if (await chartContainer.isVisible()) {
          // Chart should still be visible and functional
          await assertChartLoads(adminPage, '[data-testid="credits-usage-chart"]');
        }
      }

      // Test custom date range
      const customDateRange = adminPage.locator('[data-testid="custom-date-range"]');
      if (await customDateRange.isVisible()) {
        await customDateRange.click();

        const startDateInput = adminPage.locator('[data-testid="start-date"]');
        const endDateInput = adminPage.locator('[data-testid="end-date"]');

        if (await startDateInput.isVisible() && await endDateInput.isVisible()) {
          const today = new Date();
          const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

          await startDateInput.fill(lastWeek.toISOString().split('T')[0]);
          await endDateInput.fill(today.toISOString().split('T')[0]);

          const applyFilter = adminPage.locator('[data-testid="apply-date-filter"]');
          if (await applyFilter.isVisible()) {
            await applyFilter.click();

            // Should update chart with custom range
            await adminPage.waitForTimeout(1000);
            const updatedChart = adminPage.locator('[data-testid="credits-usage-chart"]');
            if (await updatedChart.isVisible()) {
              await assertChartLoads(adminPage, '[data-testid="credits-usage-chart"]');
            }
          }
        }
      }
    }
  });

  test('should export chart data and images', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    const chartExport = adminPage.locator('[data-testid="chart-export"]');
    if (await chartExport.isVisible()) {
      // Test image export
      const exportImageButton = adminPage.locator('[data-testid="export-chart-image"]');
      if (await exportImageButton.isVisible()) {
        await exportImageButton.click();

        const exportDialog = adminPage.locator('[data-testid="export-image-dialog"]');
        if (await exportDialog.isVisible()) {
          await expect(exportDialog).toBeVisible();

          // Should have format options
          const formatSelector = adminPage.locator('[data-testid="export-format"]');
          if (await formatSelector.isVisible()) {
            await formatSelector.selectOption('png');

            // Should have resolution options
            const resolutionSelector = adminPage.locator('[data-testid="export-resolution"]');
            if (await resolutionSelector.isVisible()) {
              await expect(resolutionSelector).toBeVisible();
            }
          }

          // Close export dialog
          const closeExport = adminPage.locator('[data-testid="close-export"]');
          if (await closeExport.isVisible()) {
            await closeExport.click();
            await expect(exportDialog).not.toBeVisible();
          }
        }
      }

      // Test data export
      const exportDataButton = adminPage.locator('[data-testid="export-chart-data"]');
      if (await exportDataButton.isVisible()) {
        await exportDataButton.click();

        const dataExportDialog = adminPage.locator('[data-testid="export-data-dialog"]');
        if (await dataExportDialog.isVisible()) {
          await expect(dataExportDialog).toBeVisible();

          // Should have data format options
          const dataFormatSelector = adminPage.locator('[data-testid="data-export-format"]');
          if (await dataFormatSelector.isVisible()) {
            await dataFormatSelector.selectOption('csv');
          }

          // Close data export dialog
          const closeDataExport = adminPage.locator('[data-testid="close-data-export"]');
          if (await closeDataExport.isVisible()) {
            await closeDataExport.click();
            await expect(dataExportDialog).not.toBeVisible();
          }
        }
      }
    }
  });

  test('should handle chart interactivity and tooltips', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    const chartCanvas = adminPage.locator('[data-testid="credits-usage-chart"] canvas');
    if (await chartCanvas.isVisible()) {
      // Test chart hover interactions
      await chartCanvas.hover({ position: { x: 100, y: 100 } });

      // Should show tooltip on hover
      const chartTooltip = adminPage.locator('[data-testid="chart-tooltip"]');
      if (await chartTooltip.isVisible()) {
        await expect(chartTooltip).toBeVisible();

        // Tooltip should contain data
        const tooltipContent = await chartTooltip.textContent();
        expect(tooltipContent).toBeTruthy();
      }

      // Test chart click interactions
      await chartCanvas.click({ position: { x: 150, y: 150 } });

      // Should show detailed data on click
      const chartDetails = adminPage.locator('[data-testid="chart-click-details"]');
      if (await chartDetails.isVisible()) {
        await expect(chartDetails).toBeVisible();
      }
    }
  });

  test('should configure chart display options', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    const chartSettings = adminPage.locator('[data-testid="chart-settings"]');
    if (await chartSettings.isVisible()) {
      await chartSettings.click();

      const settingsPanel = adminPage.locator('[data-testid="chart-settings-panel"]');
      if (await settingsPanel.isVisible()) {
        await expect(settingsPanel).toBeVisible();

        // Test chart type selector
        const chartTypeSelector = adminPage.locator('[data-testid="chart-type-selector"]');
        if (await chartTypeSelector.isVisible()) {
          await chartTypeSelector.selectOption('bar');

          // Should update chart type
          await adminPage.waitForTimeout(1000);
          const updatedChart = adminPage.locator('[data-testid="credits-usage-chart"]');
          if (await updatedChart.isVisible()) {
            await assertChartLoads(adminPage, '[data-testid="credits-usage-chart"]');
          }
        }

        // Test color scheme selector
        const colorSchemeSelector = adminPage.locator('[data-testid="color-scheme-selector"]');
        if (await colorSchemeSelector.isVisible()) {
          await colorSchemeSelector.selectOption('dark');

          // Should update chart colors
          await adminPage.waitForTimeout(500);
        }

        // Test animation toggle
        const animationToggle = adminPage.locator('[data-testid="chart-animation-toggle"]');
        if (await animationToggle.isVisible()) {
          const initialState = await animationToggle.isChecked();
          await animationToggle.click();
          await expect(animationToggle).toBeChecked({ checked: !initialState });
        }

        // Close settings panel
        const closeSettings = adminPage.locator('[data-testid="close-chart-settings"]');
        if (await closeSettings.isVisible()) {
          await closeSettings.click();
          await expect(settingsPanel).not.toBeVisible();
        }
      }
    }
  });

  test('should handle real-time chart updates', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    const realtimeToggle = adminPage.locator('[data-testid="realtime-chart-updates"]');
    if (await realtimeToggle.isVisible()) {
      const initialState = await realtimeToggle.isChecked();

      // Toggle real-time updates
      await realtimeToggle.click();

      // Should update toggle state
      await expect(realtimeToggle).toBeChecked({ checked: !initialState });

      // Should show real-time indicator when enabled
      if (!initialState) {
        const realtimeIndicator = adminPage.locator('[data-testid="chart-realtime-indicator"]');
        if (await realtimeIndicator.isVisible()) {
          await expect(realtimeIndicator).toBeVisible();
        }

        // Should show last update timestamp
        const lastUpdate = adminPage.locator('[data-testid="chart-last-update"]');
        if (await lastUpdate.isVisible()) {
          const updateText = await lastUpdate.textContent();
          expect(updateText).toBeTruthy();
        }
      }
    }
  });

  test('should display chart performance metrics', async ({ adminPage }) => {
    await adminPage.goto('/charts/credits');
    await assertPageLoaded(adminPage);

    // Measure chart render performance
    const startTime = Date.now();

    const chartContainer = adminPage.locator('[data-testid="credits-usage-chart"]');
    if (await chartContainer.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="credits-usage-chart"]');

      const renderTime = Date.now() - startTime;

      // Chart should render within reasonable time (5 seconds)
      expect(renderTime).toBeLessThan(5000);

      // Should show chart loading performance info
      const performanceInfo = adminPage.locator('[data-testid="chart-performance"]');
      if (await performanceInfo.isVisible()) {
        const renderTimeDisplay = adminPage.locator('[data-testid="chart-render-time"]');
        if (await renderTimeDisplay.isVisible()) {
          const timeText = await renderTimeDisplay.textContent();
          expect(timeText).toMatch(/\d+/); // Should contain numbers
        }
      }
    }
  });
});
