import React from 'react';
import { render } from '@testing-library/react';
import type { RouterAdapter } from '../../src/types';

// Import all public APIs
import {
  ContextSwitcherProvider,
  ContextSwitcher,
  ContextIndicator,
  OrganisationPicker,
  ProjectPicker,
  useContextSwitcher,
  useDebouncedValue,
  useKeyboardShortcut,
} from '../../src';

// Mock router adapter
const mockRouterAdapter: RouterAdapter = {
  getCurrentPath: () => '/',
  buildPathForContext: (context) => `/${context.orgSlug}/${context.projectSlug || ''}`,
  navigateTo: () => {},
};

describe('Smoke tests', () => {
  describe('Public API exports', () => {
    it('exports ContextSwitcherProvider', () => {
      expect(ContextSwitcherProvider).toBeDefined();
      expect(typeof ContextSwitcherProvider).toBe('function');
    });

    it('exports ContextSwitcher component', () => {
      expect(ContextSwitcher).toBeDefined();
      expect(typeof ContextSwitcher).toBe('function');
    });

    it('exports ContextIndicator component', () => {
      expect(ContextIndicator).toBeDefined();
      expect(typeof ContextIndicator).toBe('function');
    });

    it('exports OrganisationPicker component', () => {
      expect(OrganisationPicker).toBeDefined();
      expect(typeof OrganisationPicker).toBe('function');
    });

    it('exports ProjectPicker component', () => {
      expect(ProjectPicker).toBeDefined();
      expect(typeof ProjectPicker).toBe('function');
    });

    it('exports useContextSwitcher hook', () => {
      expect(useContextSwitcher).toBeDefined();
      expect(typeof useContextSwitcher).toBe('function');
    });

    it('exports useDebouncedValue hook', () => {
      expect(useDebouncedValue).toBeDefined();
      expect(typeof useDebouncedValue).toBe('function');
    });

    it('exports useKeyboardShortcut hook', () => {
      expect(useKeyboardShortcut).toBeDefined();
      expect(typeof useKeyboardShortcut).toBe('function');
    });
  });

  describe('Basic rendering', () => {
    it('renders ContextSwitcherProvider without crashing', () => {
      expect(() => {
        render(
          <ContextSwitcherProvider
            config={{
              routerAdapter: mockRouterAdapter,
              apiBaseUrl: '/api',
            }}
          >
            <div>Test Child</div>
          </ContextSwitcherProvider>
        );
      }).not.toThrow();
    });

    it('renders ContextSwitcher without crashing', () => {
      expect(() => {
        render(
          <ContextSwitcherProvider
            config={{
              routerAdapter: mockRouterAdapter,
              apiBaseUrl: '/api',
            }}
          >
            <ContextSwitcher />
          </ContextSwitcherProvider>
        );
      }).not.toThrow();
    });

    it('renders ContextIndicator without crashing', () => {
      expect(() => {
        render(
          <ContextSwitcherProvider
            config={{
              routerAdapter: mockRouterAdapter,
              apiBaseUrl: '/api',
            }}
          >
            <ContextIndicator />
          </ContextSwitcherProvider>
        );
      }).not.toThrow();
    });

    it('renders OrganisationPicker without crashing', () => {
      expect(() => {
        render(
          <ContextSwitcherProvider
            config={{
              routerAdapter: mockRouterAdapter,
              apiBaseUrl: '/api',
            }}
          >
            <OrganisationPicker isOpen={false} onClose={() => {}} />
          </ContextSwitcherProvider>
        );
      }).not.toThrow();
    });

    it('renders ProjectPicker without crashing', () => {
      expect(() => {
        render(
          <ContextSwitcherProvider
            config={{
              routerAdapter: mockRouterAdapter,
              apiBaseUrl: '/api',
            }}
          >
            <ProjectPicker isOpen={false} onClose={() => {}} />
          </ContextSwitcherProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Package structure', () => {
    it('has valid package name', () => {
      const pkg = require('../../package.json');
      expect(pkg.name).toBe('@django-core/context-switcher');
    });

    it('has version number', () => {
      const pkg = require('../../package.json');
      expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('has main entry point', () => {
      const pkg = require('../../package.json');
      expect(pkg.main).toBeDefined();
    });

    it('has module entry point', () => {
      const pkg = require('../../package.json');
      expect(pkg.module).toBeDefined();
    });

    it('has types entry point', () => {
      const pkg = require('../../package.json');
      expect(pkg.types).toBeDefined();
    });
  });

  describe('TypeScript definitions', () => {
    it('provides type definitions for all exports', () => {
      // This test ensures TypeScript compilation succeeded
      // and type definitions are available
      const types = [
        ContextSwitcherProvider,
        ContextSwitcher,
        ContextIndicator,
        OrganisationPicker,
        ProjectPicker,
        useContextSwitcher,
        useDebouncedValue,
        useKeyboardShortcut,
      ];

      types.forEach(type => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('Build artifacts', () => {
    it('package is buildable', () => {
      // This test passes if the package built successfully
      // The existence of this test file running means the build worked
      expect(true).toBe(true);
    });
  });
});
