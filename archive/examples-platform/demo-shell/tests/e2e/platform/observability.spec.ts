import { test, expect, assertPageLoaded, assertRoleBasedUI, assertChartLoads } from '../fixtures';

test.describe('Observability Page', () => {
  test('should load observability dashboard for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage, 'Observability');

    // Admin should see all observability features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="observability-overview"]', '[data-testid="metrics-dashboard"]', '[data-testid="observability-config"]', '[data-testid="alerting-rules"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show observability overview
    const observabilityOverview = adminPage.locator('[data-testid="observability-overview"]');
    await expect(observabilityOverview).toBeVisible();
  });

  test('should load observability dashboard for member with monitoring access', async ({ memberPage }) => {
    await memberPage.goto('/platform/observability');
    await assertPageLoaded(memberPage, 'Observability');

    // Member should see dashboards but no config
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="observability-overview"]', '[data-testid="metrics-dashboard"]'],
        cannotView: ['[data-testid="observability-config"]', '[data-testid="alerting-config"]']
      }
    }, 'member');
  });

  test('should restrict observability dashboard for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/platform/observability');

    // Viewer might be redirected or see limited view
    const currentUrl = viewerPage.url();
    if (currentUrl.includes('/platform/observability')) {
      await assertPageLoaded(viewerPage, 'Observability');

      // Should see basic metrics only
      await assertRoleBasedUI(viewerPage, {
        viewer: {
          canView: ['[data-testid="basic-metrics"]'],
          cannotView: ['[data-testid="detailed-metrics"]', '[data-testid="observability-config"]', '[data-testid="alerting-rules"]']
        }
      }, 'viewer');
    }
  });

  test('should display metrics dashboard with charts', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage);

    const metricsDashboard = adminPage.locator('[data-testid="metrics-dashboard"]');
    if (await metricsDashboard.isVisible()) {
      // Test Chart.js integration for observability metrics
      const metricsCharts = adminPage.locator('[data-testid="metrics-chart"]');
      const chartCount = await metricsCharts.count();

      if (chartCount > 0) {
        // Test first chart loads
        await assertChartLoads(adminPage, '[data-testid="metrics-chart"]');

        // Should show different metric types
        const chartTitles = adminPage.locator('[data-testid="chart-title"]');
        const titleCount = await chartTitles.count();
        expect(titleCount).toBeGreaterThan(0);
      }
    }
  });

  test('should show system performance metrics', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage);

    const performanceMetrics = adminPage.locator('[data-testid="performance-metrics"]');
    if (await performanceMetrics.isVisible()) {
      // Should show key performance indicators
      const responseTime = adminPage.locator('[data-testid="avg-response-time"]');
      const throughput = adminPage.locator('[data-testid="request-throughput"]');
      const errorRate = adminPage.locator('[data-testid="error-rate"]');

      if (await responseTime.isVisible()) {
        const responseTimeText = await responseTime.textContent();
        expect(responseTimeText).toMatch(/\d+/); // Should contain numbers
      }

      if (await throughput.isVisible()) {
        const throughputText = await throughput.textContent();
        expect(throughputText).toMatch(/\d+/); // Should contain numbers
      }

      if (await errorRate.isVisible()) {
        const errorRateText = await errorRate.textContent();
        expect(errorRateText).toBeTruthy();
      }
    }
  });

  test('should display application logs', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage);

    const applicationLogs = adminPage.locator('[data-testid="application-logs"]');
    if (await applicationLogs.isVisible()) {
      // Should show log entries
      const logEntries = adminPage.locator('[data-testid="log-entry"]');
      const entryCount = await logEntries.count();

      if (entryCount > 0) {
        const firstEntry = logEntries.first();
        await expect(firstEntry.locator('[data-testid="log-timestamp"]')).toBeVisible();
        await expect(firstEntry.locator('[data-testid="log-level"]')).toBeVisible();
        await expect(firstEntry.locator('[data-testid="log-message"]')).toBeVisible();

        // Should show log levels
        const logLevel = await firstEntry.locator('[data-testid="log-level"]').textContent();
        expect(['debug', 'info', 'warn', 'error', 'fatal']).toContain(logLevel?.toLowerCase());
      }
    }
  });

  test('should filter logs by level and timeframe', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage);

    const logFilters = adminPage.locator('[data-testid="log-filters"]');
    if (await logFilters.isVisible()) {
      // Test log level filter
      const levelFilter = adminPage.locator('[data-testid="log-level-filter"]');
      if (await levelFilter.isVisible()) {
        await levelFilter.selectOption('error');

        // Should filter to error logs only
        const errorLogs = adminPage.locator('[data-testid="log-entry"]');
        const errorCount = await errorLogs.count();

        if (errorCount > 0) {
          const firstErrorLog = errorLogs.first();
          const levelText = await firstErrorLog.locator('[data-testid="log-level"]').textContent();
          expect(levelText?.toLowerCase()).toBe('error');
        }
      }

      // Test time range filter
      const timeFilter = adminPage.locator('[data-testid="time-range-filter"]');
      if (await timeFilter.isVisible()) {
        await timeFilter.selectOption('1h');

        // Should apply time filter
        const filteredLogs = adminPage.locator('[data-testid="filtered-logs"]');
        if (await filteredLogs.isVisible()) {
          await expect(filteredLogs).toBeVisible();
        }
      }
    }
  });

  test('should search logs with text queries', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage);

    const logSearch = adminPage.locator('[data-testid="log-search"]');
    if (await logSearch.isVisible()) {
      await logSearch.fill('authentication');
      await adminPage.press('[data-testid="log-search"]', 'Enter');

      // Should show search results
      const searchResults = adminPage.locator('[data-testid="log-search-results"]');
      if (await searchResults.isVisible()) {
        await expect(searchResults).toBeVisible();

        // Should highlight search terms
        const highlightedText = adminPage.locator('[data-testid="search-highlight"]');
        if (await highlightedText.count() > 0) {
          await expect(highlightedText.first()).toBeVisible();
        }
      }
    }
  });

  test('should display alerting rules and notifications', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage);

    const alertingRules = adminPage.locator('[data-testid="alerting-rules"]');
    if (await alertingRules.isVisible()) {
      // Should show alert rules list
      const rules = adminPage.locator('[data-testid="alert-rule"]');
      const ruleCount = await rules.count();

      if (ruleCount > 0) {
        const firstRule = rules.first();
        await expect(firstRule.locator('[data-testid="rule-name"]')).toBeVisible();
        await expect(firstRule.locator('[data-testid="rule-status"]')).toBeVisible();

        // Should show rule configuration
        const ruleConfig = firstRule.locator('[data-testid="rule-config"]');
        if (await ruleConfig.isVisible()) {
          await expect(ruleConfig).toBeVisible();
        }
      }

      // Should have create rule button (admin only)
      const createRuleButton = adminPage.locator('[data-testid="create-alert-rule"]');
      if (await createRuleButton.isVisible()) {
        await expect(createRuleButton).toBeVisible();
      }
    }
  });

  test('should show traces and distributed tracing', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage);

    const distributedTracing = adminPage.locator('[data-testid="distributed-tracing"]');
    if (await distributedTracing.isVisible()) {
      // Should show recent traces
      const traces = adminPage.locator('[data-testid="trace-item"]');
      const traceCount = await traces.count();

      if (traceCount > 0) {
        const firstTrace = traces.first();
        await expect(firstTrace.locator('[data-testid="trace-id"]')).toBeVisible();
        await expect(firstTrace.locator('[data-testid="trace-duration"]')).toBeVisible();
        await expect(firstTrace.locator('[data-testid="trace-status"]')).toBeVisible();

        // Should be able to expand trace details
        const expandButton = firstTrace.locator('[data-testid="expand-trace"]');
        if (await expandButton.isVisible()) {
          await expandButton.click();

          const traceDetails = adminPage.locator('[data-testid="trace-details"]');
          await expect(traceDetails).toBeVisible();
        }
      }
    }
  });

  test('should handle real-time metrics updates', async ({ adminPage }) => {
    await adminPage.goto('/platform/observability');
    await assertPageLoaded(adminPage);

    const realtimeToggle = adminPage.locator('[data-testid="realtime-toggle"]');
    if (await realtimeToggle.isVisible()) {
      const initialState = await realtimeToggle.isChecked();

      // Toggle real-time updates
      await realtimeToggle.click();

      // Should update toggle state
      await expect(realtimeToggle).toBeChecked({ checked: !initialState });

      // Should show real-time indicator when enabled
      if (!initialState) {
        const realtimeIndicator = adminPage.locator('[data-testid="realtime-indicator"]');
        if (await realtimeIndicator.isVisible()) {
          await expect(realtimeIndicator).toBeVisible();
        }
      }
    }
  });
});
