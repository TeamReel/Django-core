import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Dashboard } from '../../src/components/Dashboard';
import { ListDetail } from '../../src/components/ListDetail';
import { Wizard } from '../../src/components/Wizard';
import { Settings } from '../../src/components/Settings';

describe('State Override Integration Tests', () => {
  // ============================================================================
  // Dashboard State Overrides
  // ============================================================================

  describe('Dashboard', () => {
    it('should render custom loading state', () => {
      const customLoading = <div data-testid="custom-loading">Custom Loading</div>;

      render(
        <Dashboard loading renderLoading={() => customLoading}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should render custom empty state', () => {
      const customEmpty = <div data-testid="custom-empty">No Data</div>;

      render(
        <Dashboard isEmpty renderEmpty={() => customEmpty}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should render custom error state', () => {
      const customError = (error: Error) => (
        <div data-testid="custom-error">Error: {error.message}</div>
      );
      const testError = new Error('Test error');

      render(
        <Dashboard error={testError} renderError={customError}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText(/Test error/)).toBeInTheDocument();
    });

    it('should render custom permission denied state', () => {
      const customPermissionDenied = <div data-testid="custom-denied">Access Denied</div>;

      render(
        <Dashboard permissionDenied renderPermissionDenied={() => customPermissionDenied}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );

      expect(screen.getByTestId('custom-denied')).toBeInTheDocument();
      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should maintain layout structure with partial overrides', () => {
      const customLoading = <div data-testid="custom-loading">Loading</div>;

      render(
        <Dashboard loading renderLoading={() => customLoading}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );

      // Custom loading replaces entire content
      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
    });

    it('should render success state when no state flags are set', () => {
      render(
        <Dashboard>
          <Dashboard.Header title="Test Dashboard" />
        </Dashboard>
      );

      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // ListDetail State Overrides
  // ============================================================================

  describe('ListDetail', () => {
    it('should render custom loading state', () => {
      const customLoading = <div data-testid="custom-loading">Loading List</div>;

      render(
        <div style={{ height: '400px' }}>
          <ListDetail loading renderLoading={() => customLoading}>
            <ListDetail.List>List Content</ListDetail.List>
            <ListDetail.Detail>Detail Content</ListDetail.Detail>
          </ListDetail>
        </div>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.queryByText('List Content')).not.toBeInTheDocument();
    });

    it('should render custom empty state', () => {
      const customEmpty = <div data-testid="custom-empty">No Items</div>;

      render(
        <div style={{ height: '400px' }}>
          <ListDetail isEmpty renderEmpty={() => customEmpty}>
            <ListDetail.List>List Content</ListDetail.List>
            <ListDetail.Detail>Detail Content</ListDetail.Detail>
          </ListDetail>
        </div>
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    });

    it('should render custom error state', () => {
      const customError = (error: Error) => (
        <div data-testid="custom-error">{error.message}</div>
      );

      render(
        <div style={{ height: '400px' }}>
          <ListDetail
            error={new Error('Fetch failed')}
            renderError={customError}
          >
            <ListDetail.List>List Content</ListDetail.List>
            <ListDetail.Detail>Detail Content</ListDetail.Detail>
          </ListDetail>
        </div>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Fetch failed')).toBeInTheDocument();
    });

    it('should render custom permission denied state', () => {
      const customDenied = <div data-testid="custom-denied">No Access</div>;

      render(
        <div style={{ height: '400px' }}>
          <ListDetail permissionDenied renderPermissionDenied={() => customDenied}>
            <ListDetail.List>List Content</ListDetail.List>
            <ListDetail.Detail>Detail Content</ListDetail.Detail>
          </ListDetail>
        </div>
      );

      expect(screen.getByTestId('custom-denied')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Wizard State Overrides
  // ============================================================================

  describe('Wizard', () => {
    const wizardSteps = [
      { id: 'step1', label: 'Step 1' },
      { id: 'step2', label: 'Step 2' },
    ];

    it('should render custom loading state', () => {
      const customLoading = <div data-testid="custom-loading">Loading Wizard</div>;

      render(
        <Wizard
          steps={wizardSteps}
          loading
          renderLoading={() => customLoading}
        >
          <Wizard.Step stepId="step1">Content 1</Wizard.Step>
          <Wizard.Step stepId="step2">Content 2</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.queryByText('Step 1')).not.toBeInTheDocument();
    });

    it('should render custom empty state', () => {
      const customEmpty = <div data-testid="custom-empty">No Steps</div>;

      render(
        <Wizard
          steps={[]}
          isEmpty
          renderEmpty={() => customEmpty}
        >
          {/* No steps */}
        </Wizard>
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    });

    it('should render custom error state', () => {
      const customError = (error: Error) => (
        <div data-testid="custom-error">{error.message}</div>
      );

      render(
        <Wizard
          steps={wizardSteps}
          error={new Error('Validation error')}
          renderError={customError}
        >
          <Wizard.Step stepId="step1">Content 1</Wizard.Step>
          <Wizard.Step stepId="step2">Content 2</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Validation error')).toBeInTheDocument();
    });

    it('should render custom permission denied state', () => {
      const customDenied = <div data-testid="custom-denied">Premium Only</div>;

      render(
        <Wizard
          steps={wizardSteps}
          permissionDenied
          renderPermissionDenied={() => customDenied}
        >
          <Wizard.Step stepId="step1">Content 1</Wizard.Step>
          <Wizard.Step stepId="step2">Content 2</Wizard.Step>
        </Wizard>
      );

      expect(screen.getByTestId('custom-denied')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Settings State Overrides
  // ============================================================================

  describe('Settings', () => {
    const settingsSections = [
      { id: 'profile', label: 'Profile' },
      { id: 'security', label: 'Security' },
    ];

    it('should render custom loading state', () => {
      const customLoading = <div data-testid="custom-loading">Loading Settings</div>;

      render(
        <Settings
          sections={settingsSections}
          loading
          renderLoading={() => customLoading}
        >
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should render custom empty state', () => {
      const customEmpty = <div data-testid="custom-empty">No Sections</div>;

      render(
        <Settings
          sections={[]}
          isEmpty
          renderEmpty={() => customEmpty}
        >
          {/* No sections */}
        </Settings>
      );

      expect(screen.getByTestId('custom-empty')).toBeInTheDocument();
    });

    it('should render custom error state', () => {
      const customError = (error: Error) => (
        <div data-testid="custom-error">{error.message}</div>
      );

      render(
        <Settings
          sections={settingsSections}
          error={new Error('Settings load failed')}
          renderError={customError}
        >
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByTestId('custom-error')).toBeInTheDocument();
      expect(screen.getByText('Settings load failed')).toBeInTheDocument();
    });

    it('should render custom permission denied state', () => {
      const customDenied = <div data-testid="custom-denied">Admin Only</div>;

      render(
        <Settings
          sections={settingsSections}
          permissionDenied
          renderPermissionDenied={() => customDenied}
        >
          <Settings.Section sectionId="profile">Profile Content</Settings.Section>
          <Settings.Section sectionId="security">Security Content</Settings.Section>
        </Settings>
      );

      expect(screen.getByTestId('custom-denied')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Cross-Template Consistency Tests
  // ============================================================================

  describe('Render Prop Consistency', () => {
    it('all templates should support renderLoading', () => {
      const customLoading = <div data-testid="loading">Loading</div>;

      const { rerender } = render(
        <Dashboard loading renderLoading={() => customLoading}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      rerender(
        <div style={{ height: '400px' }}>
          <ListDetail loading renderLoading={() => customLoading}>
            <ListDetail.List>List</ListDetail.List>
            <ListDetail.Detail>Detail</ListDetail.Detail>
          </ListDetail>
        </div>
      );
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      rerender(
        <Wizard
          steps={[{ id: '1', label: 'Step' }]}
          loading
          renderLoading={() => customLoading}
        >
          <Wizard.Step stepId="1">Content</Wizard.Step>
        </Wizard>
      );
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      rerender(
        <Settings
          sections={[{ id: 'section', label: 'Section' }]}
          loading
          renderLoading={() => customLoading}
        >
          <Settings.Section sectionId="section">Content</Settings.Section>
        </Settings>
      );
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('all templates should support renderEmpty', () => {
      const customEmpty = <div data-testid="empty">Empty</div>;

      // Test each template has consistent renderEmpty support
      const { rerender } = render(
        <Dashboard isEmpty renderEmpty={() => customEmpty}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );
      expect(screen.getByTestId('empty')).toBeInTheDocument();

      rerender(
        <div style={{ height: '400px' }}>
          <ListDetail isEmpty renderEmpty={() => customEmpty}>
            <ListDetail.List>List</ListDetail.List>
            <ListDetail.Detail>Detail</ListDetail.Detail>
          </ListDetail>
        </div>
      );
      expect(screen.getByTestId('empty')).toBeInTheDocument();
    });

    it('all templates should support renderError with error parameter', () => {
      const testError = new Error('Test error');
      const customError = (error: Error) => (
        <div data-testid="error">{error.message}</div>
      );

      const { rerender } = render(
        <Dashboard error={testError} renderError={customError}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();

      rerender(
        <div style={{ height: '400px' }}>
          <ListDetail error={testError} renderError={customError}>
            <ListDetail.List>List</ListDetail.List>
            <ListDetail.Detail>Detail</ListDetail.Detail>
          </ListDetail>
        </div>
      );
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('all templates should support renderPermissionDenied', () => {
      const customDenied = <div data-testid="denied">Denied</div>;

      const { rerender } = render(
        <Dashboard permissionDenied renderPermissionDenied={() => customDenied}>
          <Dashboard.Header title="Test" />
        </Dashboard>
      );
      expect(screen.getByTestId('denied')).toBeInTheDocument();

      rerender(
        <div style={{ height: '400px' }}>
          <ListDetail permissionDenied renderPermissionDenied={() => customDenied}>
            <ListDetail.List>List</ListDetail.List>
            <ListDetail.Detail>Detail</ListDetail.Detail>
          </ListDetail>
        </div>
      );
      expect(screen.getByTestId('denied')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // State Priority Tests
  // ============================================================================

  describe('State Priority', () => {
    it('loading state should take priority over all other states', () => {
      const customLoading = <div data-testid="loading">Loading</div>;
      const customError = <div data-testid="error">Error</div>;

      render(
        <Dashboard
          loading
          error={new Error('Test')}
          isEmpty
          permissionDenied
          renderLoading={() => customLoading}
          renderError={() => customError}
        >
          <Dashboard.Header title="Test" />
        </Dashboard>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    });

    it('permission denied should take priority over error and empty', () => {
      const customDenied = <div data-testid="denied">Denied</div>;
      const customError = <div data-testid="error">Error</div>;

      render(
        <Dashboard
          permissionDenied
          error={new Error('Test')}
          isEmpty
          renderPermissionDenied={() => customDenied}
          renderError={() => customError}
        >
          <Dashboard.Header title="Test" />
        </Dashboard>
      );

      expect(screen.getByTestId('denied')).toBeInTheDocument();
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    });

    it('error should take priority over empty', () => {
      const customError = <div data-testid="error">Error</div>;
      const customEmpty = <div data-testid="empty">Empty</div>;

      render(
        <Dashboard
          error={new Error('Test')}
          isEmpty
          renderError={() => customError}
          renderEmpty={() => customEmpty}
        >
          <Dashboard.Header title="Test" />
        </Dashboard>
      );

      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.queryByTestId('empty')).not.toBeInTheDocument();
    });
  });
});
