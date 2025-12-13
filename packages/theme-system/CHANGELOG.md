# Changelog

All notable changes to `@django-core/theme-system` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-15

### Added

- **Core Theme System** (WP01-WP03)
  - `ThemeProvider` React Context provider for theme management
  - `useTheme()` hook for accessing theme state
  - Theme contracts using vanilla-extract
  - Light/dark/system mode support
  - System preference detection with `prefers-color-scheme` media query

- **Storage Adapters** (WP04)
  - `CookieStorage` - Browser cookies with SSR support
  - `LocalStorageAdapter` - Browser localStorage for client-only apps
  - `B12Adapter` - Sync to Django backend via B12 API
  - `ComposedStorage` - Combine multiple adapters for redundancy

- **SSR Support** (WP05)
  - `<ThemeScript />` component for zero-flash initialization
  - `resolveServerTheme()` utility for server-side cookie parsing
  - Next.js App Router and Pages Router support
  - Django template integration

- **UI Components** (WP06)
  - `<ThemeToggle variant="icon" />` - Icon button for mode cycling
  - `<ThemeToggle variant="switch" />` - Toggle switch for light/dark
  - `<ThemeToggle variant="dropdown" />` - Dropdown menu with all modes

- **Accessibility** (WP07)
  - WCAG 2.1 AA contrast validation
  - Automated contrast ratio checking for theme tokens
  - Build-time validation with actionable error messages
  - Border color validation using 3:1 UI component threshold

- **Brand Variants** (WP02)
  - Brand variant system with hierarchical inheritance
  - Runtime brand switching
  - Token overrides for colors, typography, spacing
  - Type-safe brand configuration

- **Documentation** (WP08)
  - Comprehensive README with quickstart guide
  - API documentation for all public exports
  - Integration guides for Next.js, Django, React SPA
  - Brand customization guide
  - Troubleshooting guide
  - Migration guide from manual implementations
  - CHANGELOG and versioning strategy

### Dependencies

- React 18+
- @django-core/design-system ^0.1.0
- @vanilla-extract/css ^1.14.0

### Peer Dependencies

- @django-core/api-client ^0.1.0 (optional, for B12Adapter)

### Breaking Changes

None (initial release)

## [Unreleased]

### Planned

- Animation transitions for theme switching
- Custom theme persistence strategies
- Theme preview component for settings pages
- Additional brand variant examples

---

## Version History

- **0.1.0** (2025-01-15) - Initial release with full feature set

---

## Migration Guides

- [Migrating from manual theme implementations](./docs/migration-guide.md)

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup and guidelines.

## License

MIT
