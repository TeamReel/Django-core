# Changelog

All notable changes to `@django-core/context-switcher` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of multi-tenancy context switcher
- Organisation and project picker components with virtualization
- React Context-based state management
- Router adapter pattern for framework-agnostic URL synchronization
- Debounced search with 300ms delay
- Keyboard shortcuts (Cmd/Ctrl+K)
- WCAG 2.1 AA accessibility compliance
- Comprehensive documentation (README, integration guide, customization guide, troubleshooting)
- 4 Architecture Decision Records (ADRs)
- TypeScript support with full type definitions
- Integration with @django-core/design-system
- Integration with @django-core/api-client
- Virtualized lists for 1000+ items with react-window
- 90%+ test coverage with Jest and React Testing Library
- Example placeholders for React Router and Next.js integrations

### Documentation
- Comprehensive README with API reference
- Integration guide for React Router, Next.js, and Django templates
- Customization guide for styling, layouts, and router adapters
- Troubleshooting guide with common issues and solutions
- ADR-001: Router Adapter Pattern
- ADR-002: State Management with React Context
- ADR-003: Virtualization Strategy for Large Lists
- ADR-004: API Integration with @django-core/api-client
- TypeDoc configuration for API documentation generation

## [0.1.0] - 2024-12-11

### Added
- Initial release (internal development version)
- Core context switching functionality
- ContextSwitcherProvider and useContextSwitcher hook
- ContextSwitcher, ContextIndicator components
- OrganisationPicker and ProjectPicker modal components
- RouterAdapter interface for URL synchronization
- Lifecycle hooks (onBeforeContextChange, onContextChanged, onContextError)
- Cookie-based authentication support
- Server-side rendering compatibility

### Dependencies
- React ^18.0.0 (peer dependency)
- React DOM ^18.0.0 (peer dependency)
- @django-core/api-client (workspace dependency)
- @django-core/design-system (workspace dependency)
- react-window ^2.2.3

### Development
- Jest testing setup
- React Testing Library integration
- MSW (Mock Service Worker) for API mocking
- ESLint and Prettier configuration
- TypeScript strict mode enabled
- Vite build configuration

## Release Process

### Versioning Strategy

- **Patch (0.0.x)**: Bug fixes, documentation updates, internal improvements
- **Minor (0.x.0)**: New features, new components, backward-compatible API changes
- **Major (x.0.0)**: Breaking changes, major API redesigns

### Pre-release Checklist

Before releasing a new version:

1. **Update CHANGELOG.md**
   - Move unreleased changes to new version section
   - Add release date
   - Categorize changes (Added, Changed, Deprecated, Removed, Fixed, Security)

2. **Update package.json version**
   ```bash
   pnpm version [patch|minor|major]
   ```

3. **Run tests**
   ```bash
   pnpm test
   pnpm test:coverage
   ```

4. **Build package**
   ```bash
   pnpm build
   ```

5. **Update documentation**
   - Generate API docs: `pnpm docs:api`
   - Review README for accuracy
   - Check all links work

6. **Create git tag**
   ```bash
   git tag -a v0.1.0 -m "Release v0.1.0"
   git push origin v0.1.0
   ```

7. **Publish to npm** (when ready for external release)
   ```bash
   pnpm publish --access public
   ```

## Migration Guides

### From Pre-release to v0.1.0

No migration needed - this is the first release.

Future migration guides will be added here when breaking changes are introduced.

---

## Links

- [README](./README.md)
- [Integration Guide](./docs/integration-guide.md)
- [Customization Guide](./docs/customization-guide.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [Architecture Decision Records](./docs/adr/)
- [GitHub Repository](https://github.com/TeamReel/django-core)
- [Issues](https://github.com/TeamReel/django-core/issues)
