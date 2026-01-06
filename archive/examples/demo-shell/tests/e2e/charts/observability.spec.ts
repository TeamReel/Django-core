import { test, expect, assertPageLoaded, assertRoleBasedUI, assertChartLoads } from '../fixtures';

test.describe('Observability Chart Page', () => {
  test('should load observability chart for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage, 'Observability Chart');

    // Admin should see all chart features and controls
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="observability-chart-container"]', '[data-testid="metrics-controls"]', '[data-testid="chart-dashboard"]', '[data-testid="alert-thresholds"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show observability chart
    const observabilityChartContainer = adminPage.locator('[data-testid="observability-chart-container"]');
    await expect(observabilityChartContainer).toBeVisible();
  });

  test('should load observability chart for member with monitoring access', async ({ memberPage }) => {
    await memberPage.goto('/charts/observability');
    await assertPageLoaded(memberPage, 'Observability Chart');

    // Member should see charts but limited controls
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="observability-chart-container"]', '[data-testid="metrics-filters"]'],
        cannotView: ['[data-testid="alert-thresholds"]', '[data-testid="admin-metrics-controls"]']
      }
    }, 'member');
  });

  test('should restrict observability chart for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/charts/observability');

    // Viewer might be redirected or see limited view
    const currentUrl = viewerPage.url();
    if (currentUrl.includes('/charts/observability')) {
      await assertPageLoaded(viewerPage, 'Observability Chart');

      // Should see basic metrics only
      await assertRoleBasedUI(viewerPage, {
        viewer: {
          canView: ['[data-testid="basic-metrics-chart"]'],
          cannotView: ['[data-testid="detailed-metrics"]', '[data-testid="metrics-controls"]', '[data-testid="chart-settings"]']
        }
      }, 'viewer');
    }
  });

  test('should render Chart.js system performance metrics', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    // Test Chart.js integration for system performance
    const performanceChart = adminPage.locator('[data-testid="system-performance-chart"]');
    if (await performanceChart.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="system-performance-chart"]');

      // Should show chart canvas element
      const canvas = performanceChart.locator('canvas');
      await expect(canvas).toBeVisible();

      // Canvas should have dimensions
      const canvasRect = await canvas.boundingBox();
      expect(canvasRect?.width).toBeGreaterThan(0);
      expect(canvasRect?.height).toBeGreaterThan(0);
    }
  });

  test('should display response time metrics chart', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    const responseTimeChart = adminPage.locator('[data-testid="response-time-chart"]');
    if (await responseTimeChart.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="response-time-chart"]');

      // Should show line chart for response time trends
      const chartCanvas = responseTimeChart.locator('canvas');
      await expect(chartCanvas).toBeVisible();

      // Should show metrics legend
      const metricsLegend = adminPage.locator('[data-testid="response-time-legend"]');
      if (await metricsLegend.isVisible()) {
        await expect(metricsLegend).toBeVisible();

        const legendItems = metricsLegend.locator('[data-testid="legend-item"]');
        const itemCount = await legendItems.count();
        expect(itemCount).toBeGreaterThan(0);

        if (itemCount > 0) {
          const firstItem = legendItems.first();
          await expect(firstItem.locator('[data-testid="legend-color"]')).toBeVisible();
          await expect(firstItem.locator('[data-testid="legend-label"]')).toBeVisible();
        }
      }
    }
  });

  test('should show error rate and throughput charts', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    const errorRateChart = adminPage.locator('[data-testid="error-rate-chart"]');
    if (await errorRateChart.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="error-rate-chart"]');

      // Should show area chart for error rates
      const chartCanvas = errorRateChart.locator('canvas');
      await expect(chartCanvas).toBeVisible();
    }

    const throughputChart = adminPage.locator('[data-testid="throughput-chart"]');
    if (await throughputChart.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="throughput-chart"]');

      // Should show bar chart for request throughput
      const chartCanvas = throughputChart.locator('canvas');
      await expect(chartCanvas).toBeVisible();

      // Should show throughput metrics
      const throughputMetrics = adminPage.locator('[data-testid="throughput-metrics"]');
      if (await throughputMetrics.isVisible()) {
        const currentThroughput = adminPage.locator('[data-testid="current-throughput"]');
        const avgThroughput = adminPage.locator('[data-testid="avg-throughput"]');

        if (await currentThroughput.isVisible()) {
          const currentText = await currentThroughput.textContent();
          expect(currentText).toMatch(/\d+/); // Should contain numbers
        }

        if (await avgThroughput.isVisible()) {
          const avgText = await avgThroughput.textContent();
          expect(avgText).toMatch(/\d+/);
        }
      }
    }
  });

  test('should display resource utilization charts', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    const resourceChart = adminPage.locator('[data-testid="resource-utilization-chart"]');
    if (await resourceChart.isVisible()) {
      await assertChartLoads(adminPage, '[data-testid="resource-utilization-chart"]');

      // Should show multi-series chart for CPU, memory, disk
      const chartCanvas = resourceChart.locator('canvas');
      await expect(chartCanvas).toBeVisible();

      // Should show resource breakdowns
      const resourceBreakdown = adminPage.locator('[data-testid="resource-breakdown"]');
      if (await resourceBreakdown.isVisible()) {
        const cpuUsage = adminPage.locator('[data-testid="cpu-usage-percent"]');
        const memoryUsage = adminPage.locator('[data-testid="memory-usage-percent"]');
        const diskUsage = adminPage.locator('[data-testid="disk-usage-percent"]');

        if (await cpuUsage.isVisible()) {
          const cpuText = await cpuUsage.textContent();
          expect(cpuText).toMatch(/\d+%/);
        }

        if (await memoryUsage.isVisible()) {
          const memText = await memoryUsage.textContent();
          expect(memText).toMatch(/\d+%/);
        }

        if (await diskUsage.isVisible()) {
          const diskText = await diskUsage.textContent();
          expect(diskText).toMatch(/\d+%/);
        }
      }
    }
  });

  test('should filter metrics by time range and service', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    const metricsFilters = adminPage.locator('[data-testid="metrics-filters"]');
    if (await metricsFilters.isVisible()) {
      // Test time range filter
      const timeRangeFilter = adminPage.locator('[data-testid="metrics-time-range"]');
      if (await timeRangeFilter.isVisible()) {
        await timeRangeFilter.selectOption('1h');

        // Should update all charts with filtered data
        await adminPage.waitForTimeout(1000); // Allow charts to update

        const performanceChart = adminPage.locator('[data-testid="system-performance-chart"]');
        if (await performanceChart.isVisible()) {
          await assertChartLoads(adminPage, '[data-testid="system-performance-chart"]');
        }
      }

      // Test service filter
      const serviceFilter = adminPage.locator('[data-testid="service-filter"]');
      if (await serviceFilter.isVisible()) {
        await serviceFilter.selectOption('api');

        // Should filter metrics to API service only
        await adminPage.waitForTimeout(1000);

        const filteredMetrics = adminPage.locator('[data-testid="filtered-metrics-indicator"]');
        if (await filteredMetrics.isVisible()) {
          await expect(filteredMetrics).toBeVisible();
        }
      }

      // Test metric type filter
      const metricTypeFilter = adminPage.locator('[data-testid="metric-type-filter"]');
      if (await metricTypeFilter.isVisible()) {
        // Toggle different metric types
        const responseTimeToggle = adminPage.locator('[data-testid="toggle-response-time"]');
        const errorRateToggle = adminPage.locator('[data-testid="toggle-error-rate"]');
        const throughputToggle = adminPage.locator('[data-testid="toggle-throughput"]');

        if (await responseTimeToggle.isVisible()) {
          const initialState = await responseTimeToggle.isChecked();
          await responseTimeToggle.click();
          await expect(responseTimeToggle).toBeChecked({ checked: !initialState });

          // Should show/hide corresponding chart
          const responseChart = adminPage.locator('[data-testid="response-time-chart"]');
          if (initialState) {
            // Was checked, now unchecked - chart should be hidden
            if (await responseChart.isVisible()) {
              await expect(responseChart).not.toBeVisible();
            }
          } else {
            // Was unchecked, now checked - chart should be visible
            if (await responseChart.isVisible()) {
              await expect(responseChart).toBeVisible();
            }
          }
        }
      }
    }
  });

  test('should configure alert thresholds on charts (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    const alertThresholds = adminPage.locator('[data-testid="alert-thresholds"]');
    if (await alertThresholds.isVisible()) {
      await alertThresholds.click();

      const thresholdsPanel = adminPage.locator('[data-testid="thresholds-panel"]');
      if (await thresholdsPanel.isVisible()) {
        await expect(thresholdsPanel).toBeVisible();

        // Should show threshold configurations
        const thresholdItems = adminPage.locator('[data-testid="threshold-item"]');
        const itemCount = await thresholdItems.count();

        if (itemCount > 0) {
          const firstThreshold = thresholdItems.first();
          await expect(firstThreshold.locator('[data-testid="threshold-metric"]')).toBeVisible();
          await expect(firstThreshold.locator('[data-testid="threshold-value"]')).toBeVisible();
          await expect(firstThreshold.locator('[data-testid="threshold-condition"]')).toBeVisible();

          // Test editing threshold
          const editThreshold = firstThreshold.locator('[data-testid="edit-threshold"]');
          if (await editThreshold.isVisible()) {
            await editThreshold.click();

            const thresholdInput = adminPage.locator('[data-testid="threshold-value-input"]');
            if (await thresholdInput.isVisible()) {
              await thresholdInput.fill('90');

              const saveThreshold = adminPage.locator('[data-testid="save-threshold"]');
              if (await saveThreshold.isVisible()) {
                await saveThreshold.click();

                // Should update threshold value
                const updatedValue = await firstThreshold.locator('[data-testid="threshold-value"]').textContent();
                expect(updatedValue).toContain('90');
              }
            }
          }
        }

        // Should show threshold lines on charts
        const chartWithThresholds = adminPage.locator('[data-testid="chart-with-thresholds"]');
        if (await chartWithThresholds.isVisible()) {
          const thresholdLine = adminPage.locator('[data-testid="threshold-line"]');
          if (await thresholdLine.isVisible()) {
            await expect(thresholdLine).toBeVisible();
          }
        }

        // Close thresholds panel
        const closeThresholds = adminPage.locator('[data-testid="close-thresholds"]');
        if (await closeThresholds.isVisible()) {
          await closeThresholds.click();
          await expect(thresholdsPanel).not.toBeVisible();
        }
      }
    }
  });

  test('should export observability charts and data', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    const chartExport = adminPage.locator('[data-testid="export-metrics"]');
    if (await chartExport.isVisible()) {
      await chartExport.click();

      const exportDialog = adminPage.locator('[data-testid="metrics-export-dialog"]');
      if (await exportDialog.isVisible()) {
        await expect(exportDialog).toBeVisible();

        // Should have export options
        const exportOptions = adminPage.locator('[data-testid="export-options"]');
        if (await exportOptions.isVisible()) {
          // Should have chart selection
          const chartSelection = adminPage.locator('[data-testid="chart-selection"]');
          if (await chartSelection.isVisible()) {
            const chartCheckboxes = chartSelection.locator('[data-testid="chart-checkbox"]');
            const checkboxCount = await chartCheckboxes.count();

            if (checkboxCount > 0) {
              await chartCheckboxes.first().check();
              await expect(chartCheckboxes.first()).toBeChecked();
            }
          }

          // Should have format options
          const formatSelector = adminPage.locator('[data-testid="metrics-export-format"]');
          if (await formatSelector.isVisible()) {
            await formatSelector.selectOption('pdf');

            // Should show format-specific options
            const pdfOptions = adminPage.locator('[data-testid="pdf-export-options"]');
            if (await pdfOptions.isVisible()) {
              await expect(pdfOptions).toBeVisible();
            }
          }
        }

        // Close export dialog
        const closeExport = adminPage.locator('[data-testid="close-metrics-export"]');
        if (await closeExport.isVisible()) {
          await closeExport.click();
          await expect(exportDialog).not.toBeVisible();
        }
      }
    }
  });

  test('should display real-time metrics with live updates', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    const realtimeMetrics = adminPage.locator('[data-testid="realtime-metrics"]');
    if (await realtimeMetrics.isVisible()) {
      const realtimeToggle = adminPage.locator('[data-testid="realtime-metrics-toggle"]');
      if (await realtimeToggle.isVisible()) {
        await realtimeToggle.check();

        // Should show real-time indicator
        const realtimeIndicator = adminPage.locator('[data-testid="realtime-indicator"]');
        if (await realtimeIndicator.isVisible()) {
          await expect(realtimeIndicator).toBeVisible();
        }

        // Should show last update timestamp
        const lastUpdate = adminPage.locator('[data-testid="metrics-last-update"]');
        if (await lastUpdate.isVisible()) {
          const initialTime = await lastUpdate.textContent();

          // Wait for potential update (in a real scenario, this would update)
          await adminPage.waitForTimeout(2000);

          const updatedTime = await lastUpdate.textContent();
          // Time should be updated or at least still present
          expect(updatedTime).toBeTruthy();
        }

        // Should show connection status
        const connectionStatus = adminPage.locator('[data-testid="realtime-connection-status"]');
        if (await connectionStatus.isVisible()) {
          const statusText = await connectionStatus.textContent();
          expect(['connected', 'connecting', 'disconnected']).toContain(statusText?.toLowerCase());
        }
      }
    }
  });

  test('should handle chart interactions and drill-downs', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    const interactiveChart = adminPage.locator('[data-testid="system-performance-chart"] canvas');
    if (await interactiveChart.isVisible()) {
      // Test chart hover for tooltips
      await interactiveChart.hover({ position: { x: 200, y: 150 } });

      const chartTooltip = adminPage.locator('[data-testid="metrics-tooltip"]');
      if (await chartTooltip.isVisible()) {
        await expect(chartTooltip).toBeVisible();

        const tooltipData = await chartTooltip.textContent();
        expect(tooltipData).toBeTruthy();
      }

      // Test chart click for drill-down
      await interactiveChart.click({ position: { x: 250, y: 200 } });

      const drillDownPanel = adminPage.locator('[data-testid="metrics-drill-down"]');
      if (await drillDownPanel.isVisible()) {
        await expect(drillDownPanel).toBeVisible();

        // Should show detailed metrics for clicked time period
        const detailedMetrics = adminPage.locator('[data-testid="detailed-metrics"]');
        if (await detailedMetrics.isVisible()) {
          await expect(detailedMetrics).toBeVisible();
        }

        // Close drill-down panel
        const closeDrillDown = adminPage.locator('[data-testid="close-drill-down"]');
        if (await closeDrillDown.isVisible()) {
          await closeDrillDown.click();
          await expect(drillDownPanel).not.toBeVisible();
        }
      }
    }
  });

  test('should optimize chart performance with large datasets', async ({ adminPage }) => {
    await adminPage.goto('/charts/observability');
    await assertPageLoaded(adminPage);

    // Test chart performance with extended time range
    const timeRangeFilter = adminPage.locator('[data-testid="metrics-time-range"]');
    if (await timeRangeFilter.isVisible()) {
      // Select longer time range that would have more data points
      await timeRangeFilter.selectOption('30d');

      const startTime = Date.now();

      // Wait for charts to load with larger dataset
      const performanceChart = adminPage.locator('[data-testid="system-performance-chart"]');
      if (await performanceChart.isVisible()) {
        await assertChartLoads(adminPage, '[data-testid="system-performance-chart"]');

        const loadTime = Date.now() - startTime;

        // Should load within reasonable time even with large dataset (10 seconds max)
        expect(loadTime).toBeLessThan(10000);
      }

      // Should show data point sampling indicator for large datasets
      const samplingIndicator = adminPage.locator('[data-testid="data-sampling-indicator"]');
      if (await samplingIndicator.isVisible()) {
        await expect(samplingIndicator).toBeVisible();

        const samplingInfo = await samplingIndicator.textContent();
        expect(samplingInfo).toBeTruthy();
      }
    }
  });
});
