/**
 * Theme system - centralized exports
 *
 * @module @django-core/theme-system/themes
 */

// Core theme contract and implementations
export { themeVars } from './contract.css';
export { lightTheme } from './light.css';
export { darkTheme } from './dark.css';

// Brand system
export { brandConfig, defaultBrand } from './brands';
export type { BrandVariant, BrandVariantDefinition, BrandConfig, ThemeTokenMap as BrandThemeTokenMap } from '../types/brand';

// Theme types
export type { ThemeMode, ThemeConfiguration, ThemePreference, ThemeTokenMap } from '../types/theme';
